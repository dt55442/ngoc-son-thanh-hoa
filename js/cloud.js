// ═══════════════════════════════════════════════════════════
// js/cloud.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { saveSession, updateUserProfileHeader } from './auth.js';
import { renderAll } from './main.js';
import { canEditAnything, canEditTab, currentTabId, getEditableTabs, getTabDef, syncPermissionUI } from './permissions.js';
import { STORAGE_KEY_CUSTOM_CHARTS, STORAGE_KEY_DATA, STORAGE_KEY_MATERIAL_PLAN, STORAGE_KEY_MATERIAL_RATES, STORAGE_KEY_MATERIALS, STORAGE_KEY_PLANNING_FORECAST, STORAGE_KEY_PLANNING_ITEMS, STORAGE_KEY_PLANNING_STOCK, STORAGE_KEY_PRESS_RECORDS, STORAGE_KEY_PRODUCT_BOMS, state } from './state.js';
import { restoreMaterialRecords, saveData } from './storage.js';
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
  let fbUploadPromptShown = false; // đã hỏi đẩy dữ liệu máy lên mây chưa
  let fbConflictAskedAt = 0;       // thời điểm hỏi conflict gần nhất (chống hỏi liên tục)
  let fbConflictRemoteCore = '';   // core mây lần hỏi conflict gần nhất (chỉ hỏi lại khi mây THAY ĐỔI)
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
          await fbDb.collection(FB_COLL).doc(FB_DOC).set(collectCloudSnapshot());
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
      productBoms: state.productBoms,
      planningItems: state.planningItems,
      planningForecast: state.planningForecast,
      planningStock: state.planningStock,
      pressRecords: state.pressRecords,
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
      productBoms: obj.productBoms || [],
      planningForecast: obj.planningForecast || {}, planningStock: obj.planningStock || {},
      pressRecords: obj.pressRecords || []
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
  function mergeMaterialPlan(localObj, remoteObj) {
    const out = Object.assign({}, (localObj && typeof localObj === 'object') ? localObj : {});
    const src = (remoteObj && typeof remoteObj === 'object') ? remoteObj : {};
    for (const wk of Object.keys(src)) {
      const rWeek = (src[wk] && typeof src[wk] === 'object') ? src[wk] : {};
      if (!out[wk] || typeof out[wk] !== 'object') { out[wk] = Object.assign({}, rWeek); continue; }
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
    const m = onlyAddMissing ? mergeAddMissing : mergeById;
    if (remote.batches) state.batches = m(state.batches, remote.batches);
    if (remote.pressRecords) state.pressRecords = m(state.pressRecords, remote.pressRecords);
    if (remote.materialRecords) {
      if (onlyAddMissing) state.materialRecords = mergeAddMissing(state.materialRecords, remote.materialRecords);
      else restoreMaterialRecords(remote.materialRecords); // đã có logic gộp theo dấu thời gian riêng
    }
    if (remote.planningItems) state.planningItems = m(state.planningItems, remote.planningItems);
    if (remote.productBoms) state.productBoms = m(state.productBoms, remote.productBoms);
    if (remote.materialRates) state.materialRates = m(state.materialRates, remote.materialRates);
    if (remote.customCharts) state.customCharts = m(state.customCharts, remote.customCharts);
    if (!onlyAddMissing) {
      if (remote.planningForecast) state.planningForecast = mergeKeyedDict(state.planningForecast, remote.planningForecast);
      if (remote.planningStock) state.planningStock = mergeKeyedDict(state.planningStock, remote.planningStock);
      if (remote.materialPlan) state.materialPlan = mergeMaterialPlan(state.materialPlan, remote.materialPlan);
    }
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
    try { localStorage.setItem(STORAGE_KEY_PRODUCT_BOMS, JSON.stringify(state.productBoms)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_PLANNING_ITEMS, JSON.stringify(state.planningItems)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_PLANNING_FORECAST, JSON.stringify(state.planningForecast)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_PLANNING_STOCK, JSON.stringify(state.planningStock)); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_PRESS_RECORDS, JSON.stringify(state.pressRecords)); } catch (e) {}
  }

  function handleRemoteSnapshot(snap) {
    fbDidLoadRemote = true;
    const remote = snap.exists ? (snap.data() || {}) : {};
    fbLastRemote = remote;
    fbRemoteDocExists = snap.exists;
    fbRemoteHasData = hasCloudData(remote);
    if (fbApplying) return;               // bỏ qua bản ta vừa ghi
    if (!snap.exists) { maybePromptUpload(); return; } // mây chưa có dữ liệu -> có thể đẩy local lên
    if (cloudCore(remote) === cloudCore(collectCloudSnapshot())) { maybePromptUpload(); return; } // giống nhau
    // Máy này chưa có dữ liệu thật -> nhận theo mây luôn, KHÔNG hỏi (tránh ghi đè mất dữ liệu)
    if (!localHasAnyData()) { applyFireSnapshot(remote); maybePromptUpload(); return; }
    // Khác nhau -> hỏi admin/editor nên giữ bên nào, tránh mất dữ liệu
    if (state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.role === 'editor')) {
      handleRemoteConflict(remote);
    } else {
      applyFireSnapshot(remote); // viewer: mặc định theo mây
      maybePromptUpload();
    }
  }

  // Khi dữ liệu trên mây KHÁC máy: để người nhập liệu chọn thủ công.
  // FIX lỗi "đẩy thành công nhưng máy khác không bao giờ thấy dữ liệu mới":
  //  - Trước đây chỉ hỏi MỘT lần mỗi phiên (fbConflictPrompted chốt vĩnh viễn) ->
  //    mọi dữ liệu mới từ mây về sau đều bị BỎ QUA IM LẶNG cho tới khi tải lại trang.
  //  - Giờ: hỏi lại mỗi khi mây THAY ĐỔI (tối thiểu cách nhau 30 giây để chống spam).
  function handleRemoteConflict(remote) {
    const remoteCore = cloudCore(remote);
    if (remoteCore === fbConflictRemoteCore && Date.now() - fbConflictAskedAt < 30000) return;
    fbConflictAskedAt = Date.now();
    fbConflictRemoteCore = remoteCore;
    const keepCloud = confirm(
      'Dữ liệu trên MÂY khác với dữ liệu trên MÁY bạn đang mở.\n\n' +
      '➡️  Nhấn OK:  LẤY dữ liệu trên MÂY (ghi đè máy này).\n' +
      '⬅️  Nhấn Cancel:  GIỮ dữ liệu trên MÁY.'
    );
    if (keepCloud) {
      applyFireSnapshot(remote);
    } else {
      const keepLocal = confirm(
        'Bạn muốn GIỮ dữ liệu trên MÁY và ĐẨY LÊN MÂY (ghi đè mây) không?\n\n' +
        '➡️  OK:  Giữ máy & đẩy lên mây (app sẽ TỰ GỘP thêm các bản ghi đang có trên mây mà máy này chưa có - không mất dữ liệu người khác).\n' +
        '⬅️  Cancel:  Bỏ qua - sẽ được hỏi lại khi mây có dữ liệu mới.'
      );
      if (keepLocal) uploadLocalDataToCloud();
    }
    maybePromptUpload();
  }

  function applyFireSnapshot(data) {
    fbApplying = true;
    try {
      if (data.batches) state.batches = data.batches;
      if (data.customCharts) state.customCharts = data.customCharts;
      if (data.materialRates) state.materialRates = data.materialRates;
      // GỘP theo dấu thời gian (mới hơn thắng) thay vì ghi đè — tránh mất
      // đơn giá/ảnh của các lần nhập nguyên liệu mới hơn bản trên mây.
      if (data.materialRecords) restoreMaterialRecords(data.materialRecords);
      if (data.materialPlan !== undefined) state.materialPlan = data.materialPlan || {};
      if (data.productBoms) state.productBoms = data.productBoms;
      if (data.planningItems) state.planningItems = data.planningItems;
      if (data.planningForecast !== undefined) state.planningForecast = data.planningForecast;
      if (data.planningStock !== undefined) state.planningStock = data.planningStock;
      if (data.pressRecords) state.pressRecords = data.pressRecords;
      persistAllLocal();
      // Máy vừa khớp với mây -> cập nhật mốc "đã đồng bộ" để lần so sánh sau chính xác
      try { fbSeedCore = cloudCore(collectCloudSnapshot()); } catch (e) {}
      renderAll();
    } finally { fbApplying = false; }
  }

  // Đẩy dữ liệu hiện tại lên mây (chỉ admin/editor; debounce 600ms)
  function firePushSync() {
    if (!isFirebaseOnline() || !fbAuthLoaded || !state.currentUser ||
        (state.currentUser.role !== 'admin' && state.currentUser.role !== 'editor')) {
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
      showToast(`Tài khoản "${state.currentUser.fullname || state.currentUser.email}" không có quyền ghi dữ liệu lên mây (cần Sửa/Quản trị).`, 'info');
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
    if (!isFirebaseOnline() || !state.currentUser ||
        (state.currentUser.role !== 'admin' && state.currentUser.role !== 'editor')) return; // giữ cờ bẩn, chờ lần sau
    fbApplying = true;
    try {
      await fbDb.collection(FB_COLL).doc(FB_DOC).set(collectCloudSnapshot());
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

  // Hỏi admin/editor: có nên đẩy dữ liệu trên máy (kèm vị trí thẻ) lên mây không
  function maybePromptUpload() {
    if (fbUploadPromptShown || !state.currentUser) return;
    const r = state.currentUser.role;
    if (r !== 'admin' && r !== 'editor') return;
    if (fbRemoteDocExists && fbRemoteHasData) return; // mây đã có dữ liệu -> không ghi đè
    if (!localHasAnyData()) return;                    // máy không có gì -> không đẩy
    fbUploadPromptShown = true;
    setTimeout(() => {
      if (confirm('Dữ liệu trên mây đang trống, nhưng máy này có dữ liệu cũ (kể cả vị trí/định dạng thẻ, biểu đồ).\n\nBạn có muốn ĐẨY dữ liệu từ máy lên mây để dùng chung không?')) {
        uploadLocalDataToCloud();
      }
    }, 900);
  }

  // Đẩy MẠNH toàn bộ dữ liệu hiện tại (local) lên mây - dùng cho nút thủ công & prompt
  async function uploadLocalDataToCloud() {
    if (!isFirebaseOnline()) { showToast('Chưa ở chế độ online (cần kết nối mạng + SDK)', 'error'); return; }
    if (!state.currentUser) { showToast('Chưa đăng nhập', 'error'); return; }
    const r = state.currentUser.role;
    if (r !== 'admin' && r !== 'editor') { showToast('Bạn không có quyền ghi dữ liệu lên mây', 'error'); return; }
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
      // nhưng dữ liệu mới biến mất").
      let mergedFromCloud = false;
      if (fbRemoteDocExists && fbRemoteHasData && fbLastRemote &&
          cloudCore(fbLastRemote) !== cloudCore(collectCloudSnapshot())) {
        mergedFromCloud = mergeRemoteIntoLocal(fbLastRemote, true);
      }
      await fbDb.collection(FB_COLL).doc(FB_DOC).set(collectCloudSnapshot());
      fbUploadPromptShown = true;
      fbDirty = false;
      try { fbSeedCore = cloudCore(collectCloudSnapshot()); } catch (e) {}
      const counts = 'lô: ' + ((state.batches || []).length)
        + ', nguyên liệu: ' + ((state.materialRecords || []).length)
        + ', ép ván: ' + ((state.pressRecords || []).length);
      showToast('Đã đẩy dữ liệu lên mây thành công! (' + counts
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

  // ─── SHARE & SYNC MODAL ───────────────────────────────────────
  function openShareModal() {
    const tokenData = { timestamp: new Date().toISOString(), sender: state.currentUser?.fullname || 'Quản trị', batches: state.batches };
    const shareCode = btoa(encodeURIComponent(JSON.stringify(tokenData)));
    document.getElementById('share-token-input').value  = shareCode;
    document.getElementById('import-token-area').value  = '';
    document.getElementById('modal-share-data')?.classList.add('show');
    initLucide();
  }

  function closeShareModal() {
    document.getElementById('modal-share-data')?.classList.remove('show');
  }

  function copyShareTokenToClipboard() {
    const inp = document.getElementById('share-token-input');
    if (!inp) return;
    inp.select(); inp.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(inp.value).then(() => {
      showToast('Đã sao chép Mã Đồng Bộ!', 'success');
    }).catch(() => {
      showToast('Đã chọn mã chia sẻ! Ấn Ctrl+C để sao chép', 'info');
    });
  }

  function applyImportedShareToken() {
    if (!requireEditPermission()) return;
    const raw = document.getElementById('import-token-area')?.value.trim();
    if (!raw) { showToast('Vui lòng dán Mã Đồng Bộ!', 'error'); return; }
    try {
      const payload = JSON.parse(decodeURIComponent(atob(raw)));
      if (payload && Array.isArray(payload.batches)) {
        state.batches = payload.batches;
        saveData(); renderAll(); closeShareModal();
        showToast(`Đã đồng bộ dữ liệu từ ${payload.sender || 'Người chỉnh sửa'}!`, 'success');
      } else { showToast('Mã đồng bộ không hợp lệ!', 'error'); }
    } catch (e) { showToast('Không thể đọc mã đồng bộ: ' + e.message, 'error'); }
  }

export {
  FB_COLL,
  FB_DOC,
  FB_ROLES_DOC,
  FB_SETTINGS_COLL,
  applyFireSnapshot,
  applyImportedShareToken,
  applyRoleToUI,
  canEditNow,
  checkAuthAndRenderFirebase,
  closeShareModal,
  cloudCore,
  collectCloudSnapshot,
  copyShareTokenToClipboard,
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
  fbUploadPromptShown,
  firePushSync,
  flushPendingCloudPush,
  handleFirebaseAuth,
  handleRemoteConflict,
  handleRemoteSnapshot,
  hasCloudData,
  initFirebase,
  initLucide,
  isFirebaseOnline,
  localHasAnyData,
  maybePromptUpload,
  openShareModal,
  pullCloudToLocal,
  registerServiceWorker,
  requireEditPermission,
  requireTabEditPermission,
  resolveFirebaseRole,
  setupFirestoreSync,
  uploadLocalDataToCloud
};
