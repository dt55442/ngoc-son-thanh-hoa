// ============================================
// FIREBASE CONFIG - Chế độ ONLINE (đồng bộ Cloud)
// ============================================
// Ghi rõ: cấu hình này KHÔNG phải "mật khẩu nhạy cảm", nhưng nên giữ riêng tư.
// Ứng dụng vẫn chạy được OFFLINE (localStorage) khi không có kết nối/SDK.
// ============================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyD5WRlDdQfRyaxXpkvBOlU9JbPziRL3nHA",
  authDomain: "quan-ly-nan-tre.firebaseapp.com",
  projectId: "quan-ly-nan-tre",
  storageBucket: "quan-ly-nan-tre.firebasestorage.app",
  messagingSenderId: "340370865322",
  appId: "1:340370865322:web:9b0b39ef401fe56349a4d3",
  // Email chủ sở hữu hệ thống - luôn có quyền Admin (phải KHỚP với isOwner() trong firestore.rules)
  ownerEmail: "dt55442@gmail.com"
};

window.__BAMBOO_FIREBASE_READY__ = false;

(function () {
  try {
    if (window.firebase && window.firebase.initializeApp) {
      // Khởi tạo Firebase app (chỉ 1 lần)
      if (!window.firebase.apps || window.firebase.apps.length === 0) {
        window.firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      window.__BAMBOO_FIREBASE_READY__ = true;
      console.log('[Firebase] Khởi tạo thành công (ONLINE)');
    } else {
      window.__BAMBOO_FIREBASE_READY__ = false;
      console.warn('[Firebase] Không có SDK - chuyển chế độ OFFLINE (localStorage)');
    }
  } catch (e) {
    window.__BAMBOO_FIREBASE_READY__ = false;
    console.warn('[Firebase] Lỗi khởi tạo:', e);
  }
})();