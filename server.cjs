/**
 * NHA MAY NGOC SON THANH HOA - Fast Local Server (Node.js)
 * Thay thế server.ps1: xử lý ĐỒNG THỜI mọi request (không xếp hàng tuần tự),
 * giữ kết nối sống (keep-alive) -> tải trang lạnh nhanh gấp ~20 lần trên máy mạnh.
 *
 * Cách chạy:  node server.js [port]     (mặc định 8080)
 * Server KHÔNG phụ thuộc thư viện ngoài - chỉ dùng module có sẵn của Node.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2], 10) || 8080;
const ROOT = __dirname;

// ─── Bảng MIME đầy đủ cho mọi loại file app dùng ───────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8'
};

// Thời gian cache trình duyệt: file app luôn kiểm tra lại (SW lo offline),
// thư viện vendored + font + icon hiếm đổi -> cache 1 ngày.
function cacheControl(urlPath) {
  if (/^\/(vendor|fonts|icons)\//.test(urlPath)) return 'public, max-age=86400';
  return 'no-cache';
}

const server = http.createServer((req, res) => {
  try {
    // Giải mã URL (%20, ký tự tiếng Việt...) và chặn path traversal
    let urlPath;
    try { urlPath = decodeURIComponent(req.url.split('?')[0]); }
    catch (e) { res.writeHead(400).end('Bad Request'); return; }

    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden'); return;
    }

    fs.stat(filePath, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Khong tim thay: ' + urlPath);
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': cacheControl(urlPath)
      });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on('error', () => res.destroy());
    });
  } catch (e) {
    if (!res.headersSent) res.writeHead(500);
    res.end('Server Error');
  }
});

// Lắng nghe dual-stack (::): máy khách vào bằng localhost (::1) hoặc
// 127.0.0.1 / IP LAN đều được nhận NGAY lập tức, tránh độ trễ ~200ms/lần
// kết nối gây ra khi chỉ bind IPv4 (hiện tượng Win thử ::1 trước).
server.listen(PORT, () => {
  console.log('');
  console.log('  ==============================================');
  console.log('   NHA MAY NGOC SON THANH HOA - FAST SERVER (Node.js)');
  console.log('  ==============================================');
  console.log('   Mo ung dung tai:  http://localhost:' + PORT);
  console.log('   De tat server:    Ctrl+C hoac dong cua so nay');
  console.log('  ==============================================');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('LOI: Cong ' + PORT + ' dang duoc su dung.');
    console.error('- Neu trang dang mo roi thi khong can lam gi them.');
    console.error('- Hoac doi cong khac: node server.js 8081');
  } else {
    console.error('Loi server:', err.message);
  }
  process.exit(1);
});
