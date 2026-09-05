/**
 * NHÀ MÁY NGỌC SƠN THANH HÓA - Service Worker
 * Cho phép ứng dụng hoạt động hoàn toàn OFFLINE trên Android/iOS
 * Chiến lược: Cache First - cập nhật nền (stale-while-revalidate)
 */

const CACHE_NAME = 'nha-may-ngoc-son-v57';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './js/main.js',
  './js/state.js',
  './js/storage.js',
  './js/auth.js',
  './js/cloud.js',
  './js/utils.js',
  './js/lunar.js',
  './js/events.js',
  './js/kanban.js',
  './js/dashboard.js',
  './js/batch-modals.js',
  './js/export-xlsx.js',
  './js/planning.js',
  './js/press.js',
  './js/materials.js',
  './firebase-config.js',
  './manifest.json',
  './vendor/lucide.min.js',
  './vendor/chart.umd.js',
  './vendor/hammer.min.js',
  './vendor/chartjs-plugin-zoom.min.js',
  './vendor/xlsx.full.min.js',
  './vendor/firebase-app-compat.js',
  './vendor/firebase-auth-compat.js',
  './vendor/firebase-firestore-compat.js',
  './fonts/fonts.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

// Tự động thêm tất cả font woff2 vào APP_SHELL
// (các font được tải về local trong thư mục fonts/)
const FONT_FILES = [
  './fonts/font_1.woff2', './fonts/font_2.woff2', './fonts/font_3.woff2',
  './fonts/font_4.woff2', './fonts/font_5.woff2', './fonts/font_6.woff2',
  './fonts/font_7.woff2', './fonts/font_8.woff2', './fonts/font_9.woff2',
  './fonts/font_10.woff2', './fonts/font_11.woff2', './fonts/font_12.woff2',
  './fonts/font_13.woff2'
];

const ALL_CACHE_URLS = [...APP_SHELL, ...FONT_FILES];

// ─── INSTALL: Pre-cache toàn bộ ứng dụng ───────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Đang cache toàn bộ tài nguyên ứng dụng...');
        return Promise.allSettled(
          ALL_CACHE_URLS.map((url) => cache.add(url))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: Dọn cache cũ ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH: Network First cho HTML/JS/CSS, Cache First cho tài nguyên tĩnh ───
// Lý do: tránh trường hợp Service Worker trả về index.html / app cũ từ cache
// khiến trang trắng vĩnh viễn sau khi cập nhật code.
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Chỉ xử lý GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bỏ qua các request không phải http/https
  if (!url.protocol.startsWith('http')) return;
  // Bỏ qua request tới Firebase cloud (không cache)
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return;

  const isStatic = /\.(png|jpg|jpeg|gif|woff|woff2|ttf|ico)$/i.test(url.pathname)
    || url.pathname.includes('/vendor/')
    || url.pathname.includes('/fonts/');

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      // Tài nguyên tĩnh hiếm đổi: Cache First + revalidate nền
      if (isStatic && cached) {
        fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
        }).catch(() => {});
        return cached;
      }

      // Code ứng dụng: Network First -> offline mới rơi về cache
      try {
        const response = await fetch(request);
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      } catch (err) {
        if (cached) return cached;   // OFFLINE -> dùng bản đã cache
        throw err;                   // Không có gì cả -> để trang báo lỗi tự nhiên
      }
    })()
  );
});

// ─── MESSAGE: Cập nhật cache thủ công ───────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});