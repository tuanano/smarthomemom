# SmartHomeMom Execution Tasks

Theo dõi tiến độ triển khai POC ứng dụng Quản lý chi tiêu và Thực đơn Gia đình (ReactJS + Firebase + PWA).

## Danh sách công việc

- [x] **Giai đoạn 1: Khởi tạo & Cấu hình PWA**
  - [x] Khởi tạo dự án Vite (React + TypeScript) tại `C:\XProjects\smarthomemom`
  - [x] Cài đặt các package cần thiết (`firebase`, `zustand`, `lucide-react`, `recharts`, `date-fns`, `vite-plugin-pwa`)
  - [x] Cấu hình `vite.config.ts` để tích hợp PWA Manifest & Service Worker
  - [x] Tạo cấu trúc thư mục feature-first (`app`, `core`, `features`, `styles`)
  - [x] Thiết lập các biến CSS biến đổi giao diện ấm áp (coral/cream pastel) và layout mobile-first

- [x] **Giai đoạn 2: Cấu hình Firebase & Đăng nhập**
  - [x] Tạo tệp cấu hình Firebase Web SDK (`src/firebase.ts`)
  - [x] Thiết lập Offline Persistence cho Firestore
  - [x] Xây dựng màn hình Đăng ký / Đăng nhập
  - [x] Xây dựng màn hình Onboarding khai báo thành viên và tự động tính toán nhu cầu Calo (TDEE)

- [x] **Giai đoạn 3: Phân hệ Quản lý Thu chi & Ví**
  - [x] Xây dựng Dashboard chính hiển thị số dư ví, danh sách chi tiêu hôm nay
  - [x] Thiết kế form/popup thêm giao dịch với **Bàn phím Tính toán (Smart Keypad)** tích hợp
  - [x] Viết logic Firestore Transaction để tự động cập nhật số dư ví khi thu/chi
  - [x] Triển khai Quản lý hạn mức (Budget) và thanh đo trạng thái/cảnh báo trực quan
  - [x] Tạo biểu đồ phân tích chi tiêu theo tháng và so sánh Thu - Chi bằng `recharts`

- [x] **Giai đoạn 4: Phân hệ Lên Thực đơn & Gemini AI**
  - [x] Màn hình "Tủ nguyên liệu" (Chợ nhà tôi) cho phép tick chọn nguyên liệu khả dụng
  - [x] Màn hình Lịch thực đơn tuần (Weekly Board) kèm thanh dinh dưỡng Calorie
  - [x] Tích hợp API Gemini gợi ý thực đơn tuần từ nguyên liệu khả dụng và lượng calo mục tiêu
  - [x] Tích hợp chức năng Đổi món (Shuffle) cho bữa ăn đơn lẻ sử dụng Gemini
  - [x] Thiết kế Danh sách đi chợ tự động gom nhóm theo sạp hàng và lọc nguyên liệu sẵn có

- [x] **Giai đoạn 5: Hoàn thiện PWA & Tối ưu hóa**
  - [x] Viết Service Worker cache asset và hiển thị Banner cài đặt ứng dụng (Install Prompt banner)
  - [x] Chạy build production và kiểm tra hiệu năng bằng Lighthouse

- [x] **Giai đoạn 6: Tính năng Pull-to-Refresh (Kéo để làm mới)**
  - [x] Xây dựng component `PullToRefresh` hỗ trợ touch events và hiển thị spinner
  - [x] Tích hợp `PullToRefresh` vào DashboardPage, MenuPage và LocalPantry
  - [x] Triển khai logic làm mới dữ liệu thật/giả lập tương ứng cho từng trang
  - [x] Kiểm thử và xác minh tính đúng đắn trên môi trường mô phỏng di động

- [x] **Giai đoạn 7: Quy trình Onboarding mở rộng & Màn hình Cài đặt**
  - [x] Cập nhật cấu trúc types (`src/types/index.ts`) thêm defaultWalletId
  - [x] Bổ sung hàm xóa ví/ngân sách trong `src/stores/familyStore.ts`
  - [x] Thiết kế lại giao diện Onboarding thành 3 bước đầy đủ thông tin ví và hạn mức
  - [x] Xây dựng màn hình Cài đặt `SettingsPage.tsx` mới
  - [x] Tích hợp tab Cài đặt vào `App.tsx` và cấu hình Ví mặc định trong `TransactionModal.tsx`
  - [x] Kiểm thử luồng onboarding mới và xác minh hoạt động của các tính năng cấu hình

- [x] **Giai đoạn 8: Nâng cấp Toàn diện Thu chi & Thực đơn**
  - [x] Thêm các interface types cho CustomCategory, CustomIngredient và FavoriteMenu
  - [x] Bổ sung realtime subscriptions và actions trong `familyStore.ts`
  - [x] Tích hợp logic và UI Cân đối số dư ví tự động bù trừ giao dịch
  - [x] Thêm bộ lọc tìm kiếm và ngày tháng vào Lịch sử giao dịch của DashboardPage
  - [x] Nâng cấp SettingsPage để cho phép tự thêm/xóa danh mục và nguyên liệu
  - [x] Cập nhật MenuPage hỗ trợ thêm món thủ công và lưu/áp dụng thực đơn yêu thích
  - [x] Chạy build xác minh toàn bộ ứng dụng hoạt động ổn định

- [x] **Giai đoạn 9: Thiết kế lại Cài đặt & Quản lý Danh mục/Nguyên liệu**
  - [x] Thiết lập khung điều hướng dạng danh sách menu chuyển trang (sub-pages) trong `SettingsPage.tsx`
  - [x] Xây dựng Sub-page: Gia đình & Thành viên
  - [x] Xây dựng Sub-page: Quản lý Ví tiền (bao gồm chức năng Cân đối & Sửa/Xóa ví)
  - [x] Xây dựng Sub-page: Quản lý Hạn mức chi tiêu
  - [x] Xây dựng Sub-page: Quản lý Danh mục chi tiêu (thêm mới, hiển thị, sửa/xóa danh mục tùy chỉnh)
  - [x] Xây dựng Sub-page: Quản lý Danh mục nguyên liệu (phân nhóm theo loại, thêm mới, sửa/xóa nguyên liệu tùy chỉnh)
  - [x] Xây dựng Sub-page: Thông tin tài khoản
  - [x] Refactor lưu trữ và quản lý danh mục/nguyên liệu riêng biệt theo từng gia đình (loại bỏ hoàn toàn hardcode)
  - [x] Chạy build và xác minh biên dịch thành công

- [x] **Giai đoạn 10: Chi tiết & Cập nhật Giao dịch**
  - [x] Thiết lập hàm cập nhật giao dịch (`updateTransaction`) trong `familyStore.ts` chạy transaction Firestore cập nhật số dư ví an toàn
  - [x] Cập nhật giao diện `TransactionModal.tsx` hỗ trợ 2 chế độ (Tạo mới & Xem chi tiết/Sửa)
  - [x] Thêm nút Xóa (Delete) giao dịch trong modal chi tiết
  - [x] Gắn sự kiện nhấp chọn (Click) vào danh sách giao dịch ở `DashboardPage.tsx` để xem chi tiết
  - [x] Chạy build biên dịch thành công 100%

