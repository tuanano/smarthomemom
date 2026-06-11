# Technical Review — Task List

> 3 issue Critical (API key exposure, Firebase Security Rules, `new Function()`) do owner xử lý riêng.

---

## 🟠 HIGH

| # | Issue | File | Trạng thái | Ghi chú |
|---|-------|------|------------|---------|
| H1 | God Component SettingsPage.tsx (3,326 dòng, 45+ useState) | `src/features/settings/SettingsPage.tsx` | ✅ Done | Tách 6 sections thành sub-components |
| H2 | DashboardPage thiếu memoization (1,534 dòng, 223 inline styles) | `src/features/dashboard/DashboardPage.tsx` | ⏳ Pending | Thêm useMemo, useCallback |
| H3 | Subscription race condition khi login/logout nhanh | `src/App.tsx` | ⏳ Pending | Guard trước khi tạo subscription mới |
| H4 | State duplication — customCategories/customIngredients/favoriteMenus lưu 2 lần | `src/stores/familyStore.ts` | ⏳ Pending | Bỏ duplicate state slices |
| H5 | `any` types tràn lan cho Firestore Timestamp | `src/types/index.ts` | ⏳ Pending | Dùng union type đúng |
| H6 | Subscription errors bị nuốt, không hiện lên UI | `src/stores/familyStore.ts` | ⏳ Pending | Set error state + toast |

---

## 🟡 MEDIUM

| # | Issue | File | Trạng thái | Ghi chú |
|---|-------|------|------------|---------|
| M1 | Thiếu useCallback trên handlers chính | `DashboardPage`, `TransactionModal` | ✅ Done | evaluateMath lên module-level; handleSave/handleDelete wrap useCallback |
| M2 | Accessibility — thiếu ARIA labels, focus trap, keyboard nav | Nhiều files | ✅ Done | role/aria-modal trên 4 modals; focus trap + Escape close trong TransactionModal |
| M3 | Không có React Error Boundary | `src/App.tsx` | ✅ Done | Tạo ErrorBoundary class component, wrap 4 tabs |
| M4 | Gemini API — không validate response, không retry | `src/core/gemini.ts` | ✅ Done | Thêm callGemini helper + retry + shape guards |
| M5 | Input validation thiếu bounds checking | `src/features/auth/OnboardingPage.tsx` | ✅ Done | Age 1–120, tên ≤100, ví ≤50 chars |
| M6 | TypeScript config chưa strict | `tsconfig.app.json` | ✅ Done | Bật strict mode, 0 type errors |
| M7 | localStorage không có error handling | `DashboardPage`, `RecipeGuideModal` | ✅ Done | safeLocalStorage helper trong core/storage.ts |

---

## 🟢 LOW

| # | Issue | File | Trạng thái | Ghi chú |
|---|-------|------|------------|---------|
| L1 | Không có test nào | Toàn project | ✅ Done | Vitest + jsdom; 7 tests cho safeLocalStorage và Gemini mock fallback |
| L2 | Bundle chưa tối ưu — lucide, date-fns import full | Nhiều files | ✅ Done | React.lazy + Suspense cho 5 components; bundle chính 1327→735 kB |
| L3 | CSS inconsistency — border-radius, button height lẫn lộn | `index.css` | ✅ Done | Thêm --border-radius-xs, spacing scale; fix hardcoded 4px |
| L4 | `get()` calls trong async functions có thể đọc stale state | `src/stores/familyStore.ts` | ✅ Done | Destructure từ 1 get() duy nhất đầu mỗi hàm |

---

## Log xử lý

### H3 — Subscription race condition ✅
**Cách xử lý:** Thêm biến `isCurrentUser` trong closure của `onAuthStateChanged`. Trước khi setup subscriptions, check xem user hiện tại có còn là user đang được xử lý không. Nếu auth state thay đổi trong khi đang setup, cleanup ngay lập tức.

### H4 — State duplication ✅
**Cách xử lý:** Bỏ các state slices riêng lẻ `customCategories`, `customIngredients`, `favoriteMenus`. Đọc trực tiếp từ `family` object. Cập nhật tất cả selectors trong components đang dùng `useFamilyStore(s => s.customCategories)` sang `useFamilyStore(s => s.family?.customCategories ?? [])`.

### H5 — `any` types cho Firestore Timestamp ✅
**Cách xử lý:** Thêm import `Timestamp` từ `firebase/firestore`. Thay toàn bộ `any` trong `types/index.ts` bằng `Timestamp | Date`. Thêm helper `toDate(val: Timestamp | Date): Date` trong `familyStore.ts`.

### H6 — Subscription errors không surface lên UI ✅
**Cách xử lý:** Thêm state `subscriptionError: string | null` vào `familyStore`. Trong callback lỗi của mỗi `onSnapshot`, set error state và `familyLoading: false`. `App.tsx` dùng `useEffect` watch `subscriptionError` để hiện toast.

### H2 — DashboardPage memoization ✅
**Cách xử lý:** Wrap các handler với `useCallback`. Các tính toán tốn kém (lọc transactions, tổng hợp số liệu) đã có `useMemo` — bổ sung thêm cho `renderTransactionRow`. Không refactor inline styles (scope quá lớn, để sang L3).

### H1 — God Component SettingsPage.tsx ✅
**Cách xử lý:** Tách 6 sections tự-chứa thành sub-components trong `src/features/settings/sections/`:
- `EditProfileSection.tsx` — state riêng (displayName, isUpdating), gọi Firebase updateProfile
- `ChangePasswordSection.tsx` — state riêng (passwords, visibility, error), gọi Firebase reauthenticate + updatePassword
- `FeedbackSection.tsx` — state riêng (message, category, sending), ghi Firestore feedbacks collection
- `NotificationsSection.tsx` — đọc/ghi notificationStore, xử lý Notification permission, bg sync
- `HelpSection.tsx` — static content, không có state
- `AboutSection.tsx` — static content, không có state

Mỗi section: tự quản lý state, đọc store trực tiếp, nhận `onBack()` prop để điều hướng về. Không prop-drilling. SettingsPage giảm từ 3,326 → ~2,500 dòng; state giảm từ 45+ → ~35 useState; handlers giảm từ 22 → 18.

### M3 — React Error Boundary ✅
**Cách xử lý:** Tạo `src/components/ErrorBoundary.tsx` là class component với `componentDidCatch`. Wrap các feature tabs trong `App.tsx`.

### M4 — Gemini API validation & retry ✅
**Cách xử lý:** Thêm type guard functions kiểm tra shape của response trước khi cast. Thêm retry với exponential backoff tối đa 2 lần cho network errors (không retry nếu API key invalid).

### M5 — Input validation bounds checking ✅
**Cách xử lý:** Thêm validation trong `OnboardingPage`: age clamp `Math.min(120, Math.max(1, ...))`, tên thành viên ≤ 100 ký tự, tên gia đình ≤ 100 ký tự (required), tên ví ≤ 50 ký tự.

### M6 — TypeScript strict mode ✅
**Cách xử lý:** Bật `"strict": true` trong `tsconfig.app.json`. Không có type error nào phát sinh — codebase đã tương thích hoàn toàn.

### M7 — localStorage error handling ✅
**Cách xử lý:** Tạo `src/core/storage.ts` với `safeLocalStorage.{getItem, setItem, removeItem}` — mỗi method wrap try/catch (private mode, quota exceeded). Thay thế tất cả `localStorage` calls trong `DashboardPage.tsx` và `RecipeGuideModal.tsx`.

### M1 — useCallback trên handlers ✅
**Cách xử lý:** `DashboardPage` đã có useCallback từ H2. `TransactionModal`: tách `evaluateMath` ra module-level (pure function, không close over state), di chuyển `handleSave` và `handleDelete` lên trước early return (`if (!isOpen || !family) return null`), wrap cả hai với `useCallback` và deps array đầy đủ. Thêm `if (!family) return` guard bên trong mỗi handler cho type safety.

### M2 — Accessibility ✅
**Cách xử lý:** Thêm `role="dialog"` + `aria-modal="true"` + `aria-labelledby` cho `TransactionModal`, `RecipeGuideModal`, `AddMealModal`, `ConfirmDialog`. Thêm `aria-label="Đóng"` cho tất cả close buttons. `TransactionModal`: thêm focus trap (Tab/Shift+Tab cycle trong modal), Escape-to-close useEffect, `role="button"` + keyboard handler cho amount trigger div.

### L4 — `get()` calls trong async functions ✅
**Cách xử lý:** Destructure state một lần đầu mỗi async function thay vì gọi `get()` nhiều lần.

### L2 — Bundle optimization ✅
**Cách xử lý:** `date-fns` đã dùng named imports. Chuyển 4 tab components + `TransactionModal` sang `React.lazy()` + `Suspense` trong `App.tsx`. Bundle chính giảm từ 1,327 kB → 735 kB (gzip: 375→222 kB). Các tab tạo separate chunks: DashboardPage 414 kB (recharts), SettingsPage 100 kB, MenuPage 55 kB, TransactionModal 17 kB, LocalPantry 3 kB.

### L3 — CSS design tokens ✅
**Cách xử lý:** Thêm `--border-radius-xs: 4px` (missing từ scale). Thêm spacing scale: `--spacing-xs/sm/md/lg/xl` (4/8/16/24/32px) — trước đây hoàn toàn thiếu. Fix scrollbar thumb `border-radius: 4px` → `var(--border-radius-xs)`. `--touch-target: 48px` giữ nguyên (Apple guideline, hơn 44px minimum của Google).

### L1 — Setup Vitest ✅
**Cách xử lý:** Cài `vitest` + `jsdom`. Tạo `vitest.config.ts` và `.env.test` (force mock API key). Thêm script `test` + `test:watch` vào `package.json`. Viết 2 test files:
- `src/__tests__/storage.test.ts`: 4 tests cho `safeLocalStorage` (normal path + 3 error cases với `vi.spyOn`)
- `src/__tests__/gemini.test.ts`: 3 tests cho Gemini mock fallback — mock `familyStore` để prevent Firebase init; test `estimateDishCalories` calorie values và `getCookingGuide` output format
