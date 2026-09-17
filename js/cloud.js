// ═══════════════════════════════════════════════════════════
// js/cloud.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { saveSession, updateUserProfileHeader } from './auth.js';
import { HISTORY_LIMIT, syncHistorySnapshots } from './history.js';
import { renderAll } from './main.js';
import { canEditAnything, canEditTab, currentTabId, getEditableTabs, getTabDef, syncPermissionUI } from './permissions.js';
import { STORAGE_KEY_CUSTOM_CHARTS, STORAGE_KEY_DATA, STORAGE_KEY_DELETED_IDS, STORAGE_KEY_HR_ATTENDANCE, STORAGE_KEY_HR_CHECKINS, STORAGE_KEY_HR_EMPLOYEES, STORAGE_KEY_HR_LEAVES, STORAGE_KEY_HR_POSNEEDS, STORAGE_KEY_HR_SHIFTS, STORAGE_KEY_HR_ASSIGN, STORAGE_KEY_HR_POSITIONS, STORAGE_KEY_HR_RECRUITMENT, STORAGE_KEY_HR_OVERTIMES, STORAGE_KEY_HISTORY, STORAGE_KEY_MATERIAL_PLAN, STORAGE_KEY_MATERIAL_RATES, STORAGE_KEY_MATERIALS, STORAGE_KEY_PLANNING_FORECAST, STORAGE_KEY_PLANNING_ITEMS, STORAGE_KEY_PLANNING_STOCK, STORAGE_KEY_PRESS_NOTES, STORAGE_KEY_PRESS_RECORDS, STORAGE_KEY_QC_EXPORTS, STORAGE_KEY_XUONG2_CUTS, state } from './state.js';
import { restoreMaterialRecords } from './storage.js';
import { applyTombstonesToRecordList, getDeletedMap, hasDeletedIds, mergeTombstones, saveDeletedIds, stripTombstonedPlanWeeks, untrackDeleted } from './tombstone.js';
import { showToast } from './utils.js';

  // Nhãn danh sách tab được sửa (dùng trong thông báo phân quyền)
  function listEditableTabsLabel() {
    const tabs = getEditableTabs();
    if (tabs.length === 0) return 'không có tab nào';
    return tabs.map(id => getTabDef(id)?.short || id).join(', ');
  }


  // ─── FIREBASE (ONLINE - ĐỒNG BỘ MÂY) ───────────────────────────
  // Giữ nguyên chế độ OFFLINE (localStorage). Khi có kết nối + SDK Firebase:
  //   - Đăng nhập bằng Firebase Auth (email)
  //   - Phân quyền: admin / editor (sửa) / viewer (chỉ xem)
  //   - Đồng bộ dữ liệu thời gian thực qua Firestore
  let fbEnabled = false;
  let fbDb = null;
  let fbAuthLoaded = false;       // đã có kết quả trạng thái đăng nhập
  let fbDidLoadRemote = false;    // đã nhận dữ liệu từ Firestore ít nhất 1 lần
  let fbApplying = false;         // đang áp dụng remote (tránh lặp vô hạn)
  let fbUnsubDoc = null;
  let fbPushTimer = null;
  let fbSeedCore = null; // core dữ liệu tại lần đồng bộ (đẩy/áp mây) gần nhất - nhận diện "chưa có thay đổi thật"
  let fbRemoteDocExists = false;   // doc apps/main đã tồn tại trên mây
  let fbRemoteHasData = false;     // doc trên mây có dữ liệu thực (khác rỗng)
  let fbLastRemote = null;         // bản snapshot mây gần nhất (nút tải về + gộp khéo trước khi đẩy)
  let fbDirty = false;             // có thay đổi CHƯA được đẩy lên mây
  let fbSyncWarnAt = 0;            // thời điểm lần cuối cảnh báo không đồng bộ được (chống spam)
  let fbListenWarnAt = 0;          // thời điểm lần cuối cảnh báo lỗi lắng nghe mây (chống spam)

  // ─── Chẩn đoán lỗi quyền (permission-denied) ───────────────────
  function isPermDeniedErr(e) {
    const code = String((e && e.code) || '');
    const msg = String((e && e.message) || '');
    return code.indexOf('permission-denied') !== -1 || /insufficient permissions|permission/i.test(msg);
  }
  function fbOwnerHint() {
    const cfg = window.FIREBASE_CONFIG || {};
    let authInfo = 'CHƯA xác thực Firebase Auth';
    try {
      const au = (window.firebase && window.firebase.auth) ? window.firebase.auth().currentUser : null;
      if (au) authInfo = 'đã auth: ' + (au.email || au.uid);
    } catch (e) {}
    return 'Project: ' + (cfg.projectId || '?') + ' | ' + authInfo
      + ' | Email đã đăng nhập app: ' + ((state.currentUser && state.currentUser.email) || '?');
  }

  // Chẩn đoán sâu khi bị permission-denied: đọc doc roles thật trên mây,
  // đối chiếu email, và nếu là owner thì TỰ THÊM mình vào adminEmails rồi đẩy lại.
  // Phép thử phân biệt: nếu cả bước thêm quyền cũng bị chặn -> Firebase đang chạy RULES CŨ.
  let fbDiagRunning = false;
  async function deepPermissionDiagnosis() {
    if (fbDiagRunning || !fbDb) return;
    fbDiagRunning = true;
    try {
      const email = ((state.currentUser && state.currentUser.email) || '').trim().toLowerCase();
      let d = null;
      try {
        const snap = await fbDb.collection(FB_SETTINGS_COLL).doc(FB_ROLES_DOC).get();
        d = snap.exists ? (snap.data() || {}) : null;
      } catch (e) {
        showToast('CHẨN ĐOÁN: không đọc được settings/roles (' + (e.code || e.message) + ') → rules không cho người đăng nhập đọc. Publish lại file firestore.rules.', 'error');
        return;
      }
      if (!d) {
        showToast('CHẨN ĐOÁN: settings/roles chưa tồn tại trên mây. Đăng xuất → đăng nhập lại để app tự tạo quyền Admin cho bạn.', 'warning');
        return;
      }
      const ad = (d.adminEmails || []).map(s => String(s).trim().toLowerCase());
      const ed = (d.editorEmails || []).map(s => String(s).trim().toLowerCase());
      const inA = ad.indexOf(email) !== -1, inE = ed.indexOf(email) !== -1;
      const cfgOwner = String((window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.ownerEmail) || '').trim().toLowerCase();
      if (inA || inE) {
        showToast('CHẨN ĐOÁN: email ĐÃ nằm trong roles (admin=' + inA + ', editor=' + inE + ') mà ghi vẫn bị chặn → Firebase đang chạy RULES CŨ. Mở Console → Firestore → Rules → dán bản trong file firestore.rules → Publish.', 'error');
        return;
      }
      if (cfgOwner && email === cfgOwner) {
        // Owner bị thiếu trong roles -> tự thêm rồi đẩy lại dữ liệu
        try {
          await fbDb.collection(FB_SETTINGS_COLL).doc(FB_ROLES_DOC).set({
            adminEmails: ad.concat([email]),
            editorEmails: ed,
            viewerEmails: d.viewerEmails || []
          });
        } catch (e2) {
          showToast('CHẨN ĐOÁN: owner tự thêm quyền cũng bị chặn (' + (e2.code || e2.message) + ') → chắc chắn đang chạy RULES CŨ. Publish lại file firestore.rules rồi bấm Đồng Bộ lần nữa.', 'error');
          return;
        }
        try {
          await writeCloudSnapshot();
          fbDirty = false;
          showToast('ĐÃ TỰ CỨU HỘ: thêm ' + email + ' vào adminEmails trên mây và đẩy dữ liệu thành công!', 'success');
        } catch (e3) {
          showToast('Đã thêm quyền nhưng đẩy dữ liệu vẫn lỗi (' + (e3.code || e3.message) + '). Bấm Đồng Bộ lần nữa.', 'warning');
        }
        return;
      }
      showToast('CHẨN ĐOÁN: ' + email + ' CHƯA có trong roles (admin: ' + ad.length + ', editor: ' + ed.length + ' mục). Nhờ Quản Trị thêm email này vào adminEmails/editorEmails.', 'error');
    } finally {
      fbDiagRunning = false;
    }
  }

  const FB_COLL = 'apps';
  const FB_DOC = 'main';
  const FB_SETTINGS_COLL = 'settings';
  const FB_ROLES_DOC = 'roles';
  const FB_SHARDS_COLL = 'shards';
  // ─── GIỚI HẠN KÍCH THƯỚC DOC (nguyên nhân lỗi "exceeds the maximum allowed
  // size of 1,048,576 bytes") ────────────────────────────────────────────────
  // Firestore giới hạn MỖI document 1 MiB. Trước đây toàn bộ dữ liệu nằm trong
  // 1 doc apps/main → khi vượt mức, MỌI lần đẩy lên mây đều lỗi vĩnh viễn.
  // Giải pháp 2 lớp:
  //   1) NÉN GZIP (CompressionStream có sẵn của trình duyệt) bản JSON trước khi
  //      đẩy — JSON lặp khóa rất nhiều nên thường giảm ~85-90% dung lượng.
  //   2) Nếu nén rồi vẫn vượt mức cho phép → CHIA NHỎ (shard) thành nhiều doc
  //      con apps/main/shards/0..N-1; doc apps/main chỉ còn là "mục lục".
  // Định dạng doc apps/main trên mây (trường __fmt báo hiệu):
  //   - KHÔNG có __fmt        : JSON trơn nguyên vẹn (định dạng cũ, ≤ ~800KB)
  //   - __fmt 'gzip'          : { payload: base64(gzip(json)) }  — 1 doc duy nhất
  //   - __fmt 'shard-gzip'    : { shards: N, epoch } + shards/i = { part, idx, epoch, ts }
  //   - __fmt 'shard-plain'   : như trên nhưng mảnh là JSON trơn (trình duyệt cũ)
  const CLOUD_PLAIN_LIMIT = 800 * 1024;      // JSON trơn ≤ 800KB → giữ định dạng cũ (tương thích 100%)
  const CLOUD_GZIP_LIMIT = 900 * 1024;       // base64 là ASCII: byte = ký tự → ≤ 900KB trong 1 doc
  const CLOUD_SHARD_PART_GZIP = 700 * 1024;  // mỗi mảnh gzip-base64 ≤ 700KB (giới hạn 1MiB/doc, chừa biên)
  const CLOUD_SHARD_PART_PLAIN = 250000;     // mảnh JSON trơn: ký tự có thể tốn 3 bytes UTF-8 → biên ~750KB
  let fbRemoteSeq = 0;             // chống "đua": chỉ áp dụng bản lắp ráp mây MỚI NHẤT
  let fbReadWarnAt = 0;            // chống spam cảnh báo lỗi đọc/lắp ráp mây
  let fbWriteChain = Promise.resolve(); // xâu đợi ghi: tránh 2 lần đẩy cùng lúc trộn mảnh shard của nhau
  let fbShardCleanupCount = -1;    // số mảnh đã dọn lần trước (-1: chưa dọn lần nào)

  // ── Tiện ích byte / nén gzip (không cần thư viện ngoài) ──────────────────
  function utf8Bytes(str) {
    try { return new TextEncoder().encode(str).length; } catch (e) { return str.length; }
  }
  function isGzipSupported() {
    return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
  }
  function bytesToBase64(bytes) {
    let bin = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  async function gzipStringToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return bytesToBase64(new Uint8Array(buf));
  }
  async function gunzipBase64ToString(b64) {
    const stream = new Blob([base64ToBytes(b64)]).stream().pipeThrough(new DecompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return new TextDecoder('utf-8').decode(new Uint8Array(buf));
  }
  // Chia chuỗi theo SỐ KÝ TỰ (an toàn tuyệt đối: ghép đúng thứ tự → khôi phục nguyên vẹn)
  function chunkString(str, size) {
    const parts = [];
    for (let i = 0; i < str.length; i += size) parts.push(str.slice(i, i + size));
    return parts.length ? parts : [''];
  }
  function cloudDocRef() { return fbDb.collection(FB_COLL).doc(FB_DOC); }
  function shardColRef() { return cloudDocRef().collection(FB_SHARDS_COLL); }

  // Dọn mảnh shard cũ không còn mục lục dùng (best-effort, không chặn đẩy dữ liệu).
  // Chỉ xóa mảnh "già" (>5 phút) để không đụng mảnh máy khác VỪA ghi; mảnh mới
  // thừa sẽ được dọn trong các lần đẩy sau.
  function cleanupStaleShards(keepCount, epoch) {
    if (fbShardCleanupCount === keepCount || !fbDb) return;
    fbShardCleanupCount = keepCount;
    const hotBefore = Date.now() - 5 * 60 * 1000;
    shardColRef().where('idx', '>=', keepCount).get().then((qs) => {
      const dels = [];
      qs.forEach((d) => {
        const dd = d.data() || {};
        const ts = Number(dd.ts) || 0;
        if (ts && ts >= hotBefore) return;   // mảnh vừa ghi (máy khác/đua) → để lần dọn sau
        if (dd.epoch === epoch) return;      // mảnh của mục lục hiện tại thì tuyệt đối không đụng
        dels.push(d.ref.delete());
      });
      return Promise.all(dels);
    }).catch(() => { fbShardCleanupCount = -1; });
  }

  // ĐẨY dữ liệu lên mây (tự chọn định dạng: trơn / gzip / shard). Trả về { mode, ... }.
  // Khi shard: ghi các MẢNH trước (epoch mới) → mục lục apps/main SAU CÙNG. Nếu
  // ghi dở giữa chừng, mục lục vẫn trỏ dữ liệu cũ nguyên vẹn → không mất dữ liệu mây.
  function writeCloudSnapshot() {
    const run = () => doWriteCloudSnapshot();
    const p = fbWriteChain.then(run, run);
    fbWriteChain = p.catch(() => {});
    return p;
  }
  async function doWriteCloudSnapshot() {
    const snap = collectCloudSnapshot();
    const docRef = cloudDocRef();
    const raw = JSON.stringify(snap);
    const size = utf8Bytes(raw);
    if (size <= CLOUD_PLAIN_LIMIT) {
      await docRef.set(snap);   // nhỏ → giữ nguyên định dạng cũ (mọi phiên bản đọc được)
      cleanupStaleShards(0);
      return { mode: 'plain', size };
    }
    let payload = null;
    if (isGzipSupported()) {
      const b64 = await gzipStringToBase64(raw);
      if (b64.length <= CLOUD_GZIP_LIMIT) {
        await docRef.set({ __fmt: 'gzip', payload: b64, updatedBy: snap.updatedBy, updatedAt: snap.updatedAt });
        cleanupStaleShards(0);
        return { mode: 'gzip', size: b64.length };
      }
      payload = b64; // nén rồi vẫn lớn → shard base64
    }
    const isGzipShard = payload !== null;
    const fmt = isGzipShard ? 'shard-gzip' : 'shard-plain';
    const partSize = isGzipShard ? CLOUD_SHARD_PART_GZIP : CLOUD_SHARD_PART_PLAIN;
    const parts = chunkString(isGzipShard ? payload : raw, partSize);
    const epoch = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    await Promise.all(parts.map((part, i) =>
      shardColRef().doc(String(i)).set({ part, idx: i, epoch, ts: Date.now() })));
    await docRef.set({
      __fmt: fmt, shards: parts.length, epoch,
      updatedBy: snap.updatedBy, updatedAt: snap.updatedAt
    });
    cleanupStaleShards(parts.length, epoch);
    return { mode: fmt, parts: parts.length, size: isGzipShard ? payload.length : size };
  }

  // LẮP RÁP dữ liệu mây từ mục lục → object dữ liệu đầy đủ (như định dạng cũ).
  // plain: trả nguyên doc; gzip: giải nén; shard: nạp đủ mảnh cùng epoch → ghép → giải nén.
  // CACHE THEO EPOCH: epoch trên mây chỉ đổi khi CÓ LẦN ĐẨY MỚI → cùng epoch là
  // cùng dữ liệu. Trước đây MỖI snapshot (kể cả echo/kill metadata của chính mình
  // và snapshot trùng) đều nạp lại TOÀN BỘ N mảnh qua mạng → nguyên nhân chính
  // làm web chậm/lag khi online. Giờ chỉ nạp lại khi epoch (lần đẩy) đổi.
  let fbAssembleCache = { epoch: null, promise: null };
  async function assembleRemoteObject(meta) {
    const fmt = (meta && meta.__fmt) || 'plain';
    if (fmt === 'plain') return meta; // JSON trơn nằm ngay trong doc mục lục
    const epoch = (meta && meta.epoch) || null;
    if (epoch && fbAssembleCache.epoch === epoch && fbAssembleCache.promise) {
      return fbAssembleCache.promise; // đã lắp ráp bản này rồi — dùng lại, không nạp mảnh
    }
    const p = assembleRemoteObjectFresh(meta).catch((e) => {
      // Lỗi lắp ráp → gỡ cache để lần snapshot sau thử nạp lại từ đầu
      if (epoch && fbAssembleCache.epoch === epoch) { fbAssembleCache.epoch = null; fbAssembleCache.promise = null; }
      throw e;
    });
    if (epoch) { fbAssembleCache.epoch = epoch; fbAssembleCache.promise = p; }
    return p;
  }
  async function assembleRemoteObjectFresh(meta) {
    const fmt = (meta && meta.__fmt) || 'plain';
    if (fmt === 'plain') return meta;
    if (fmt === 'gzip') return JSON.parse(await gunzipBase64ToString(meta.payload || ''));
    const n = Math.max(0, Math.floor(meta.shards) || 0);
    if (!n) throw new Error('Mục lục mây (apps/main) thiếu số mảnh dữ liệu (shards)');
    const parts = new Array(n).fill(null);
    const gets = [];
    for (let i = 0; i < n; i++) gets.push(shardColRef().doc(String(i)).get());
    const snaps = await Promise.all(gets);
    for (let i = 0; i < snaps.length; i++) {
      const s = snaps[i];
      if (s && s.exists) {
        const d = s.data() || {};
        const idx = Number.isFinite(d.idx) ? d.idx : i;
        if (d.epoch === meta.epoch && typeof d.part === 'string' && idx >= 0 && idx < n) parts[idx] = d.part;
      }
    }
    const missing = parts.filter((p) => p === null).length;
    if (missing) throw new Error('Thiếu ' + missing + '/' + n + ' mảnh dữ liệu trên mây — bấm Đồng Bộ lần nữa để ghi lại');
    const joined = parts.join('');
    return fmt === 'shard-gzip' ? JSON.parse(await gunzipBase64ToString(joined)) : JSON.parse(joined);
  }

  function isFirebaseOnline() {
    return !!window.__BAMBOO_FIREBASE_READY__ && fbEnabled;
  }

  function initFirebase() {
    if (!window.__BAMBOO_FIREBASE_READY__) { console.warn('[FB] SKIP - chế độ OFFLINE'); return; }
    try { fbDb = window.firebase.firestore(); } catch (e) { console.warn('[FB] Lỗi Firestore', e); return; }
    fbEnabled = true;
    console.log('[FB] Đồng bộ online đã khởi động');
    try { if (fbSeedCore === null) fbSeedCore = cloudCore(collectCloudSnapshot()); } catch (e) {}
    // XEM CÔNG KHAI: lắng nghe dữ liệu ngay cả khi CHƯA đăng nhập
    setupFirestoreSync();
    applyRoleToUI(state.currentUser ? state.currentUser.role : null);
    try {
      window.firebase.auth().onAuthStateChanged((user) => handleFirebaseAuth(user));
    } catch (e) { console.warn('[FB] Lỗi Auth', e); }
  }

  function handleFirebaseAuth(user) {
    fbAuthLoaded = true;
    if (!user) {
      // Khách vãng lai (chưa đăng nhập): chỉ XEM, không ép mở modal đăng nhập
      state.currentUser = null;
      saveSession();
      applyRoleToUI(null);
      renderAll();
      return;
    }
    resolveFirebaseRole(user);
  }

  async function resolveFirebaseRole(user) {
    try {
      const email = (user.email || '').trim().toLowerCase();
      const rolesSnap = await fbDb.collection(FB_SETTINGS_COLL).doc(FB_ROLES_DOC).get();
      const roles = rolesSnap.exists ? (rolesSnap.data() || {}) : { adminEmails: [], managerEmails: [], editorEmails: [], viewerEmails: [] };
      let role = null;

      // OWNER bypass: chủ sở hữu khai báo trong firebase-config.js luôn là Admin
      // (khớp với isOwner() bên rules) - dù doc roles có tồn tại mà thiếu họ hay không.
      const cfgOwner = String((window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.ownerEmail) || '').trim().toLowerCase();
      if (cfgOwner && email === cfgOwner) {
        role = 'admin';
        if (!rolesSnap.exists) {
          // Người đầu tiên đăng nhập sẽ là Quản Trị (tạo doc quyền)
          await fbDb.collection(FB_SETTINGS_COLL).doc(FB_ROLES_DOC).set({
            adminEmails: [email], managerEmails: [], editorEmails: [], viewerEmails: []
          });
        }
      }
      else if ((roles.adminEmails  || []).includes(email)) role = 'admin';
      else if ((roles.managerEmails || []).includes(email)) role = 'manager';
      else if ((roles.editorEmails || []).includes(email)) role = 'editor';
      else if ((roles.viewerEmails || []).includes(email)) role = 'viewer';

      if (!role) {
        if (!rolesSnap.exists) {
          // Người đầu tiên đăng nhập sẽ là Quản Trị (tạo doc quyền)
          role = 'admin';
          await fbDb.collection(FB_SETTINGS_COLL).doc(FB_ROLES_DOC).set({
            adminEmails: [email], managerEmails: [], editorEmails: [], viewerEmails: []
          });
        } else {
          role = 'viewer'; // email chưa khai báo => chỉ xem
        }
      }

      // Đọc tên hiển thị do Admin đặt (nếu có)
      let displayFullname = '';
      try {
        const dnSnap = await fbDb.collection(FB_SETTINGS_COLL).doc('displayNames').get();
        if (dnSnap.exists && dnSnap.data()[email]) displayFullname = dnSnap.data()[email];
      } catch (e) {}

      state.currentUser = {
        username: user.email, email: user.email,
        fullname: displayFullname || user.displayName || (user.email ? user.email.split('@')[0] : user.uid),
        role, uid: user.uid
      };
      // Hợp nhất quyền chi tiết cấp riêng cho email này (nếu Admin đã cấu hình):
      // userGrants: { '<email>': { editTabs: ['kanban','press'], allowAdvanced: true } }
      try {
        const grants = ((roles.userGrants || {})[email]) || null;
        if (grants) {
          if (Array.isArray(grants.editTabs)) state.currentUser.editTabs = grants.editTabs;
          if (typeof grants.allowAdvanced === 'boolean') state.currentUser.allowAdvanced = grants.allowAdvanced;
        }
      } catch (e) {}
      saveSession();
      applyRoleToUI(role);
      setupFirestoreSync();
      checkAuthAndRenderFirebase();
      flushPendingCloudPush(); // vừa có quyền -> đẩy nốt các thay đổi còn kẹt trên máy
      showToast(`Đã đăng nhập (${role})`, 'success');
    } catch (e) {
      console.warn('[FB] Lỗi lấy quyền', e);
      showToast('Lỗi xác thực quyền: ' + e.message
        + (isPermDeniedErr(e) ? '. ' + fbOwnerHint() : ''), 'error');
    }
  }

  function applyRoleToUI(role) {
    // Phân quyền đã dồn về js/permissions.js — hàm này giữ lại để tương thích
    // với các nơi gọi cũ (auth.js, events.js...). state.currentUser phải được
    // gán TRƯỚC khi gọi (role chỉ dùng để hiển thị).
    syncPermissionUI();
  }

  function canEditNow() {
    return canEditAnything();
  }
  // Cổng chặn theo ngữ cảnh tab đang mở: người dùng chỉ sửa được tab
  // được chỉ định trong quyền của họ (editTabs / admin = mọi tab)
  function requireEditPermission() {
    if (canEditTab(currentTabId())) return true;
    if (canEditAnything()) {
      showToast(`Bạn không có quyền chỉnh sửa ở tab này. Chỉ được sửa: ${listEditableTabsLabel()}.`, 'error');
    } else {
      showToast('Bạn đang XEM ở chế độ công khai. Vui lòng Đăng Nhập để sửa đổi thông tin.', 'error');
      document.getElementById('modal-login')?.classList.add('show');
    }
    return false;
  }
  // Cổng chặn tường minh theo tab/chỉ định (dùng cho biểu đồ theo nguồn dữ liệu)
  function requireTabEditPermission(tabId) {
    if (canEditTab(tabId)) return true;
    showToast(`Bạn không có quyền chỉnh sửa ở tab ${getTabDef(tabId)?.short || tabId}.`, 'error');
    return false;
  }

  // Hiển thị app; nếu đã đăng nhập thì cập nhật hồ sơ. Không ép đăng nhập (xem công khai)
  function checkAuthAndRenderFirebase() {
    document.getElementById('modal-login')?.classList.remove('show');
    if (state.currentUser) updateUserProfileHeader();
    renderAll();
  }
  // ─── ĐỒNG BỘ DỮ LIỆU (FIRESTORE) ───────────────────────────────
  function setupFirestoreSync() {
    if (fbUnsubDoc) return;
    fbUnsubDoc = fbDb.collection(FB_COLL).doc(FB_DOC).onSnapshot(
      (snap) => handleRemoteSnapshot(snap),
      (err) => {
        console.warn('[FB] Lỗi lắng nghe dữ liệu', err);
        // Trước đây chỉ console.warn -> máy nhận "mù" dữ liệu mây mà không ai hay biết
        if (Date.now() - fbListenWarnAt > 30000) {
          fbListenWarnAt = Date.now();
          showToast('Mất kết nối lắng nghe dữ liệu mây: ' + ((err && err.message) || err), 'error');
        }
      }
    );
  }

  // Dữ liệu ứng dụng hiện tại (toàn bộ) để gửi lên mây
  function collectCloudSnapshot() {
    return {
      batches: state.batches,
      customCharts: state.customCharts,
      materialRates: state.materialRates,
      materialRecords: state.materialRecords,
      materialPlan: state.materialPlan || {},
      planningItems: state.planningItems,
      planningForecast: state.planningForecast,
      planningStock: state.planningStock,
      qcExports: state.qcExports || [],
      pressRecords: state.pressRecords,
      pressNotes: state.pressNotes || [],
      hrEmployees: state.hrEmployees || [],
      hrLeaves: state.hrLeaves || [],
      hrRecruitment: state.hrRecruitment || [],
      hrPositionNeeds: state.hrPositionNeeds || [],
      hrShifts: state.hrShifts || [],
      hrAssignments: state.hrAssignments || [],
      hrPositions: state.hrPositions || [],
      hrAttendance: state.hrAttendance || [],
      hrCheckins: state.hrCheckins || [],
      hrOvertimes: state.hrOvertimes || [],
      xuong2CutRecords: state.xuong2CutRecords || [],
      history: state.history || [],
      deletedIds: state.deletedIds || {},
      updatedBy: state.currentUser ? state.currentUser.email : 'unknown',
      updatedAt: new Date().toISOString()
    };
  }

  // Lõi dữ liệu (bỏ meta) để so sánh
  function cloudCore(obj) {
    return JSON.stringify({
      batches: obj.batches || [], customCharts: obj.customCharts || [],
      materialRates: obj.materialRates || [], materialRecords: obj.materialRecords || [],
      materialPlan: obj.materialPlan || {},
      planningItems: obj.planningItems || [],
      pressNotes: obj.pressNotes || [],
      planningForecast: obj.planningForecast || {}, planningStock: obj.planningStock || {},
      qcExports: obj.qcExports || [],
      pressRecords: obj.pressRecords || [],
      hrEmployees: obj.hrEmployees || [], hrLeaves: obj.hrLeaves || [], hrRecruitment: obj.hrRecruitment || [],
      hrPositionNeeds: obj.hrPositionNeeds || [],
      hrShifts: obj.hrShifts || [],
      hrAssignments: obj.hrAssignments || [],
      hrPositions: obj.hrPositions || [], hrAttendance: obj.hrAttendance || [], hrCheckins: obj.hrCheckins || [],
      hrOvertimes: obj.hrOvertimes || [],
      xuong2CutRecords: obj.xuong2CutRecords || [],
      history: obj.history || [],
      deletedIds: obj.deletedIds || {}
    });
  }

  // ─── GỘP DỮ LIỆU TỪ MÂY (chống mất bản ghi khi nhiều máy cùng nhập) ──
  // Dấu thời gian so sánh bản ghi (ưu tiên updatedAt)
  function recStamp(r) {
    return String((r && (r.updatedAt || r.createdAt)) || '');
  }
  // Gộp 2 danh sách theo id: bản ghi chỉ có ở một phía vẫn được giữ lại;
  // trùng id -> bản có dấu thời gian MỚI HƠN thắng (bằng/thiếu -> giữ bản máy đang có).
  function mergeById(localArr, incomingArr) {
    const local = Array.isArray(localArr) ? localArr : [];
    const incoming = Array.isArray(incomingArr) ? incomingArr : [];
    const map = new Map();
    const localNoIdKeys = new Set();
    const incomingNoId = [];
    for (const r of local) {
      if (!r) continue;
      if (!r.id) { localNoIdKeys.add(JSON.stringify(r)); continue; }
    }
    for (const r of incoming) {
      if (!r) continue;
      if (!r.id) {
        // bản ngoài không có id: chỉ nhận nếu máy chưa có bản y hệt (tránh nhân đôi)
        const key = JSON.stringify(r);
        if (!localNoIdKeys.has(key)) { incomingNoId.push(r); localNoIdKeys.add(key); }
        continue;
      }
      const cur = map.get(r.id);
      if (!cur || recStamp(r) >= recStamp(cur)) map.set(r.id, r);
    }
    for (const r of local) {
      if (!r || !r.id) continue;
      const cur = map.get(r.id);
      if (!cur || recStamp(r) >= recStamp(cur)) map.set(r.id, r);
    }
    return [...incomingNoId, ...map.values()];
  }
  // Chỉ BỔ SUNG bản ghi mà máy CHƯA có (không đụng bản trùng id) - dùng trước khi
  // đẩy máy lên mây để không bao giờ xóa mất dữ liệu người khác vừa thêm trên mây.
  function mergeAddMissing(localArr, incomingArr) {
    const local = Array.isArray(localArr) ? localArr : [];
    const incoming = Array.isArray(incomingArr) ? incomingArr : [];
    const ids = new Set(local.filter(r => r && r.id).map(r => r.id));
    const add = incoming.filter(r => r && r.id && !ids.has(r.id));
    return add.length ? [...local, ...add] : local;
  }
  // Gộp dict theo khóa trên cùng (planningForecast / planningStock: { năm: {...} })
  function mergeKeyedDict(localObj, remoteObj) {
    const out = Object.assign({}, (localObj && typeof localObj === 'object') ? localObj : {});
    const src = (remoteObj && typeof remoteObj === 'object') ? remoteObj : {};
    for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
    return out;
  }
  // Gộp kế hoạch nguyên liệu ({ '2026-W36': { 'lo-hoi': x, ... } }): tuần chỉ có ở
  // một phía -> giữ lại; trùng tuần -> gộp theo TỪNG vị trí (máy thiếu vị trí nào
  // thì nhận vị trí đó từ mây, không ghi đè vị trí máy đã nhập).
  // deletedWeeks: tombstone của materialPlan ({ tuần: thời điểm xóa }) — tuần đã
  // bị xóa thì KHÔNG nhận lại từ mây (trừ khi mây có bản MỚI HƠN lần xóa ->
  // hồi sinh: gỡ dấu vết xóa). Máy có bản MỚI HƠN mây -> giữ nguyên bản máy
  // (không nhận lại vị trí đã bị máy xóa/ghi trống).
  function mergeMaterialPlan(localObj, remoteObj, deletedWeeks, changedTomb) {
    const out = Object.assign({}, (localObj && typeof localObj === 'object') ? localObj : {});
    const src = (remoteObj && typeof remoteObj === 'object') ? remoteObj : {};
    for (const wk of Object.keys(src)) {
      const rWeek = (src[wk] && typeof src[wk] === 'object') ? src[wk] : {};
      const rStamp = String((rWeek && rWeek.updatedAt) || '');
      const delTs = deletedWeeks ? String(deletedWeeks[wk] || '') : '';
      if (delTs) {
        if (rStamp > delTs) untrackDeleted('materialPlan', wk); // tạo/sửa lại sau khi xóa -> hồi sinh
        else continue;                                          // tuần đã bị xóa -> không nhận lại
      }
      if (!out[wk] || typeof out[wk] !== 'object') { out[wk] = Object.assign({}, rWeek); continue; }
      if (String((out[wk] && out[wk].updatedAt) || '') >= rStamp) continue; // máy mới hơn -> giữ máy
      for (const k of Object.keys(rWeek)) {
        if (!(k in out[wk]) || out[wk][k] === null || out[wk][k] === undefined) out[wk][k] = rWeek[k];
      }
    }
    return out;
  }
  // Gộp bản snapshot mây vào state máy. onlyAddMissing=true: chỉ bổ sung bản ghi máy thiếu.
  // Trả về true nếu có thay đổi (đã tự lưu localStorage + render lại).
  function mergeRemoteIntoLocal(remote, onlyAddMissing) {
    if (!remote || typeof remote !== 'object') return false;
    const before = cloudCore(collectCloudSnapshot());
    // Hợp nhất dấu vết xóa (tombstone) từ mây TRƯỚC TIÊN: lần xóa từ máy khác
    // phải chặn bản ghi cũ — không nhận về máy và gỡ luôn bản cũ còn sót.
    const changedTomb = { flag: false };
    mergeTombstones(remote.deletedIds, changedTomb);
    const m = onlyAddMissing ? mergeAddMissing : mergeById;
    // Lọc tombstone cả HAI phía: danh sách mây gửi về & danh sách đang có trên máy
    const clean = (colKey, arr) => applyTombstonesToRecordList(colKey, arr, changedTomb);
    if (remote.batches) state.batches = m(clean('batches', state.batches), clean('batches', remote.batches));
    if (remote.pressRecords) state.pressRecords = m(clean('pressRecords', state.pressRecords), clean('pressRecords', remote.pressRecords));
    if (remote.materialRecords) {
      state.materialRecords = clean('materialRecords', state.materialRecords);
      if (onlyAddMissing) state.materialRecords = mergeAddMissing(state.materialRecords, clean('materialRecords', remote.materialRecords));
      else restoreMaterialRecords(clean('materialRecords', remote.materialRecords)); // đã có logic gộp theo dấu thời gian riêng
    }
    if (remote.planningItems) state.planningItems = m(clean('planningItems', state.planningItems), clean('planningItems', remote.planningItems));
    if (remote.pressNotes) state.pressNotes = m(clean('pressNotes', state.pressNotes || []), clean('pressNotes', remote.pressNotes));
    if (remote.materialRates) state.materialRates = m(clean('materialRates', state.materialRates), clean('materialRates', remote.materialRates));
    if (remote.customCharts) state.customCharts = m(clean('customCharts', state.customCharts), clean('customCharts', remote.customCharts));
    if (remote.qcExports) state.qcExports = m(clean('qcExports', state.qcExports || []), clean('qcExports', remote.qcExports));
    if (remote.hrEmployees) state.hrEmployees = m(clean('hrEmployees', state.hrEmployees || []), clean('hrEmployees', remote.hrEmployees));
    if (remote.hrLeaves) state.hrLeaves = m(clean('hrLeaves', state.hrLeaves || []), clean('hrLeaves', remote.hrLeaves));
    if (remote.hrPositions) state.hrPositions = m(clean('hrPositions', state.hrPositions || []), clean('hrPositions', remote.hrPositions));
    if (remote.hrAttendance) state.hrAttendance = m(clean('hrAttendance', state.hrAttendance || []), clean('hrAttendance', remote.hrAttendance));
    if (remote.hrCheckins) state.hrCheckins = m(clean('hrCheckins', state.hrCheckins || []), clean('hrCheckins', remote.hrCheckins));
    if (remote.hrRecruitment) state.hrRecruitment = m(clean('hrRecruitment', state.hrRecruitment || []), clean('hrRecruitment', remote.hrRecruitment));
    if (remote.hrPositionNeeds) state.hrPositionNeeds = m(clean('hrPositionNeeds', state.hrPositionNeeds || []), clean('hrPositionNeeds', remote.hrPositionNeeds));
    if (remote.hrShifts) state.hrShifts = m(clean('hrShifts', state.hrShifts || []), clean('hrShifts', remote.hrShifts));
    if (remote.hrAssignments) state.hrAssignments = m(clean('hrAssignments', state.hrAssignments || []), clean('hrAssignments', remote.hrAssignments));
    if (remote.hrOvertimes) state.hrOvertimes = m(clean('hrOvertimes', state.hrOvertimes || []), clean('hrOvertimes', remote.hrOvertimes));
    // Vị trí công đoạn Xưởng 2 — nhật ký cắt/chọn (thẻ launcher tab Công Đoạn)
    if (remote.xuong2CutRecords) state.xuong2CutRecords = m(clean('xuong2CutRecords', state.xuong2CutRecords || []), clean('xuong2CutRecords', remote.xuong2CutRecords));
    // Lịch sử sửa đổi: gộp thêm các dòng máy này chưa có (mỗi dòng 1 id riêng)
    if (remote.history) {
      state.history = mergeAddMissing(state.history || [], remote.history || []);
      if (state.history.length > HISTORY_LIMIT) state.history = state.history.slice(-HISTORY_LIMIT);
    }
    if (!onlyAddMissing) {
      if (remote.planningForecast) state.planningForecast = mergeKeyedDict(state.planningForecast, remote.planningForecast);
      if (remote.planningStock) state.planningStock = mergeKeyedDict(state.planningStock, remote.planningStock);
      if (remote.materialPlan) state.materialPlan = mergeMaterialPlan(state.materialPlan, remote.materialPlan, getDeletedMap('materialPlan'), changedTomb);
    }
    if (changedTomb.flag) saveDeletedIds(); // tombstone đổi (hợp nhất/hồi sinh) -> lưu ngay
    // Dữ liệu vừa gộp từ mây (không phải thao tác sửa trên máy này) ->
    // đặt lại nền so sánh lịch sử để lần lưu sau không ghi log ảo
    syncHistorySnapshots();
    const after = cloudCore(collectCloudSnapshot());
    if (after !== before) {
      persistAllLocal();
      renderAll();
      return true;
    }
    return false;
  }
  // Ghi toàn bộ dữ liệu state xuống localStorage (dùng chung cho apply/merge)
  function persistAllLocal() {
    try { localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(state.batches)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_CUSTOM_CHARTS, JSON.stringify(state.customCharts)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_MATERIAL_RATES, JSON.stringify(state.materialRates)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_MATERIALS, JSON.stringify(state.materialRecords)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_MATERIAL_PLAN, JSON.stringify(state.materialPlan || {})); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_PLANNING_ITEMS, JSON.stringify(state.planningItems)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_PLANNING_FORECAST, JSON.stringify(state.planningForecast)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_PLANNING_STOCK, JSON.stringify(state.planningStock)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_PRESS_RECORDS, JSON.stringify(state.pressRecords)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_PRESS_NOTES, JSON.stringify(state.pressNotes || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_QC_EXPORTS, JSON.stringify(state.qcExports || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_EMPLOYEES, JSON.stringify(state.hrEmployees || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_LEAVES, JSON.stringify(state.hrLeaves || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_RECRUITMENT, JSON.stringify(state.hrRecruitment || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_POSNEEDS, JSON.stringify(state.hrPositionNeeds || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_SHIFTS, JSON.stringify(state.hrShifts || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_ASSIGN, JSON.stringify(state.hrAssignments || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_POSITIONS, JSON.stringify(state.hrPositions || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_ATTENDANCE, JSON.stringify(state.hrAttendance || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_CHECKINS, JSON.stringify(state.hrCheckins || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HR_OVERTIMES, JSON.stringify(state.hrOvertimes || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_XUONG2_CUTS, JSON.stringify(state.xuong2CutRecords || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history || [])); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_DELETED_IDS, JSON.stringify(state.deletedIds || {})); } catch (e) {}
    syncHistorySnapshots(); // thay đổi đến từ mây/nạp file → đặt lại nền so sánh lịch sử
  }

  function handleRemoteSnapshot(snap) {
    fbDidLoadRemote = true;
    fbRemoteDocExists = snap.exists;
    const meta = snap.exists ? (snap.data() || {}) : {};
    // Dữ liệu mây có thể ở dạng gzip/shard → phải LẮP RÁP BẤT ĐỒNG BỘ trước khi
    // gộp về máy. fbRemoteSeq: nếu mục lục đổi giữa chừng (máy khác vừa đẩy) thì
    // kết quả lắp ráp của bản cũ bị bỏ qua — chỉ áp dụng bản MỚI NHẤT.
    // Trả về promise để có thể chờ (dùng trong kiểm thử / đồng bộ tuần tự).
    const seq = ++fbRemoteSeq;
    return assembleRemoteObject(meta).then((remote) => {
      if (seq !== fbRemoteSeq) return;      // đã có bản mây mới hơn → bỏ qua
      fbLastRemote = remote;
      fbRemoteHasData = hasCloudData(remote);
      if (fbApplying) return;               // bỏ qua bản ta vừa ghi
      if (!snap.exists) return;             // mây chưa có dữ liệu -> KHÔNG hỏi, dùng nút thủ công khi cần
      if (cloudCore(remote) === cloudCore(collectCloudSnapshot())) return; // giống nhau
      // Máy này chưa có dữ liệu thật -> nhận theo mây luôn, KHÔNG hỏi (tránh ghi đè mất dữ liệu)
      if (!localHasAnyData()) { applyFireSnapshot(remote); return; }
      // Dữ liệu mây KHÁC máy -> KHÔNG HỎI nữa (tránh bấm nhầm gây ghi đè):
      // chỉ TỰ GỘP THÊM các bản ghi trên mây mà máy này chưa có (an toàn, không
      // mất dữ liệu). Muốn ghi đè theo mây / đẩy máy lên mây thì dùng 2 nút
      // "Đồng Bộ Dữ Liệu Máy Lên Mây" & "Tải Dữ Liệu Từ Mây Về Máy" trong menu ⋮.
      // Mây chỉ có DẤU VẾT XÓA (danh sách rỗng) cũng phải gộp: để GỠ bản ghi cũ
      // còn sót trên máy theo tombstone — không thì lần đẩy sau sẽ "hồi sinh".
      if (fbRemoteHasData || hasDeletedIds(remote)) mergeRemoteIntoLocal(remote, true);
    }).catch((e) => {
      console.warn('[FB] Lỗi đọc/lắp ráp dữ liệu mây', e);
      if (Date.now() - fbReadWarnAt > 30000) {
        fbReadWarnAt = Date.now();
        showToast('Lỗi đọc dữ liệu từ mây: ' + ((e && e.message) || e), 'error');
      }
    });
  }

  function applyFireSnapshot(data) {
    fbApplying = true;
    try {
      // Hợp nhất dấu vết xóa (tombstone) từ mây TRƯỚC, rồi lọc mọi danh sách:
      // bản ghi đã bị xóa từ máy khác không được hồi sinh qua "tải từ mây về máy".
      const changedTomb = { flag: false };
      mergeTombstones(data.deletedIds, changedTomb);
      const clean = (colKey, arr) => applyTombstonesToRecordList(colKey, arr, changedTomb);
      if (data.batches) state.batches = clean('batches', data.batches);
      if (data.customCharts) state.customCharts = clean('customCharts', data.customCharts);
      if (data.materialRates) state.materialRates = clean('materialRates', data.materialRates);
      // GỘP theo dấu thời gian (mới hơn thắng) thay vì ghi đè — tránh mất
      // đơn giá/ảnh của các lần nhập nguyên liệu mới hơn bản trên mây.
      if (data.materialRecords) restoreMaterialRecords(clean('materialRecords', data.materialRecords));
      if (data.materialPlan !== undefined) state.materialPlan = stripTombstonedPlanWeeks(data.materialPlan || {}, changedTomb);
      if (data.planningItems) state.planningItems = clean('planningItems', data.planningItems);
      if (data.planningForecast !== undefined) state.planningForecast = data.planningForecast;
      if (data.planningStock !== undefined) state.planningStock = data.planningStock;
      if (data.qcExports) state.qcExports = clean('qcExports', data.qcExports);
      if (data.pressRecords) state.pressRecords = clean('pressRecords', data.pressRecords);
      if (data.pressNotes) state.pressNotes = clean('pressNotes', data.pressNotes);
      if (data.hrEmployees) state.hrEmployees = clean('hrEmployees', data.hrEmployees);
      if (data.hrLeaves) state.hrLeaves = clean('hrLeaves', data.hrLeaves);
      if (data.hrRecruitment) state.hrRecruitment = clean('hrRecruitment', data.hrRecruitment);
      if (data.hrPositionNeeds) state.hrPositionNeeds = clean('hrPositionNeeds', data.hrPositionNeeds);
      if (data.hrShifts) state.hrShifts = clean('hrShifts', data.hrShifts);
      if (data.hrAssignments) state.hrAssignments = clean('hrAssignments', data.hrAssignments);
      if (data.hrPositions) state.hrPositions = clean('hrPositions', data.hrPositions);
      if (data.hrAttendance) state.hrAttendance = clean('hrAttendance', data.hrAttendance);
      if (data.hrCheckins) state.hrCheckins = clean('hrCheckins', data.hrCheckins);
      if (data.hrOvertimes) state.hrOvertimes = clean('hrOvertimes', data.hrOvertimes);
      if (data.history) {
        // Lịch sử từ mây: gộp thêm các dòng máy chưa có + giới hạn số dòng
        state.history = mergeAddMissing(state.history || [], data.history || []);
        if (state.history.length > HISTORY_LIMIT) state.history = state.history.slice(-HISTORY_LIMIT);
      }
      if (changedTomb.flag) saveDeletedIds();
      syncHistorySnapshots();
      persistAllLocal();
      // Máy vừa khớp với mây -> cập nhật mốc "đã đồng bộ" để lần so sánh sau chính xác
      try { fbSeedCore = cloudCore(collectCloudSnapshot()); } catch (e) {}
      renderAll();
    } finally { fbApplying = false; }
  }

  // Có quyền ghi dữ liệu lên mây không? (Quản Trị / Người Chỉnh Sửa / Ban Quản Lý)
  // Trước đây Ban Quản Lý bị chặn đẩy dữ liệu: lần XÓA của họ không bao giờ lên
  // mây → dòng đã xóa "sống lại" sau mỗi lần tải lại trang (nguyên nhân chính).
  function canPushToCloud() {
    const r = state.currentUser ? state.currentUser.role : null;
    return r === 'admin' || r === 'editor' || r === 'manager';
  }

  // Đẩy dữ liệu hiện tại lên mây (admin/editor/manager; debounce 600ms)
  function firePushSync() {
    if (!isFirebaseOnline() || !fbAuthLoaded || !state.currentUser || !canPushToCloud()) {
      // Có thay đổi nhưng điều kiện đẩy chưa đủ -> đánh dấu "bẩn" và cảnh báo ít thôi
      fbDirty = true;
      warnSyncBlocked();
      return;
    }
    fbDirty = true;
    clearTimeout(fbPushTimer);
    fbPushTimer = setTimeout(() => doFirePush(), 600);
  }

  // Cảnh báo (tối đa 1 lần/90 giây) vì sao dữ liệu chưa lên mây
  function warnSyncBlocked() {
    if (Date.now() - fbSyncWarnAt < 90000) return;
    fbSyncWarnAt = Date.now();
    if (!window.__BAMBOO_FIREBASE_READY__ || !navigator.onLine) {
      showToast('Có thay đổi mới nhưng đang OFFLINE — dữ liệu sẽ nằm trên máy này cho tới khi đồng bộ lên mây.', 'info');
    } else if (!state.currentUser) {
      showToast('Có thay đổi mới nhưng CHƯA ĐĂNG NHÂP — hãy đăng nhập quyền Sửa/Quản trị để dữ liệu lên mây dùng chung.', 'info');
    } else {
      showToast(`Tài khoản "${state.currentUser.fullname || state.currentUser.email}" chỉ xem — không có quyền ghi dữ liệu lên mây (cần Người Chỉnh Sửa / Ban Quản Lý / Quản Trị).`, 'info');
    }
  }

  // Đẩy NGAY phần dữ liệu chờ đẩy (dùng khi rời trang / vừa có quyền / vừa online)
  function flushPendingCloudPush() {
    if (!fbDirty) return;
    clearTimeout(fbPushTimer);
    fbPushTimer = null;
    doFirePush();
  }

  async function doFirePush() {
    if (!fbDidLoadRemote) {
      // Chưa nhận dữ liệu mây lần nào -> hẹn thử lại thay vì bỏ im lặng (dữ liệu kẹt trên máy)
      if (fbDirty) {
        clearTimeout(fbPushTimer);
        fbPushTimer = setTimeout(() => { if (fbDirty) doFirePush(); }, 3000);
      }
      return;
    }
    if (fbSeedCore && cloudCore(collectCloudSnapshot()) === fbSeedCore) { fbDirty = false; return; } // chưa có thay đổi thực tế
    if (!isFirebaseOnline() || !state.currentUser || !canPushToCloud()) return; // giữ cờ bẩn, chờ lần sau
    fbApplying = true;
    try {
      await writeCloudSnapshot();
      fbDirty = false;
      try { fbSeedCore = cloudCore(collectCloudSnapshot()); } catch (e) {}
    } catch (e) {
      console.warn('[FB] Lỗi đẩy dữ liệu', e);
      showToast('Không đồng bộ lên mây: ' + e.message, 'error');
      if (isPermDeniedErr(e)) deepPermissionDiagnosis();
    } finally { fbApplying = false; }
  }

  // Dữ liệu có "thật" trên mây: materialRecords (tab Nguyên Liệu) cũng là dữ liệu thực —
  // nếu không tính thì mây rỗng + máy có nguyên liệu sẽ bị coi là "máy không có gì".
  function hasCloudData(data) {
    if (!data) return false;
    const arrFilled = (v) => Array.isArray(v) && v.length > 0;
    if (arrFilled(data.batches) || arrFilled(data.customCharts) ||
        arrFilled(data.materialRates) || arrFilled(data.planningItems) ||
        arrFilled(data.pressRecords) || arrFilled(data.materialRecords)) return true;
    if (data.planningForecast && typeof data.planningForecast === 'object' && Object.keys(data.planningForecast).length > 0) return true;
    if (data.planningStock && typeof data.planningStock === 'object' && Object.keys(data.planningStock).length > 0) return true;
    if (data.materialPlan && typeof data.materialPlan === 'object' && Object.keys(data.materialPlan).length > 0) return true;
    return false;
  }

  // Cục bộ (máy này) có dữ liệu nào không
  function localHasAnyData() {
    if (Array.isArray(state.batches) && state.batches.length) return true;
    if (Array.isArray(state.materialRates) && state.materialRates.length) return true;
    if (Array.isArray(state.planningItems) && state.planningItems.length) return true;
    if (Array.isArray(state.customCharts) && state.customCharts.length) return true;
    if (Array.isArray(state.pressRecords) && state.pressRecords.length) return true;
    if (Array.isArray(state.materialRecords) && state.materialRecords.length) return true;
    if (state.planningForecast && typeof state.planningForecast === 'object' && Object.keys(state.planningForecast).length) return true;
    if (state.planningStock && typeof state.planningStock === 'object' && Object.keys(state.planningStock).length) return true;
    if (state.materialPlan && typeof state.materialPlan === 'object' && Object.keys(state.materialPlan).length) return true;
    return false;
  }

  // Đẩy MẠNH toàn bộ dữ liệu hiện tại (local) lên mây - dùng cho nút thủ công
  async function uploadLocalDataToCloud() {
    if (!isFirebaseOnline()) { showToast('Chưa ở chế độ online (cần kết nối mạng + SDK)', 'error'); return; }
    if (!state.currentUser) { showToast('Chưa đăng nhập', 'error'); return; }
    if (!canPushToCloud()) { showToast('Bạn không có quyền ghi dữ liệu lên mây (cần Người Chỉnh Sửa / Ban Quản Lý / Quản Trị).', 'error'); return; }
    if (!fbDidLoadRemote) {
      showToast('Đang chờ dữ liệu từ mây... Thử lại sau 1 giây', 'info');
      setTimeout(uploadLocalDataToCloud, 1200);
      return;
    }
    if (fbApplying) return;
    fbApplying = true;
    try {
      // GỘP KHÉO trước khi đẩy: bổ sung các bản ghi đang có trên mây mà máy này
      // CHƯA có -> nút "Đồng Bộ Dữ Liệu Máy Lên Mây" không còn nguy cơ xóa mất
      // dữ liệu mới vừa được máy khác thêm lên mây (nguyên nhân "thành công
      // nhưng dữ liệu mới biến mất"). Tombstone từ mây cũng được gộp trước để
      // bản ghi đã bị máy khác xóa KHÔNG bị đẩy ngược lại lên mây.
      let mergedFromCloud = false;
      if (fbRemoteDocExists && fbLastRemote &&
          (fbRemoteHasData || hasDeletedIds(fbLastRemote)) &&
          cloudCore(fbLastRemote) !== cloudCore(collectCloudSnapshot())) {
        mergedFromCloud = mergeRemoteIntoLocal(fbLastRemote, true);
      }
      const w = await writeCloudSnapshot();
      fbDirty = false;
      try { fbSeedCore = cloudCore(collectCloudSnapshot()); } catch (e) {}
      const counts = 'lô: ' + ((state.batches || []).length)
        + ', nguyên liệu: ' + ((state.materialRecords || []).length)
        + ', ép ván: ' + ((state.pressRecords || []).length);
      const note = w.mode === 'gzip' ? ' — đã nén gzip (' + Math.round(w.size / 1024) + ' KB trên mây)'
        : (w.mode === 'shard-gzip' ? ' — đã nén + chia ' + w.parts + ' mảnh'
          : (w.mode === 'shard-plain' ? ' — chia ' + w.parts + ' mảnh' : ''));
      showToast('Đã đẩy dữ liệu lên mây thành công! (' + counts + note
        + (mergedFromCloud ? ' — đã gộp thêm bản ghi từ mây' : '') + ')', 'success');
    } catch (e) {
      console.warn('[FB] Lỗi đẩy dữ liệu lên mây', e);
      showToast('Lỗi khi đẩy dữ liệu lên mây: ' + e.message
        + (isPermDeniedErr(e) ? '. ' + fbOwnerHint() : ''), 'error');
      if (isPermDeniedErr(e)) deepPermissionDiagnosis();
    } finally { fbApplying = false; }
  }

  // TẢI dữ liệu từ mây về máy (ghi đè máy) - chiều NGƯỢC LẠI với uploadLocalDataToCloud.
  // Dùng khi máy này bị "tua ngược"/thiếu dữ liệu và muốn lấy đúng bản mới nhất trên mây.
  function pullCloudToLocal() {
    if (!fbRemoteDocExists || !fbLastRemote || !hasCloudData(fbLastRemote)) {
      showToast('Trên mây chưa có dữ liệu để tải về.', 'error');
      return;
    }
    applyFireSnapshot(fbLastRemote);
    showToast('Đã tải dữ liệu từ mây về máy thành công! (ghi đè dữ liệu máy)', 'success');
  }

  // Đăng ký Service Worker - cho phép ứng dụng hoạt động ngoại tuyến hoàn toàn
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('[PWA] Service Worker đã đăng ký:', reg.scope))
          .catch(err => console.warn('[PWA] Lỗi đăng ký Service Worker:', err));
      });
    }
  }

  function initLucide() {
    if (window.lucide) window.lucide.createIcons();
  }

export {
  CLOUD_GZIP_LIMIT,
  CLOUD_PLAIN_LIMIT,
  CLOUD_SHARD_PART_GZIP,
  CLOUD_SHARD_PART_PLAIN,
  FB_COLL,
  FB_DOC,
  FB_ROLES_DOC,
  FB_SETTINGS_COLL,
  FB_SHARDS_COLL,
  applyFireSnapshot,
  applyRoleToUI,
  assembleRemoteObject,
  canEditNow,
  canPushToCloud,
  checkAuthAndRenderFirebase,
  chunkString,
  cloudCore,
  collectCloudSnapshot,
  doFirePush,
  fbApplying,
  fbAuthLoaded,
  fbDb,
  fbDidLoadRemote,
  fbEnabled,
  fbPushTimer,
  fbRemoteDocExists,
  fbRemoteHasData,
  fbSeedCore,
  fbUnsubDoc,
  firePushSync,
  flushPendingCloudPush,
  gzipStringToBase64,
  gunzipBase64ToString,
  handleFirebaseAuth,
  handleRemoteSnapshot,
  hasCloudData,
  initFirebase,
  initLucide,
  isFirebaseOnline,
  localHasAnyData,
  pullCloudToLocal,
  registerServiceWorker,
  requireEditPermission,
  requireTabEditPermission,
  resolveFirebaseRole,
  setupFirestoreSync,
  uploadLocalDataToCloud,
  utf8Bytes,
  writeCloudSnapshot
};
