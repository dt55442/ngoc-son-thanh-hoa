# 📱 HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG NHÀ MÁY NGỌC SƠN THANH HÓA TRÊN ĐIỆN THOẠI

Ứng dụng **Nhà máy Ngọc Sơn Thanh Hóa** là **PWA (Progressive Web App)**. Một số chức năng lưu cục bộ có thể dùng khi offline; đồng bộ Firebase và các chức năng trực tuyến cần kết nối mạng.

---

## Điều kiện trước khi cài

- Chỉ mở ứng dụng từ **đường dẫn HTTPS đã xác nhận an toàn**. Trước khi dùng dữ liệu thật, cần chắc chắn nguồn publish không chứa dữ liệu sản xuất/nhân sự hoặc tệp nội bộ công khai; HTTPS không tự làm dữ liệu riêng tư.
- **Không** copy thư mục rồi mở `index.html` bằng trình quản lý tệp (`file://`); cách đó không đăng ký service worker và không cài được PWA. `http://localhost` chỉ dùng cho phát triển trên chính thiết bị đang chạy máy chủ, không phải địa chỉ để điện thoại khác truy cập.
- Lần đầu cần có mạng để tải trang, manifest, icon và service worker. Repo đã có manifest, icon và service worker; nếu vẫn không thấy tùy chọn cài, kiểm tra URL có HTTPS và tải lại trang khi online.

## Cài trên Android

1. Mở đường dẫn HTTPS của ứng dụng bằng **Chrome**.
2. Chạm **⋮** → **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính**. Có thể mở menu ⋮ của ứng dụng rồi chọn **Cài Ứng Dụng** để xem hướng dẫn.
3. Xác nhận; biểu tượng ứng dụng sẽ xuất hiện trên màn hình chính.

## Cài trên iPhone/iPad

1. Mở đường dẫn HTTPS bằng **Safari**.
2. Chạm **Chia sẻ** → **Thêm vào Màn hình chính** → **Thêm**.
3. Mở ứng dụng từ biểu tượng vừa tạo.

Thông báo Web Push trên iPhone/iPad còn cần ứng dụng đã được thêm vào Màn hình chính, phiên bản hệ điều hành/trình duyệt hỗ trợ và người dùng cấp quyền. Bản hiện tại **chưa có dịch vụ gửi push khi ứng dụng đóng**; muốn gửi thông báo cá nhân sau này cần thiết kế định danh người nhận và một sender/backend được công ty duyệt.

## Sử dụng sau khi cài

Sau khi cài đặt, app sẽ:
- ✅ Hiển thị icon riêng trên màn hình chính
- ✅ Mở toàn màn hình (không có thanh địa chỉ Chrome)
- ✅ Các chức năng lưu cục bộ tiếp tục hoạt động khi offline
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

Khi online (Firebase), dữ liệu được đồng bộ qua đám mây **KHÔNG hỏi nhắc** (tránh bấm nhầm ghi đè):
- Mây có bản ghi mà máy chưa có → **tự gộp thêm** (an toàn, không ghi đè).
- Muốn thao tác chủ động → dùng 2 nút trong menu **⋮**:
  1. **"Đồng Bộ Dữ Liệu Máy Lên Mây"** — đẩy dữ liệu máy lên đám mây (tự gộp khéo các bản ghi mây đang có).
  2. **"Tải Dữ Liệu Từ Mây Về Máy"** — tải bản mới nhất từ đám mây về máy.

### 🗑️ Lần XÓA cũng được đồng bộ (tombstone)
- Khi xóa 1 dòng (lượt ép, lô nan, nhân viên...), app ghi lại **"dấu vết xóa"** (id + thời điểm xóa) và đẩy lên mây cùng dữ liệu.
- Máy khác nhận dấu vết xóa → **tự gỡ dòng tương ứng** trên máy mình → dòng đã xóa **không còn "sống lại"** khi tải lại trang hay khi máy khác đẩy dữ liệu.
- Nếu nhập lại dòng cùng id với mốc thời gian **mới hơn lần xóa** (hoặc bấm Hoàn tác) → dòng được **hồi sinh** và gỡ dấu vết xóa.
- Dấu vết xóa được giữ tối đa **90 ngày** rồi tự dọn.

### ✍️ Quyền đẩy dữ liệu lên mây
- **Admin / Editor / Ban Quản Lý** đều được đẩy dữ liệu lên mây (trước đây Ban Quản Lý bị chặn → lần xóa của họ không bao giờ lên mây, khiến dòng đã xóa hồi sinh sau mỗi lần tải lại trang).
- **Viewer / khách** chỉ xem. Nếu rules Firebase chưa cập nhật, hãy dán lại file `firestore.rules` (v3) vào Firebase Console → Rules → **Publish**.

### 🟢 Badge trạng thái đồng bộ (góc trên phải)
- **Đã đồng bộ** (xanh) — dữ liệu máy đã nằm trên mây, mọi máy đang thấy cùng dữ liệu.
- **Đang chờ đẩy / đang nhận…** (vàng nhấp nháy) — app đang tự đồng bộ, chờ 1–2 giây là xong.
- **Mất mạng** (đỏ) — thay đổi được giữ trên máy, có mạng lại là tự đẩy lên, không mất.
- **Chưa đăng nhập / Chỉ xem / Máy cục bộ** (xám) — máy này chỉ xem; muốn nhập liệu và đồng bộ thì đăng nhập tài khoản quyền Sửa/Quản trị.
- Badge chỉ để THEO DÕI — **không cần bấm nút "Tải Từ Mây"** chỉ vì badge vàng; 2 nút trong menu ⋮ chỉ dùng khi nghi máy bị thiếu/tua ngược dữ liệu.

### 🛟 AUTO BACKUP — chống mất dữ liệu do sai xót/xóa nhầm (3 lớp)
1. **Bản cất trên máy** — app tự cất tối đa 10 snapshot gần nhất (nén gzip) tại các thời điểm rủi ro: trước khi tải dữ liệu từ mây về, trước khi nạp file JSON, sau mỗi lần đồng bộ mây (tối đa 1 lần/5 phút). Admin mở qua menu ⋮ → **"Phục Hồi Tự Động (Bản Cất Trên Máy)"**.
2. **Bản cất trên mây** — mỗi ngày 1 bản (giữ 14 ngày), tự cất sau lần đẩy mây đầu tiên trong ngày. Admin mở qua menu ⋮ → **"Bản Cất Dự Phòng Trên Mây"**. Phòng cả trường hợp máy hỏng localStorage/Windows.
3. **Bản cất trong thư mục dữ liệu** — nếu đã chọn thư mục dữ liệu: trước khi ghi đè `bamboo_data.json`, app tự copy bản cũ sang thư mục `backups/` (giữ 10 bản, tối đa 1 bản/10 phút).
- Phục hồi (bản cất nào cũng vậy) luôn **GỘP KHÉO**: bản ghi có mốc thời gian mới hơn thắng, dữ liệu máy/mây đang có mà mới hơn sẽ không bị ghi đè; bản ghi đã xóa đúng quy trình (có dấu vết xóa) không bị hồi sinh.

---

## 💡 LƯU Ý

- Lần đầu cài cần mở URL HTTPS khi có mạng để trình duyệt tải manifest, icon và service worker.
- Sau khi tài nguyên đã được cache, các chức năng lưu cục bộ có thể dùng offline; đồng bộ Firebase và các tính năng trực tuyến vẫn cần mạng.
- Nếu thay đổi code, hãy xóa app cũ và cài lại hoặc hard-refresh (Ctrl+Shift+R trên desktop / xóa cache Chrome)
- Thông tin đăng nhập do quản trị viên cấp. Không ghi hoặc chia sẻ mật khẩu trong tài liệu; hãy thay/thu hồi mọi thông tin mặc định trước khi dùng với dữ liệu thật.

---

## 👥 PHÂN QUYỀN & DASHBOARD MỚI (v4.1)

### Dashboard là màn hình mặc định
Mở app sẽ vào thẳng **Dashboard Tổng Quan** gồm:
1. **VÙNG CƠ BẢN** — biểu đồ chung của tất cả các tab, **mọi người đều xem được**
2. **VÙNG NÂNG CAO** 🔒 — phân tích chuyên sâu, **chỉ Admin & Ban Quản Lý** (hoặc người được cấp riêng) xem được; người khác thấy thẻ khóa

> 📌 Thẻ KPI **"Phân bổ khối lượng theo công đoạn"** (Sấy 1 → Sấy 2 → Kho → Bào Tinh) đã chuyển sang **tab Công Đoạn**, thu gọn nằm cùng hàng với 2 thẻ KPI tổng hợp. Trên điện thoại, tab Công Đoạn mặc định xem từng công đoạn một — **vuốt ngang** trên bảng (hoặc bấm tab Sấy 1 / Sấy 2 / Kho / Bào tinh) để chuyển công đoạn.

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
Khai báo 1 dòng trong `APP_TABS` (file `js/permissions.js`) + schema dữ liệu trong `BUILDER_SCHEMA` (file `js/dashboard.js`) — Dashboard và bảng phân quyền **tự động nhận tab mới**.
Tab QC (Xuất Hàng) là ví dụ mẫu: `APP_TABS` + section `qc-view` trong `index.html` + module `js/qc.js` + đồng bộ `qcExports` trong `js/cloud.js`.
**Tab Nhân Sự** (nhân viên + kỹ năng đa vị trí, chấm công & phân vị theo ngày, xin nghỉ phép có duyệt của ban lãnh đạo, thống kê đi làm theo tháng/TOP ngày nghỉ, nhu cầu tuyển dụng) cũng làm theo đúng mô hình này: `hr` trong `APP_TABS` + section `hr-view` + module `js/hr.js` + đồng bộ `hrEmployees/hrLeaves/hrRecruitment/hrPositions/hrAttendance/hrCheckins` trong `js/cloud.js`. *(Chấm công: "Nghỉ có phép" suy ra từ đơn nghỉ đã duyệt — không lưu trùng; nạp giờ Excel từ máy chấm công tự nhận cột, đối chiếu rồi mới áp dụng; test riêng tại `tests/hr-attendance.test.mjs`.)*

---

## 🔒 BẢO MẬT DỮ LIỆU

- Dữ liệu có bản lưu cục bộ trong localStorage/IndexedDB; khi kết nối Firebase, một số dữ liệu được đồng bộ lên Firestore. Không mặc định rằng dữ liệu chỉ nằm trên điện thoại.
- Xóa dữ liệu trình duyệt/app có thể làm mất bản cục bộ. Nếu dùng đồng bộ đám mây, hãy kiểm tra trạng thái đồng bộ trước khi khôi phục.
- File sao lưu JSON có thể chứa dữ liệu sản xuất/nhân sự; chỉ lưu và chia sẻ qua nơi được công ty cho phép.
- Không đưa JSON dữ liệu, bản sao lưu, tệp debug hoặc thông tin truy cập vào nguồn website công khai.

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

## 📡 CÀI ỨNG DỤNG TRÊN ĐIỆN THOẠI

Để cài PWA trên điện thoại, dùng URL **HTTPS** của website đã được kiểm tra và làm theo hướng dẫn Android/iPhone ở đầu tài liệu. Địa chỉ HTTP trong mạng LAN (ví dụ `http://192.168.x.x:8080`) chỉ phù hợp để truy cập thử; không đáp ứng điều kiện secure context để cài PWA/service worker.

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
│   ├── press.js        ← Sản lượng ép ván: nhập liệu, tính thành phẩm
│   ├── materials.js    ← Nhập nguyên liệu: 3 vị trí, ảnh, kế hoạch nguyên liệu
│   └── qc.js           ← Tab QC: bảng xuất hàng (tên hàng từ kế hoạch, tuần, SL xuất, ghi chú)
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
