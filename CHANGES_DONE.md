# Các phần đã hoàn thiện

## Frontend
- Sửa lỗi TypeScript trong `roomStore.fetchTrendingRooms`.
- Tạo lại landing page gọn, đúng mục đích web nghe nhạc live thay vì mockup dashboard tĩnh.
- Thêm route `/room` để sidebar không bị dẫn tới trang 404 khi chưa có phòng đang mở.
- Sửa fallback Socket.IO URL: mặc định dùng `NEXT_PUBLIC_WS_URL`, sau đó `NEXT_PUBLIC_API_URL`, cuối cùng `http://localhost:5000`.
- Đồng bộ thêm CSS cho trang `/room` fallback.
- Kiểm tra TypeScript: `npx tsc --noEmit` chạy pass.
- Kiểm tra ESLint: không còn lỗi, chỉ còn warning tối ưu ảnh `<img>`.

## Backend
- Kiểm tra syntax toàn bộ file JS backend bằng `node --check`: pass.
- Thêm `.env.example` backend an toàn, không chứa secret thật.
- Giữ nguyên cấu trúc API chính: auth, rooms, songs, playlists, users, messages, lyrics, admin.

## Dọn dẹp
- Loại bỏ thư mục build/cache/dependency nặng: `node_modules`, `.next`, logs.
- Xóa file test tạm và tài liệu phân tích cũ không cần thiết.
- Xóa file `.env` thật và `.env.local` để tránh lộ secret/API key trong gói gửi lại.

## Cách chạy
```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Lưu ý: trong môi trường kiểm tra này không build Next production được vì package SWC Linux không có sẵn trong node_modules cũ từ Windows và không thể tải registry. TypeScript và syntax backend đã được kiểm tra thành công.
