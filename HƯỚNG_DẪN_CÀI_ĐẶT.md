# 📱 HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG NHÀ MÁY NGỌC SƠN THANH HÓA TRÊN ANDROID

Ứng dụng **Nhà máy Ngọc Sơn Thanh Hóa** đã được chuyển thành **PWA (Progressive Web App)** hoạt động **hoàn toàn OFFLINE** - không cần mạng để sử dụng, dữ liệu JSON xuất bình thường.

---

## ✅ CÁC BƯỚC CÀI ĐẶT TRÊN ĐIỆN THOẠI ANDROID

### Bước 1: Copy toàn bộ thư mục lên điện thoại

Copy toàn bộ thư mục dự án này sang điện thoại Android qua:
- Cáp USB (chế độ truyền file MTP)
- Zalo/Email/Google Drive rồi tải về
- Bluetooth

> ⚠️ **QUAN TRỌNG:** Phải chuyển **TOÀN BỘ thư mục** gồm các file/subfolder:
> - `index.html`
> - `styles.css`
> - `js/` (14 module logic — xem cấu trúc bên dưới)
> - `firebase-config.js`
> - `manifest.json`
> - `sw.js`
> - `vendor/` (thư viện offline)
> - `fonts/` (font offline)
> - `icons/` (icon ứng dụng)
> - `bamboo_data.json`, `Backup_BambooTracker_*.json` (dữ liệu hiện có)

### Bước 2: Mở file index.html bằng Chrome

1. Dùng ứng dụng **File Manager** (Quản lý tệp) tìm file `index.html`
2. Chạm vào file → chọn **Chrome** (hoặc trình duyệt hỗ trợ PWA)

### Bước 3: Cài đặt ứng dụng (Thêm vào Màn hình chính)

| Cách 1 - Trình đơn Chrome | Cách 2 - Nút cài đặt |
|---|---|
| 1. Mở ứng dụng trong Chrome<br>2. Chạm vào biểu tượng **⋮** (3 chấm) góc trên phải<br>3. Chọn **"Thêm vào màn hình chính"**<br>4. Xác nhận → App xuất hiện trên màn hình chính | 1. Chrome sẽ hiện banner **"Cài đặt ứng dụng"**<br>2. Chạm **"Cài đặt"**<br>3. App xuất hiện trên màn hình chính |

### Bước 4: Sử dụng như App thật

Sau khi cài đặt, app sẽ:
- ✅ Hiển thị icon riêng trên màn hình chính
- ✅ Mở toàn màn hình (không có thanh địa chỉ Chrome)
- ✅ **Hoạt động 100% OFFLINE** - không cần mạng
- ✅ Dữ liệu lưu tự động vào bộ nhớ điện thoại
- ✅ Xuất file JSON / Excel bình thường

---

## 📤 XUẤT DỮ LIỆU JSON TRÊN ANDROID

Khi cần xuất dữ liệu JSON:
1. Mở app → chạm **⋮** (menu) góc trên
2. Chọn **"Sao Lưu Dữ Liệu (JSON)"** hoặc **"Lưu Dữ Liệu Cục Bộ (Máy)"**
3. Trên Android sẽ hiện **hộp thoại chia sẻ** → chọn:
   - 📁 **File Manager** → lưu vào thư mục Download
   - ☁️ **Google Drive** → lưu cloud
   - 💬 **Zalo** → gửi cho người khác
4. File JSON xuất ra đúng định dạng source như trước

---

## 📥 NHẬP / PHỤC HỒI DỮ LIỆU

1. Chạm **⋮** → **"Phục Hồi Dữ Liệu (JSON)"** hoặc **"Nạp File Đã Lưu"**
2. Chọn file `.json` từ điện thoại
3. Dữ liệu sẽ được nạp vào ứng dụng

---

## 🔄 ĐỒNG BỘ DỮ LIỆU GIỮA CÁC MÁY

App hỗ trợ mã đồng bộ nhanh:
1. Chạm **⋮** → **"Chia Sẻ & Đồng Bộ Dữ Liệu"**
2. **Sao chép mã đồng bộ** → gửi qua Zalo/Email
3. Máy khác mở app → dán mã → **"Cập Nhật & Đồng Bộ Dữ Liệu Ngay"**

---

## 💡 LƯU Ý

- **Lần đầu mở cần có mạng** trong vài giây để Chrome nhận diện là PWA (tải manifest + icon)
- Sau khi đã cài đặt và mở 1 lần, app **không bao giờ cần mạng lại**
- Nếu thay đổi code, hãy xóa app cũ và cài lại hoặc hard-refresh (Ctrl+Shift+R trên desktop / xóa cache Chrome)
- Tài khoản mặc định: `admin` / `admin123` — thêm sẵn: `quanly1` / `123456` (Ban Quản Lý), `editor1` / `123456` (Editor)

---

## 👥 PHÂN QUYỀN & DASHBOARD MỚI (v4.1)

### Dashboard là màn hình mặc định
Mở app sẽ vào thẳng **Dashboard Tổng Quan** gồm:
1. **Phân bổ khối lượng theo công đoạn** (Sấy 1 → Sấy 2 → Kho → Bào Tinh)
2. **VÙNG CƠ BẢN** — biểu đồ chung của tất cả các tab, **mọi người đều xem được**
4. **VÙNG NÂNG CAO** 🔒 — phân tích chuyên sâu, **chỉ Admin & Ban Quản Lý** (hoặc người được cấp riêng) xem được; người khác thấy thẻ khóa

### Bốn vai trò
| Vai trò | Xem vùng cơ bản | Xem vùng nâng cao | Chỉnh sửa |
|---|---|---|---|
| **Admin** (Quản Trị) | ✅ | ✅ | Mọi tab + quản lý người dùng |
| **Manager** (Ban Quản Lý) | ✅ | ✅ | Theo tab được chỉ định |
| **Editor** (Người Chỉnh Sửa) | ✅ | ❌ | Theo tab được chỉ định |
| **Viewer / Khách** | ✅ | ❌ | Không |

Admin cấu hình **"tab được phép chỉnh sửa"** (Công Đoạn / Kế Hoạch / Ép Ván / Dashboard-biểu đồ) và quyền **xem Vùng Nâng Cao** cho từng người trong **Quản Lý Người Dùng** (nút 👥 trên header) → bấm icon ⚙️ cạnh từng người.

### Biểu đồ theo vùng & theo tab
- Mỗi tab (Kanban / Kế Hoạch / Ép Ván) có **vùng "Phân Tích & Biểu Đồ" riêng** ở cuối tab — tạo mới/sửa biểu đồ ngay tại đó
- Khi tạo/sửa biểu đồ chọn được: **Nguồn dữ liệu** (tab nào), **Vùng hiển thị** (Cơ bản/Nâng cao), **Độ rộng thẻ**
- Kéo thả để sắp xếp biểu đồ, kéo phải để mở rộng thẻ

### Thêm tab mới trong tương lai
Khai báo 1 dòng trong `APP_TABS` (file `js/permissions.js`) + schema dữ liệu trong `BUILDER_SCHEMA` (file `js/dashboard.js`) — Dashboard và bảng phân quyền **tự nhận tab mới**.

---

## 🔒 BẢO MẬT DỮ LIỆU

- Toàn bộ dữ liệu lưu **cục bộ trong bộ nhớ điện thoại** - không gửi lên bất kỳ server nào
- Dữ liệu lưu dưới dạng JSON trong localStorage & IndexedDB của Chrome
- Khi xóa app khỏi điện thoại → dữ liệu cũng bị xóa. Nên thường xuyên **Sao Lưu JSON**!

---

## 🖥️ CHẠY TRÊN DESKTOP

### Cách 1: Chạy server tự động (RECOMMENDED)
1. **Dubble-chạm** file `chay_app.bat`
2. Trình duyệt tự mở `http://localhost:8080`
3. Để dừng server: đóng cua so BAT

### Cách 2: Chạy server bằng PowerShell
```
powershell -ExecutionPolicy Bypass -File server.ps1
```
Rồi mở `http://localhost:8080`

### Cách 3: Mở trực tiếp (không server)
- Mở `index.html` bằng Chrome/Edge
- ⚠️ **Service Worker không hoạt** trên file:// - PWA install prompt không xuất hiện
- Dùng này chỉ cho test nhanh, không cho cài đặt PWA

---

## 📡 CHẠY SERVER & CÀI ĐẶT TRÊN ĐIỆN THOẠI (VIA WIFI)

1. Chạy `chay_app.bat` trên máy tính
2. Tìm IP máy tính: `ipconfig` → IPv4 Address (VD: 192.168.1.100)
3. Trên điện thoại Android (cùng WiFi):
   - Mở Chrome → địать `http://192.168.1.100:8080`
   - Chrome sẽ hiện banner **"Cài đặt ứng dụng"** → chạm **Cài đặt**
4. App xuất hiện trên màn hình chính điện thoại

> 💡 **Lần đầu mở cần mạng** để Chrome nhận diện PWA. Sau đó app hoạt **100% OFFLINE**.

---

## 📁 CẤU TRÚC FILE DỰ ÁN

```
📁 Nhà máy Ngọc Sơn Thanh Hóa/
├── index.html          ← Ứng dụng chính (nạp <script type="module" src="js/main.js">)
├── styles.css          ← Style
├── js/                 ← ⭐ Logic ứng dụng (ES Modules)
│   ├── main.js         ← Điểm vào: boot, điều hướng tab, renderAll, window.app API
│   ├── state.js        ← State toàn cục + storage keys + cấu hình mặc định
│   ├── storage.js      ← localStorage / lưu dữ liệu ra file / JSON backup-restore
│   ├── auth.js         ← Phiên đăng nhập, đăng ký, quản trị người dùng & phân quyền
│   ├── cloud.js        ← Firebase Auth/Firestore sync + Share modal + Service Worker
│   ├── utils.js        ← Hàm tiện ích: ngày/tuần, thể tích, validate, toast
│   ├── lunar.js        ← Âm lịch Việt Nam (thuật toán Hồ Ngọc Đức)
│   ├── events.js       ← Toàn bộ wiring sự kiện UI + undo/hoàn tác
│   ├── kanban.js       ← Bảng công đoạn (Kanban) + bộ lọc từng cột
│   ├── dashboard.js    ← Tổng quan: biểu đồ, % hiển thị, kéo thả sắp xếp
│   ├── batch-modals.js ← Modal thêm/sửa lô, chuyển lô, chuyển nhiều lô
│   ├── export-xlsx.js  ← Xuất Excel tùy chỉnh + builder cấu hình
│   ├── planning.js     ← Kế hoạch sản xuất: định mức, ma trận 52 tuần, giả định
│   └── press.js        ← Sản lượng ép ván: nhập liệu, tính thành phẩm
├── tests/smoke.mjs     ← Kiểm thử khởi động headless: `node tests/smoke.mjs`
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker (offline, cache v11 trọn bộ js/)
├── chay_app.bat        ← ⭐ Chạy server (Windows)
├── server.ps1          ← Server PowerShell
├── firebase-config.js  ← Cấu hình Firebase (chế độ online)
├── HƯỚNG_DẪN_CÀI_ĐẶT.md ← Hướng dẫn này
├── vendor/             ← Thư viện offline (Chart.js, Lucide, XLSX)
├── fonts/              ← Font offline (Inter, JetBrains Mono)
├── icons/              ← Icon ứng (192, 512, maskable)
├── bamboo_data.json    ← Dữ liệu hiện có
└── Backup_BambooTracker_*.json ← Sao lưu
```

**Chúc bạn sử dụng hiệu quả! 🎋**
