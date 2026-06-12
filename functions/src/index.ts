import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

initializeApp();

const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

async function getFamilyTokens(familyId: string): Promise<string[]> {
  const familySnap = await db.doc(`families/${familyId}`).get();
  const data = familySnap.data();
  const tokens: string[] = data?.fcmTokens ?? [];

  // Also collect tokens from linked family members (other Firebase accounts in the same family)
  const linkedMemberIds: Record<string, string> = data?.linkedMemberIds ?? {};
  for (const uid of Object.keys(linkedMemberIds)) {
    if (uid === familyId) continue;
    const memberSnap = await db.doc(`families/${uid}`).get();
    const memberTokens: string[] = memberSnap.data()?.fcmTokens ?? [];
    tokens.push(...memberTokens);
  }

  return [...new Set(tokens)]; // deduplicate
}

async function sendPush(tokens: string[], title: string, body: string, tag: string): Promise<void> {
  if (tokens.length === 0) return;
  await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { tag },
    webpush: {
      notification: {
        icon: 'https://tuanano.github.io/smarthomemom/pwa-192x192.png',
        badge: 'https://tuanano.github.io/smarthomemom/pwa-192x192.png',
      },
    },
  });
}

// ── Trigger: giao dịch mới ────────────────────────────────────────────────

export const onTransactionCreated = onDocumentCreated(
  'families/{familyId}/transactions/{txId}',
  async (event) => {
    const familyId = event.params.familyId;
    const tx = event.data?.data();
    if (!tx) return;

    const tokens = await getFamilyTokens(familyId);

    // Notification for new transaction
    const typeMap: Record<string, string> = {
      income: '💰 Thu nhập mới',
      expense: '💸 Chi tiêu mới',
      transfer: '🔄 Chuyển tiền',
    };
    const title = typeMap[tx.type as string] ?? '💰 Giao dịch mới';
    const amount = formatVND(tx.amount as number);
    const note = tx.note ? ` — ${tx.note}` : '';
    const body = `${tx.category}: ${amount}${note}`;

    await sendPush(tokens, title, body, 'smm-transaction');

    // Check budget alert after expense transaction
    if (tx.type === 'expense') {
      await checkAndAlertBudget(familyId, tx.category as string, tx.date as Timestamp, tokens);
    }
  }
);

// ── Budget alert check ────────────────────────────────────────────────────

async function checkAndAlertBudget(
  familyId: string,
  category: string,
  txDate: Timestamp,
  tokens: string[]
): Promise<void> {
  const budgetsSnap = await db.collection(`families/${familyId}/budgets`)
    .where('category', '==', category)
    .get();

  if (budgetsSnap.empty) return;

  const txDateObj = txDate.toDate();
  const txMonth = txDateObj.getMonth();
  const txYear = txDateObj.getFullYear();

  // Query all expense transactions for this category in the same month
  const txSnap = await db.collection(`families/${familyId}/transactions`)
    .where('type', '==', 'expense')
    .where('category', '==', category)
    .get();

  const totalSpent = txSnap.docs.reduce((sum, d) => {
    const data = d.data();
    const date = (data.date as Timestamp).toDate();
    if (date.getMonth() === txMonth && date.getFullYear() === txYear) {
      return sum + (data.amount as number);
    }
    return sum;
  }, 0);

  for (const budgetDoc of budgetsSnap.docs) {
    const budget = budgetDoc.data();
    if (!budget.limitAmount || budget.limitAmount <= 0) continue;
    if (budget.isAlerted) continue;

    const threshold: number = budget.alertThreshold ?? 0.8;
    if (totalSpent / budget.limitAmount >= threshold) {
      const pct = Math.round((totalSpent / budget.limitAmount) * 100);
      await sendPush(
        tokens,
        '⚠️ Cảnh báo ngân sách',
        `Danh mục "${category}" đã dùng ${pct}% hạn mức tháng này!`,
        'smm-budget-alert'
      );
      // Mark as alerted to avoid duplicate notifications
      await budgetDoc.ref.update({ isAlerted: true });
    }
  }
}
