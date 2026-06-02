# Kế hoạch triển khai & Bản đặc tả kỹ thuật chi tiết: POC SmartHomeMom (ReactJS & Firebase)

Tài liệu này định hình lộ trình phát triển phiên bản **Proof of Concept (POC)** bằng **ReactJS (Vite + TypeScript)** kết hợp với **Firebase** để kiểm chứng các tính năng trước khi chuyển đổi sang ứng dụng di động Flutter.

---

## User Review Required

> [!IMPORTANT]
> **Các quyết định kỹ thuật cốt lõi cho bản POC ReactJS:**
> 1. **Framework & Bundler:** Sử dụng **Vite + React (TypeScript)** để có tốc độ chạy dev server và hot reload nhanh nhất.
> 2. **Cấu hình PWA (Progressive Web App):** Tích hợp `vite-plugin-pwa` để ứng dụng có thể cài đặt trực tiếp lên điện thoại của các mẹ (Add to Home Screen), có Splash Screen riêng, giao diện ẩn thanh địa chỉ trình duyệt, và hỗ trợ chạy ngoại tuyến (Offline).
> 3. **State Management:** Sử dụng **Zustand** thay cho Redux/Riverpod. Zustand cực kỳ nhỏ gọn, dễ hiểu và hoàn hảo cho một dự án POC nhưng vẫn đảm bảo khả năng mở rộng tốt.
> 4. **Giao diện & Styling:** Sử dụng **Vanilla CSS (hoặc CSS Modules)** thiết kế Mobile-First. Tất cả các nút bấm tối thiểu đạt kích thước 48x48px để các mẹ thao tác chạm dễ dàng bằng một tay khi đang làm việc nhà.
> 5. **Tích hợp AI:** Sử dụng thư viện `@google/generative-ai` trực tiếp ở phía client hoặc tích hợp qua Firebase Vertex AI Web SDK để gọi Gemini API.

---

## 1. Cấu hình Dependencies (`package.json`)

Dưới đây là các package chính sẽ sử dụng cho POC ReactJS:

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    
    // Firebase Web SDK
    "firebase": "^10.12.2",
    
    // State Management
    "zustand": "^4.5.2",
    
    // UI Icons & Charts
    "lucide-react": "^0.395.0", // Bộ icon hiện đại, thay thế cho Lucide
    "recharts": "^2.12.7",       // Biểu đồ React tương tác mạnh mẽ
    
    // Utilities
    "date-fns": "^3.6.0",        // Xử lý ngày tháng dễ dàng
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.2.2",
    "vite": "^5.3.1",
    "vite-plugin-pwa": "^0.20.0"  // Plugin tích hợp tạo Service Worker và Manifest tự động
  }
}
```

---

## 2. Thiết kế Cơ sở Dữ liệu Chi tiết (Firestore Schema)

Cấu trúc Firestore vẫn được giữ nguyên tính nhất quán để sau này dễ dàng chuyển đổi sang Flutter.

### `/families/{familyId}` (Nhóm gia đình & Cấu hình dinh dưỡng)
```typescript
interface Family {
  familyId: string;
  familyName: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
  members: FamilyMember[];
  nutritionTargets: {
    calories: number; // kcal/ngày
    protein: number;  // g/ngày
    carbs: number;    // g/ngày
    fat: number;      // g/ngày
  };
}

interface FamilyMember {
  id: string;
  name: string;
  role: 'father' | 'mother' | 'child' | 'grandparent';
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
}
```

### `/families/{familyId}/wallets/{walletId}` (Quản lý nguồn tiền)
```typescript
interface Wallet {
  walletId: string;
  name: string;
  type: 'cash' | 'bank' | 'e_wallet';
  balance: number;
  colorCode: string;
  iconName: string; // Tên icon từ Lucide (ví dụ: 'CreditCard', 'Coins')
  createdAt: any;
}
```

### `/families/{familyId}/transactions/{transactionId}` (Giao dịch thu/chi)
```typescript
interface Transaction {
  transactionId: string;
  walletId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  note: string;
  date: any; // Firestore Timestamp
  createdAt: any;
  imageUrl?: string;
  toWalletId?: string; // Chỉ dành cho chuyển tiền
  spentBy?: string;    // ID thành viên gia đình thực hiện chi tiêu
}
```

---

## 3. Bản Phân Tích & Đặc Tả Chi Tiết Tính Năng Quản Lý Thu Chi (Expense Management UX Specification)

Dựa trên nghiên cứu các ứng dụng quản lý tài chính hàng đầu (Money Lover, Spendee, YNAB) và hành vi của đối tượng **mẹ nội trợ**, dưới đây là danh sách tính năng và các tối ưu hóa tương tác (UX) cốt lõi:

### 3.1. Nhóm Tính năng và Tương tác Tối ưu hóa Nhập liệu (Quick Input UX)
Các mẹ nội trợ thường bận rộn và có ít thời gian rảnh. Thao tác ghi chép phải nhanh chóng, đơn giản và tốn ít lượt bấm nhất có thể.

*   **Bàn phím Tính toán Thông minh (Custom Smart Keypad):**
    *   *Mô tả:* Thay thế bàn phím số thông thường bằng bàn phím tích hợp phép tính cộng, trừ, nhân, chia (ví dụ: `25.000 + 45.000 + 15.000 =`).
    *   *Lợi ích:* Mẹ có thể cộng dồn tiền mua thịt, rau, gia vị ngay tại chợ trực tiếp trên app mà không cần mở máy tính cầm tay trước.
*   **Trạng thái mặc định thông minh (Smart Defaults):**
    *   *Mô tả:* Khi mở form thêm giao dịch, app tự động điền sẵn:
        *   Loại giao dịch: **Chi phí (Expense)**.
        *   Ngày phát sinh: **Hôm nay (Today)**.
        *   Ví thanh toán: **Ví được sử dụng nhiều nhất gần đây (ví dụ: Tiền mặt)**.
    *   *Lợi ích:* Giảm 3 bước thao tác xuống còn 0 bước cho các trường thông tin cơ bản.
*   **Nhập liệu nhanh bằng AI / Cú pháp tự nhiên (NLP Quick Input):**
    *   *Mô tả:* Cho phép gõ hoặc nói một câu đơn giản: *"mua thit heo 65k"* hoặc *"tien dien 1tr2"*. Hệ thống tự động bóc tách thành:
        *   Số tiền: `65,000` / `1,200,000` VND.
        *   Ghi chú: *"thịt heo"* / *"tiền điện"*.
        *   Danh mục tương ứng: *Đi chợ / Ăn uống* hoặc *Hóa đơn / Điện nước*.
*   **Quét hóa đơn bằng ảnh (Receipt OCR):**
    *   *Mô tả:* Chụp ảnh hóa đơn siêu thị (Co.opmart, WinMart), AI/OCR tự nhận diện tổng số tiền thanh toán, ngày tháng và gợi ý danh mục chi tiêu.

### 3.2. Quản lý Danh mục (Categories) Phân cấp & Tự động hóa
*   **Danh mục Cha - Con (Parent-Child Categories):**
    *   *Ví dụ:* Danh mục cha **Sinh hoạt gia đình** -> Danh mục con: *Đi chợ*, *Tiền điện*, *Tiền nước*, *Internet*.
    *   *Lợi ích:* Giúp báo cáo trực quan mà không làm rối danh sách lúc chọn nhanh.
*   **Gợi ý Danh mục theo thói quen thời gian (Time-based Smart Categories):**
    *   *Mô tả:*
        *   Sáng sớm (6h - 9h): Ưu tiên hiển thị danh mục *"Ăn sáng"*, *"Cà phê"*.
        *   Chiều tối (16h - 19h): Ưu tiên hiển thị danh mục *"Đi chợ/Nấu ăn"*, *"Đổ xăng"*.
        *   Cuối tháng (25 - 30): Ưu tiên hiển thị *"Hóa đơn điện nước"*, *"Học phí"*.
    *   *Lợi ích:* Các mẹ chỉ cần chạm một chạm là chọn đúng danh mục mà không cần cuộn tìm kiếm.

### 3.3. Ví liên kết & Chia sẻ trong Gia đình (Shared Family Ledger)
*   **Tách biệt Ví chung & Ví riêng:**
    *   *Ví riêng (Cá nhân):* Chi tiêu cá nhân của mẹ không ảnh hưởng tới quỹ gia đình.
    *   *Ví chung (Gia đình):* Cả bố và mẹ đều có thể xem số dư và ghi chép chi tiêu vào ví này (ví dụ: "Quỹ đi chợ", "Tiền tiết kiệm mua xe").
*   **Gắn thẻ người chi tiêu (Spent By Tag):**
    *   *Mô tả:* Tự động gắn thẻ ai là người tiêu tiền (Mẹ / Bố / Con cái) khi nhập giao dịch vào Ví chung.
    *   *Lợi ích:* Cuối tháng thống kê được cơ cấu chi tiêu của từng thành viên trong nhà.

### 3.4. Quản lý Hạn mức và Lập Ngân sách (Budgeting & Cashflow planning)
*   **Hạn mức linh hoạt theo nhóm danh mục (Envelopes Budgeting):**
    *   *Mô tả:* Cho phép gom nhóm nhiều danh mục lại để áp dụng hạn mức chung (Ví dụ: Nhóm *"Đi chợ" + "Ăn ngoài"* giới hạn 6,000,000đ/tháng).
*   **Cộng dồn ngân sách (Budget Rollover):**
    *   *Mô tả:* Nếu tháng này ngân sách "Mua sắm" còn dư 500,000đ, số tiền này tự động được cộng dồn vào hạn mức của tháng sau (hoặc chuyển vào quỹ tiết kiệm).
*   **Thanh tiến trình màu sắc & Dự báo thông minh (Predictive Alerts):**
    *   *Mô tả:* Dựa trên tốc độ chi tiêu hiện tại, hệ thống tính toán dự báo xem mẹ có bị vượt hạn mức vào cuối tháng hay không. Đưa ra cảnh báo thân thiện: *"Với tốc độ chi tiêu hiện tại, Quỹ đi chợ sẽ hết vào ngày 22 của tháng. Mẹ hãy cân nhắc điều chỉnh nhé!"*.

### 3.5. Tự động hóa Giao dịch định kỳ (Auto-recurring Transactions)
*   *Mô tả:* Thiết lập lịch tự động ghi nhận đối với các khoản cố định: tiền nhà (ngày 5 hàng tháng), tiền mạng (ngày 10 hàng tháng), tiền sữa cho con...
*   *Tương tác tối ưu:* Thay vì tự động trừ âm thầm, hệ thống gửi một thông báo nhắc nhở nhẹ nhàng vào buổi sáng: *"Hôm nay đến lịch thanh toán Tiền nước (150.000đ), mẹ đã thanh toán chưa?"* -> Bấm **"Đã thanh toán"** để app tự ghi chép.

---

## 4. Bản Phân Tích & Đặc Tả Chi Tiết Tính Năng Quản Lý Thực Đơn & Dinh Dưỡng (Menu & Nutrition UX Specification)

*(Đã mô tả chi tiết ở phần trước - Giữ nguyên toàn bộ nội dung)*

---

## 5. Đặc Tả Kỹ Thuật PWA (Progressive Web App Specification)

Để bản POC trên nền Web hoạt động giống như một ứng dụng di động thực thụ trên iOS/Android, cấu hình PWA phải tuân thủ các thông số sau:

### 5.1. Cấu hình Web App Manifest (`manifest.webmanifest`)
Được tạo tự động thông qua cấu hình `vite-plugin-pwa` trong `vite.config.ts`:

```typescript
{
  name: "SmartHomeMom - Chi Tiêu & Thực Đơn Gia Đình",
  short_name: "SmartHomeMom",
  description: "Ứng dụng quản lý tài chính và gợi ý thực đơn thông minh cho các mẹ nội trợ.",
  start_url: "/",
  display: "standalone", // Ẩn thanh địa chỉ và các nút của trình duyệt
  background_color: "#FFFDF9", // Màu kem pastel ấm áp chủ đạo
  theme_color: "#FF8C69", // Màu cam san hô thương hiệu
  orientation: "portrait-primary", // Khóa màn hình dọc
  icons: [
    {
      src: "pwa-192x192.png",
      sizes: "192x192",
      type: "image/png"
    },
    {
      src: "pwa-512x512.png",
      sizes: "512x512",
      type: "image/png"
    },
    {
      src: "pwa-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable" // Đảm bảo hiển thị bo góc đẹp mắt trên Android
    }
  ]
}
```

### 5.2. Service Worker & Chiến lược Cache Offline (Offline Caching)
Sử dụng Workbox (thông qua plugin PWA) với cấu hình **Network First (hoặc Stale While Revalidate)** để đảm bảo:
*   **Tải ứng dụng tức thời:** Lưu trữ toàn bộ asset tĩnh (HTML, JS, CSS, Font chữ Google Fonts) vào Cache Storage. Khi mẹ mở app, app tải trực tiếp từ máy của mẹ mà không cần đợi internet.
*   **Hoạt động ngoại tuyến (Offline Mode):**
    *   Mẹ có thể mở app để xem danh sách đi chợ, xem thực đơn tuần đã lên sẵn kể cả khi ở trong khu vực chợ truyền thống không có sóng mạng.
    *   Kích hoạt tính năng **Offline Persistence** của Firestore Web SDK để cho phép mẹ nhập thu chi ngoại tuyến. Dữ liệu sẽ được lưu tạm tại thiết bị và tự động đẩy lên Firebase Database ngay khi có kết nối mạng trở lại.

### 5.3. Tiêu chuẩn thiết kế giao diện Mobile-First cho PWA
*   **Thanh điều hướng dưới (Bottom Navigation Bar):** Thiết kế nút bấm lớn, cố định ở mép dưới màn hình (gồm các tab: Dashboard, Thực đơn, Ví, Báo cáo) thay vì menu hamburger góc trên để dễ chạm bằng ngón cái.
*   **Kích thước Touch Targets:** Tất cả các nút tương tác (chạm chọn nguyên liệu, thêm thu chi) tối thiểu đạt `48px x 48px` và khoảng cách trống giữa các nút tối thiểu `8px` để tránh chạm nhầm khi đang bận nấu nướng.
*   **Hộp thoại Hướng dẫn Cài đặt (Install Prompt Custom App):**
    *   Phát hiện sự kiện `beforeinstallprompt`.
    *   Hiển thị một Banner nhỏ tinh tế ở đầu trang: *"Thêm SmartHomeMom vào màn hình chính của điện thoại để truy cập nhanh"* kèm nút **"Cài đặt ngay"**.

---

## 6. Quy tắc bảo mật Firebase (Firestore Security Rules)

Để đảm bảo dữ liệu gia đình được cô lập tuyệt đối, chỉ thành viên trong cùng Family mới có quyền truy cập chéo. Dưới đây là tệp `firestore.rules` cấu hình sẵn cho dự án Web POC:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Hàm helper kiểm tra user đã đăng nhập chưa
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Hàm helper kiểm tra quyền truy cập vào dữ liệu gia đình
    function isFamilyMember(familyId) {
      return isSignedIn() && (
        request.auth.uid == familyId || 
        exists(/databases/$(database)/documents/families/$(familyId)) &&
        request.auth.uid in get(/databases/$(database)/documents/families/$(familyId)).data.members.map(m => m.id)
      );
    }

    // Quy tắc cho collection families
    match /families/{familyId} {
      allow create: if isSignedIn();
      allow read, update, delete: if isFamilyMember(familyId);
      
      // Quy tắc cho các collection con của family
      match /wallets/{walletId} {
        allow read, write: if isFamilyMember(familyId);
      }
      
      match /transactions/{transactionId} {
        allow read, write: if isFamilyMember(familyId);
      }
      
      match /budgets/{budgetId} {
        allow read, write: if isFamilyMember(familyId);
      }
      
      match /menus/{menuId} {
        allow read, write: if isFamilyMember(familyId);
      }
      
      match /settings/ingredients {
        allow read, write: if isFamilyMember(familyId);
      }
    }

    // Danh mục món ăn hệ thống
    match /recipes/{recipeId} {
      allow read: if isSignedIn();
      allow write: if false; 
    }
  }
}
```

---

## 7. Cấu trúc State Management (Zustand Stores)

Quản lý dữ liệu tập trung phía Client và tự động đồng bộ Firestore với các store sau:

### `authStore.ts`
```typescript
import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
```

### `familyStore.ts` (Quản lý gia đình, ví, giao dịch, và thực phẩm)
```typescript
import { create } from 'zustand';

export interface Family {
  familyId: string;
  familyName: string;
  members: any[];
  nutritionTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface Wallet {
  walletId: string;
  name: string;
  type: 'cash' | 'bank' | 'e_wallet';
  balance: number;
  colorCode: string;
  iconName: string;
}

export interface Transaction {
  transactionId: string;
  walletId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  note: string;
  date: any;
  spentBy?: string;
}

interface FamilyState {
  family: Family | null;
  wallets: Wallet[];
  transactions: Transaction[];
  availableIngredients: string[];
  setFamily: (family: Family | null) => void;
  setWallets: (wallets: Wallet[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setAvailableIngredients: (ingredients: string[]) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  family: null,
  wallets: [],
  transactions: [],
  availableIngredients: [],
  setFamily: (family) => set({ family }),
  setWallets: (wallets) => set({ wallets }),
  setTransactions: (transactions) => set({ transactions }),
  setAvailableIngredients: (ingredients) => set({ availableIngredients: ingredients }),
}));
```

---

## 8. Lộ trình phát triển POC từng bước cho AI Agent (Developer Checklist)

### Bước 1: Khởi tạo dự án Vite & Firebase Web
- [ ] Chạy lệnh tạo dự án: `npm create vite@latest smarthomemom-poc -- --template react-ts`
- [ ] Cài đặt các package cần thiết: `npm install firebase zustand react-router-dom lucide-react recharts date-fns`
- [ ] Khởi tạo Firebase Web App trong `src/firebase.ts`.
- [ ] Thiết lập định dạng CSS cơ bản với phong cách ấm áp (pastel, chữ to rõ ràng cho các mẹ nội trợ).

### Bước 2: Cấu hình PWA & Tích hợp Service Worker
- [ ] Cài đặt plugin: `npm install -D vite-plugin-pwa`
- [ ] Tạo file thiết lập cấu hình PWA trong `vite.config.ts`.
- [ ] Thiết kế và tạo các asset icon PWA (192x192, 512x512) đặt trong thư mục `public/`.
- [ ] Viết hook tự động bắt sự kiện `beforeinstallprompt` để hiển thị nút hướng dẫn cài đặt lên màn hình chính.
- [ ] Kích hoạt Firestore Offline Persistence: `enableIndexedDbPersistence(db)`.

### Bước 3: Luồng Auth & Đăng ký Gia đình
- [ ] Xây dựng các trang Đăng nhập / Đăng ký.
- [ ] Tạo trang thiết lập gia đình đầu tiên (Khai báo các thành viên gia đình để tính calo).

### Bước 4: Triển khai Module Thu chi chi tiết (Áp dụng Best Practice)
- [ ] **Màn hình Dashboard chính:** Hiển thị tổng quan các ví (chung/riêng), số dư hiện tại và danh sách giao dịch gần nhất.
- [ ] **Modal Thêm Giao dịch thông minh:**
  - [ ] Thiết kế **Bàn phím Tính toán số học** ngay trên form nhập số tiền.
  - [ ] Áp dụng các **Smart Defaults** (Mặc định chi tiêu, ngày hôm nay, ví mặc định).
  - [ ] Tích hợp bộ lọc danh mục thông minh gợi ý theo múi giờ sinh hoạt của các mẹ nội trợ.
  - [ ] Thêm chức năng chọn thẻ thành viên (`spentBy`) khi chi tiêu thuộc Ví chung gia đình.
- [ ] **Xử lý Firestore Transaction:** Khi lưu giao dịch, thực hiện cập nhật an toàn số dư ví đích.

### Bước 5: Hạn mức & Biểu đồ thống kê
- [ ] Tạo giao diện thiết lập "Hạn mức chi tiêu" (Budget) cho từng danh mục hoặc nhóm danh mục.
- [ ] Viết hàm tính toán dự đoán chi tiêu để hiển thị cảnh báo thông minh nếu tốc độ tiêu tiền quá nhanh.
- [ ] Tích hợp biểu đồ tròn của `recharts` phân tích cơ cấu chi tiêu.

### Bước 6: Lập Thực đơn Dinh dưỡng & Tích hợp Gemini (UX Tối ưu)
- [ ] **Màn hình "Tủ thực phẩm địa phương":** Thiết kế giao diện Tab chia ngăn với các nút bật/tắt nguyên liệu có hình ảnh minh họa sống động.
- [ ] **Màn hình Lịch tuần thực đơn (Weekly Board):** Thiết kế dạng cột/thanh trượt ngày, hiển thị các bữa Sáng-Trưa-Tối và thanh trạng thái dinh dưỡng (Calorie Status Bar).
- [ ] **Tích hợp Gemini AI Recommender:**
  - [ ] Viết hàm gửi prompt chi tiết lọc nguyên liệu địa phương, tính toán calo và tránh lặp món.
  - [ ] Triển khai tính năng **"Đổi món nhanh" (Shuffle)** gửi prompt thay thế cho riêng một bữa ăn cụ thể.
- [ ] **Giao diện Danh sách đi chợ (Smart Shopping List):**
  - [ ] Tự động gom nhóm nguyên liệu cần mua của tuần.
  - [ ] Phân chia danh mục theo Sạp hàng (Thịt, Cá, Rau củ, Tạp hóa) để tối ưu thao tác đi chợ thực tế.
  - [ ] Nút ẩn nguyên liệu có sẵn tại nhà.

---

# Kế hoạch bổ sung: Tính năng Pull-to-Refresh (Kéo để làm mới)

## Mô tả tính năng
Tích hợp khả năng kéo từ trên xuống (Pull-to-Refresh) cho các màn hình danh sách chính (Dashboard và Thực đơn) để mang lại trải nghiệm giống như ứng dụng di động bản địa (Native Mobile App). 

## Đề xuất Giải pháp Kỹ thuật
Chúng tôi sẽ xây dựng một component dùng chung là `PullToRefresh` nằm trong thư mục `src/components/PullToRefresh.tsx`. Component này sẽ lắng nghe các sự kiện chạm (`onTouchStart`, `onTouchMove`, `onTouchEnd`) trên thiết bị di động (hoặc chuột trên máy tính) và áp dụng các hiệu ứng chuyển động mượt mà.

### 1. Thành phần mới [NEW] `PullToRefresh.tsx`
Tạo tệp [PullToRefresh.tsx](file:///c:/XProjects/smarthomemom/src/components/PullToRefresh.tsx):
- Nhận prop `onRefresh: () => Promise<void>` và `children: React.ReactNode`.
- Đo lường khoảng cách kéo xuống (`pullDistance`). Áp dụng lực cản (resistance factor ~ `0.4`) để cảm giác kéo tự nhiên.
- Chỉ kích hoạt kéo khi vùng chứa đang cuộn ở vị trí trên cùng (`scrollTop === 0`).
- Hiển thị spinner xoay ở đầu trang. Khi kéo đủ khoảng cách vượt ngưỡng (> `60px`) và thả tay, spinner sẽ kích hoạt trạng thái xoay liên tục và gọi hàm `onRefresh`.
- Sau khi `onRefresh` hoàn tất, thu gọn khoảng cách kéo về `0` bằng CSS transition mượt mà.

### 2. Tích hợp vào các màn hình danh sách
- **DashboardPage**: Bọc nội dung Dashboard bằng `PullToRefresh`. Hành động làm mới sẽ kích hoạt làm mới nhanh các subscription của Firestore và giả lập tải dữ liệu trong 1 giây để cập nhật số dư/giao dịch mới nhất.
- **MenuPage**: Bọc nội dung bằng `PullToRefresh`. Hành động làm mới sẽ lấy lại thực đơn từ Firestore và tải lại dữ liệu dinh dưỡng.

## Kế hoạch Xác minh (Verification Plan)
- **Kiểm thử thủ công trên thiết bị di động / Chế độ mô phỏng thiết bị di động của trình duyệt (Chrome DevTools):**
  - Cuộn xuống cuối danh sách -> Kéo xuống -> Không được kích hoạt Pull-to-Refresh.
  - Cuộn lên đầu danh sách -> Kéo xuống -> Hiển thị vòng xoay spinner và cảm nhận được lực cản nhẹ.
  - Kéo chưa đủ ngưỡng (< 60px) và thả ra -> Vùng chứa tự động co lại bình thường, không kích hoạt tải.
  - Kéo vượt ngưỡng (> 60px) và thả ra -> Spinner quay liên tục, dữ liệu được tải lại, sau khi thành công thì spinner biến mất và danh sách cập nhật.

---

# Kế hoạch bổ sung: Hoàn thiện Quy trình Onboarding & Màn hình Cấu hình (Settings)

## Mô tả tính năng
Hiện tại ứng dụng chỉ hỗ trợ thiết lập thành viên khi onboarding, các thiết lập về Ví, Hạn mức, và Ví mặc định được tự động điền sẵn ngầm một cách cố định và chưa có giao diện thay đổi.
Chúng tôi đề xuất:
1. **Mở rộng Onboarding thành 3 bước:**
   - **Bước 1 (Thành viên):** Khai báo các thành viên gia đình (giữ nguyên).
   - **Bước 2 (Ví tiền & Ví mặc định):** Thiết lập số dư ban đầu cho các ví (Tiền mặt, Thẻ ngân hàng...) và chọn Ví mặc định khi ghi chép.
   - **Bước 3 (Hạn mức/Ngân sách tháng):** Thiết lập hạn mức chi tiêu cho các danh mục phổ biến như "Đi chợ / Ăn uống", "Hóa đơn / Sinh hoạt", v.v.
2. **Thêm tab Cài đặt (Settings):** Cho phép người dùng chỉnh sửa tất cả các cấu hình này bất cứ lúc nào khi đang sử dụng ứng dụng.

## Đề xuất Giải pháp Kỹ thuật

### 1. Thay đổi cấu trúc dữ liệu (`src/types/index.ts`)
- Thêm trường `defaultWalletId?: string` vào interface `Family` để lưu vết ví được chọn mặc định.

### 2. Bổ sung các hàm cơ sở dữ liệu (`src/stores/familyStore.ts`)
- Thêm `deleteWallet(familyId: string, walletId: string): Promise<void>` để xóa ví.
- Thêm `deleteBudget(familyId: string, budgetId: string): Promise<void>` để xóa hạn mức.

### 3. Cải tiến trang Onboarding (`src/features/auth/OnboardingPage.tsx`)
- Chia giao diện thành state `step` (1, 2, 3).
- **Step 1:** Cấu hình thành viên gia đình.
- **Step 2:**
  - Hiển thị danh sách ví mẫu (Tiền mặt, Tài khoản ngân hàng) kèm input nhập số dư.
  - Hỗ trợ thêm ví mới.
  - Chọn một ví làm "Ví mặc định".
- **Step 3:**
  - Hiển thị các danh mục chi tiêu kèm ô nhập hạn mức đề xuất (Ví dụ: Đi chợ: 5.000.000đ).
  - Người dùng có thể tích chọn bật/tắt hạn mức cho từng danh mục.
- Khi hoàn tất, ghi đồng thời dữ liệu gia đình, danh sách ví và danh sách hạn mức lên Firestore.

### 4. Xây dựng màn hình Cài đặt mới [NEW] `SettingsPage.tsx`
Tạo tệp [SettingsPage.tsx](file:///c:/XProjects/smarthomemom/src/features/settings/SettingsPage.tsx) với các phân hệ chỉnh sửa trực quan:
- **Thông tin Gia đình & Thành viên:** Cho phép thay đổi tên gia đình, thêm thành viên mới, sửa tuổi/mức độ vận động, hoặc xóa thành viên. Hệ thống tự động tính lại nhu cầu Calorie tổng của gia đình và lưu lên Firestore.
- **Quản lý Ví:** Liệt kê các ví hiện tại. Hỗ trợ tạo ví mới, đổi tên ví, sửa số dư ví, xóa ví (cảnh báo trước), và thiết lập lại Ví mặc định.
- **Quản lý Hạn mức:** Liệt kê hạn mức hiện tại. Cho phép thêm hạn mức cho các danh mục chưa có, chỉnh sửa số tiền hạn mức, hoặc xóa hạn mức.

### 5. Cập nhật thanh điều hướng và chọn ví mặc định
- **App.tsx:** Thêm tab thứ 4 "Cài đặt" ở thanh điều hướng dưới. Tích hợp hiển thị `SettingsPage` khi tab hoạt động.
- **TransactionModal.tsx:** Đọc `family.defaultWalletId` để tự động chọn ví mặc định này khi mở modal thêm giao dịch.

## Kế hoạch Xác minh (Verification Plan)
- **Luồng Onboarding:** Đăng ký tài khoản mới -> Đi qua 3 bước onboarding -> Xác minh dữ liệu được ghi chính xác lên Firestore (tài liệu gia đình, collection con `wallets`, `budgets`).
- **Màn hình Settings:** 
  - Thêm thành viên -> Số Calo đề xuất trên Thực đơn tự động cập nhật.
  - Thêm ví mới -> Vào tab Dashboard xem ví mới có xuất hiện trong danh sách và số dư tổng có tăng không.
  - Chọn ví mặc định trong Settings -> Mở modal ghi chép chi tiêu xem ví đó có được chọn sẵn không.
  - Chỉnh sửa/Xóa ví và hạn mức -> Xác minh các thay đổi cập nhật tức thời trên giao diện.

---

# Kế hoạch bổ sung: Nâng cấp Toàn diện Quản lý Thu chi & Thực đơn (Tìm kiếm, Yêu thích, Điều chỉnh Số dư, Cấu hình mở rộng)

## 1. Mục tiêu và các Tính năng bổ sung
Dựa trên yêu cầu mở rộng, chúng tôi sẽ triển khai các chức năng sau:
- **Điều chỉnh số dư ví thực tế:** Nhập số tiền hiện tại, tự động tính chênh lệch và tạo giao dịch điều chỉnh bù trừ.
- **Tìm kiếm & Bộ lọc giao dịch:** Tìm kiếm giao dịch trên Dashboard theo từ khóa (ghi chú, danh mục), lọc theo khoảng thời gian (ngày, tuần, tháng).
- **Tính năng Thực đơn Nâng cao (MenuPage):**
  - Đánh dấu lưu trữ Thực đơn yêu thích (Favorite Menus).
  - Áp dụng thực đơn yêu thích vào ngày được chọn bất kỳ.
  - Thêm thủ công món ăn nấu hôm đó (bữa sáng, trưa, tối).
- **Mở rộng Cấu hình (SettingsPage):**
  - Cho phép tự tạo/xóa Danh mục chi tiêu tùy chỉnh (Custom Categories).
  - Cho phép tự thêm nguyên liệu mới vào danh sách tổng (Master Ingredients).

## 2. Thiết kế Cơ sở Dữ liệu & Types (`src/types/index.ts`)
- **interface `CustomCategory`**: `{ id, name, type, iconName, color }`
- **interface `CustomIngredient`**: `{ id, name, category }`
- **interface `FavoriteMenu`**: `{ favMenuId, name, meals: { breakfast, lunch, dinner } }`

## 3. Cập nhật Zustand Store (`src/stores/familyStore.ts`)
Bổ sung các hàm đăng ký thời gian thực (Realtime Subscription) và hành động (Actions):
- `subscribeCustomCategories`, `addCustomCategory`, `deleteCustomCategory`
- `subscribeCustomIngredients`, `addCustomIngredient`, `deleteCustomIngredient`
- `subscribeFavoriteMenus`, `saveFavoriteMenu`, `deleteFavoriteMenu`

## 4. Chi tiết triển khai code

### 4.1. Điều chỉnh Số dư thực tế (SettingsPage)
- Trong phần sửa Ví, thêm nút "Cân đối số dư".
- Khi bấm Lưu:
  - `const diff = actualAmount - currentBalance;`
  - Tạo giao dịch tự động: `type` (nếu `diff > 0` là `income`, ngược lại `expense`), `amount: Math.abs(diff)`, `category: 'Điều chỉnh số dư'`, `note: 'Điều chỉnh số dư ví thực tế'`.
  - Gọi `createTransaction` để cập nhật đồng bộ Firestore.

### 4.2. Tìm kiếm Giao dịch (DashboardPage)
- Thêm thanh tìm kiếm input và dropdown chọn loại thời gian (Tất cả, Hôm nay, Tuần này, Tháng này) ở ngay đầu danh sách lịch sử.
- Lọc danh sách giao dịch dựa trên từ khóa tìm kiếm (`note` hoặc `category`).

### 4.3. Quản lý Danh mục & Nguyên liệu Tùy biến (SettingsPage - Tab mới)
- Thêm tab "Danh mục & Nguyên liệu" trong Settings.
- **Danh mục:** Cho phép chọn Tên, Loại (Thu/Chi), Icon (từ danh sách Icon có sẵn), Màu sắc và thêm mới. Cho phép xóa danh mục tự tạo.
- **Nguyên liệu:** Cho phép thêm tên nguyên liệu tùy chọn (ví dụ: "Rau đay", "Cá quả") vào nhóm tương ứng (Thịt, Cá, Rau...). Nguyên liệu mới sẽ hiển thị tại Tủ chợ và gửi lên Gemini prompt.

### 4.4. Thêm món thủ công & Lưu thực đơn yêu thích (MenuPage)
- **Thêm món thủ công:** Thêm nút "+ Món thủ công" dưới mỗi bữa ăn. Cho phép nhập Tên món, Calorie và Chi phí ước tính.
- **Lưu yêu thích:** Thêm nút trái tim "Lưu yêu thích" cho thực đơn ngày đang chọn. Lưu vào collection `/favorite_menus`.
- **Tab Yêu thích:** Thêm tab phụ "Yêu thích" liệt kê các thực đơn đã lưu. Có nút "Áp dụng vào ngày hôm nay" để sao chép đè dữ liệu bữa ăn.

## 5. Kế hoạch Xác minh (Verification Plan)
- **Xác minh số dư:** Thực hiện cân đối ví Tiền mặt từ 3M -> 2.5M. Xem Dashboard số dư có giảm và có giao dịch đặc biệt "-500.000đ" không.
- **Xác minh tìm kiếm:** Gõ "thịt" hoặc chọn lọc "Tháng này" xem danh sách có thu gọn chính xác.
- **Xác minh thực đơn:** Thêm món "Rau đay luộc" thủ công vào bữa tối -> Kiểm tra Shopping List có cập nhật nguyên liệu. Lưu yêu thích -> Áp dụng sang ngày khác xem có hoạt động.



