export function HelpSection() {
  const sections = [
    {
      emoji: '💰', title: 'Ghi Thu Chi', color: '#FF8C69',
      items: [
        'Nhấn nút + ở giữa thanh điều hướng để thêm giao dịch mới',
        'Chọn loại: Chi tiêu, Thu nhập hoặc Chuyển khoản giữa ví',
        'Tab "Thu Chi" hiển thị lịch sử, số dư từng ví và tình trạng hạn mức',
      ]
    },
    {
      emoji: '🍽️', title: 'Lên Thực Đơn', color: '#06D6A0',
      items: [
        'Tab "Thực Đơn" → nhấn "Tạo thực đơn tuần" để AI gợi ý bữa ăn phù hợp',
        'Giao diện hiển thị thực đơn theo ngày: Sáng, Trưa, Tối',
        'Nhấn vào bữa để xem nguyên liệu chi tiết và calo',
      ]
    },
    {
      emoji: '🛒', title: 'Lịch Đi Chợ', color: '#4EA8DE',
      items: [
        'Trong tab Thực Đơn, chuyển sang tab "Lịch đi chợ"',
        'Hệ thống tổng hợp nguyên liệu theo tuần và nhóm theo khu vực chợ',
        'Nhấn tick vào từng mục đã mua, nhấn "Xóa đã mua" để dọn danh sách',
      ]
    },
    {
      emoji: '💳', title: 'Quản lý Ví Tiền', color: '#8338EC',
      items: [
        'Vào Cài đặt → Quản lý Ví để thêm ví tiền mặt, tài khoản ngân hàng, ví MoMo...',
        'Nhấn "Cân đối" để điều chỉnh số dư thực tế của ví khi có sai lệch',
        'Ví lưu trữ không tính vào tổng số dư — dùng để theo dõi tiền tiết kiệm',
      ]
    },
    {
      emoji: '🎯', title: 'Hạn Mức Chi Tiêu', color: '#F15BB5',
      items: [
        'Vào Cài đặt → Quản lý Hạn mức để thiết lập ngân sách theo danh mục',
        'Dashboard hiển thị % đã chi so với hạn mức theo từng danh mục',
        'Hệ thống sẽ cảnh báo khi chi tiêu vượt 80% ngưỡng đặt ra',
      ]
    },
    {
      emoji: '👨‍👩‍👧', title: 'Gia Đình & Thành Viên', color: '#F77F00',
      items: [
        'Thêm các thành viên trong gia đình để tính toán calo và dinh dưỡng chính xác hơn',
        'Mỗi thành viên có thể liên kết với tài khoản riêng qua tính năng chia sẻ nhóm',
        'Nhập mã nhóm gia đình để nhiều điện thoại cùng quản lý chung một ngân sách',
      ]
    },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sections.map((section) => (
        <div key={section.title} className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              backgroundColor: `${section.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px'
            }}>
              {section.emoji}
            </div>
            <span style={{ fontWeight: 700, fontSize: '15px', color: section.color }}>{section.title}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {section.items.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                  backgroundColor: `${section.color}20`, color: section.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 800
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
