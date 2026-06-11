import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Send } from 'lucide-react';
import { db } from '../../../firebase';
import { useAuthStore } from '../../../stores/authStore';
import { useFamilyStore } from '../../../stores/familyStore';
import { useToast } from '../../../components/Toast';

export function FeedbackSection({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { family } = useFamilyStore();
  const showToast = useToast();

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature' | 'other'>('other');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  if (!user) return null;

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setIsSendingFeedback(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        userId: user.uid,
        userEmail: user.email,
        familyId: family?.familyId || '',
        familyName: family?.familyName || '',
        category: feedbackCategory,
        message: feedbackMessage.trim(),
        appVersion: '1.0.0',
        status: 'new',
        createdAt: serverTimestamp(),
      });
      showToast('Đã gửi phản hồi! Cảm ơn bạn.', 'success');
      setFeedbackMessage('');
      setFeedbackCategory('other');
      onBack();
    } catch {
      showToast('Lỗi khi gửi phản hồi. Vui lòng thử lại.', 'error');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const categories = [
    { value: 'bug' as const, label: '🐛 Báo lỗi', color: 'var(--danger)' },
    { value: 'feature' as const, label: '✨ Đề xuất', color: '#8338EC' },
    { value: 'other' as const, label: '💬 Góp ý', color: '#4EA8DE' },
  ];

  const placeholder = feedbackCategory === 'bug'
    ? 'Mô tả lỗi bạn gặp phải, khi nào xảy ra, thao tác nào dẫn đến lỗi...'
    : feedbackCategory === 'feature'
    ? 'Tính năng bạn mong muốn, lý do hữu ích với gia đình bạn...'
    : 'Nhận xét, góp ý, cảm nhận của bạn về ứng dụng...';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ backgroundColor: '#F3E5FF', borderColor: '#CE93D8' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <MessageSquare size={16} style={{ color: '#8338EC', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: '#4A148C', lineHeight: 1.5 }}>
            Phản hồi của bạn giúp chúng tôi cải thiện ứng dụng mỗi ngày. Mọi góp ý đều được đọc kỹ!
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Loại phản hồi</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {categories.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFeedbackCategory(cat.value)}
                style={{
                  padding: '10px 6px', borderRadius: '10px',
                  border: `2px solid ${feedbackCategory === cat.value ? cat.color : 'var(--border)'}`,
                  backgroundColor: feedbackCategory === cat.value ? `${cat.color}12` : 'var(--bg-grey)',
                  color: feedbackCategory === cat.value ? cat.color : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 700, textAlign: 'center', transition: 'all 0.15s'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Nội dung phản hồi</label>
          <textarea
            className="form-control"
            placeholder={placeholder}
            value={feedbackMessage}
            onChange={e => setFeedbackMessage(e.target.value)}
            style={{ minHeight: '120px', resize: 'none', lineHeight: 1.6 }}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px', textAlign: 'right' }}>
            {feedbackMessage.length} ký tự
          </div>
        </div>

        <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-grey)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Phản hồi sẽ được gửi qua email tới nhóm phát triển kèm thông tin tài khoản của bạn để hỗ trợ tốt hơn.
        </div>
      </div>

      <button
        type="button"
        onClick={handleSendFeedback}
        disabled={!feedbackMessage.trim() || isSendingFeedback}
        className="btn btn-primary"
        style={{ width: '100%', height: '50px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#8338EC', borderColor: '#8338EC', opacity: (!feedbackMessage.trim() || isSendingFeedback) ? 0.6 : 1 }}
      >
        <Send size={17} /> {isSendingFeedback ? 'Đang gửi...' : 'Gửi phản hồi'}
      </button>
    </div>
  );
}
