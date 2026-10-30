// ═══════════════════════════════════════════════════════════
// js/hr.js — TAB NHÂN SỰ (Quản lý nhân sự)
// ───────────────────────────────────────────────────────────
// Gồm:
//   1. DANH SÁCH NHÂN VIÊN (thông tin cơ sở, thêm/sửa/xóa, lọc theo bộ phận,
//      kỹ năng — các vị trí có thể làm)
//   2. XIN NGHỈ PHÉP (gửi đơn; ban lãnh đạo (Admin/Ban Quản Lý) duyệt
//      Đồng ý / Không đồng ý)
//   3. THỐNG KÊ NGHỈ PHÉP + TOP NHÂN VIÊN THEO SỐ NGÀY NGHỈ
//   4. NHÂN SỰ CẦN — TUYỂN DỤNG (dữ liệu cho biểu đồ kiểm soát nhân sự)
//   5. CHẤM CÔNG & PHÂN VỊ THEO NGÀY (đi làm / vắng; "nghỉ có phép" suy ra
//      từ đơn nghỉ ĐÃ DUYỆT; phân vị trí theo kỹ năng từng người)
//   6. VỊ TRÍ LÀM VIỆC & KỸ NĂNG (danh mục vị trí; mỗi NV 1-nhiều vị trí)
//   7. THỐNG KÊ ĐI LÀM THEO THÁNG (ngày công, nghỉ phép, vắng, tỷ lệ đi làm)
// Lưu localStorage + đồng bộ mây (firePushSync) như các tab khác.
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission, requirePayApply, requirePayLock } from './cloud.js';
import { trackDeleted } from './tombstone.js';
import { logDataChange } from './history.js';
import { STORAGE_KEY_HR_EMPLOYEES, STORAGE_KEY_HR_LEAVES, STORAGE_KEY_HR_RECRUITMENT, STORAGE_KEY_HR_POSNEEDS, STORAGE_KEY_HR_SHIFTS, STORAGE_KEY_HR_ASSIGN, STORAGE_KEY_HR_POSITIONS, STORAGE_KEY_HR_ATTENDANCE, STORAGE_KEY_HR_CHECKINS, STORAGE_KEY_HR_CI_ACKS, STORAGE_KEY_HR_PAY_ROWS, STORAGE_KEY_HR_PAY_LOCKS, STORAGE_KEY_HR_OVERTIMES, STORAGE_KEY_HR_CALENDAR, APP_VERSION, state } from './state.js';
import { STORAGE_KEY_HR_WORKER_EVALUATIONS } from './state.js';
import { canArea, canEditAnything, canPayLock } from './permissions.js';
import { escapeHTML, showToast } from './utils.js';
import { hideTreLoading, showTreLoading } from './loading.js'; // LOADING nông dân chặt tre — che lúc đọc file Excel
import * as repo from './repo.js'; // KHO DỮ LIỆU LỚN THEO THÁNG (IndexedDB)

  // ─── HẰNG SỐ NHÂN SỰ ────────────────────────────────────────────
  // Bộ phận cố định theo mô hình nhà máy — thứ tự này cũng dùng để SẮP XẾP
  // nhóm bộ phận trên bảng chấm công.
  // 21/10/2026 (yêu cầu người dùng): "Lò Hơi" GỘP VÀO "Cơ Điện" ⇒ còn 5 bộ
  // phận. Dữ liệu cũ được DI TRÚ một lần bằng migrateHrDeptMerge() (gọi trong
  // loadHrData + sau khi nạp bù IndexedDB + khi phục hồi backup). Dữ liệu vừa
  // về từ mây/file cũ vẫn được gom đúng nhờ hrDeptAliasOf().
  // ⚠ ĐỪNG NHẦM: "Lò hơi" ở tab NGUYÊN LIỆU (materialActiveLoc 'lo-hoi', cột
  // "Lò Hơi (TB/ngày)") là VỊ TRÍ NHẬP NGUYÊN LIỆU — KHÔNG gộp, KHÔNG đổi.
  const HR_DEPARTMENTS = ['Văn Phòng', 'Cơ Điện', 'QC', 'Xưởng 1', 'Xưởng 2'];
  const HR_EVAL_VIEW_KEY = 'bamboo_tracker_hr_eval_view_v1';
  var workerEvaluationEfficiencyProvider;
  const HR_DEPT_ALIAS = { 'Lò Hơi': 'Cơ Điện', 'Lò hơi': 'Cơ Điện', 'Lo Hoi': 'Cơ Điện', 'lo hoi': 'Cơ Điện' };
  // Bộ phận hiển thị sau khi gộp — nhận cả dữ liệu cũ chưa kịp di trú
  function hrDeptAliasOf(dept) {
    const raw = String(dept || '').trim();
    if (!raw) return raw;
    if (HR_DEPT_ALIAS[raw]) return HR_DEPT_ALIAS[raw];
    if (hrStripDiacritics(raw).toLowerCase() === 'lo hoi') return 'Cơ Điện';
    return raw;
  }
  // Đã kiểm tra di trú bộ phận trong phiên này chưa (tránh quét lại mảng lớn mỗi render)
  let hrDeptMergeChecked = false;
  const EMP_STATUS  = { active: 'Đang làm việc', pause: 'Tạm nghỉ', quit: 'Đã nghỉ việc' };
  const LEAVE_TYPES  = ['Nghỉ phép', 'Nghỉ chờ việc', 'Nghỉ không lương', 'Ốm', 'Việc gia đình', 'Khác'];
  const LEAVE_STATUS = { pending: 'Chờ duyệt', approved: 'Đồng ý', rejected: 'Không đồng ý' };
  const RECRUIT_STATUS = { open: 'Đang tuyển', done: 'Đã đủ người' };
  // Chấm công thủ công: đi làm / vắng. Riêng "Nghỉ có phép" KHÔNG lưu trùng —
  // suy ra trực tiếp từ đơn nghỉ đã duyệt (xem approvedLeaveOn).
  const ATT_STATUS = { work: 'Đi làm', absent: 'Vắng (không phép)' };

  // Duyệt/xóa đơn nghỉ: CHỈ Admin & Ban Quản Lý — xét theo VAI TRÒ (trước đây
  // dựa trên quyền "xem vùng nâng cao" nên editor được cấp riêng vẫn duyệt được).
  // Editor dù được cấp tab Nhân Sự cũng chỉ được TẠO đơn mới, không được duyệt/xóa.
  function canApproveLeave() {
    const role = state.currentUser ? state.currentUser.role : null;
    return role === 'admin' || role === 'manager';
  }

  // ─── VẼ ICON LUCIDE THEO NHỊP (20/10/2026) ─────────────────────
  // TRƯỚC ĐÂY renderHrView gọi initLucide() 8 lần liên tiếp (mỗi hàm con 1
  // lần) ⇒ lucide quét lại DOM và tạo SVG nhiều lượt (1.559 icon/lần vẽ, đo
  // thật) — riêng phần này đã làm tab Nhân Sự giật trên điện thoại.
  // NAY: mọi chỗ chỉ GỌI HẸN 1 lần cho khung hình kế tiếp (gộp cả loạt vẽ).
  let hrIconRaf = 0;
  function hrScheduleIcons() {
    if (hrIconRaf) return;
    const raf = (typeof requestAnimationFrame === 'function')
      ? requestAnimationFrame
      : (cb => setTimeout(cb, 0));
    hrIconRaf = raf(() => {
      hrIconRaf = 0;
      try { initLucide(); } catch (e) { /* lỗi icon không chặn render */ }
    });
  }

  // ─── LƯU TRỮ LỚN THEO THÁNG (IndexedDB) — 20/10/2026 ────────────
  // 3 mảng lớn (bố trí / chấm công / giờ máy) tăng theo (số người × số ngày):
  // 120 người ≈ 2,6 MB/tháng. localStorage chỉ 5–10 MB nên KHÔNG thể lưu cả
  // nhiều năm (đầy sau 1–3 tháng ⇒ mất dữ liệu lần lưu kế tiếp). Nay:
  //   · IndexedDB lưu TỪNG THÁNG (js/repo.js) — chỉ ghi lại tháng ĐỔI
  //   · localStorage chỉ giữ CACHE 2 tháng gần nhất để mở app là thấy ngay
  //   · Phần cũ tự nạp sau (không chặn boot) rồi vẽ lại nếu đang ở tab HR
  const HR_BIG_DOMAINS = ['hrAssignments', 'hrAttendance', 'hrCheckins'];
  let hrHydrated = false;
  let hrHydrationPromise = null;
  let hrRepoWarned = false;
  function hrMonthKeyOf(rec) {
    return String((rec && (rec.date || rec.from || (rec.createdAt || '').slice(0, 10))) || '').slice(0, 7);
  }
  function hrMonthListBack(n) {
    const d = new Date(); const out = [];
    for (let i = 0; i < n; i++) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push(dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'));
    }
    return out;
  }
  function hrCacheSlice(arr) {
    const months = new Set(hrMonthListBack(2));
    return (arr || []).filter(r => months.has(hrMonthKeyOf(r)));
  }
  // Gộp 2 nguồn theo id — bản có mốc updatedAt/createdAt MỚI HƠN thắng
  function hrRecStampOf(r) { return String((r && (r.updatedAt || r.createdAt)) || ''); }
  function hrMergeRecords(a, b) {
    const map = new Map();
    (a || []).forEach(r => { if (r && r.id) map.set(r.id, r); });
    (b || []).forEach(r => {
      if (!r || !r.id) return;
      const old = map.get(r.id);
      if (!old || hrRecStampOf(r) >= hrRecStampOf(old)) map.set(r.id, r);
    });
    return [...map.values()];
  }
  function hrWriteLocalCache(dom) {
    const io = HR_DOMAIN_IO.find(x => x.dom === dom);
    if (!io) return;
    try { localStorage.setItem(io.key, JSON.stringify(hrCacheSlice(state[dom] || []))); } catch (e) {}
  }
  // Nạp phần dữ liệu cũ từ IndexedDB trước khi bật đồng bộ mây.
  function hrHydrateFromRepo() {
    if (!repo.available() || hrHydrated) return Promise.resolve(true);
    if (hrHydrationPromise) return hrHydrationPromise;
    hrHydrationPromise = repo.prime(HR_BIG_DOMAINS)
      .then(() => Promise.all(HR_BIG_DOMAINS.map(d => repo.loadDomain(d).then(arr => [d, arr]))))
      .then(pairs => {
        const writes = [];
        pairs.forEach(([dom, arr]) => {
          const local = state[dom] || [];
          const merged = arr.length ? hrMergeRecords(arr, local) : local;
          state[dom] = merged;
          if (JSON.stringify(merged) !== JSON.stringify(arr) && merged.length) {
            writes.push(repo.putDomain(dom, merged, { dropMissing: true }));
          }
        });
        return Promise.all(writes).then(results => {
          const failed = results.find(r => !r || !r.persisted);
          if (failed) throw (failed.error || new Error('Không ghi được dữ liệu Nhân sự đã hợp nhất vào IndexedDB.'));
          hrHydrated = true;
          hrBumpIndex();
          // Dữ liệu bố trí nạp bù từ IndexedDB có thể còn nhãn cũ "Lò Hơi" ⇒ di trú
          try { migrateHrDeptMerge(); } catch (e) { console.error('[NHÂN SỰ] Không di trú được bộ phận cũ:', e); }
          HR_BIG_DOMAINS.forEach(d => { if (repo.healthy(d)) hrWriteLocalCache(d); });
          if (state.activeView === 'hr-view') { try { renderHrVisible(); } catch (e) { console.error('[NHÂN SỰ] Không vẽ lại được dữ liệu đã nạp:', e); } }
          return true;
        });
      })
      .catch(e => {
        console.error('[NHÂN SỰ] Không nạp/ghi bền được kho IndexedDB:', e);
        if (!hrRepoWarned) {
          hrRepoWarned = true;
          showToast('Không nạp hoặc lưu bền được toàn bộ dữ liệu Nhân Sự trên thiết bị. Dữ liệu chưa được xác nhận vẫn cần sao lưu/đồng bộ lại.', 'error');
        }
        return false;
      })
      .then(ok => {
        hrHydrationPromise = null;
        return ok;
      });
    return hrHydrationPromise;
  }

  // ─── GIỚI HẠN SỐ DÒNG BẢNG (20/10/2026) ────────────────────────
  // Bảng dài (nhân viên · chấm công · đối chiếu máy) trước đây render HẾT
  // mọi dòng ⇒ 1.559+ icon và layout nặng trên điện thoại. Nay mặc định
  // 200 dòng, bấm "Xem thêm" tăng 500 dòng (thuần phiên, không lưu máy).
  const HR_ROWS_PAGE = 200;
  const HR_ROWS_MORE = 500;
  const hrRowsLimit = { employees: HR_ROWS_PAGE, attendance: HR_ROWS_PAGE, ci: HR_ROWS_PAGE };
  function hrMoreRowHtml(kind, shown, total, colspan) {
    if (total <= shown) return '';
    const step = Math.min(HR_ROWS_MORE, total - shown);
    return `<tr class="hr-more-row"><td colspan="${colspan}" class="text-center" style="padding:10px;">` +
      `<button type="button" class="btn btn-outline btn-sm" onclick="app.hrShowMoreRows('${kind}')">` +
      `Xem thêm ${step} dòng (đang hiện ${shown}/${total})</button></td></tr>`;
  }
  function hrShowMoreRows(kind) {
    const k = hrRowsLimit[kind] ? kind : 'employees';
    hrRowsLimit[k] = (hrRowsLimit[k] || HR_ROWS_PAGE) + HR_ROWS_MORE;
    if (k === 'employees') renderHrEmployeesTable();
    else if (k === 'attendance') renderHrAttendanceCard();
    else if (k === 'ci') renderHrCheckinTable();
  }

  // ─── LƯU / NẠP DỮ LIỆU ──────────────────────────────────────────
  function loadHrData() {
    try { state.hrEmployees  = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_EMPLOYEES))  || []; } catch (e) { state.hrEmployees  = []; }
    try { state.hrLeaves     = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_LEAVES))     || []; } catch (e) { state.hrLeaves     = []; }
    try { state.hrRecruitment = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_RECRUITMENT)) || []; } catch (e) { state.hrRecruitment = []; }
    try { state.hrPositionNeeds = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_POSNEEDS)) || []; } catch (e) { state.hrPositionNeeds = []; }
    try { state.hrShifts = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_SHIFTS)) || []; } catch (e) { state.hrShifts = []; }
    try { state.hrAssignments = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_ASSIGN)) || []; } catch (e) { state.hrAssignments = []; }
    try { state.hrPositions  = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_POSITIONS))  || []; } catch (e) { state.hrPositions  = []; }
    try { state.hrAttendance = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_ATTENDANCE)) || []; } catch (e) { state.hrAttendance = []; }
    try { state.hrCheckins   = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_CHECKINS))   || []; } catch (e) { state.hrCheckins   = []; }
    try { state.hrCiAcks     = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_CI_ACKS))    || []; } catch (e) { state.hrCiAcks     = []; }
    if (!Array.isArray(state.hrCiAcks)) state.hrCiAcks = [];
    // DÒNG CÔNG ĐÃ XỬ LÝ + BẢN CHỐT CÔNG (20/10/2026)
    try { state.hrPayRows = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_PAY_ROWS)) || []; } catch (e) { state.hrPayRows = []; }
    if (!Array.isArray(state.hrPayRows)) state.hrPayRows = [];
    try { state.hrPayLocks = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_PAY_LOCKS)) || []; } catch (e) { state.hrPayLocks = []; }
    if (!Array.isArray(state.hrPayLocks)) state.hrPayLocks = [];
    try { state.hrOvertimes  = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_OVERTIMES))  || []; } catch (e) { state.hrOvertimes  = []; }
    // Lịch làm việc theo tháng (ngày nghỉ/lễ) — object theo khóa 'YYYY-MM'
    try { state.hrWorkCalendar = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_CALENDAR)) || {}; } catch (e) { state.hrWorkCalendar = {}; }
    if (!state.hrWorkCalendar || typeof state.hrWorkCalendar !== 'object') state.hrWorkCalendar = {};
    try { state.hrWorkerEvaluations = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_WORKER_EVALUATIONS)) || []; } catch (e) { state.hrWorkerEvaluations = []; }
    if (!Array.isArray(state.hrWorkerEvaluations)) state.hrWorkerEvaluations = [];
    // Hoàn tất nạp từ IndexedDB trước khi khởi tạo đồng bộ; sau đó áp dụng
    // migration cho cả chế độ fallback khi IndexedDB không khả dụng.
    return hrHydrateFromRepo().then(() => {
      try { migrateHrDeptMerge(); }
      catch (e) { console.error('[NHÂN SỰ] Không di trú được bộ phận cũ:', e); }
      if (hrReconcileAllAssignmentEnds()) saveHrData(['hrAssignments']);
      return true;
    });
  }

  // ─── DI TRÚ BỘ PHẬN: "Lò Hơi" → "Cơ Điện" (21/10/2026) ──────────
  // Đổi nhãn bộ phận ở 5 miền dữ liệu + cấu hình ca. KHÔNG xóa bản ghi nào
  // (chỉ đổi `department`), KHÔNG đụng 'lo-hoi' của tab Nguyên Liệu.
  // Idempotent: lần chạy sau không còn bản ghi nào đổi ⇒ không ghi localStorage.
  function migrateHrDeptMerge() {
    const NEW = 'Cơ Điện';
    const touched = [];
    const fixList = (list, dom) => {
      let n = 0;
      (list || []).forEach(r => {
        if (!r) return;
        const cur = String(r.department || '').trim();
        if (!cur || cur === NEW) return;
        if (hrDeptAliasOf(cur) !== NEW) return;
        r.department = NEW;
        r.updatedAt = new Date().toISOString();   // để máy khác nhận đúng bản mới (quy tắc 65)
        n++;
      });
      if (n) touched.push(dom);
      return n;
    };
    const nEmp  = fixList(state.hrEmployees, 'hrEmployees');
    const nPos  = fixList(state.hrPositions, 'hrPositions');
    const nNeed = fixList(state.hrPositionNeeds, 'hrPositionNeeds');
    const nRec  = fixList(state.hrRecruitment, 'hrRecruitment');
    const nAsg  = fixList(state.hrAssignments, 'hrAssignments');
    // CẤU HÌNH CA (khoá theo bộ phận): chỉ có Lò Hơi → đổi id; có cả 2 → giữ
    // Cơ Điện, bỏ Lò Hơi (giờ công lịch sử sẽ tính theo cấu hình Cơ Điện).
    let shiftMerged = false;
    const shifts = state.hrShifts || [];
    const oldCfg = shifts.find(s => s && hrDeptAliasOf(s.id) === NEW && s.id !== NEW);
    const newCfg = shifts.find(s => s && s.id === NEW);
    if (oldCfg) {
      shiftMerged = true;
      if (!newCfg) oldCfg.id = NEW;
      else state.hrShifts = shifts.filter(s => s !== oldCfg);
      touched.push('hrShifts');
    }
    if (state.hrBoardDept && hrDeptAliasOf(state.hrBoardDept) !== state.hrBoardDept) {
      state.hrBoardDept = hrDeptAliasOf(state.hrBoardDept);
    }
    if (!touched.length) return 0;
    saveHrData([...new Set(touched)]);
    const parts = [];
    if (nEmp)  parts.push(`${nEmp} nhân viên`);
    if (nPos)  parts.push(`${nPos} vị trí`);
    if (nNeed) parts.push(`${nNeed} dòng nhu cầu`);
    if (nRec)  parts.push(`${nRec} nhu cầu tuyển`);
    if (nAsg)  parts.push(`${nAsg} lượt bố trí`);
    try {
      showToast(`Đã gộp bộ phận "Lò Hơi" vào "Cơ Điện"${parts.length ? ': ' + parts.join(' · ') : ''}.`, 'info');
      if (shiftMerged) showToast('Cấu hình ca của "Lò Hơi" đã gộp vào "Cơ Điện" — kiểm tra lại giờ ca ở Cài Đặt Ca.', 'info');
    } catch (e) { /* toast không chặn */ }
    return nEmp + nPos + nNeed + nRec + nAsg;
  }

  // ─── LƯU DỮ LIỆU NHÂN SỰ — CHỈ GHI KEY ĐÃ ĐỔI (20/10/2026) ──────
  // TRƯỚC ĐÂY mỗi thao tác nhỏ (thêm 1 người vào ô bố trí, thêm 1 vị trí…)
  // đều GHI LẠI CẢ 12 key localStorage (mảng bố trí/chấm công/chấm máy có
  // thể vài MB) + ghi lịch sử 12 miền ⇒ 1 cú bấm mất ~1 giây (đo thật:
  // 963 ms cho thêm bố trí, 826 ms cho thêm vị trí).
  // NAY: chỉ ghi + ghi lịch sử ĐÚNG key thay đổi. Không truyền tham số =
  // giữ nguyên hành vi cũ (ghi tất cả) nên mọi chỗ gọi cũ vẫn đúng.
  const HR_DOMAIN_IO = [
    { dom: 'hrEmployees',     key: STORAGE_KEY_HR_EMPLOYEES,  get: () => state.hrEmployees,     def: [] },
    { dom: 'hrLeaves',        key: STORAGE_KEY_HR_LEAVES,     get: () => state.hrLeaves,        def: [] },
    { dom: 'hrRecruitment',   key: STORAGE_KEY_HR_RECRUITMENT, get: () => state.hrRecruitment,  def: [] },
    { dom: 'hrPositionNeeds', key: STORAGE_KEY_HR_POSNEEDS,   get: () => state.hrPositionNeeds, def: [] },
    { dom: 'hrShifts',        key: STORAGE_KEY_HR_SHIFTS,     get: () => state.hrShifts,        def: [] },
    { dom: 'hrAssignments',   key: STORAGE_KEY_HR_ASSIGN,     get: () => state.hrAssignments,   def: [] },
    { dom: 'hrPositions',     key: STORAGE_KEY_HR_POSITIONS,  get: () => state.hrPositions,     def: [] },
    { dom: 'hrAttendance',    key: STORAGE_KEY_HR_ATTENDANCE, get: () => state.hrAttendance,    def: [] },
    { dom: 'hrCheckins',      key: STORAGE_KEY_HR_CHECKINS,   get: () => state.hrCheckins,      def: [] },
    { dom: 'hrCiAcks',        key: STORAGE_KEY_HR_CI_ACKS,    get: () => state.hrCiAcks,        def: [] },
    { dom: 'hrPayRows',       key: STORAGE_KEY_HR_PAY_ROWS,   get: () => state.hrPayRows,       def: [] },
    { dom: 'hrPayLocks',      key: STORAGE_KEY_HR_PAY_LOCKS,  get: () => state.hrPayLocks,      def: [] },
    { dom: 'hrOvertimes',     key: STORAGE_KEY_HR_OVERTIMES,  get: () => state.hrOvertimes,     def: [] },
    { dom: 'hrWorkCalendar',  key: STORAGE_KEY_HR_CALENDAR,    get: () => state.hrWorkCalendar, def: {} },
    { dom: 'hrWorkerEvaluations', key: STORAGE_KEY_HR_WORKER_EVALUATIONS, get: () => state.hrWorkerEvaluations, def: [] }
  ];
  let hrQuotaWarned = false;
  function reportHrRepoFailure(io, value, error) {
    console.error('[NHÂN SỰ] Không ghi bền được ' + io.dom + ' vào IndexedDB:', error);
    try {
      localStorage.setItem(io.key, JSON.stringify(value == null ? io.def : value));
    } catch (fallbackError) {
      console.error('[NHÂN SỰ] Không thể giữ bản dự phòng localStorage cho ' + io.dom + ':', fallbackError);
      showToast('Không ghi được dữ liệu Nhân Sự vào IndexedDB hoặc bộ nhớ dự phòng. Hãy xuất dữ liệu ngay và kiểm tra dung lượng thiết bị.', 'error');
      return;
    }
    if (!hrRepoWarned) {
      hrRepoWarned = true;
      showToast('Kho Nhân Sự IndexedDB đang lỗi; dữ liệu được giữ tạm trong localStorage trên thiết bị này. Chưa thể bảo đảm đồng bộ đầy đủ.', 'error');
    }
  }
  function saveHrData(keys) {
    const want = Array.isArray(keys) && keys.length ? keys : HR_DOMAIN_IO.map(x => x.dom);
    const changed = [];
    const persistenceWrites = [];
    want.forEach(dom => {
      const io = HR_DOMAIN_IO.find(x => x.dom === dom);
      if (!io) return;
      const val = io.get();
      const isBig = HR_BIG_DOMAINS.indexOf(dom) !== -1;
      const repoWasHealthy = isBig && repo.healthy(dom);
      if (isBig) {
        try {
          const write = repo.putDomain(dom, val || [], { dropMissing: hrHydrated });
          persistenceWrites.push(Promise.resolve(write).then(result => {
            if (!repo.available() || (result && result.persisted)) {
              if (result && result.persisted && hrHydrated) hrWriteLocalCache(dom);
              return;
            }
            reportHrRepoFailure(io, val, (result && result.error) || repo.lastWriteErrorRef());
          }).catch(error => reportHrRepoFailure(io, val, error)));
        } catch (error) {
          persistenceWrites.push(Promise.resolve().then(() => reportHrRepoFailure(io, val, error)));
        }
      }
      // Miền LỚN: localStorage chỉ giữ 2 tháng gần nhất (cache mở app nhanh),
      // toàn bộ dữ liệu nằm ở IndexedDB theo tháng (xem hrHydrateFromRepo).
      const payload = (isBig && repoWasHealthy) ? hrCacheSlice(val) : (val == null ? io.def : val);
      try {
        localStorage.setItem(io.key, JSON.stringify(payload));
      } catch (e) {
        // Hết dung lượng localStorage (dữ liệu nhiều năm): KHÔNG chặn thao tác —
        // dữ liệu vẫn nằm trong state + mây; cảnh báo 1 lần để Admin biết.
        if (!hrQuotaWarned) {
          hrQuotaWarned = true;
          console.warn('[NHÂN SỰ] localStorage đã đầy — không ghi được key ' + io.key, e);
          try { showToast('Bộ nhớ trình duyệt đã đầy — dữ liệu Nhân Sự vẫn được giữ trên máy và đồng bộ mây, nhưng nên xuất file sao lưu.', 'error'); } catch (e2) {}
        }
      }
      changed.push(dom);
    });
    if (changed.length) logDataChange(changed);
    hrBumpIndex();   // dữ liệu đổi → chỉ mục tra cứu dựng lại ở lần đọc kế tiếp
    firePushSync();  // đồng bộ lên mây nếu online
    return Promise.all(persistenceWrites);
  }

  // ─── CHỈ MỤC TRA CỨU O(1) (20/10/2026) ──────────────────────────
  // TRƯỚC ĐÂY: hrEmpById / hrPosById / attRecordOf / checkinRecordOf /
  // approvedLeaveOn đều là .find() TUYẾN TÍNH và bị gọi BÊN TRONG vòng lặp
  // (computeAttendanceStats: 150 NV × 31 ngày × 13.500 bản ghi ≈ 62 TRIỆU
  // phép so sánh ⇒ 227 ms mỗi lần vẽ tab Nhân Sự; renderHrAttendanceCard
  // 110 ms; hrAssignmentsOf gọi lại theo từng dòng).
  // NAY: Map chỉ mục, CHỈ dựng lại khi tham chiếu mảng / độ dài đổi hoặc
  // sau khi lưu (hrBumpIndex). Map giữ THAM CHIẾU bản ghi nên sửa tại chỗ
  // (a.status = 'work') vẫn thấy ngay; thay cả phần tử thì hrBumpIndex lo.
  let hrIdxGen = 0;
  const hrIdx = { emp: null, pos: null, att: null, ci: null, leave: null, asgDate: null };
  function hrBumpIndex() { hrIdxGen++; }
  function hrIdxValid(cache, list) {
    return !!cache && cache.src === list && cache.len === list.length && cache.gen === hrIdxGen;
  }

  function hrEmpById(id) {
    const list = state.hrEmployees || [];
    if (!hrIdxValid(hrIdx.emp, list)) {
      const map = new Map();
      list.forEach(e => { if (e && e.id) map.set(e.id, e); });
      hrIdx.emp = { src: list, len: list.length, gen: hrIdxGen, map };
    }
    return hrIdx.emp.map.get(id) || null;
  }

  // Danh sách bố trí của MỘT NGÀY (gọi rất nhiều lần khi vẽ bảng chấm công)
  function hrAssignmentsOf(date, positionId) {
    const list = state.hrAssignments || [];
    if (!hrIdxValid(hrIdx.asgDate, list)) {
      const map = new Map();
      list.forEach(a => {
        if (!a || !a.date) return;
        if (!map.has(a.date)) map.set(a.date, []);
        map.get(a.date).push(a);
      });
      hrIdx.asgDate = { src: list, len: list.length, gen: hrIdxGen, map };
    }
    const day = hrIdx.asgDate.map.get(date) || [];
    return positionId ? day.filter(a => a.positionId === positionId) : day;
  }

  // Chấm công 1 người 1 ngày
  function attRecordOfMap() {
    const list = state.hrAttendance || [];
    if (!hrIdxValid(hrIdx.att, list)) {
      const map = new Map();
      list.forEach(a => { if (a && a.employeeId) map.set(`${a.employeeId}|${a.date}`, a); });
      hrIdx.att = { src: list, len: list.length, gen: hrIdxGen, map };
    }
    return hrIdx.att.map;
  }
  // Giờ máy chấm công 1 người 1 ngày
  function checkinRecordOfMap() {
    const list = state.hrCheckins || [];
    if (!hrIdxValid(hrIdx.ci, list)) {
      const map = new Map();
      list.forEach(c => { if (c && c.employeeId) map.set(`${c.employeeId}|${c.date}`, c); });
      hrIdx.ci = { src: list, len: list.length, gen: hrIdxGen, map };
    }
    return hrIdx.ci.map;
  }
  // Đơn nghỉ theo nhân viên (mỗi người vài đơn — duyệt tuần tự)
  function hrLeavesOfMap() {
    const list = state.hrLeaves || [];
    if (!hrIdxValid(hrIdx.leave, list)) {
      const map = new Map();
      list.forEach(l => {
        if (!l || !l.employeeId) return;
        if (!map.has(l.employeeId)) map.set(l.employeeId, []);
        map.get(l.employeeId).push(l);
      });
      hrIdx.leave = { src: list, len: list.length, gen: hrIdxGen, map };
    }
    return hrIdx.leave.map;
  }

  function hrEmpName(id) { const e = hrEmpById(id); return e ? e.name : 'Nhân viên đã xóa'; }
  function hrEmpDept(id) { const e = hrEmpById(id); return e ? e.department : '—'; }
  function fmtDateDMY(iso) {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('-');
    return d && m ? `${d}/${m}/${y}` : iso;
  }
  // Số ngày nghỉ = số ngày từ "từ ngày" → "đến ngày" (gộp cả 2 đầu)
  function leaveDaysCount(from, to) {
    if (!from || !to || to < from) return 1;
    return Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  }

  // ─── THỜI GIAN NGHỈ: cả ngày / nửa ngày (0.5) / theo giờ ─────────
  // 1 ngày làm việc chuẩn = 8 giờ. Chế độ "theo giờ" quy đổi ra ngày lẻ
  // (VD: 4 giờ = 0.5 ngày) để thống kê ngày nghỉ vẫn cộng đúng.
  const LEAVE_WORK_HOURS_PER_DAY = 8;
  // Nhãn dạng chữ (toast/thống kê): "3 ngày" | "0.5 ngày" | "4 giờ (≈ 0.5 ngày)"
  function leaveDurationText(l) {
    const days = l.days || leaveDaysCount(l.from, l.to);
    if (l.durationMode === 'hours' && l.hours) {
      return `${Number(l.hours).toLocaleString('vi-VN')} giờ (≈ ${days} ngày)`;
    }
    return `${days} ngày`;
  }
  // Nhãn dạng HTML cho bảng đơn nghỉ (bản ghi cũ không có durationMode → như trước)
  function leaveDurationLabel(l) {
    const days = l.days || leaveDaysCount(l.from, l.to);
    if (l.durationMode === 'hours' && l.hours) {
      return `<strong>${Number(l.hours).toLocaleString('vi-VN')} giờ</strong> <span style="font-size:0.68rem;color:var(--text-muted);">(≈ ${days} ngày)</span>`;
    }
    return `<strong>${days}</strong> ngày`;
  }
  // Đồng bộ UI form theo chế độ thời gian đã chọn:
  //  - "Cả ngày": chọn khoảng từ ngày → đến ngày (như cũ)
  //  - "Nửa ngày" / "Theo giờ": nghỉ TRONG MỘT ngày → khóa "Đến ngày" = "Từ ngày";
  //    riêng "Theo giờ" hiện thêm ô nhập số giờ.
  function syncLeaveDurationUI() {
    const mode = document.getElementById('leave-duration')?.value || 'full';
    const fromInput = document.getElementById('leave-from');
    const toInput = document.getElementById('leave-to');
    const hoursGroup = document.getElementById('group-leave-hours');
    if (!toInput) return;
    if (mode === 'full') {
      toInput.disabled = false;
      if (hoursGroup) hoursGroup.style.display = 'none';
      return;
    }
    if (fromInput && fromInput.value) toInput.value = fromInput.value;
    toInput.disabled = true;
    if (hoursGroup) hoursGroup.style.display = mode === 'hours' ? '' : 'none';
  }
  function hrPosById(id) {
    const list = state.hrPositions || [];
    if (!hrIdxValid(hrIdx.pos, list)) {
      const map = new Map();
      list.forEach(p => { if (p && p.id) map.set(p.id, p); });
      hrIdx.pos = { src: list, len: list.length, gen: hrIdxGen, map };
    }
    return hrIdx.pos.map.get(id) || null;
  }
  function hrPosName(id) { const p = hrPosById(id); return p ? p.name : 'Vị trí đã xóa'; }
  // Hôm nay theo GIỜ MÁY (yyyy-mm-dd) — không dùng toISOString (UTC) để tránh lệch ngày buổi tối
  function hrTodayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  // Cộng/trừ n ngày trên chuỗi yyyy-mm-dd (đi qua Date địa phương, an toàn timezone)
  function hrShiftDateISO(iso, days) {
    const [y, m, d] = String(iso).split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, (d || 1) + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  // ─── RENDER TOÀN TAB ────────────────────────────────────────────
  // ─── VẼ TAB NHÂN SỰ THEO TỪNG PHẦN (20/10/2026) ─────────────────
  // renderHrView() KHÔNG tham số = vẽ ĐỦ 12 bảng (giữ nguyên hành vi cũ cho
  // test + các luồng nhập liệu lớn). Truyền mảng phần (vd ['employees']) thì
  // CHỈ vẽ phần đó → dùng cho renderAll()/switchView() để không phải dựng lại
  // 12 bảng + 1.559 icon mỗi lần đồng bộ mây (trước đây 671 ms/lần).
  const HR_RENDER_PARTS = ['employees', 'attendance', 'checkin', 'positions', 'leaves', 'overtime', 'stats', 'evaluation', 'recruitment', 'posneeds', 'pay'];
  function renderHrView(parts) {
    const all = !Array.isArray(parts);
    const has = p => all || parts.indexOf(p) !== -1;
    populateHrSelects();
    if (has('employees')) renderHrEmployeesTable();
    if (has('attendance')) renderHrAttendanceCard();
    if (has('checkin')) renderHrCheckinTable();
    if (has('positions')) renderHrPositionsTable();
    if (has('leaves')) { renderHrLeavesTable(); renderHrLeaveStats(); }
    if (has('overtime')) renderHrOvertimesTable();
    if (has('stats')) renderHrAttendanceStats();
    if (has('evaluation') && (Array.isArray(parts) || (openDetailCard && openDetailCard.id === 'hr-worker-eval-card'))) {
      renderWorkerEvaluation();
    }
    if (has('recruitment')) renderHrRecruitmentTable();
    if (has('posneeds')) renderPositionNeedsTable();
    // THẺ CHỐT CÔNG: chỉ quét tháng khi ĐƯỢC YÊU CẦU (mở thẻ) hoặc thẻ đang mở —
    // tránh quét toàn bộ tháng 2 lần cho mỗi lần render toàn tab (quy tắc 86).
    if (has('pay') && (Array.isArray(parts) || hrPayCardIsOpen())) renderHrPayCard();
    // Bảng bố trí + đếm trên thẻ + dock: luôn cập nhật (đều nhẹ)
    renderHrBoard();
    updateHrCardGrid();
    hrDockRender();     // đồng bộ trạng thái dock 3 cấp (Home → nhóm → thẻ)
    syncHrMiniActive();
    hrScheduleIcons();
  }

  // Vẽ ĐÚNG phần đang mở (thẻ chi tiết nào đang pop-up) — dùng cho renderAll
  // và switchView. Không có thẻ nào mở → chỉ vẽ bảng bố trí + đếm + dock.
  function hrCardRenderParts(cardId) {
    // 21/10/2026 — SỬA LỖI "MỞ THẺ TRỐNG": map cũ dùng id KHÔNG khớp id thật
    // trong index.html (vd 'hr-posneeds-card' vs 'hr-posneed-card') ⇒
    // hrOpenCard gọi renderHrView([]) → không vẽ phần nào. Nay map theo ĐÚNG id
    // của thẻ, giữ alias id cũ, và id lạ thì vẽ ĐỦ (không bao giờ trả rỗng).
    const map = {
      // id THẬT trong index.html
      'hr-emp-card': ['employees'],
      'hr-att-card': ['attendance'],
      'hr-ci-card': ['checkin'],
      'hr-pos-card': ['positions'],
      'hr-leave-card': ['leaves'],
      'hr-ot-card': ['overtime'],
      'hr-stats-card': ['leaves'],          // Thống kê nghỉ phép (bảng + top)
      'hr-att-stats-card': ['stats'],       // Thống kê đi làm theo tháng
      'hr-worker-eval-card': ['evaluation'],
      'hr-recruit-card': ['recruitment'],
      'hr-posneed-card': ['posneeds'],      // Sơ đồ bong bóng 3 cấp
      'hr-pay-card': ['pay'],
      // alias id CŨ (giữ để tương thích)
      'hr-employees-card': ['employees'],
      'hr-attendance-card': ['attendance'],
      'hr-checkin-card': ['checkin'],
      'hr-positions-card': ['positions'],
      'hr-leaves-card': ['leaves'],
      'hr-overtime-card': ['overtime'],
      'hr-recruitment-card': ['recruitment'],
      'hr-posneeds-card': ['posneeds']
    };
    // Không có thẻ nào đang mở ⇒ chỉ vẽ bảng bố trí + đếm + dock (như cũ,
    // tránh vẽ lại 12 bảng mỗi lần đồng bộ mây — quy tắc 86).
    if (!cardId) return [];
    // Thẻ LẠ (không có trong map) → vẽ ĐỦ phần (trước đây trả [] làm thẻ trống trơn)
    return map[cardId] || HR_RENDER_PARTS.slice();
  }
  function renderHrVisible() {
    const cardId = openDetailCard ? openDetailCard.id : '';
    renderHrView(hrCardRenderParts(cardId));
  }

  // Sau thao tác BỐ TRÍ / VỊ TRÍ: chỉ vẽ lại bảng bố trí + đếm + dock.
  // TRƯỚC ĐÂY gọi renderHrView() (12 bảng) ⇒ thêm 1 người vào 1 ô mất 963 ms
  // và thêm 1 vị trí mất 826 ms (đo thật) — dù chỉ 1 ô đổi.
  function renderHrAfterBoardChange() {
    // Bảng "Nhân sự cần tại vị trí" tự nạp vị trí mới / cập nhật tên — rất nhẹ
    renderPositionNeedsTable();
    renderHrBoard();
    updateHrCardGrid();
    syncHrMiniActive();
    hrScheduleIcons();
  }

  // Điền danh sách nhân viên vào select đơn nghỉ + select lọc bộ phận.
  // QUAN TRỌNG: giữ nguyên lựa chọn đang có (cur) qua các lần render lại —
  // nếu không, mỗi lần đổi bộ lọc (gọi renderHrView) select "Bộ phận" bị xây
  // lại và snap về "Tất Cả" khiến bộ lọc tưởng như không hoạt động.
  function populateHrSelects() {
    ['hr-emp-filter-dept', 'hr-recruit-filter-dept', 'hr-att-filter-dept', 'hr-ci-filter-dept', 'hr-attstats-filter-dept'].forEach(selId => {
      const sel = document.getElementById(selId);
      if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = '<option value="all">Tất Cả Bộ Phận</option>' +
        HR_DEPARTMENTS.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
      if (cur) sel.value = cur;
    });
    const evalDept = document.getElementById('hr-eval-filter-dept');
    if (evalDept) {
      const cur = evalDept.value;
      const depts = HR_DEPARTMENTS.filter(d => d !== 'Văn Phòng');
      evalDept.innerHTML = '<option value="all">Tất Cả Bộ Phận (trừ Văn Phòng)</option>' +
        depts.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
      if (cur && depts.includes(cur)) evalDept.value = cur;
      else evalDept.value = 'all';
    }
  }

  // ─── 1) DANH SÁCH NHÂN VIÊN ──────────────────────────────────────
  function renderHrEmployeesTable() {
    const tbody = document.getElementById('hr-employees-body');
    if (!tbody) return;
    const dept   = document.getElementById('hr-emp-filter-dept')?.value || 'all';
    const status = document.getElementById('hr-emp-filter-status')?.value || 'all';
    const q      = (document.getElementById('hr-emp-search')?.value || '').trim().toLowerCase();

    const list = (state.hrEmployees || []).filter(e => {
      if (dept !== 'all' && e.department !== dept) return false;
      if (status !== 'all' && (e.status || 'active') !== status) return false;
      if (q) {
        const hay = `${e.name || ''} ${e.code || ''} ${e.phone || ''} ${e.position || ''} ${e.title || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const countEl = document.getElementById('hr-employees-count');
    if (countEl) countEl.textContent = `${list.length} / ${(state.hrEmployees || []).length} nhân viên`;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="users" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>${(state.hrEmployees || []).length ? 'Không có nhân viên nào khớp bộ lọc.' : 'Chưa có nhân viên nào. Bấm "Thêm Nhân Viên" để bắt đầu.'}</p></td></tr>`;
      hrScheduleIcons();
      return;
    }

    const shownList = list.slice(0, hrRowsLimit.employees);
    tbody.innerHTML = shownList.map(e => {
      const st = e.status || 'active';
      const stCls = st === 'active' ? 'ok' : (st === 'pause' ? 'warn' : 'off');
      // Người đã nghỉ việc: chip trạng thái kèm NGÀY NGHỈ VIỆC (ngày làm cuối)
      const stCell = `<span class="hr-chip ${stCls}">${EMP_STATUS[st]}</span>` +
        (st === 'quit' && e.quitDate ? ` <span style="font-size:0.68rem; color:var(--text-muted); white-space:nowrap;">nghỉ ${fmtDateDMY(e.quitDate)}</span>` : '');
      return `<tr>
        <td class="hr-emp-code">${escapeHTML(e.code || '—')}</td>
        <td><strong>${escapeHTML(e.name || '')}</strong></td>
        <td>${escapeHTML(e.gender || '—')}</td>
        <td>${fmtDateDMY(e.birthDate)}</td>
        <td>${escapeHTML(e.phone || '—')}</td>
        <td>${escapeHTML(e.department || '—')}</td>
        <td>${escapeHTML(e.position || '—')}</td>
        <td>${escapeHTML(e.title || '—')}</td>
        <td>${fmtDateDMY(e.joinDate)}</td>
        <td>${stCell}</td>
        <td class="hr-notes" title="${escapeHTML(e.notes || '')}">${escapeHTML(e.notes || '—')}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;" data-perm="hr">
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrEditEmployee('${e.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeleteEmployee('${e.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('') + hrMoreRowHtml('employees', shownList.length, list.length, 12);
  }

  // Ẩn/hiện ô "Ngày Nghỉ Việc" theo Trạng Thái (chỉ hiện khi "Đã nghỉ việc")
  function syncEmployeeQuitDateRow() {
    const row = document.getElementById('employee-quitdate-row');
    if (row) row.style.display = document.getElementById('employee-status')?.value === 'quit' ? '' : 'none';
  }

  function openEmployeeModal(id) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-employee');
    const form = document.getElementById('employee-form');
    if (!modal || !form) return;
    form.reset();
    const deptSel = document.getElementById('employee-department');
    if (deptSel) deptSel.innerHTML = hrDeptOptions();
    const titleEl = document.getElementById('employee-modal-title');

    if (id) {
      const e = hrEmpById(id);
      if (!e) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Nhân Viên: ${escapeHTML(e.name)}`;
      document.getElementById('employee-id').value = e.id;
      document.getElementById('employee-code').value = e.code || '';
      document.getElementById('employee-name').value = e.name || '';
      document.getElementById('employee-gender').value = e.gender || 'Nam';
      document.getElementById('employee-birth').value = e.birthDate || '';
      document.getElementById('employee-phone').value = e.phone || '';
      document.getElementById('employee-idcard').value = e.idCard || '';
      document.getElementById('employee-address').value = e.address || '';
      document.getElementById('employee-department').value = e.department || HR_DEPARTMENTS[0];
      document.getElementById('employee-position').value = e.position || '';
      document.getElementById('employee-title').value = e.title || '';
      document.getElementById('employee-joindate').value = e.joinDate || '';
      document.getElementById('employee-status').value = e.status || 'active';
      document.getElementById('employee-quitdate').value = e.quitDate || '';
      document.getElementById('employee-notes').value = e.notes || '';
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="user-plus"></i> Thêm Nhân Viên Mới`;
      document.getElementById('employee-id').value = '';
      document.getElementById('employee-status').value = 'active';
      document.getElementById('employee-gender').value = 'Nam';
      document.getElementById('employee-code').value = `NV${String((state.hrEmployees || []).length + 1).padStart(3, '0')}`;
    }
    // Kỹ năng — các vị trí nhân viên có thể làm (tick nhiều vị trí)
    renderEmployeeSkillsBox(id ? (hrEmpById(id)?.skills || []) : []);
    syncEmployeeQuitDateRow();
    modal.classList.add('show');
    hrScheduleIcons();
  }

  function closeEmployeeModal() {
    document.getElementById('modal-employee')?.classList.remove('show');
  }

  function handleEmployeeSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const id = document.getElementById('employee-id').value;
    const name = document.getElementById('employee-name').value.trim();
    if (!name) { showToast('Họ và tên không được để trống!', 'error'); return; }

    const status = document.getElementById('employee-status').value;
    const quitDate = status === 'quit' ? (document.getElementById('employee-quitdate')?.value || '') : '';
    const data = {
      id: id || `emp-${Date.now()}`,
      code: document.getElementById('employee-code').value.trim(),
      name,
      gender: document.getElementById('employee-gender').value,
      birthDate: document.getElementById('employee-birth').value,
      phone: document.getElementById('employee-phone').value.trim(),
      idCard: document.getElementById('employee-idcard').value.trim(),
      address: document.getElementById('employee-address').value.trim(),
      department: document.getElementById('employee-department').value,
      position: document.getElementById('employee-position').value.trim(),
      title: document.getElementById('employee-title').value.trim(),
      joinDate: document.getElementById('employee-joindate').value,
      status,
      // Ngày nghỉ việc (ngày làm cuối) — chỉ có ý nghĩa khi "Đã nghỉ việc";
      // bảng chấm công vẫn xuất người này đến hết tháng nghỉ, tháng sau tự ẩn.
      quitDate,
      skills: collectEmployeeSkills(),
      notes: document.getElementById('employee-notes').value.trim(),
      updatedAt: new Date().toISOString()
    };

    if (id) {
      const idx = state.hrEmployees.findIndex(x => x.id === id);
      if (idx !== -1) state.hrEmployees[idx] = { ...state.hrEmployees[idx], ...data };
      showToast(`Đã cập nhật nhân viên ${name}!`, 'success');
    } else {
      data.createdAt = new Date().toISOString();
      state.hrEmployees.push(data);
      showToast(`Đã thêm nhân viên ${name}!`, 'success');
    }
    saveHrData();
    closeEmployeeModal();
    renderHrView();
  }

  function deleteEmployee(id) {
    if (!requireEditPermission()) return;
    const e = hrEmpById(id);
    if (!e) return;
    if (!confirm(`Xóa nhân viên "${e.name}"? Các đơn nghỉ phép & dữ liệu chấm công/phân vị của người này cũng bị xóa.`)) return;
    trackDeleted('hrEmployees', id);
    // Cascade xóa: đơn nghỉ + chấm công + giờ máy chấm công của người này cũng bị xóa
    trackDeleted('hrLeaves', (state.hrLeaves || []).filter(l => l.employeeId === id).map(l => l.id));
    trackDeleted('hrAttendance', (state.hrAttendance || []).filter(a => a.employeeId === id).map(a => a.id));
    trackDeleted('hrCheckins', (state.hrCheckins || []).filter(c => c.employeeId === id).map(c => c.id));
    state.hrEmployees = state.hrEmployees.filter(x => x.id !== id);
    state.hrLeaves = (state.hrLeaves || []).filter(l => l.employeeId !== id);
    state.hrAttendance = (state.hrAttendance || []).filter(a => a.employeeId !== id);
    state.hrCheckins = (state.hrCheckins || []).filter(c => c.employeeId !== id);
    saveHrData();
    renderHrView();
    showToast(`Đã xóa nhân viên ${e.name}`, 'info');
  }

  // ─── KỸ NĂNG NHÂN VIÊN (vị trí có thể làm) TRONG MODAL NHÂN VIÊN ──
  // Nhóm chip tick: bấm chọn nhiều vị trí; chip "on" = đã chọn.
  // Vị trí hiển thị THEO BỘ PHẬN đang chọn của nhân viên (+ vị trí chưa phân
  // bộ phận + những kỹ năng đã chọn trước đó để vẫn bỏ tick được).
  function renderEmployeeSkillsBox(selected) {
    const box = document.getElementById('employee-skills-box');
    if (!box) return;
    const list = state.hrPositions || [];
    if (!list.length) {
      box.innerHTML = '<span style="font-size:0.72rem;color:var(--text-muted);">Chưa có vị trí nào — thêm ở bảng "Vị Trí Làm Việc" bên dưới để đánh dấu kỹ năng.</span>';
      return;
    }
    const dept = document.getElementById('employee-department')?.value || '';
    const sel = selected || [];
    const visible = list.filter(p => !p.department || p.department === dept || sel.includes(p.id));
    if (!visible.length) {
      box.innerHTML = '<span style="font-size:0.72rem;color:var(--text-muted);">Bộ phận này chưa có vị trí làm việc — thêm ở bảng "Vị Trí Làm Việc" (chọn cùng bộ phận).</span>';
      return;
    }
    box.innerHTML = visible.map(p => `
      <label class="att-pos-chip${sel.includes(p.id) ? ' on' : ''}" title="Bấm chọn nếu nhân viên làm được vị trí này">
        <input type="checkbox" value="${escapeHTML(p.id)}" ${sel.includes(p.id) ? 'checked' : ''} style="display:none;">
        ${escapeHTML(p.name)}${p.department ? ` <span style="font-weight:400;opacity:0.75;">· ${escapeHTML(p.department)}</span>` : ''}
      </label>`).join('');
    box.querySelectorAll('input[type="checkbox"]').forEach(inp => {
      inp.addEventListener('change', () => {
        inp.closest('.att-pos-chip')?.classList.toggle('on', inp.checked);
      });
    });
  }

  function collectEmployeeSkills() {
    return [...document.querySelectorAll('#employee-skills-box input[type="checkbox"]:checked')].map(i => i.value);
  }

  // ─── Ô GỢI Ý NHÂN VIÊN (COMBOBOX) TRONG FORM XIN NGHỈ PHÉP ──────
  // Gõ tên / mã NV / SĐT → lọc không phân biệt dấu → bấm chọn (hoặc ↑↓ Enter)
  function leaveEmployeeSuggestions(q) {
    const key = hrStripDiacritics(q);
    return (state.hrEmployees || [])
      .filter(e => (e.status || 'active') !== 'quit')
      .filter(e => !key || hrStripDiacritics(`${e.name} ${e.code} ${e.phone} ${e.department} ${e.position}`).includes(key))
      .slice(0, 30);
  }

  function renderLeaveEmployeeSuggestions() {
    const box = document.getElementById('leave-employee-suggest');
    if (!box) return;
    const list = leaveEmployeeSuggestions(document.getElementById('leave-employee')?.value || '');
    if (!list.length) {
      box.innerHTML = '<div class="hr-combobox-empty">Không tìm thấy nhân viên nào</div>';
      box.style.display = 'block';
      return;
    }
    box.innerHTML = list.map(e => `
      <div class="hr-combobox-item" data-emp-id="${escapeHTML(e.id)}">
        <strong>${escapeHTML(e.name)}</strong>
        <span class="hr-combobox-meta">${escapeHTML((e.code ? e.code + ' · ' : '') + (e.department || '') + (e.position ? ' · ' + e.position : ''))}</span>
      </div>`).join('');
    box.style.display = 'block';
  }

  function hideLeaveEmployeeSuggestions() {
    const box = document.getElementById('leave-employee-suggest');
    if (box) box.style.display = 'none';
  }

  // Chọn 1 nhân viên từ danh sách gợi ý
  function pickLeaveEmployee(id) {
    const e = hrEmpById(id);
    const input = document.getElementById('leave-employee');
    const hidden = document.getElementById('leave-employee-id');
    if (e && input) input.value = e.name;
    if (hidden) hidden.value = id;
    hideLeaveEmployeeSuggestions();
  }

  // Điều hướng bằng bàn phím: ↑↓ di chuyển, Enter chọn, Esc đóng
  function handleLeaveEmployeeKeydown(evt) {
    const box = document.getElementById('leave-employee-suggest');
    if (!box || box.style.display === 'none') return;
    const items = box.querySelectorAll ? Array.from(box.querySelectorAll('.hr-combobox-item')) : [];
    if (!items.length) return;
    let activeIdx = items.findIndex(it => it.classList && it.classList.contains('active'));
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      evt.preventDefault();
      const delta = evt.key === 'ArrowDown' ? 1 : -1;
      activeIdx = (activeIdx + delta + items.length) % items.length;
      items.forEach((it, i) => it.classList && it.classList.toggle('active', i === activeIdx));
      if (items[activeIdx] && items[activeIdx].scrollIntoView) items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (evt.key === 'Enter') {
      evt.preventDefault();
      const target = items[activeIdx >= 0 ? activeIdx : 0];
      if (target) pickLeaveEmployee(target.getAttribute('data-emp-id'));
    } else if (evt.key === 'Escape') {
      hideLeaveEmployeeSuggestions();
    }
  }

  // ─── 2) XIN NGHỈ PHÉP ────────────────────────────────────────────
  function renderHrLeavesTable() {
    const tbody = document.getElementById('hr-leaves-body');
    if (!tbody) return;
    const leaves = state.hrLeaves || [];
    const countEl = document.getElementById('hr-leaves-count');
    if (countEl) {
      const pending = leaves.filter(l => (l.status || 'pending') === 'pending').length;
      countEl.textContent = `${leaves.length} đơn (${pending} chờ duyệt)`;
    }
    if (!leaves.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="calendar-x" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có đơn xin nghỉ phép nào. Bấm "Xin Nghỉ Phép" để gửi đơn.</p></td></tr>`;
      hrScheduleIcons();
      return;
    }
    const sorted = [...leaves].sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const approver = canArea('ap.leave', 'approve');

    tbody.innerHTML = sorted.map(l => {
      const st = l.status || 'pending';
      const stCls = st === 'approved' ? 'ok' : (st === 'rejected' ? 'off' : 'warn');
      const actions = [];
      if (st === 'pending' && approver) {
        actions.push(`<button class="btn btn-success btn-sm" onclick="app.hrApproveLeave('${l.id}')" title="Duyệt Đồng ý"><i data-lucide="check"></i> Đồng Ý</button>`);
        actions.push(`<button class="btn btn-outline btn-sm" onclick="app.hrRejectLeave('${l.id}')" title="Không duyệt" style="color:var(--danger);"><i data-lucide="x"></i> Không Đồng Ý</button>`);
      }
      // IM LẶNG lúc render: dùng canEditTab('hr') thay vì requireEditPermission()
      // (trước đây render bảng đơn nghỉ bắn toast "không có quyền" MỖI lần
      // chuyển sang tab Nhân Sự — nguyên nhân chính của cảnh báo phiền toái).
      // Xóa đơn: chỉ ban lãnh đạo (Admin & Ban Quản Lý) — editor chỉ tạo đơn mới
      if (approver) {
        actions.push(`<button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeleteLeave('${l.id}')" title="Xóa đơn" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>`);
      }
      return `<tr>
        <td><strong>${escapeHTML(hrEmpName(l.employeeId))}</strong><br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(hrEmpDept(l.employeeId))}</span></td>
        <td>${escapeHTML(l.type || 'Nghỉ phép')}</td>
        <td>${fmtDateDMY(l.from)}</td>
        <td>${fmtDateDMY(l.to)}</td>
        <td>${leaveDurationLabel(l)}</td>
        <td class="hr-notes" title="${escapeHTML(l.reason || '')}">${escapeHTML(l.reason || '—')}</td>
        <td><span class="hr-chip ${stCls}">${LEAVE_STATUS[st]}</span>${l.approvedBy ? `<br><span style="font-size:0.68rem;color:var(--text-muted);">bởi ${escapeHTML(l.approvedBy)}</span>` : ''}</td>
        <td class="text-right"><div style="display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap;">${actions.join('')}</div></td>
      </tr>`;
    }).join('');
  }

  function openLeaveModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-leave');
    const form = document.getElementById('leave-form');
    if (!modal || !form) return;
    form.reset();
    if (!(state.hrEmployees || []).length) {
      showToast('Chưa có nhân viên nào — thêm nhân viên trước khi xin nghỉ phép!', 'error');
      return;
    }
    const typeSel = document.getElementById('leave-type');
    if (typeSel) typeSel.innerHTML = LEAVE_TYPES.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('leave-from').value = today;
    document.getElementById('leave-to').value = today;
    // Thời gian nghỉ về mặc định "Cả ngày" (reset form đã trả select về mặc định)
    syncLeaveDurationUI();
    // Xóa nội dung ô tìm kiếm nhân viên + ẩn gợi ý
    const empInput = document.getElementById('leave-employee');
    if (empInput) empInput.value = '';
    const empHidden = document.getElementById('leave-employee-id');
    if (empHidden) empHidden.value = '';
    hideLeaveEmployeeSuggestions();
    modal.classList.add('show');
    hrScheduleIcons();
  }

  function closeLeaveModal() {
    document.getElementById('modal-leave')?.classList.remove('show');
  }

  function handleLeaveSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    // Nhân viên: ưu tiên id đã chọn từ gợi ý; nếu gõ tay mà trùng khớp đúng 1 tên thì chấp nhận
    const empInput = (document.getElementById('leave-employee')?.value || '').trim();
    let employeeId = document.getElementById('leave-employee-id')?.value || '';
    if (!employeeId && empInput) {
      const exact = (state.hrEmployees || []).filter(x =>
        (x.status || 'active') !== 'quit' && x.name.toLowerCase() === empInput.toLowerCase());
      if (exact.length === 1) employeeId = exact[0].id;
    }
    if (!employeeId) { showToast('Vui lòng gõ tên và chọn nhân viên từ danh sách gợi ý!', 'error'); return; }
    const type = document.getElementById('leave-type').value;
    const from = document.getElementById('leave-from').value;
    let to = document.getElementById('leave-to').value;
    const reason = document.getElementById('leave-reason').value.trim();
    if (!employeeId) { showToast('Vui lòng chọn nhân viên!', 'error'); return; }
    if (!from || !to) { showToast('Vui lòng chọn ngày nghỉ (từ ngày → đến ngày)!', 'error'); return; }
    if (to < from) { showToast('"Đến ngày" không được trước "Từ ngày"!', 'error'); return; }

    // Thời gian nghỉ: Cả ngày / Nửa ngày (0.5) / Theo giờ (1 ngày làm = 8 giờ)
    const mode = document.getElementById('leave-duration')?.value || 'full';
    let days = leaveDaysCount(from, to);
    let hours = null;
    if (mode === 'half') {
      to = from;            // nửa ngày chỉ áp dụng TRONG MỘT ngày
      days = 0.5;
    } else if (mode === 'hours') {
      to = from;            // nghỉ theo giờ cũng trong 1 ngày
      hours = parseFloat((document.getElementById('leave-hours')?.value || '').replace(',', '.'));
      if (!hours || hours <= 0) { showToast('Vui lòng nhập số giờ nghỉ (VD: 4)!', 'error'); return; }
      if (hours > 12) { showToast('Số giờ nghỉ tối đa 12 giờ (1 ngày làm = 8 giờ).', 'error'); return; }
      days = Math.round((hours / LEAVE_WORK_HOURS_PER_DAY) * 100) / 100; // VD: 4 giờ = 0.5 ngày
    }

    state.hrLeaves.push({
      id: `leave-${Date.now()}`,
      employeeId, type, from, to,
      days,
      durationMode: mode,                    // 'full' | 'half' | 'hours'
      hours: (mode === 'hours') ? hours : null,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    saveHrData();
    closeLeaveModal();
    renderHrView();
    showToast(`Đã gửi đơn nghỉ ${leaveDurationText({ durationMode: mode, hours, days, from, to })} cho ${hrEmpName(employeeId)} — chờ ban lãnh đạo duyệt`, 'success');
  }

  // ═══ 2b) ĐĂNG KÝ TĂNG CA (mini card tương đồng "Xin Nghỉ Phép") ═══
  // Người đăng ký nhập GIỜ DỰ KIẾN (từ → đến). Giờ tăng ca THỰC TẾ KHÔNG
  // lưu cứng — tự tính từ Bảng bố trí vị trí theo ngày (hrAssignments):
  // khi giờ làm được cập nhật lại (sự cố, kéo dài ca) thì số giờ TC hiển
  // thị tự thay đổi theo (overtimeActualMin + hrSplitHoursHC).
  function toMinT(t) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; }

  // Giờ TC THỰC TẾ (phút) của 1 đăng ký: tổng phần NGOÀI ca chuẩn của các
  // lượt gán người đó trong ngày trên Bảng bố trí. Chưa có dữ liệu → 0.
  function overtimeActualMin(ot) {
    if (!ot || !ot.employeeId || !ot.date) return 0;
    const assignments = hrAssignmentsOf(ot.date).filter(a => a.employeeId === ot.employeeId);
    const schedule = hrAssignmentScheduleOf(assignments);
    return assignments.reduce((sum, a) => sum + hrSplitAssignmentHoursDate(a, ot.date, schedule).tc, 0);
  }
  // Nhãn giờ DỰ KIẾN: "17:30 → 19:30 · 2h"
  function overtimePlannedText(ot) {
    let m = toMinT(ot.end) - toMinT(ot.start);
    if (m <= 0) m += 1440; // qua nửa đêm
    return `${fmtHour(ot.start)} → ${fmtHour(ot.end)} · ${fmtHm(m)}`;
  }

  function overtimeActor() {
    const user = state.currentUser || {};
    return {
      uid: String(user.uid || ''),
      email: String(user.email || user.username || ''),
      name: String(user.fullname || user.username || user.email || 'Không rõ'),
      role: String(user.role || '')
    };
  }
  function sameOvertimeActor(a, b) {
    if (!a || !b) return false;
    if (a.uid && b.uid) return a.uid === b.uid;
    return !!(a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase());
  }
  function overtimeSnapshot(ot) {
    if (!ot) return null;
    return {
      employeeId: ot.employeeId || '',
      date: ot.date || '',
      start: ot.start || '',
      end: ot.end || '',
      plannedMin: Number(ot.plannedMin) || 0,
      reason: ot.reason || '',
      status: ot.status || 'pending'
    };
  }
  function appendOvertimeAudit(ot, action, before, after, reason) {
    if (!Array.isArray(ot.auditTrail)) ot.auditTrail = [];
    const actor = overtimeActor();
    ot.auditTrail.push({
      id: 'ot-audit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      at: new Date().toISOString(),
      action,
      actor,
      reason: String(reason || ''),
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null
    });
  }
  function overtimeCanRequestAmendment(ot) {
    const actor = overtimeActor();
    const creator = ot && ot.createdBy ? ot.createdBy : {};
    if (canArea('ap.ot', 'approve')) return true;
    if (!state.currentUser) return false;
    if (!creator.email && !creator.uid) return canEditAnything() || canPayLock();
    return (!!creator.email && creator.email.toLowerCase() === actor.email.toLowerCase())
      || (!!creator.uid && creator.uid === actor.uid);
  }
  function overtimeAuditActionLabel(action) {
    return ({
      submitted: 'Đã gửi đơn',
      approved: 'Đã duyệt',
      rejected: 'Đã từ chối',
      amendment_requested: 'Đã yêu cầu điều chỉnh',
      amendment_approved: 'Đã duyệt điều chỉnh',
      amendment_rejected: 'Đã từ chối điều chỉnh',
      cancelled: 'Đã hủy đơn'
    })[action] || 'Đã thay đổi';
  }
  function overtimeAuditHtml(ot) {
    const events = Array.isArray(ot.auditTrail) ? ot.auditTrail : [];
    if (!events.length) return '<p class="hr-notes">Đơn cũ chưa có nhật ký chi tiết.</p>';
    return '<details class="hr-overtime-audit"><summary>Nhật ký thao tác (' + events.length + ')</summary><ol>'
      + events.map(ev => {
        const actor = ev.actor || {};
        const beforeAfter = (ev.before || ev.after)
          ? '<details><summary>Xem nội dung trước/sau</summary><pre>' + escapeHTML(JSON.stringify({ before: ev.before, after: ev.after }, null, 2)) + '</pre></details>'
          : '';
        return '<li><strong>' + escapeHTML(overtimeAuditActionLabel(ev.action)) + '</strong>'
          + ' · ' + escapeHTML(actor.name || actor.email || 'Không rõ')
          + (actor.email ? ' (' + escapeHTML(actor.email) + ')' : '')
          + ' · ' + escapeHTML(ev.at ? new Date(ev.at).toLocaleString('vi-VN') : '')
          + (ev.reason ? '<br>Lý do: ' + escapeHTML(ev.reason) : '')
          + beforeAfter + '</li>';
      }).join('')
      + '</ol></details>';
  }

  function renderHrOvertimesTable() {
    const tbody = document.getElementById('hr-ot-body');
    if (!tbody) return;
    const list = state.hrOvertimes || [];
    const countEl = document.getElementById('hr-ot-count');
    if (countEl) {
      const pend = list.filter(o => (o.status || 'pending') === 'pending').length;
      countEl.textContent = `${list.length} đơn (${pend} chờ duyệt)`;
    }
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="clock-plus" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có đăng ký tăng ca nào. Bấm "Đăng Ký Tăng Ca" để gửi đăng ký.</p></td></tr>`;
      hrScheduleIcons();
      return;
    }
    const approver = canArea('ap.ot', 'approve');
    const sorted = [...list].sort((a, b) =>
      String(b.date || '').localeCompare(String(a.date || '')) ||
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    tbody.innerHTML = sorted.map(o => {
      const st = o.status || 'pending';
      const stCls = st === 'approved' ? 'ok' : (st === 'rejected' || st === 'cancelled' ? 'off' : 'warn');
      const stLabel = ({ pending: 'Chờ duyệt', approved: 'Đồng ý', rejected: 'Không đồng ý', cancelled: 'Đã hủy' })[st] || 'Không rõ';
      const actMin = overtimeActualMin(o);
      const actHtml = actMin > 0
        ? `<span class="hr-chip on" title="Giờ tăng ca THỰC TẾ — tự tính từ Bảng bố trí theo ngày (tự cập nhật khi sửa giờ/sự cố)"><i data-lucide="check"></i> TC <strong>${fmtHm(actMin)}</strong></span>`
        : '<span style="color:var(--text-muted);font-size:0.75rem;" title="Chưa có giờ làm trong Bảng bố trí theo ngày">— chưa có</span>';
      const actions = [];
      if (st === 'pending' && approver) {
        actions.push(`<button class="btn btn-success btn-sm" onclick="app.hrApproveOvertime('${o.id}')" title="Duyệt Đồng ý"><i data-lucide="check"></i> Đồng Ý</button>`);
        actions.push(`<button class="btn btn-outline btn-sm" onclick="app.hrRejectOvertime('${o.id}')" title="Không duyệt" style="color:var(--danger);"><i data-lucide="x"></i> Không Đồng Ý</button>`);
      }
      if (st !== 'cancelled' && overtimeCanRequestAmendment(o)) {
        actions.push(`<button class="btn btn-outline btn-sm" onclick="app.hrRequestOvertimeAmendment('${o.id}')" title="Gửi yêu cầu điều chỉnh"><i data-lucide="file-pen-line"></i> Yêu cầu sửa</button>`);
      }
      if (approver && st !== 'cancelled') {
        actions.push(`<button class="btn btn-outline btn-sm" onclick="app.hrCancelOvertime('${o.id}')" title="Hủy đơn (giữ lại lịch sử)" style="color:var(--danger);"><i data-lucide="ban"></i> Hủy đơn</button>`);
      }
      const creator = o.createdBy || {};
      const amendments = Array.isArray(o.amendments) ? o.amendments : [];
      const amendmentHtml = amendments.map(a => {
        const aLabel = ({ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Không đồng ý' })[a.status] || 'Không rõ';
        const changes = a.proposed || {};
        const amendActions = a.status === 'pending' && approver
          ? `<button class="btn btn-success btn-sm" onclick="app.hrApproveOvertimeAmendment('${o.id}','${a.id}')">Duyệt sửa</button> <button class="btn btn-outline btn-sm" onclick="app.hrRejectOvertimeAmendment('${o.id}','${a.id}')">Từ chối sửa</button>`
          : '';
        return `<div class="hr-overtime-amendment"><strong>Yêu cầu sửa · ${escapeHTML(aLabel)}</strong>`
          + `<div>${escapeHTML(a.requestedBy?.name || a.requestedBy?.email || 'Không rõ người gửi')} · ${escapeHTML(a.requestedAt ? new Date(a.requestedAt).toLocaleString('vi-VN') : '')}</div>`
          + `<div>Lý do: ${escapeHTML(a.reason || '—')}</div>`
          + `<div>Đề xuất: ${escapeHTML(changes.date || o.date)} · ${escapeHTML(changes.start || o.start)}–${escapeHTML(changes.end || o.end)} · ${escapeHTML(changes.reason || '—')}</div>`
          + (a.reviewedBy ? `<div>Người xử lý: ${escapeHTML(a.reviewedBy.name || a.reviewedBy.email || '')} · ${escapeHTML(a.reviewedAt || '')}</div>` : '')
          + amendActions + '</div>';
      }).join('');
      return `<tr>
        <td><strong>${escapeHTML(hrEmpName(o.employeeId))}</strong><br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(hrEmpDept(o.employeeId))}</span></td>
        <td>${fmtDateDMY(o.date)}</td>
        <td>${overtimePlannedText(o)}</td>
        <td>${actHtml}</td>
        <td><span class="hr-chip ${stCls}">${stLabel}</span>${creator.name ? `<br><span style="font-size:0.68rem;color:var(--text-muted);">Tạo bởi ${escapeHTML(creator.name)}${creator.email ? ' · ' + escapeHTML(creator.email) : ''}</span>` : '<br><span style="font-size:0.68rem;color:var(--text-muted);">Đơn cũ chưa lưu người tạo</span>'}${o.approvedBy ? `<br><span style="font-size:0.68rem;color:var(--text-muted);">Duyệt bởi ${escapeHTML(o.approvedBy)}</span>` : ''}</td>
        <td class="hr-notes" title="${escapeHTML(o.reason || '')}">${escapeHTML(o.reason || '—')}${amendmentHtml}${overtimeAuditHtml(o)}</td>
        <td class="text-right"><div style="display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap;">${actions.join('')}</div></td>
      </tr>`;
    }).join('');
  }

  // ─── Ô gợi ý nhân viên (combobox) trong form Đăng Ký Tăng Ca ─────
  // Tái dùng bộ lọc leaveEmployeeSuggestions; riêng phần DOM dùng id "ot-"
  function renderOvertimeEmployeeSuggestions() {
    const box = document.getElementById('ot-employee-suggest');
    if (!box) return;
    const list = leaveEmployeeSuggestions(document.getElementById('ot-employee')?.value || '');
    if (!list.length) {
      box.innerHTML = '<div class="hr-combobox-empty">Không tìm thấy nhân viên nào</div>';
      box.style.display = 'block';
      return;
    }
    box.innerHTML = list.map(e => `
      <div class="hr-combobox-item" data-emp-id="${escapeHTML(e.id)}">
        <strong>${escapeHTML(e.name)}</strong>
        <span class="hr-combobox-meta">${escapeHTML((e.code ? e.code + ' · ' : '') + (e.department || '') + (e.position ? ' · ' + e.position : ''))}</span>
      </div>`).join('');
    box.style.display = 'block';
  }

  function hideOvertimeEmployeeSuggestions() {
    const box = document.getElementById('ot-employee-suggest');
    if (box) box.style.display = 'none';
  }

  function pickOvertimeEmployee(id) {
    const e = hrEmpById(id);
    const input = document.getElementById('ot-employee');
    const hidden = document.getElementById('ot-employee-id');
    if (e && input) input.value = e.name;
    if (hidden) hidden.value = id;
    hideOvertimeEmployeeSuggestions();
  }

  function handleOvertimeEmployeeKeydown(evt) {
    const box = document.getElementById('ot-employee-suggest');
    if (!box || box.style.display === 'none') return;
    const items = box.querySelectorAll ? Array.from(box.querySelectorAll('.hr-combobox-item')) : [];
    if (!items.length) return;
    let activeIdx = items.findIndex(it => it.classList && it.classList.contains('active'));
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      evt.preventDefault();
      const delta = evt.key === 'ArrowDown' ? 1 : -1;
      activeIdx = (activeIdx + delta + items.length) % items.length;
      items.forEach((it, i) => it.classList && it.classList.toggle('active', i === activeIdx));
      if (items[activeIdx] && items[activeIdx].scrollIntoView) items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (evt.key === 'Enter') {
      evt.preventDefault();
      const target = items[activeIdx >= 0 ? activeIdx : 0];
      if (target) pickOvertimeEmployee(target.getAttribute('data-emp-id'));
    } else if (evt.key === 'Escape') {
      hideOvertimeEmployeeSuggestions();
    }
  }

  // pending link: đơn TC đang được tạo từ nút "Xử lý" của 1 dòng công
  let ciPayPendingOt = null;
  function openOvertimeModal(preset) {
    // Người được Admin cấp quyền CHỐT CÔNG cũng gửi được đơn bổ sung (không cần
    // quyền sửa tab Nhân sự) — quyết định 20/10/2026.
    if (!canPayLock() && !requireEditPermission()) return;
    const modal = document.getElementById('modal-overtime');
    const form = document.getElementById('ot-form');
    if (!modal || !form) return;
    form.reset();
    if (!(state.hrEmployees || []).length) {
      showToast('Chưa có nhân viên nào — thêm nhân viên trước khi đăng ký tăng ca!', 'error');
      return;
    }
    ciPayPendingOt = (preset && preset.employeeId) ? { employeeId: preset.employeeId, date: preset.date } : null;
    // Danh sách mốc 30 phút (05:00 → 23:30) cho giờ dự kiến
    const opts = `<option value="">--</option>` + hrHalfHourOptions().map(t => `<option value="${t}">${t}</option>`).join('');
    const startSel = document.getElementById('ot-start');
    const endSel = document.getElementById('ot-end');
    if (startSel) startSel.innerHTML = opts;
    if (endSel) endSel.innerHTML = opts;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('ot-date').value = today;
    if (startSel) startSel.value = '17:30';
    if (endSel) endSel.value = '19:30';
    const empInput = document.getElementById('ot-employee');
    const empHidden = document.getElementById('ot-employee-id');
    if (empInput) empInput.value = '';
    if (empHidden) empHidden.value = '';
    const banner = document.getElementById('ot-ci-banner');
    if (banner) { banner.hidden = true; banner.textContent = ''; }
    // ĐIỀN SẴN từ dòng công đang xử lý (bổ sung đơn TC — không giới hạn ngày)
    if (preset && preset.employeeId) {
      if (empHidden) empHidden.value = preset.employeeId;
      if (empInput) empInput.value = preset.employeeName || hrEmpName(preset.employeeId);
      const dateEl = document.getElementById('ot-date');
      if (dateEl) dateEl.value = preset.date || today;
      if (startSel && preset.start) startSel.value = preset.start;
      if (endSel && preset.end) endSel.value = preset.end;
      const rs = document.getElementById('ot-reason');
      if (rs) rs.value = preset.reason || '';
      if (banner) {
        banner.hidden = false;
        banner.textContent = `Bổ sung đơn tăng ca cho dòng đang xử lý: ${preset.employeeName || hrEmpName(preset.employeeId)} · ${fmtDateDMY(preset.date)}`
          + (preset.gapMin ? ` — TC thực tế vượt đơn ${fmtHm(preset.gapMin)}` : '');
      }
    }
    hideOvertimeEmployeeSuggestions();
    modal.classList.add('show');
    hrScheduleIcons();
  }

  function closeOvertimeModal() {
    document.getElementById('modal-overtime')?.classList.remove('show');
  }

  function requestOvertimeAmendment(id) {
    const ot = (state.hrOvertimes || []).find(x => x && x.id === id);
    if (!ot || ot.status === 'cancelled') return;
    if (!overtimeCanRequestAmendment(ot)) {
      showToast('Chỉ người gửi đơn hoặc người có quyền duyệt mới được yêu cầu điều chỉnh.', 'error');
      return;
    }
    if ((ot.amendments || []).some(a => a && a.status === 'pending')) {
      showToast('Đơn này đang có yêu cầu điều chỉnh chờ duyệt.', 'error');
      return;
    }
    const modal = document.getElementById('modal-overtime-amendment');
    const startSel = document.getElementById('ot-amend-start');
    const endSel = document.getElementById('ot-amend-end');
    if (!modal || !startSel || !endSel) return;
    const opts = `<option value="">--</option>` + hrHalfHourOptions().map(t => `<option value="${t}">${t}</option>`).join('');
    startSel.innerHTML = opts;
    endSel.innerHTML = opts;
    document.getElementById('ot-amend-request-id').value = ot.id;
    document.getElementById('ot-amend-employee').textContent = hrEmpName(ot.employeeId);
    document.getElementById('ot-amend-date').value = ot.date || '';
    startSel.value = ot.start || '';
    endSel.value = ot.end || '';
    document.getElementById('ot-amend-reason').value = ot.reason || '';
    document.getElementById('ot-amend-why').value = '';
    modal.classList.add('show');
    hrScheduleIcons();
  }

  function closeOvertimeAmendmentModal() {
    document.getElementById('modal-overtime-amendment')?.classList.remove('show');
  }

  function handleOvertimeAmendmentSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('ot-amend-request-id')?.value || '';
    const ot = (state.hrOvertimes || []).find(x => x && x.id === id);
    if (!ot || ot.status === 'cancelled') return;
    if (!overtimeCanRequestAmendment(ot)) {
      showToast('Chỉ người gửi đơn hoặc người có quyền duyệt mới được yêu cầu điều chỉnh.', 'error');
      return;
    }
    if ((ot.amendments || []).some(a => a && a.status === 'pending')) {
      showToast('Đơn này đang có yêu cầu điều chỉnh chờ duyệt.', 'error');
      return;
    }
    const date = document.getElementById('ot-amend-date')?.value || '';
    const start = document.getElementById('ot-amend-start')?.value || '';
    const end = document.getElementById('ot-amend-end')?.value || '';
    const businessReason = (document.getElementById('ot-amend-reason')?.value || '').trim();
    const reason = (document.getElementById('ot-amend-why')?.value || '').trim();
    if (!date || !start || !end) {
      showToast('Vui lòng nhập đủ ngày và giờ dự kiến mới.', 'error');
      return;
    }
    if (!reason) {
      showToast('Bắt buộc nêu lý do điều chỉnh để người duyệt đối chiếu.', 'error');
      return;
    }
    let plannedMin = toMinT(end) - toMinT(start);
    if (plannedMin < 0) plannedMin += 1440;
    if (!plannedMin) {
      showToast('Giờ kết thúc phải khác giờ bắt đầu.', 'error');
      return;
    }
    const proposed = { date, start, end, plannedMin, reason: businessReason };
    const before = overtimeSnapshot(ot);
    if (JSON.stringify(before) === JSON.stringify(Object.assign({}, before, proposed))) {
      showToast('Nội dung điều chỉnh không có thay đổi.', 'info');
      return;
    }
    const actor = overtimeActor();
    const requestedAt = new Date().toISOString();
    const amendment = {
      id: 'otam-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      status: 'pending',
      requestedBy: actor,
      requestedAt,
      reason,
      proposed
    };
    if (!Array.isArray(ot.amendments)) ot.amendments = [];
    ot.amendments.push(amendment);
    ot.updatedAt = requestedAt;
    appendOvertimeAudit(ot, 'amendment_requested', before, Object.assign({}, before, proposed), reason);
    saveHrData(['hrOvertimes']);
    closeOvertimeAmendmentModal();
    renderHrView();
    showToast('Đã gửi yêu cầu điều chỉnh tăng ca; dữ liệu gốc được giữ nguyên cho tới khi duyệt.', 'success');
  }

  function handleOvertimeSubmit(e) {
    e.preventDefault();
    // Người có quyền CHỐT CÔNG được gửi đơn bổ sung dù không có quyền sửa tab NS
    if (!canPayLock() && !requireEditPermission()) return;
    const empInput = (document.getElementById('ot-employee')?.value || '').trim();
    let employeeId = document.getElementById('ot-employee-id')?.value || '';
    if (!employeeId && empInput) {
      const exact = (state.hrEmployees || []).filter(x =>
        (x.status || 'active') !== 'quit' && x.name.toLowerCase() === empInput.toLowerCase());
      if (exact.length === 1) employeeId = exact[0].id;
    }
    if (!employeeId) { showToast('Vui lòng gõ tên và chọn nhân viên từ danh sách gợi ý!', 'error'); return; }
    const date = document.getElementById('ot-date')?.value || '';
    const start = document.getElementById('ot-start')?.value || '';
    const end = document.getElementById('ot-end')?.value || '';
    const reason = (document.getElementById('ot-reason')?.value || '').trim();
    if (!date) { showToast('Vui lòng chọn ngày tăng ca!', 'error'); return; }
    if (!start || !end) { showToast('Vui lòng chọn giờ tăng ca dự kiến (từ → đến)!', 'error'); return; }
    if (!reason) { showToast('Vui lòng nêu lý do đăng ký tăng ca!', 'error'); return; }
    let plannedMin = toMinT(end) - toMinT(start);
    if (plannedMin < 0) plannedMin += 1440; // làm qua nửa đêm
    if (plannedMin === 0) { showToast('Giờ kết thúc phải khác giờ bắt đầu!', 'error'); return; }

    const linked = !!(ciPayPendingOt && ciPayPendingOt.employeeId === employeeId && ciPayPendingOt.date === date);
    const otId = `ot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();
    const ot = {
      id: otId,
      employeeId, date, start, end,
      plannedMin,
      reason,
      status: 'pending',
      autoFromCi: linked,
      createdAt,
      updatedAt: createdAt,
      createdBy: overtimeActor(),
      auditTrail: []
    };
    appendOvertimeAudit(ot, 'submitted', null, overtimeSnapshot(ot), reason);
    state.hrOvertimes.push(ot);
    saveHrData(['hrOvertimes']);
    // Gắn mã đơn vào DÒNG CÔNG đang xử lý → đơn được duyệt là dòng tự chốt
    if (linked) payMarkAddOt(employeeId, date, otId, reason || 'Bổ sung đơn TC từ bảng đối chiếu');
    ciPayPendingOt = null;
    closeOvertimeModal();
    renderHrView();
    showToast(`Đã gửi đăng ký tăng ca ${fmtHour(start)} → ${fmtHour(end)} (${fmtHm(plannedMin)}) cho ${hrEmpName(employeeId)} — chờ ban lãnh đạo duyệt${linked ? ' (đã gắn vào dòng công đang xử lý)' : ''}`, 'success');
  }

  // Ban lãnh đạo duyệt: Đồng ý / Không đồng ý (chỉ đơn đang chờ)
  function approveLeave(id) {
    if (!canArea('ap.leave', 'approve')) {
      showToast('Chỉ Admin & Ban Quản Lý (ban lãnh đạo) mới được duyệt đơn nghỉ phép!', 'error');
      return;
    }
    const l = (state.hrLeaves || []).find(x => x.id === id);
    if (!l || (l.status || 'pending') !== 'pending') return;
    l.status = 'approved';
    l.approvedBy = state.currentUser?.fullname || state.currentUser?.email || 'Ban lãnh đạo';
    l.approvedAt = new Date().toISOString();
    saveHrData();
    renderHrView();
    showToast(`Đã ĐỒNG Ý đơn nghỉ của ${hrEmpName(l.employeeId)} (${leaveDurationText(l)})`, 'success');
  }

  function rejectLeave(id) {
    if (!canArea('ap.leave', 'approve')) {
      showToast('Chỉ Admin & Ban Quản Lý (ban lãnh đạo) mới được duyệt đơn nghỉ phép!', 'error');
      return;
    }
    const l = (state.hrLeaves || []).find(x => x.id === id);
    if (!l || (l.status || 'pending') !== 'pending') return;
    l.status = 'rejected';
    l.approvedBy = state.currentUser?.fullname || state.currentUser?.email || 'Ban lãnh đạo';
    l.approvedAt = new Date().toISOString();
    saveHrData();
    renderHrView();
    showToast(`Đã KHÔNG ĐỒNG Ý đơn nghỉ của ${hrEmpName(l.employeeId)}`, 'info');
  }

  // Duyệt / không duyệt / hủy đăng ký tăng ca — chỉ Admin & Ban Quản Lý.
  function approveOvertime(id) {
    if (!canArea('ap.ot', 'approve')) {
      showToast('Chỉ Admin & Ban Quản Lý mới được duyệt đăng ký tăng ca!', 'error');
      return;
    }
    const o = (state.hrOvertimes || []).find(x => x.id === id);
    if (!o || (o.status || 'pending') !== 'pending') return;
    const actor = overtimeActor();
    if (sameOvertimeActor(o.createdBy, actor)) {
      showToast('Người tạo đơn không được tự duyệt đơn của mình.', 'error');
      return;
    }
    const before = overtimeSnapshot(o);
    o.status = 'approved';
    o.approvedBy = actor.name;
    o.approvedByEmail = actor.email;
    o.approvedAt = new Date().toISOString();
    o.updatedAt = o.approvedAt;
    appendOvertimeAudit(o, 'approved', before, overtimeSnapshot(o), '');
    saveHrData(['hrOvertimes']);
    // Dòng công đang chờ "Bổ sung đơn TC" → tự chốt nếu TC đã được phủ đủ
    paySyncOtApproved(o);
    renderHrView();
    const act = overtimeActualMin(o);
    showToast(`Đã ĐỒNG Ý tăng ca của ${hrEmpName(o.employeeId)} (${overtimePlannedText(o)}${act > 0 ? ` · thực tế TC ${fmtHm(act)}` : ''})`, 'success');
  }

  function rejectOvertime(id) {
    if (!canArea('ap.ot', 'approve')) {
      showToast('Chỉ Admin & Ban Quản Lý mới được duyệt đăng ký tăng ca!', 'error');
      return;
    }
    const o = (state.hrOvertimes || []).find(x => x.id === id);
    if (!o || (o.status || 'pending') !== 'pending') return;
    const actor = overtimeActor();
    if (sameOvertimeActor(o.createdBy, actor)) {
      showToast('Người tạo đơn không được tự từ chối đơn của mình.', 'error');
      return;
    }
    const reviewReason = String(window.prompt('Nhập lý do từ chối đăng ký tăng ca:') || '').trim();
    if (!reviewReason) {
      showToast('Cần ghi lý do từ chối để lưu vết kiểm tra.', 'error');
      return;
    }
    const before = overtimeSnapshot(o);
    o.status = 'rejected';
    o.approvedBy = actor.name;
    o.approvedByEmail = actor.email;
    o.approvedAt = new Date().toISOString();
    o.reviewReason = reviewReason;
    o.updatedAt = o.approvedAt;
    appendOvertimeAudit(o, 'rejected', before, overtimeSnapshot(o), reviewReason);
    saveHrData(['hrOvertimes']);
    // Dòng công chờ đơn TC này → chuyển "Bị từ chối" để người xử lý biết
    paySyncOtRejected(o, 'Đơn tăng ca bị Ban lãnh đạo từ chối');
    renderHrView();
    showToast(`Đã KHÔNG duyệt đăng ký tăng ca của ${hrEmpName(o.employeeId)}`, 'info');
  }

  function cancelOvertime(id) {
    if (!canArea('ap.ot', 'approve')) {
      showToast('Chỉ Admin & Ban Quản Lý mới được hủy đăng ký tăng ca!', 'error');
      return;
    }
    const o = (state.hrOvertimes || []).find(x => x.id === id);
    if (!o || o.status === 'cancelled') return;
    const reason = String(window.prompt('Nhập lý do hủy đơn tăng ca (bản ghi sẽ được giữ lại):') || '').trim();
    if (!reason) {
      showToast('Cần ghi lý do hủy; đơn chưa bị thay đổi.', 'error');
      return;
    }
    const before = overtimeSnapshot(o);
    const actor = overtimeActor();
    const at = new Date().toISOString();
    o.status = 'cancelled';
    o.cancelledBy = actor;
    o.cancelledAt = at;
    o.updatedAt = at;
    (o.amendments || []).filter(a => a && a.status === 'pending').forEach(a => {
      a.status = 'rejected';
      a.reviewedBy = actor;
      a.reviewedAt = at;
      a.reviewReason = 'Đơn tăng ca đã được hủy.';
    });
    appendOvertimeAudit(o, 'cancelled', before, overtimeSnapshot(o), reason);
    saveHrData(['hrOvertimes']);
    renderHrView();
    showToast('Đã hủy đơn tăng ca; bản ghi và lịch sử được giữ lại.', 'info');
  }

  function deleteOvertime(id) {
    return cancelOvertime(id);
  }

  function approveOvertimeAmendment(id, amendmentId) {
    if (!canArea('ap.ot', 'approve')) {
      showToast('Chỉ Admin & Ban Quản Lý mới được duyệt điều chỉnh tăng ca!', 'error');
      return;
    }
    const ot = (state.hrOvertimes || []).find(x => x && x.id === id);
    const amendment = ot && (ot.amendments || []).find(a => a && a.id === amendmentId);
    if (!ot || ot.status === 'cancelled' || !amendment || amendment.status !== 'pending') return;
    const actor = overtimeActor();
    if (sameOvertimeActor(amendment.requestedBy, actor)) {
      showToast('Người yêu cầu điều chỉnh không được tự duyệt yêu cầu của mình.', 'error');
      return;
    }
    const before = overtimeSnapshot(ot);
    Object.assign(ot, amendment.proposed);
    amendment.status = 'approved';
    amendment.reviewedBy = actor;
    amendment.reviewedAt = new Date().toISOString();
    ot.updatedAt = amendment.reviewedAt;
    appendOvertimeAudit(ot, 'amendment_approved', before, overtimeSnapshot(ot), amendment.reason);
    saveHrData(['hrOvertimes']);
    renderHrView();
    showToast('Đã duyệt yêu cầu điều chỉnh; bản gốc vẫn còn trong nhật ký.', 'success');
  }

  function rejectOvertimeAmendment(id, amendmentId) {
    if (!canArea('ap.ot', 'approve')) {
      showToast('Chỉ Admin & Ban Quản Lý mới được từ chối điều chỉnh tăng ca!', 'error');
      return;
    }
    const ot = (state.hrOvertimes || []).find(x => x && x.id === id);
    const amendment = ot && (ot.amendments || []).find(a => a && a.id === amendmentId);
    if (!ot || ot.status === 'cancelled' || !amendment || amendment.status !== 'pending') return;
    const actor = overtimeActor();
    if (sameOvertimeActor(amendment.requestedBy, actor)) {
      showToast('Người yêu cầu điều chỉnh không được tự xử lý yêu cầu của mình.', 'error');
      return;
    }
    const reason = String(window.prompt('Nhập lý do từ chối yêu cầu điều chỉnh:') || '').trim();
    if (!reason) {
      showToast('Cần ghi lý do từ chối để lưu vết kiểm tra.', 'error');
      return;
    }
    const before = overtimeSnapshot(ot);
    amendment.status = 'rejected';
    amendment.reviewedBy = actor;
    amendment.reviewedAt = new Date().toISOString();
    amendment.reviewReason = reason;
    ot.updatedAt = amendment.reviewedAt;
    appendOvertimeAudit(ot, 'amendment_rejected', before, overtimeSnapshot(ot), reason);
    saveHrData(['hrOvertimes']);
    renderHrView();
    showToast('Đã từ chối yêu cầu điều chỉnh; dữ liệu gốc được giữ nguyên.', 'info');
  }

  function deleteLeave(id) {
    // Chỉ Admin & Ban Quản Lý được xóa đơn nghỉ — editor chỉ được TẠO đơn mới
    if (!canArea('ap.leave', 'approve')) {
      showToast('Chỉ Admin & Ban Quản Lý mới được xóa đơn nghỉ phép!', 'error');
      return;
    }
    trackDeleted('hrLeaves', id);
    state.hrLeaves = (state.hrLeaves || []).filter(l => l.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa đơn nghỉ phép', 'info');
  }

  // ─── 3) THỐNG KÊ NGHỈ PHÉP + TOP NGHỈ ────────────────────────────
  // Chỉ tính đơn ĐÃ ĐƯỢC DUYỆT (Đồng ý) — thống kê theo từng nhân viên,
  // sắp xếp giảm dần theo số ngày nghỉ = bảng xếp hạng (TOP).
  function computeLeaveStats() {
    const stats = {}; // employeeId -> { name, dept, times, days }
    (state.hrLeaves || []).forEach(l => {
      if ((l.status || 'pending') !== 'approved') return;
      if (!stats[l.employeeId]) {
        stats[l.employeeId] = { name: hrEmpName(l.employeeId), dept: hrEmpDept(l.employeeId), times: 0, days: 0 };
      }
      stats[l.employeeId].times += 1;
      stats[l.employeeId].days += (l.days || leaveDaysCount(l.from, l.to));
    });
    return Object.values(stats).sort((a, b) => b.days - a.days);
  }

  function renderHrLeaveStats() {
    const stats = computeLeaveStats();
    const approved = stats.reduce((s, x) => s + x.times, 0);
    const totalDays = stats.reduce((s, x) => s + x.days, 0);
    const pending = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;

    const chipsEl = document.getElementById('hr-leave-stat-chips');
    if (chipsEl) {
      chipsEl.innerHTML = `
        <span class="hr-stat-chip"><i data-lucide="calendar-x"></i> Đã duyệt: <strong>${approved} đơn</strong></span>
        <span class="hr-stat-chip"><i data-lucide="clock"></i> Chờ duyệt: <strong>${pending} đơn</strong></span>
        <span class="hr-stat-chip"><i data-lucide="hourglass"></i> Tổng ngày nghỉ: <strong>${totalDays} ngày</strong></span>`;
    }

    const tbody = document.getElementById('hr-leave-stats-body');
    if (!tbody) return;
    if (!stats.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:22px;color:var(--text-muted);">Chưa có đơn nghỉ nào được duyệt.</td></tr>`;
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    tbody.innerHTML = stats.map((s, i) => `<tr>
        <td><strong>${medals[i] || '#' + (i + 1)}</strong></td>
        <td><strong>${escapeHTML(s.name)}</strong></td>
        <td>${escapeHTML(s.dept)}</td>
        <td>${s.times} lần</td>
        <td><strong>${s.days}</strong> ngày</td>
      </tr>`).join('');
  }

  // ─── 5) CHẤM CÔNG & PHÂN VỊ THEO NGÀY ────────────────────────────
  // Mỗi nhân viên/ngày tối đa 1 bản ghi (sparse: chỉ lưu người ĐÃ chấm).
  // "Nghỉ có phép" KHÔNG lưu trùng — suy ra trực tiếp từ đơn nghỉ ĐÃ DUYỆT
  // (hrLeaves) phủ ngày đang xem, nên luôn khớp phê duyệt của ban lãnh đạo.
  function attRecordOf(employeeId, date) {
    return attRecordOfMap().get(`${employeeId}|${date}`) || null;
  }

  // Đơn nghỉ ĐÃ DUYỆT phủ đúng ngày của nhân viên (nếu có)
  function approvedLeaveOn(employeeId, date) {
    const list = hrLeavesOfMap().get(employeeId) || [];
    return list.find(l => (l.status || 'pending') === 'approved'
      && String(l.from) <= date && date <= String(l.to)) || null;
  }
  // Đơn nghỉ CHỜ DUYỆT phủ ngày (chỉ để gợi ý trên bảng chấm công)
  function pendingLeaveOn(employeeId, date) {
    const list = hrLeavesOfMap().get(employeeId) || [];
    return list.find(l => (l.status || 'pending') === 'pending'
      && String(l.from) <= date && date <= String(l.to)) || null;
  }

  // Trạng thái chấm công hiển thị: 'work' | 'absent' | 'leave' (phép đã duyệt) | '' (chưa chấm)
  function attStatusOf(employeeId, date) {
    const rec = attRecordOf(employeeId, date);
    if (rec && (rec.status === 'work' || rec.status === 'absent')) return rec.status;
    if (approvedLeaveOn(employeeId, date)) return 'leave';
    return '';
  }

  function ensureAttRecord(employeeId, date) {
    let rec = attRecordOf(employeeId, date);
    if (!rec) {
      rec = { id: `att-${date}-${employeeId}`, date, employeeId, status: 'work', positions: [], note: '', createdAt: new Date().toISOString() };
      state.hrAttendance.push(rec);
    }
    return rec;
  }

  function setAttendanceStatus(employeeId, date, status) {
    if (!requireEditPermission()) return;
    const idx = (state.hrAttendance || []).findIndex(a => a.employeeId === employeeId && a.date === date);
    const rec = idx !== -1 ? state.hrAttendance[idx] : null;
    if (status === '') {
      // Bỏ chấm: xóa hẳn bản ghi (hỏi lại nếu đã có phân vị / ghi chú)
      if (rec && (((rec.positions || []).length) || (rec.note || '').trim())) {
        if (!confirm('Bỏ chấm sẽ xóa cả phân vị & ghi chú của ngày này. Tiếp tục?')) { renderHrAttendanceCard(); return; }
      }
      if (rec) { trackDeleted('hrAttendance', rec.id); state.hrAttendance.splice(idx, 1); }
      saveHrData();
      renderHrAttendanceCard();
      showToast(`Đã bỏ chấm công ${hrEmpName(employeeId)} ngày ${fmtDateDMY(date)}`, 'info');
      return;
    }
    if (status !== 'work' && status !== 'absent') return;
    const r = ensureAttRecord(employeeId, date);
    r.status = status;
    r.updatedAt = new Date().toISOString();
    saveHrData();
    renderHrAttendanceCard();
    showToast(status === 'work'
      ? `Đã chấm ĐI LÀM: ${hrEmpName(employeeId)} (${fmtDateDMY(date)})`
      : `Đã ghi VẮNG (không phép): ${hrEmpName(employeeId)} (${fmtDateDMY(date)})`, status === 'work' ? 'success' : 'info');
  }

  // Bật/tắt 1 vị trí trong ngày. Nếu ngày chưa chấm → tự chấm "Đi làm".
  function toggleAttendancePosition(employeeId, date, positionId) {
    if (!requireEditPermission()) return;
    if (attStatusOf(employeeId, date) === 'leave') {
      showToast(`${hrEmpName(employeeId)} đang nghỉ CÓ PHÉP (đơn đã duyệt) — không phân vị trí.`, 'info');
      return;
    }
    const autoWork = !attRecordOf(employeeId, date);
    const r = ensureAttRecord(employeeId, date);
    r.positions = Array.isArray(r.positions) ? r.positions : [];
    const i = r.positions.indexOf(positionId);
    if (i === -1) {
      r.positions.push(positionId);
      const emp = hrEmpById(employeeId);
      if (emp && !(emp.skills || []).includes(positionId)) {
        showToast(`Lưu ý: ${hrEmpName(employeeId)} chưa có kỹ năng "${hrPosName(positionId)}" — vẫn cho phân nếu thực tế làm được.`, 'info');
      }
    } else {
      r.positions.splice(i, 1);
    }
    r.updatedAt = new Date().toISOString();
    saveHrData();
    renderHrAttendanceCard();
    if (autoWork) showToast(`Đã chấm ĐI LÀM: ${hrEmpName(employeeId)} (${fmtDateDMY(date)})`, 'success');
  }

  function setAttendanceNote(employeeId, date, note) {
    if (!requireEditPermission()) return;
    const rec = attRecordOf(employeeId, date);
    if (!rec) {
      if (!(note || '').trim()) return; // chưa chấm + ghi chú rỗng → bỏ qua
      const r = ensureAttRecord(employeeId, date);
      r.note = (note || '').trim();
      r.updatedAt = new Date().toISOString();
      saveHrData();
      return;
    }
    rec.note = (note || '').trim();
    rec.updatedAt = new Date().toISOString();
    saveHrData(); // cố ý KHÔNG render lại — tránh mất focus khi đang gõ
  }

  // Điều hướng ngày trên bảng chấm công
  function hrAttSetDate(iso) {
    state.hrAttDate = /^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? iso : hrTodayISO();
    renderHrAttendanceCard();
  }
  function hrAttShiftDay(delta) { hrAttSetDate(hrShiftDateISO(state.hrAttDate || hrTodayISO(), delta)); }
  function hrAttGoToday() { hrAttSetDate(hrTodayISO()); }
  function hrAttSetMonth(v) {
    state.hrAttMonth = /^\d{4}-\d{2}$/.test(String(v || '')) ? v : hrTodayISO().slice(0, 7);
    renderHrAttendanceStats();
  }

  // Vị trí hiển thị theo BỘ PHẬN của nhân viên: chọn bộ phận nào thì chỉ hiện
  // vị trí của bộ phận đó + vị trí chưa phân bộ phận (dùng chung) + những vị trí
  // người đó đã có kỹ năng (★) để vẫn phân được khi kỹ năng chéo bộ phận.
  // Sắp xếp: kỹ năng có sẵn (★) lên đầu, còn lại theo thứ tự danh mục.
  function attPositionsFor(emp) {
    const skills = (emp && emp.skills) || [];
    const dept = (emp && emp.department) || '';
    const all = state.hrPositions || [];
    const visible = all.filter(p => !p.department || p.department === dept || skills.includes(p.id));
    return [...visible.filter(p => skills.includes(p.id)), ...visible.filter(p => !skills.includes(p.id))];
  }

  // ─── LIÊN KẾT NHÂN SỰ ↔ SẢN LƯỢNG ÉP VÁN ────────────────────────
  // Tra nhân viên theo TÊN (bỏ dấu, không phân biệt hoa/thường, gộp khoảng
  // trắng thừa — tên nhập tay hay bị "Nguyễn Văn  A" 2 dấu cách).
  function hrEmpByName(name) {
    const key = hrStripForMatch(name);
    if (!key) return null;
    return (state.hrEmployees || []).find(e => hrStripForMatch(e.name || '') === key) || null;
  }
  // Tên các vị trí được phân trong ngày của 1 nhân viên (từ bảng chấm công)
  function hrPositionsNamesOf(employeeId, date) {
    const rec = attRecordOf(employeeId, date);
    return ((rec && rec.positions) || []).map(pid => hrPosName(pid));
  }
  // Danh sách công nhân được phân VỊ ÉP (tên vị trí chứa "ép") trong ngày date —
  // nguồn dữ liệu: bảng Chấm Công & Phân Vị Theo Ngày (tab Nhân Sự). Chỉ nhận
  // người đang ĐI LÀM (status work — người nghỉ có phép/vắng không tính).
  // Dùng cho: cột "Công nhân ép" tự động của lượt ép ván + bảng đối chiếu.
  function hrWorkersForPosition(date, positionPattern) {
    return (state.hrEmployees || [])
      .filter(e => (e.status || 'active') === 'active')
      .filter(e => attStatusOf(e.id, date) === 'work')
      .map(e => {
        const positions = hrPositionsNamesOf(e.id, date);
        return { id: e.id, name: e.name || '', code: e.code || '', department: e.department || '', positions, isPress: positions.some(n => positionPattern.test(n)) };
      })
      .filter(w => w.isPress)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
  }
  // Vị trí ÉP VÁN thực sự — dùng cho giờ/công nhân của công đoạn ÉP VÁN:
  //   • Tên vị trí PHẢI chứa "ép" (giữ dấu — nên "Xếp nan" KHÔNG bị nhận nhầm)
  //   • KHÔNG được là vị trí của các công đoạn Xưởng 2 đã có thẻ + giờ riêng
  //     (Bullig / Chọn thanh / Gia công) — Ép Ván KHÔNG cộng giờ của chúng.
  function isPressEpPos(name) {
    const s = String(name || '');
    if (!/ép/i.test(s)) return false;
    const n = hrStripDiacritics(s);
    return !/bullig|chon thanh|gia cong/.test(n);
  }
  function hrWorkersForPress(date) {
    return hrWorkersForPosition(date, { test: isPressEpPos });
  }
  // Vị trí phân theo LOẠI THÀNH PHẨM của lượt ép:
  //  - Thành phẩm "Bullig..." → vị trí "Chọn thanh Bullig" (CHỈ khớp tên vị trí
  //    đầy đủ "Chọn thanh Bullig" — KHÔNG khớp các vị trí "Bullig" khác)
  //  - Thành phẩm thường (Ván...) → vị trí Ép (tên vị trí chứa "ép")
  // Matcher so khớp BỎ DẤU + không phân biệt hoa/thường (ổ/ó/ỏ... đều nhận)
  const BULLIG_POS_MATCHER = {
    test(name) {
      return /chon\s+thanh\s+bullig/i.test(hrStripDiacritics(String(name || '')));
    }
  };
  // Vị trí ÉP VÁN thật (dùng chung isPressEpPos: loại vị trí công đoạn Xưởng 2 —
  // Bullig / Chọn thanh / Gia công để Ép Ván KHÔNG cộng giờ của các công đoạn đó)
  const PRESS_EP_PATTERN = { test: isPressEpPos, source: 'ép' };
  function pressPositionPatternFor(productName, isBullig) {
    const bull = isBullig === true || /bullig/i.test(String(productName || ''));
    return bull ? BULLIG_POS_MATCHER : PRESS_EP_PATTERN;
  }
  // Danh sách công nhân theo THÀNH PHẨM của lượt ép (tên TP quyết định vị trí;
  // isBullig = true khi định mức có "Sử Dụng Nan = Bullig" — tên nay chỉ kích thước)
  function hrWorkersForProduct(date, productName, isBullig) {
    return hrWorkersForPosition(date, pressPositionPatternFor(productName, isBullig));
  }
  // Chỉ danh sách TÊN công nhân ép trong ngày (dùng cho Dashboard/Xuất Excel)
  function hrPressWorkersNamesOf(date) {
    return hrWorkersForPress(date).map(w => w.name);
  }

  function renderHrAttendanceCard() {
    if (!state.hrAttDate) state.hrAttDate = hrTodayISO();
    const dateInput = document.getElementById('hr-att-date');
    if (dateInput && dateInput.value !== state.hrAttDate) dateInput.value = state.hrAttDate;
    const dept = document.getElementById('hr-att-filter-dept')?.value || 'all';
    const q = hrStripDiacritics(document.getElementById('hr-att-search')?.value || '');

    // Lọc đang làm việc (+ người ĐÃ NGHỈ VIỆC nhưng CHƯA qua ngày nghỉ — vẫn
    // hiện trên chấm công để chấm đủ ngày làm cuối) + bộ phận + tìm nhanh,
    // rồi sắp xếp theo NHÓM BỘ PHẬN (Văn Phòng -> Cơ Điện -> QC -> Xưởng 1 -> Xưởng 2 -> Lò Hơi),
    // trong cùng bộ phận xếp theo tên.
    const deptOrder = d => { const i = HR_DEPARTMENTS.indexOf(d); return i === -1 ? HR_DEPARTMENTS.length : i; };
    const list = (state.hrEmployees || []).filter(e => {
      const st = e.status || 'active';
      if (st === 'quit') {
        const qd = String(e.quitDate || '');
        return /^\d{4}-\d{2}-\d{2}$/.test(qd) && qd >= state.hrAttDate; // hiện tới ngày nghỉ việc
      }
      return st === 'active';
    })
      .filter(e => dept === 'all' || e.department === dept)
      .filter(e => !q || hrStripDiacritics(`${e.name || ''} ${e.code || ''}`).includes(q))
      .sort((a, b) => deptOrder(a.department) - deptOrder(b.department) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'vi'));

    // Đếm tổng hợp theo ngày + số người mỗi vị trí (để tổ trưởng nhìn bao quát)
    let work = 0, leave = 0, absent = 0, unmarked = 0;
    const posCount = {};
    list.forEach(e => {
      const st = attStatusOf(e.id, state.hrAttDate);
      if (st === 'work') {
        work++;
        (attRecordOf(e.id, state.hrAttDate)?.positions || []).forEach(pid => { posCount[pid] = (posCount[pid] || 0) + 1; });
      }
      else if (st === 'leave') leave++;
      else if (st === 'absent') absent++;
      else unmarked++;
    });

    const chipsEl = document.getElementById('hr-att-chips');
    if (chipsEl) {
      const posPart = Object.keys(posCount).map(pid => `${escapeHTML(hrPosName(pid))}: <strong>${posCount[pid]}</strong>`).join(' · ');
      chipsEl.innerHTML =
        `<span class="hr-stat-chip"><i data-lucide="users"></i> Tổng: <strong>${list.length}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="check-circle-2"></i> Đi làm: <strong>${work}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="calendar-check"></i> Nghỉ có phép: <strong>${leave}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="user-x"></i> Vắng: <strong>${absent}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="circle-dashed"></i> Chưa chấm: <strong>${unmarked}</strong></span>` +
        (posPart ? `<span class="hr-stat-chip"><i data-lucide="git-branch"></i> Phân vị: ${posPart}</span>` : '');
    }

    const countEl = document.getElementById('hr-att-count');
    if (countEl) countEl.textContent = `Ngày ${fmtDateDMY(state.hrAttDate)}`;

    const tbody = document.getElementById('hr-att-body');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="clipboard-list" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có nhân viên đang làm việc. Thêm nhân viên ở bảng trên.</p></td></tr>`;
      hrScheduleIcons();
      return;
    }

    const shownList = list.slice(0, hrRowsLimit.attendance);
    tbody.innerHTML = shownList.map(e => {
      const st = attStatusOf(e.id, state.hrAttDate);
      const rec = attRecordOf(e.id, state.hrAttDate);
      const leaveL = approvedLeaveOn(e.id, state.hrAttDate);
      const pendL = pendingLeaveOn(e.id, state.hrAttDate);
      const skills = e.skills || [];
      const ci = checkinRecordOf(e.id, state.hrAttDate);
      const ciBadge = ci ? `<br><span class="hr-emp-code" style="font-size:0.68rem;color:var(--text-muted);" title="Giờ máy chấm công đã nạp">⏱ ${escapeHTML(ci.in || '?')}${ci.out ? '–' + escapeHTML(ci.out) : ''}</span>` : '';

      // Ngày có đơn nghỉ ĐÃ DUYỆT → hiển thị chip, khóa select (trừ khi đã
      // chấm tay "Đi làm" — trường hợp hủy nghỉ, đơn vẫn quản lý ở tab nghỉ phép)
      let statusCell;
      if (st === 'leave') {
        statusCell = `<span class="hr-chip warn" title="Có đơn nghỉ đã được ban lãnh đạo duyệt">Nghỉ Có Phép ✓</span>`;
      } else {
        statusCell = `<select data-att-emp="${escapeHTML(e.id)}" data-att-field="status" title="Chọn trạng thái đi làm ngày này">
          <option value="" ${st === '' ? 'selected' : ''}>— Chưa chấm —</option>
          <option value="work" ${st === 'work' ? 'selected' : ''}>${ATT_STATUS.work}</option>
          <option value="absent" ${st === 'absent' ? 'selected' : ''}>${ATT_STATUS.absent}</option>
        </select>`;
      }

      let leaveCell = '<span style="color:var(--text-muted);">—</span>';
      if (leaveL) {
        leaveCell = `<span class="hr-chip ok" title="${escapeHTML((leaveL.type || '') + (leaveL.reason ? ' — ' + leaveL.reason : ''))}">${escapeHTML(leaveL.type || 'Nghỉ phép')}</span>` +
          `<br><span style="font-size:0.68rem;color:var(--text-muted);">duyệt bởi ${escapeHTML(leaveL.approvedBy || 'ban lãnh đạo')}</span>`;
      } else if (pendL) {
        leaveCell = `<span class="hr-chip warn" title="Có đơn nghỉ đang chờ ban lãnh đạo duyệt">Đơn chờ duyệt</span>`;
      }

      const posChips = attPositionsFor(e).map(p => {
        const on = (rec?.positions || []).includes(p.id);
        const skilled = skills.includes(p.id);
        return `<button type="button" class="att-pos-chip${on ? ' on' : ''}${skilled ? ' skilled' : ''}"` +
          ` data-att-emp="${escapeHTML(e.id)}" data-att-pos="${escapeHTML(p.id)}"` +
          `${st === 'leave' ? ' disabled' : ''}` +
          ` title="${escapeHTML(p.name)}${p.department ? ' · ' + escapeHTML(p.department) : ''}${skilled ? ' (kỹ năng có sẵn)' : ''}">${skilled ? '★ ' : ''}${escapeHTML(p.name)}</button>`;
      }).join('') || '<span style="font-size:0.72rem;color:var(--text-muted);">Chưa có vị trí nào</span>';

      // CỘT VỊ TRÍ TRONG NGÀY — gọn theo dữ liệu Board:
      //  • Có bố trí qua Board -> chỉ hiện ĐÚNG các vị trí đã gán hôm đó (kèm
      //    giờ làm) + badge tổng HC (giờ hành chính) / TC (tăng ca) trong ngày.
      //  • Chưa có dữ liệu Board -> giữ chip phân vị thủ công như cũ (fallback).
      const dayAs = hrAssignmentsOf(state.hrAttDate).filter(a => a.employeeId === e.id)
        .sort((a, b) => hrAssignmentStartMin(a) - hrAssignmentStartMin(b));
      let posCell;
      if (dayAs.length) {
        const schedule = hrAssignmentScheduleOf(dayAs);
        const chips = dayAs.map(a =>
          `<span class="att-pos-chip on" title="${escapeHTML(hrPosName(a.positionId))} · ${fmtHour(a.start)}${schedule.endById.get(a.id) ? '–' + fmtHour(schedule.endById.get(a.id)) : ' → hết ca'}">` +
          `${escapeHTML(hrPosName(a.positionId))} <b style="font-weight:600;">${fmtHour(a.start)}${schedule.endById.get(a.id) ? '–' + fmtHour(schedule.endById.get(a.id)) : ''}</b></span>`).join('');
        const tot = dayAs.reduce((acc, a) => {
          const r = hrSplitAssignmentHoursDate(a, state.hrAttDate, schedule);
          acc.hc += r.hc; acc.tc += r.tc; return acc;
        }, { hc: 0, tc: 0 });
        const badge = `<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">
          <span class="hr-chip" title="Giờ làm trong giờ hành chính/ca chuẩn của bộ phận">HC <strong>${fmtHm(tot.hc)}</strong></span>` +
          (tot.tc > 0 ? `<span class="hr-chip warn" title="Giờ tăng ca — ngoài giờ ca chuẩn">TC <strong>${fmtHm(tot.tc)}</strong></span>` : '') +
          `</div>`;
        posCell = `<div class="att-pos-chips">${chips}</div>${badge}`;
      } else {
        posCell = `<div class="att-pos-chips">${posChips}</div>`;
      }

      return `<tr${st === 'leave' ? ' style="opacity:0.75;"' : ''}>
        <td><strong>${escapeHTML(e.name || '')}</strong>${e.code ? `<br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(e.code)}</span>` : ''}</td>
        <td>${escapeHTML(e.department || '—')}</td>
        <td>${statusCell}${ciBadge}</td>
        <td>${leaveCell}</td>
        <td>${posCell}</td>
        <td><input type="text" data-att-emp="${escapeHTML(e.id)}" data-att-field="note" value="${escapeHTML(rec?.note || '')}" placeholder="Ghi chú..." style="min-width:110px;"></td>
      </tr>`;
    }).join('') + hrMoreRowHtml('attendance', shownList.length, list.length, 6);
    hrScheduleIcons();
  }

  // ─── 8) NẠP GIỜ TỪ MÁY CHẤM CÔNG (EXCEL) + ĐỐI CHIẾU ─────────────
  // Máy xuất file mỗi hãng một kiểu — TỰ NHẬN CỘT (Mã NV/Tên, Ngày, Giờ vào,
  // Giờ ra). Máy xuất từng LẦN QUÉT (cột "Thời gian"): gộp theo NV+ngày,
  // lần quét ĐẦU = giờ vào, lần CUỐI = giờ ra. Giờ máy chỉ dùng ĐỐI CHIẾU +
  // ÁP DỤNG (tự chấm Đi làm cho ngày thiếu/lech), không ghi đè đơn nghỉ đã duyệt.
  function ciNormTime(v) {
    if (v instanceof Date) return `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`;
    if (typeof v === 'number' && isFinite(v)) return ciTimeFromNum(v);
    const s = String(v || '').trim();
    let m = s.match(/(\d{1,2})[:h](\d{2})/);
    if (m) return `${String(+m[1]).padStart(2, '0')}:${m[2]}`;
    if (/^\d{3,4}$/.test(s)) { const t = s.padStart(4, '0'); return `${t.slice(0, 2)}:${t.slice(2)}`; }
    // Ô GIỜ lưu dạng SỐ của Excel: 0.295 = 07:05 · 45000.295 = serial + giờ
    if (/^\d+(?:[.,]\d+)?$/.test(s)) return ciTimeFromNum(Number(s.replace(',', '.')));
    return '';
  }
  // Số Excel (phân số ngày 0..1 HOẶC serial datetime) -> 'HH:mm'
  function ciTimeFromNum(n) {
    if (!isFinite(n)) return '';
    let frac = -1;
    if (n >= 0 && n < 1) frac = n;
    else if (n >= 1 && n < 60000) frac = n - Math.floor(n);
    if (frac < 0) return '';
    const mins = Math.round(frac * 1440) % 1440;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  // Serial ngày của Excel (1899-12-30 = 0) -> { date, time } — KHÔNG lệch múi giờ
  function ciSerialToDateTime(n) {
    const days = Math.floor(n);
    const mins = Math.round((n - days) * 1440) % 1440;
    const dt = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
    return {
      date: `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`,
      time: `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
    };
  }
  // Giải mã 1 ô Ngày / Ngày-giờ -> { date 'yyyy-mm-dd', time 'HH:mm' | '' }
  function ciNormDateTime(v) {
    if (v instanceof Date) {
      return { date: `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`,
               time: `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}` };
    }
    if (typeof v === 'number' && isFinite(v)) {
      // 20000..80000 = serial ngày của Excel (1954..2119); < 1 = chỉ có giờ
      if (v >= 20000 && v < 80000) return ciSerialToDateTime(v);
      return { date: '', time: ciTimeFromNum(v) };
    }
    const s = String(v || '').trim();
    // Ô NGÀY lưu dạng SỐ của Excel (file máy xuất không định dạng ngày)
    if (/^\d{5}(?:[.,]\d+)?$/.test(s)) {
      const n = Number(s.replace(',', '.'));
      if (n >= 20000 && n < 80000) return ciSerialToDateTime(n);
    }
    // Thử định dạng ISO (yyyy-MM-dd [HH:mm]) TRƯỚC để regex dd/MM không khớp nhầm "2024-06-05"
    let m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T]+(\d{1,2})[:h.](\d{2}))?/);
    if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? ciNormTime(`${m[4]}:${m[5]}`) : '' };
    m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T]+(\d{1,2})[:h.](\d{2}))?/); // dd/MM/yyyy [HH:mm]
    if (m) {
      let y = +m[3]; if (y < 100) y += 2000;
      return { date: `${y}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`,
               time: m[4] ? ciNormTime(`${m[4]}:${m[5]}`) : '' };
    }
    return { date: '', time: '' };
  }

  // Tìm dòng tiêu đề: quét ~20 dòng đầu (file máy chấm công có các dòng đầu trang
  // "Công ty TNHH..." / "BÁO CÁO DỮ LIỆU CHẤM CÔNG" / "Từ ngày... Đến ngày...")
  function ciFindHeaderRow(aoa) {
    const limit = Math.min(aoa.length, 20);
    for (let r = 0; r < limit; r++) {
      const cells = (aoa[r] || []).map(h => hrStripDiacritics(String(h ?? '')));
      if (!cells.length) continue;
      const hasCode = cells.some(h => /ma ?nv|ma nhan vien|user ?id|userid/.test(h));
      const hasName = cells.some(h => /ho ?ten|ten nhan vien|^ten$|name/.test(h));
      const hasDate = cells.some(h => /ngay|date/.test(h));
      if ((hasCode || hasName) && hasDate) return r;
    }
    return -1;
  }
  // Tự nhận cột theo tiêu đề (bỏ dấu, không phân biệt hoa/thường)
  function ciAutoMapCols(headers) {
    const norm = headers.map(h => hrStripDiacritics(h));
    const find = (pred) => norm.findIndex(pred);
    const col = {
      code:     find(h => /ma ?nv|ma nhan vien|ma ?the|user ?id|userid|enroll|ma ?so/.test(h)),
      name:     find(h => /ho ?ten|ten nhan vien|^ten$|name/.test(h)),
      dept:     find(h => /phong ?ban|bo ?phan|department|dept/.test(h)),
      date:     find(h => /ngay|date/.test(h) && !/ngay ?gio|thoi ?gian/.test(h)),
      timeIn:   find(h => /gio ?vao|check ?in|^in$|vao ?lam/.test(h)),
      timeOut:  find(h => /gio ?ra|check ?out|^out$/.test(h)),
      dateTime: find(h => /thoi ?gian|ngay ?gio|time|checkpoint/.test(h)),
      // Các cột "Lần 1".."Lần N" — máy chấm công xuất mỗi lần quét một cột (ngang)
      punchCols: norm
        .map((h, i) => ({ h, i }))
        .filter(x => /^lan\s*\d+$/.test(x.h))
        .sort((a, b) => (parseInt(a.h.replace(/\D/g, ''), 10) || 0) - (parseInt(b.h.replace(/\D/g, ''), 10) || 0))
        .map(x => x.i)
    };
    // Không có cột Ngày riêng -> cột "Thời gian/Ngày giờ" chính là datetime từng lần quét
    if (col.date === -1 && col.dateTime !== -1) { col.date = col.dateTime; col.dateTime = -1; }
    return col;
  }
  function ciResolveEmployee(code, name) {
    const list = state.hrEmployees || [];
    const codeK = hrNormCode(code);
    const nameK = hrNormNameKey(name);
    // 1) Mã NV đã CHUẨN HOÁ: "NV 001" ≡ "nv001" ≡ số 1 (máy hay xuất mã khác kiểu)
    if (codeK) {
      const byCode = list.filter(e => hrNormCode(e.code) === codeK);
      if (byCode.length === 1) return byCode[0];
    }
    // 2) Họ tên CHUẨN HOÁ (bỏ dấu, gộp khoảng trắng) — chỉ nhận khi DUY NHẤT
    if (nameK) {
      const byName = list.filter(e => hrNormNameKey(e.name) === nameK);
      if (byName.length === 1) return byName[0];
    }
    // 3) Dự phòng: so khớp tuyệt đối như trước (tên có ký tự đặc biệt)
    const byCode2 = code ? list.find(e => String(e.code || '').trim().toLowerCase() === String(code).trim().toLowerCase()) : null;
    if (byCode2) return byCode2;
    const byName2 = name ? list.find(e => String(e.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()) : null;
    return byName2 || null;
  }


  // Đọc lại ánh xạ + nhập sheet vào state.hrCheckins.
  // Hỗ trợ 3 kiểu file máy chấm công:
  //   (a) từng dòng 1 NGÀY có cột Giờ vào / Giờ ra riêng;
  //   (b) từng dòng 1 LẦN QUÉT (cột "Thời gian" datetime) -> gộp theo NV+ngày;
  //   (c) lưới cột "Lần 1".."Lần N" (mỗi dòng 1 ngày, các lần quét nằm ngang,
  //       giờ HH:MM:SS) -> lần đầu = vào, lần cuối = ra.
  function importCheckinsFromSheet(aoa, col, fileName) {
    const res = { punches: 0, added: 0, updated: 0, unmatched: [], matched: 0 };
    const hasInOut = col.timeIn !== -1;                 // kiểu (a): dòng theo NGÀY
    const punchCols = (col.timeIn === -1 && Array.isArray(col.punchCols)) ? col.punchCols : []; // kiểu (c)
    const punches = []; // [{empId, date, time}] — cho kiểu (b) và (c)
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row || !row.length) continue;
      const get = i => (i === undefined || i === null || i < 0) ? '' : row[i];
      const emp = ciResolveEmployee(get(col.code), get(col.name));
      if (!emp) {
        const key = String(get(col.code) || get(col.name) || '').trim();
        if (key && !res.unmatched.some(u => u.key === key && u.row === r + 1)) {
          res.unmatched.push({ key, row: r + 1, name: String(get(col.name) || '').trim(), dept: String(get(col.dept) || '').trim() });
        }
        continue;
      }
      if (hasInOut) {
        // Kiểu (a): dòng theo ngày, giờ vào/ra riêng
        const dt = ciNormDateTime(get(col.date));
        if (!dt.date) continue;
        const inT = ciNormTime(get(col.timeIn));
        const outT = ciNormTime(get(col.timeOut));
        if (!inT && !outT) continue;
        res.punches++;
        if (upsertCheckin(emp.id, dt.date, inT, outT, 1, fileName, [inT, outT].filter(Boolean))) res.added++; else res.updated++;
      } else if (punchCols.length) {
        // Kiểu (c): lưới cột "Lần 1..N" — mỗi dòng 1 ngày, thời gian HH:MM(:SS)
        const dt = ciNormDateTime(get(col.date));
        if (!dt.date) continue;
        const times = punchCols.map(i => ciNormTime(get(i))).filter(Boolean).sort();
        if (!times.length) continue; // ngày không quét (nghỉ) -> bỏ qua
        times.forEach(t => punches.push({ empId: emp.id, date: dt.date, time: t }));
        res.punches += times.length;
      } else {
        // Kiểu (b): từng lần quét — cột Ngày (datetime) chứa cả ngày & giờ
        const dt = ciNormDateTime(get(col.date));
        if (!dt.date || !dt.time) continue;
        punches.push({ empId: emp.id, date: dt.date, time: dt.time });
        res.punches++;
      }
    }
    if (!hasInOut && punches.length) {
      // Gộp lần quét theo NV + ngày (chung cho kiểu b & c)
      const groups = {};
      punches.forEach(p => { (groups[`${p.empId}|${p.date}`] = groups[`${p.empId}|${p.date}`] || []).push(p.time); });
      Object.keys(groups).forEach(k => {
        const [empId, date] = k.split('|');
        const times = [...groups[k]].sort();
        if (upsertCheckin(empId, date, times[0], times.length > 1 ? times[times.length - 1] : '', times.length, fileName, times)) res.added++; else res.updated++;
      });
    }
    res.matched = res.added + res.updated;
    saveHrData();
    return res;
  }
  // Upsert 1 bản ghi giờ máy. Trả về true nếu thêm mới, false nếu cập nhật.
  // punchTimes = ĐỦ danh sách lần quét trong ngày (phục vụ đối chiếu/audit)
  function upsertCheckin(employeeId, date, inT, outT, punchCount, fileName, punchTimes) {
    const rec = (state.hrCheckins || []).find(c => c.employeeId === employeeId && c.date === date);
    const now = new Date().toISOString();
    const times = Array.isArray(punchTimes) ? punchTimes.filter(Boolean) : null;
    if (rec) {
      // Giữ lần quẹt SỚM NHẤT làm giờ vào, MUỘN NHẤT làm giờ ra (file có thể
      // nhiều dòng / nhiều lần quét cho cùng 1 ngày) — nạp lại vẫn idempotent.
      if (inT) rec.in = (rec.in && rec.in < inT) ? rec.in : inT;
      if (outT) rec.out = (rec.out && rec.out > outT) ? rec.out : outT;
      rec.punches = Math.max(Number(rec.punches) || 0, Number(punchCount) || 0, 1);
      rec.fileName = fileName || rec.fileName;
      if (times && times.length) rec.punchTimes = times.slice();
      rec.updatedAt = now;
      return false;
    }
    state.hrCheckins.push({ id: `ci-${date}-${employeeId}`, employeeId, date, in: inT, out: outT,
      punches: punchCount || 1, punchTimes: times || [], fileName: fileName || '', createdAt: now, updatedAt: now });
    return true;
  }
  function checkinRecordOf(employeeId, date) {
    return checkinRecordOfMap().get(`${employeeId}|${date}`) || null;
  }

  // Áp dụng 1 ngày theo máy chấm công: tự chấm "Đi làm" (không đụng đơn nghỉ đã duyệt)
  // QUYỀN (20/10/2026): phải được Admin cấp quyền "Áp dụng chấm công theo máy"
  // (quyền tab Nhân sự KHÔNG đủ) — tránh người nhập liệu tự sửa công để tính lương.
  function applyCheckinRecord(employeeId, date) {
    if (!requirePayApply()) return;
    const rec = checkinRecordOf(employeeId, date);
    if (!rec) return;
    if (!ciRequireMonthUnlocked(String(date).slice(0, 7), 'áp dụng chấm công')) return;
    // Chỉ còn lần quẹt sáng của ca đêm HÔM TRƯỚC → không phải ngày đi làm
    const consumed = ciNightConsumedOf(employeeId, date);
    if (consumed) {
      showToast(`Lần quẹt ${consumed.times.map(m => ciFromMin(m)).join(', ')} ngày ${fmtDateDMY(date)} là GIỜ RA của ca đêm ${fmtDateDMY(consumed.fromDate)} — không chấm "Đi làm" cho ngày này.`, 'info');
      return;
    }
    if (attStatusOf(employeeId, date) === 'leave') {
      showToast(`${hrEmpName(employeeId)} ngày ${fmtDateDMY(date)} đang nghỉ CÓ PHÉP (đơn đã duyệt) — không áp dụng theo máy.`, 'info');
      return;
    }
    const hadOld = !!attRecordOf(employeeId, date);
    const att = ensureAttRecord(employeeId, date);
    att.status = 'work';
    att.appliedBy = (state.currentUser && (state.currentUser.fullname || state.currentUser.email || state.currentUser.username)) || '';
    att.appliedAt = new Date().toISOString();
    saveHrData();
    renderHrView();
    showToast(`Đã chấm ĐI LÀM theo máy chấm công: ${hrEmpName(employeeId)} ${fmtDateDMY(date)} (${rec.in || '?'}${rec.out ? '–' + rec.out : ''})${hadOld ? ' (đã đổi từ trạng thái cũ)' : ''}`, 'success');
  }
  // KỲ ĐÃ CHỐT CÔNG chưa? (thao tác ghi dữ liệu giờ công của tháng đó bị khóa)
  function ciMonthShort(month) {
    const s = String(month || '');
    return /^\d{4}-\d{2}$/.test(s) ? `${s.slice(5, 7)}/${s.slice(0, 4)}` : s;
  }
  function ciPayLockOfMonth(month) {
    const list = Array.isArray(state.hrPayLocks) ? state.hrPayLocks : [];
    return list.find(l => l && l.month === month && l.status === 'da_chot') || null;
  }
  function ciRequireMonthUnlocked(month, actionLabel) {
    const lk = ciPayLockOfMonth(month);
    if (!lk) return true;
    showToast(`Kỳ ${ciMonthShort(month)} đã CHỐT CÔNG (${lk.approvedByName || lk.preparedByName || '—'}) — không thể ${actionLabel}. Hãy Mở Khóa Kỳ trước.`, 'error');
    return false;
  }
  // Kỳ đang xem có thể VẮT 2 tháng (tuần cuối/đầu tháng) → kiểm MỌI tháng trong khoảng
  function ciMonthsOfRange(range) {
    const out = new Set();
    if (!range || !range.from) return out;
    let d = range.from;
    for (let i = 0; i < 400 && d && d <= range.to; i++) { out.add(String(d).slice(0, 7)); d = ciShiftDays(d, 1); }
    return out;
  }
  function ciRequireRangeUnlocked(range, actionLabel) {
    const months = ciMonthsOfRange(range);
    for (const m of months) {
      if (!ciRequireMonthUnlocked(m, actionLabel)) return false;
    }
    return true;
  }
  // Áp dụng TẤT CẢ ngày máy xác nhận mà chấm tay còn thiếu / lệch — CHỈ TRONG KỲ
  // (20/10/2026: trước đây áp cho MỌI tháng đã nạp ⇒ dễ sửa oan dữ liệu tháng cũ).
  // (21/10/2026: kỳ = NGÀY / TUẦN / THÁNG theo thanh lọc đang xem)
  function applyAllCheckins(reason) {
    if (!requirePayApply()) return false;
    const range = ciRangeOf(ciReadUi());
    if (!ciRequireRangeUnlocked(range, 'áp dụng chấm công')) return false;
    const targets = (state.hrCheckins || []).filter(c => {
      if (!c || !c.date || c.date < range.from || c.date > range.to) return false;
      // Bỏ qua ngày chỉ có lần quẹt SÁNG của ca đêm hôm trước
      if (ciNightConsumedOf(c.employeeId, c.date)) return false;
      const st = attStatusOf(c.employeeId, c.date);
      return st === '' || st === 'absent';
    });
    if (!targets.length) { showToast(`Không có ngày nào cần áp dụng trong kỳ ${range.label} — chấm tay đã khớp máy chấm công.`, 'info'); return false; }
    const note = String(reason || '').trim();
    const who = (state.currentUser && (state.currentUser.fullname || state.currentUser.email || state.currentUser.username)) || '';
    const now = new Date().toISOString();
    targets.forEach(c => {
      const r = ensureAttRecord(c.employeeId, c.date);
      r.status = 'work';
      r.appliedBy = who;
      r.appliedAt = now;
      if (note) r.applyNote = note;
      r.updatedAt = now;
    });
    saveHrData();
    renderHrView();
    showToast(`Đã áp dụng "Đi làm" cho ${targets.length} ngày trong kỳ ${range.label}${note ? ` — lý do: ${note}` : ''}`, 'success');
    return targets.length;
  }
  function deleteCheckin(id) {
    if (!requirePayApply()) return;
    const rec = (state.hrCheckins || []).find(c => c.id === id);
    if (rec && !ciRequireMonthUnlocked(String(rec.date).slice(0, 7), 'xóa giờ máy')) return;
    trackDeleted('hrCheckins', id);
    state.hrCheckins = (state.hrCheckins || []).filter(c => c.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa 1 bản ghi giờ máy chấm công', 'info');
  }
  // Xóa giờ máy THEO KỲ đang xem (trước đây xóa toàn bộ mọi tháng)
  function deleteCheckinsAll(reason) {
    if (!requirePayApply()) return false;
    const range = ciRangeOf(ciReadUi());
    if (!ciRequireRangeUnlocked(range, 'xóa giờ máy')) return false;
    const inRange = (state.hrCheckins || []).filter(c => c && c.date >= range.from && c.date <= range.to);
    if (!inRange.length) { showToast(`Không có giờ máy nào trong kỳ ${range.label}.`, 'info'); return false; }
    const note = String(reason || '').trim();
    trackDeleted('hrCheckins', inRange.map(c => c.id));
    const ids = new Set(inRange.map(c => c.id));
    state.hrCheckins = (state.hrCheckins || []).filter(c => !ids.has(c.id));
    saveHrData();
    renderHrView();
    showToast(`Đã xóa ${inRange.length} bản ghi giờ máy của kỳ ${range.label}${note ? ` — lý do: ${note}` : ''} (không ảnh hưởng chấm tay)`, 'info');
    return inRange.length;
  }
  // ── MODAL "ÁP DỤNG / XÓA THEO KỲ" (bắt buộc nhập lý do) ─────────
  function ciBulkPlanOf(kind) {
    const range = ciRangeOf(ciReadUi());
    const inRange = (state.hrCheckins || []).filter(c => c && c.date >= range.from && c.date <= range.to);
    if (kind === 'delete') return { kind, month: range.from.slice(0, 7), range, count: inRange.length, unit: 'bản ghi giờ máy' };
    const need = inRange.filter(c => {
      if (ciNightConsumedOf(c.employeeId, c.date)) return false;
      const st = attStatusOf(c.employeeId, c.date);
      return st === '' || st === 'absent';
    });
    const emps = new Set(need.map(c => c.employeeId));
    return { kind, month: range.from.slice(0, 7), range, count: need.length, unit: `ngày của ${emps.size} nhân viên` };
  }
  function openCiBulkModal(kind) {
    if (!requirePayApply()) return;
    const k = kind === 'delete' ? 'delete' : 'apply';
    const modal = document.getElementById('modal-ci-bulk');
    if (!modal) return;
    const plan = ciBulkPlanOf(k);
    const kindEl = document.getElementById('ci-bulk-kind');
    if (kindEl) kindEl.value = k;
    const title = document.getElementById('ci-bulk-title');
    if (title) title.innerHTML = k === 'delete'
      ? '<i data-lucide="trash-2"></i> Xóa Giờ Máy Theo Kỳ'
      : '<i data-lucide="check-check"></i> Áp Dụng Chấm Công Theo Kỳ';
    const scope = document.getElementById('ci-bulk-scope-info');
    if (scope) scope.textContent = `${(plan.range && plan.range.label) || ciMonthShort(plan.month)} · ${plan.count} ${plan.unit}`;
    const reason = document.getElementById('ci-bulk-reason');
    if (reason) reason.value = '';
    const warn = document.getElementById('ci-bulk-warn');
    if (warn) {
      // Kỳ có thể VẮT 2 tháng (tuần) → tìm tháng nào đã chốt công
      let lockedMonth = '';
      const months = (plan.range && plan.range.from) ? ciMonthsOfRange(plan.range) : new Set([plan.month]);
      for (const m of months) { if (ciPayLockOfMonth(m)) { lockedMonth = m; break; } }
      const lk = lockedMonth ? ciPayLockOfMonth(lockedMonth) : null;
      warn.hidden = !lk;
      warn.textContent = lk ? `⚠ Kỳ ${ciMonthShort(lockedMonth)} đã CHỐT CÔNG (${lk.approvedByName || lk.preparedByName || '—'}) — phải Mở Khóa Kỳ trước khi thay đổi.` : '';
    }
    const ok = document.getElementById('btn-ci-bulk-ok');
    if (ok) {
      ok.className = k === 'delete' ? 'btn btn-danger' : 'btn btn-primary';
      ok.innerHTML = k === 'delete'
        ? '<i data-lucide="trash-2"></i> Xóa Trong Kỳ'
        : '<i data-lucide="check"></i> Áp Dụng Trong Kỳ';
    }
    modal.classList.add('show');
    hrScheduleIcons();
    const inp = document.getElementById('ci-bulk-reason');
    if (inp && typeof inp.focus === 'function') inp.focus();
  }
  function closeCiBulkModal() {
    document.getElementById('modal-ci-bulk')?.classList.remove('show');
  }
  function ciBulkSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const kind = (document.getElementById('ci-bulk-kind') || {}).value || 'apply';
    const reason = String((document.getElementById('ci-bulk-reason') || {}).value || '').trim();
    if (!reason) { showToast('Vui lòng nhập LÝ DO (bắt buộc) để lưu vào nhật ký.', 'error'); return; }
    const n = kind === 'delete' ? deleteCheckinsAll(reason) : applyAllCheckins(reason);
    if (n !== false) closeCiBulkModal();
  }
  // Bảng đối chiếu Bố trí ↔ Máy chấm công — engine + giao diện ở khối 8b bên dưới.
  // Giữ tên cũ để renderHrView / test cũ gọi được.
  function renderHrCheckinTable() { ciRenderCheckinTable(); }

  // ═══════════════════════════════════════════════════════════════
  // 8b) ĐỐI CHIẾU BẢNG BỐ TRÍ ↔ MÁY CHẤM CÔNG
  // ───────────────────────────────────────────────────────────────
  // Quy tắc (chốt 19/10/2026):
  //  • Chấm sớm tối đa < 30 phút: máy cho phép quẹt trước — giờ làm tính TỪ
  //    GIỜ BẮT ĐẦU CA, KHÔNG sinh TC cho phần sớm.
  //  • Tăng ca sau hết ca: mỗi 30 phút mới tính → LÀM TRÒN XUỐNG
  //    (17:59 → 0'; 18:10 → 30'; 18:35 → 60'; 19:30 → 120').
  //  • Ngày nghỉ/lễ (Lịch làm việc tháng): toàn bộ giờ đi làm = TC, KHÔNG tròn.
  //  • Đi muộn / về sớm: hiện số phút THẬT, chỉ gắn cờ khi vượt CI_LATE_TOL_MIN.
  //  • Nghỉ phép cả ngày + có quẹt máy → cờ đỏ; nghỉ theo GIỜ → so phần còn
  //    phải làm (giờ bố trí − số giờ nghỉ).
  //  • Tăng ca: TC máy (đã tròn) ⟷ Σ đơn TC ĐÃ DUYỆT (thiếu / vượt / chưa ĐK).
  //  • Bố trí mà KHÔNG quẹt: chỉ báo khi NGÀY ĐÓ máy có dữ liệu (tránh báo oan
  //    ngày chưa nạp file) và không phải ngày nghỉ theo lịch.
  //  • Ca đêm (khung ca VẮT QUA nửa đêm): mỗi người thường có 2 lần quẹt nằm ở
  //    2 NGÀY khác nhau (vào ~19:4x hôm nay, ra ~06:0x HÔM SAU) nên KHÔNG được
  //    lấy "sớm nhất = vào, muộn nhất = ra" của từng ngày dương lịch (sẽ hiểu
  //    thành 06:00→19:46 = 13h45 nghỉ ở nhà). Engine GHÉP CẶP:
  //      · GIỜ VÀO = lần quẹt buổi CHIỀU/TỐI gần giờ bắt đầu ca
  //      · GIỜ RA  = lần quẹt BUỔI SÁNG ngày kế tiếp (quanh giờ hết ca)
  //    Lần quẹt sáng đã bị ca đêm HÔM TRƯỚC lấy làm giờ ra thì KHÔNG tính là
  //    ngày làm riêng (kết luận "Giờ ra ca đêm hôm trước", không cần xác nhận).
  //  • Engine CHỈ ĐỌC dữ liệu; chỉ 3 hàm ghi: ciApplyEndFills (điền giờ kết
  //    thúc vào Bảng bố trí), ciAckDay / ciUnackDay (đánh dấu đã xác nhận).
  // ═══════════════════════════════════════════════════════════════
  const CI_EARLY_ALLOW_MIN  = 30; // chấm sớm tối đa (< 30') — tính từ giờ bắt đầu ca
  const CI_OT_BLOCK_MIN     = 30; // mỗi 30 phút mới tính tăng ca (làm tròn XUỐNG)
  const CI_LATE_TOL_MIN     = 5;  // ngưỡng báo đi muộn / về sớm (phút)
  const CI_WORK_DAY_MAX_MIN = 16 * 60;
  const CI_MAX_ROWS         = 400;
  // Cửa sổ nhận lần quẹt của CA ĐÊM (phút, tính quanh mốc giờ của ca)
  const CI_NIGHT_IN_EARLY_MIN  = 180; // quẹt vào sớm nhất = giờ bắt đầu − 3h
  const CI_NIGHT_IN_LATE_MIN   = 240; // chấp nhận vào muộn tới +4h
  const CI_NIGHT_OUT_EARLY_MIN = 180; // quẹt ra sớm nhất = hết ca − 3h
  const CI_NIGHT_OUT_LATE_MIN  = 240; // chấp nhận ra muộn tới +4h
  const HR_CI_UI_KEY        = 'bamboo_tracker_hr_ci_ui_v1'; // THUẦN UI THEO MÁY (không mây/backup)
  const CI_VERDICT = {
    ok:           { label: 'Khớp ✓',                         cls: 'ok' },
    late:         { label: 'Đi muộn',                        cls: 'warn' },
    early:        { label: 'Về sớm',                         cls: 'warn' },
    no_out:       { label: 'Thiếu giờ ra',                   cls: 'warn' },
    no_in:        { label: 'Thiếu giờ vào',                  cls: 'warn' },
    night_out:    { label: 'Giờ ra ca đêm hôm trước',        cls: 'off' },
    no_punch:     { label: 'Không quẹt máy',                 cls: 'off' },
    no_plan:      { label: 'Máy có quẹt, chưa bố trí',       cls: 'warn' },
    leave_ok:     { label: 'Nghỉ có phép',                   cls: 'ok' },
    leave_punch:  { label: 'Nghỉ có phép nhưng có quẹt máy', cls: 'off' },
    leave_hours:  { label: 'Nghỉ theo giờ — lệch giờ làm',   cls: 'warn' },
    absent_punch: { label: 'Chấm tay "Vắng"',                cls: 'off' },
    unmarked:     { label: 'Chưa chấm tay',                  cls: 'warn' }
  };
  const CI_OT_LABEL = {
    none: '', ok: 'TC khớp đơn', short: 'TC thiếu so đơn', over: 'TC vượt đơn',
    unregistered: 'TC chưa đăng ký', pending: 'Đơn TC chờ duyệt',
    waiting: 'Chờ giờ ra để đối chiếu TC'
  };

  let ciMachineDaysCache = null;
  let ciEndfillRows = [];
  // ── CHỈ MỤC TẠM theo (NV|ngày) cho 1 lượt vẽ bảng ────────────────
  // Với ~6.000 dòng/tháng, quét tuyến tính từng dòng sẽ là O(n²). Khi
  // ciRowsForRange / ciSuggestEndFills chạy, dựng Map 1 lần rồi tra O(1);
  // gọi lẻ (test, export) thì tự quay về quét tuyến tính như cũ.
  let ciCtx = null;
  function ciBuildCtx(range) {
    // range (tùy chọn) = { from, to } — CHỈ dựng chỉ mục cho các ngày trong kỳ
    // (±1 ngày vì ghép ca đêm cần ngày trước/kế). Trước đây quét TOÀN BỘ
    // hrCheckins/hrAssignments mỗi lần vẽ bảng đối chiếu (13.500 bản ghi ×
    // nhiều mảng) — khi dữ liệu 12 tháng sẽ rất chậm.
    const from = range && range.from ? hrShiftDateISO(range.from, -1) : '';
    const to = range && range.to ? hrShiftDateISO(range.to, 1) : '';
    const inRange = d => (!from || d >= from) && (!to || d <= to);
    const asgByKey = new Map(), ciByKey = new Map(), attByKey = new Map(), otByKey = new Map(), lvByEmp = new Map();
    (state.hrAssignments || []).forEach(a => {
      if (!a || !a.employeeId || !a.date) return;
      if (!inRange(a.date)) return;
      const k = `${a.employeeId}|${a.date}`;
      if (!asgByKey.has(k)) asgByKey.set(k, []);
      asgByKey.get(k).push(a);
    });
    asgByKey.forEach(list => list.sort((x, y) => ciToMin(x.start) - ciToMin(y.start)));
    (state.hrCheckins || []).forEach(c => { if (c && c.employeeId && inRange(c.date)) ciByKey.set(`${c.employeeId}|${c.date}`, c); });
    (state.hrAttendance || []).forEach(a => { if (a && a.employeeId && inRange(a.date)) attByKey.set(`${a.employeeId}|${a.date}`, a); });
    (state.hrOvertimes || []).forEach(o => {
      if (!o || !o.employeeId) return;
      if (!inRange(o.date)) return;
      const k = `${o.employeeId}|${o.date}`;
      if (!otByKey.has(k)) otByKey.set(k, []);
      otByKey.get(k).push(o);
    });
    (state.hrLeaves || []).forEach(l => {
      if (!l || !l.employeeId) return;
      if (!lvByEmp.has(l.employeeId)) lvByEmp.set(l.employeeId, []);
      lvByEmp.get(l.employeeId).push(l);
    });
    return { asgByKey, ciByKey, attByKey, otByKey, lvByEmp };
  }
  function ciWithCtx(fn, range) {
    const prev = ciCtx;
    ciCtx = ciBuildCtx(range);
    try { return fn(); } finally { ciCtx = prev; }
  }
  // Chỉ mục (NV|ngày) cho lần gọi LẺ (không có ciCtx) — tránh quét tuyến tính
  // hàng nghìn bản ghi mỗi lần (Bảng chấm công tháng gọi theo từng ngày).
  // Chỉ mục giữ THAM CHIẾU bản ghi nên sửa `in/out` tại chỗ vẫn thấy ngay;
  // danh sách đổi (nạp/xóa/khôi phục = mảng mới hoặc đổi độ dài) → dựng lại.
  let ciFindCache = null;
  function ciCheckinOf(employeeId, date) {
    if (ciCtx) return ciCtx.ciByKey.get(`${employeeId}|${date}`) || null;
    const list = state.hrCheckins || [];
    if (!ciFindCache || ciFindCache.src !== list || ciFindCache.len !== list.length) {
      const map = new Map();
      list.forEach(c => { if (c && c.employeeId) map.set(`${c.employeeId}|${c.date}`, c); });
      ciFindCache = { src: list, len: list.length, map };
    }
    return ciFindCache.map.get(`${employeeId}|${date}`) || null;
  }

  // ─── CA ĐÊM: GHÉP CẶP QUA NGÀY ───────────────────────────────────
  // Danh sách phút quẹt THẬT của 1 ngày (punchTimes ∪ in/out) — đã bỏ trùng.
  function ciPunchListOf(employeeId, date) {
    const rec = ciCheckinOf(employeeId, date);
    if (!rec) return [];
    const set = new Set();
    const add = t => {
      const s = ciNormTime(t);
      if (!s) return;
      set.add(ciToMin(s));
    };
    (Array.isArray(rec.punchTimes) ? rec.punchTimes : []).forEach(add);
    add(rec.in);
    add(rec.out);
    return [...set].sort((a, b) => a - b);
  }
  // 1 lượt BỐ TRÍ có phải CA ĐÊM không: khung ca vắt qua nửa đêm + mọi lượt
  // bố trí của ngày đều bắt đầu từ 12:00 trở đi (tránh trộn ca ngày + ca đêm).
  function ciPlanNightOf(plan) {
    if (!plan || !plan.hasPlan || plan.startMin == null || plan.endMin == null) return null;
    if (plan.endMin <= 1440) return null;
    const list = plan.assignments || [];
    if (!list.length) return null;
    if (!list.every(a => ciToMin(a.start) >= 12 * 60)) return null;
    return { startMin: plan.startMin % 1440, endMin: plan.endMin };
  }
  // Ghép (vào, ra) của CA ĐÊM ngày `date`:
  //  · VÀO = lần quẹt CHIỀU/TỐI sớm nhất trong [bắt đầu − 3h, bắt đầu + 4h]
  //  · RA  = lần quẹt SÁNG muộn nhất NGÀY KẾ trong [hết ca − 3h, hết ca + 4h]
  //  · Dự phòng: file kiểu "Giờ vào | Giờ ra" ghi CÙNG dòng (ra < vào).
  function ciNightPairOf(employeeId, date, plan) {
    const night = ciPlanNightOf(plan);
    if (!night) return null;
    const startD = night.startMin;
    const endD = night.endMin - 1440;          // giờ ra tính trong ngày kế (VD 06:00 = 360)
    const inMin = ciPunchListOf(employeeId, date)
      .filter(m => m >= 12 * 60)               // chỉ quẹt buổi chiều/tối
      .find(m => m >= startD - CI_NIGHT_IN_EARLY_MIN && m <= startD + CI_NIGHT_IN_LATE_MIN) || 0;
    const morning = ciPunchListOf(employeeId, hrShiftDateISO(date, 1))
      .filter(m => m < 12 * 60
        && m >= endD - CI_NIGHT_OUT_EARLY_MIN
        && m <= endD + CI_NIGHT_OUT_LATE_MIN);
    let outMin = morning.length ? morning[morning.length - 1] + 1440 : 0;
    let outNextDay = !!outMin;
    if (!outMin) {
      // Dự phòng: cột "Giờ ra" cùng dòng ghi 06:0x (nhỏ hơn giờ vào) → +1 ngày
      const rec = ciCheckinOf(employeeId, date);
      const o = rec ? (ciNormTime(rec.out) ? ciToMin(ciNormTime(rec.out)) : 0) : 0;
      if (o && o <= endD + CI_NIGHT_OUT_LATE_MIN) { outMin = o + 1440; outNextDay = false; }
    }
    return { startMin: startD, endMin: night.endMin, inMin, outMin, outNextDay, morningUsed: outNextDay ? morning : [] };
  }
  // Các lần quẹt SÁNG của ngày `date` đã bị CA ĐÊM HÔM TRƯỚC lấy làm giờ ra
  function ciNightUsedByPrevOf(employeeId, date) {
    const prevDate = hrShiftDateISO(date, -1);
    const pair = ciNightPairOf(employeeId, prevDate, ciPlannedOf(employeeId, prevDate));
    return (pair && pair.morningUsed && pair.morningUsed.length) ? new Set(pair.morningUsed) : new Set();
  }
  // Danh sách quẹt CÒN dùng được cho ngày này (bỏ phần đã bị ca đêm hôm trước lấy)
  function ciUsablePunchesOf(employeeId, date) {
    const list = ciPunchListOf(employeeId, date);
    if (!list.length) return [];
    const used = ciNightUsedByPrevOf(employeeId, date);
    return used.size ? list.filter(m => !used.has(m)) : list;
  }
  // Ngày này CHỈ còn lần quẹt sáng của ca đêm HÔM TRƯỚC (không phải ngày làm riêng)
  function ciNightConsumedOf(employeeId, date) {
    const all = ciPunchListOf(employeeId, date);
    if (!all.length) return null;
    const prevDate = hrShiftDateISO(date, -1);
    const pair = ciNightPairOf(employeeId, prevDate, ciPlannedOf(employeeId, prevDate));
    const used = (pair && pair.morningUsed && pair.morningUsed.length) ? new Set(pair.morningUsed) : null;
    if (!used) return null;
    if (!all.every(m => used.has(m))) return null;
    return { fromDate: prevDate, times: all.slice(), outMin: pair.outMin };
  }

  function ciAttRecordOf(employeeId, date) {
    if (ciCtx) return ciCtx.attByKey.get(`${employeeId}|${date}`) || null;
    return (state.hrAttendance || []).find(a => a.employeeId === employeeId && a.date === date) || null;
  }
  function ciApprovedLeaveOf(employeeId, date) {
    const list = ciCtx ? (ciCtx.lvByEmp.get(employeeId) || [])
      : (state.hrLeaves || []).filter(l => l && l.employeeId === employeeId);
    return list.find(l => (l.status || 'pending') === 'approved' && String(l.from) <= date && date <= String(l.to)) || null;
  }
  function ciAttStatusOf(employeeId, date) {
    const rec = ciAttRecordOf(employeeId, date);
    if (rec && (rec.status === 'work' || rec.status === 'absent')) return rec.status;
    if (ciApprovedLeaveOf(employeeId, date)) return 'leave';
    return '';
  }
  function ciOtListOf(employeeId, date) {
    if (ciCtx) return ciCtx.otByKey.get(`${employeeId}|${date}`) || [];
    return (state.hrOvertimes || []).filter(o => o && o.employeeId === employeeId && o.date === date);
  }


  function ciPad2(n) { return String(n).padStart(2, '0'); }
  function ciToMin(t) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
  function ciFromMin(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${ciPad2(Math.floor(m / 60))}:${ciPad2(m % 60)}`; }
  // Tách HC/TC theo PHÚT + xét ngày nghỉ/lễ (ngày nghỉ → toàn bộ giờ = TC)
  function ciSplitForDate(dept, date, startMin, endMin, shiftIdx) {
    const r = hrSplitHoursHCMin(dept, startMin, endMin, shiftIdx);
    if (date && hrIsRestDay(date) && r.hc > 0) return { hc: 0, tc: r.hc + r.tc };
    return r;
  }
  // Tập NGÀY máy có dữ liệu (để biết ngày nào đã nạp file) — cache theo số bản ghi
  function ciMachineDays() {
    const list = state.hrCheckins || [];
    const sig = `${list.length}|${list[0] ? list[0].date : ''}|${list[list.length - 1] ? list[list.length - 1].date : ''}`;
    if (ciMachineDaysCache && ciMachineDaysCache.sig === sig) return ciMachineDaysCache.set;
    const set = new Set(list.map(c => String(c.date || '')));
    ciMachineDaysCache = { sig, set };
    return set;
  }
  function ciAckOf(employeeId, date) {
    return (state.hrCiAcks || []).find(a => a && a.employeeId === employeeId && a.date === date) || null;
  }
  function ciAssignmentsOn(employeeId, date) {
    if (ciCtx) return ciCtx.asgByKey.get(`${employeeId}|${date}`) || [];
    return (state.hrAssignments || [])
      .filter(a => a && a.employeeId === employeeId && a.date === date)
      .slice().sort((x, y) => hrAssignmentStartMin(x) - hrAssignmentStartMin(y));
  }
  // Giờ BỐ TRÍ của 1 NV trong ngày: khung sớm nhất → muộn nhất + HC/TC + ca
  // ⚠ GỘP KHOẢNG THỜI GIAN TRÙNG (union) — 20/10/2026: trước đây CỘNG dồn mọi
  // lượt bố trí nên 2 vị trí chồng giờ (07:00–hết ca + 07:00–11:30) bị tính
  // 13h30 cho một người chỉ làm 10h30/ngày. Nay hợp các khoảng giờ trong CÙNG
  // (bộ phận + cột ca) rồi mới chia HC/TC ⇒ 07:00–09:30 + 09:30–17:30 = 9h.
  function ciPlannedOf(employeeId, date) {
    const em = hrEmpById(employeeId);
    const dept0 = em && em.department ? em.department : '';
    const list = ciAssignmentsOn(employeeId, date);
    const schedule = hrAssignmentScheduleOf(list);
    let startMin = null, endMin = null;
    const shifts = new Set();
    const groups = new Map();   // 'bộphận|cộtCa' → [[s,e], ...]
    list.forEach(a => {
      const ad = a.department || dept0;
      const idx = a.shiftIdx || 0;
      const interval = schedule.intervals.get(a.id) || hrAssignmentInterval(a, schedule.endById.get(a.id));
      const s = interval.startMin;
      const e = interval.endMin;
      const key = `${ad}|${idx}`;
      if (!groups.has(key)) groups.set(key, { ad, idx, ivs: [] });
      groups.get(key).ivs.push([s, e]);
      startMin = startMin === null ? s : Math.min(startMin, s);
      endMin = endMin === null ? e : Math.max(endMin, e);
      shifts.add(`${idx}|${ad}`);
    });
    let hc = 0, tc = 0;
    groups.forEach(g => {
      const ivs = g.ivs.slice().sort((x, y) => x[0] - y[0]);
      const merged = [];
      ivs.forEach(iv => {
        const last = merged[merged.length - 1];
        if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
        else merged.push([iv[0], iv[1]]);
      });
      merged.forEach(([ms, me]) => {
        const r = hrSplitHoursHCDate(g.ad, date, ciFromMin(ms % 1440), ciFromMin(me % 1440), g.idx);
        hc += r.hc; tc += r.tc;
      });
    });
    return {
      assignments: list, hasPlan: list.length > 0, dept: dept0,
      startMin, endMin, hc, tc,
      shiftIdx: list.length ? (list[0].shiftIdx || 0) : 0,
      multiShift: shifts.size > 1
    };
  }
  // Đoán CA khi ngày đó KHÔNG có bố trí (bảng chấm công tháng dùng): chọn ca có
  // giờ bắt đầu gần giờ quẹt nhất (Hành chính luôn ca 0)
  function ciShiftGuess(dept, inMin) {
    const cfg = hrShiftCfg(dept);
    if (cfg.type !== 'lamca') return 0;
    let best = 0, bestDiff = Infinity;
    (cfg.shifts || []).forEach((s, i) => {
      const r = hrShiftRange(cfg, i);
      const startRel = r.startMin % 1440;
      const diff = Math.min(Math.abs(inMin - startRel), 1440 - Math.abs(inMin - startRel));
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    return best;
  }
  function ciOtOf(employeeId, date) {
    const list = ciOtListOf(employeeId, date);
    const approved = list.filter(o => (o.status || 'pending') === 'approved');
    const pending = list.filter(o => (o.status || 'pending') === 'pending');
    const approvedMin = approved.reduce((s, o) => s + (Number(o.plannedMin) || Math.max(0, ciToMin(o.end) - ciToMin(o.start))), 0);
    let earlyStartMin = null;
    approved.forEach(o => {
      const st = ciToMin(o.start);
      if (st && (earlyStartMin === null || st < earlyStartMin)) earlyStartMin = st;
    });
    return { list, approved, pending, approvedMin, earlyStartMin };
  }

  // Giờ THỰC TẾ của 1 NV trong ngày (từ máy): HC/TC đã áp quy tắc 30' + ca đêm
  // GHÉP CA ĐÊM QUA NGÀY (xem ciNightPairOf): với ca đêm, "vào" là lần quẹt
  // buổi tối hôm nay và "ra" là lần quẹt buổi sáng NGÀY KẾ — KHÔNG lấy
  // sớm nhất/muộn nhất của riêng ngày dương lịch (sẽ thành 06:00→19:46 sai).
  function ciActualSplit(employeeId, date, planIn) {
    const plan = planIn || ciPlannedOf(employeeId, date);
    const dept = plan.dept || hrEmpDept(employeeId);
    const nightPair = ciNightPairOf(employeeId, date, plan);
    const consumed = ciNightConsumedOf(employeeId, date);
    let inMin0 = 0, outMin0 = 0, crossNight = false;
    if (nightPair) {
      inMin0 = nightPair.inMin || 0;
      outMin0 = nightPair.outMin || 0;
      crossNight = !!(nightPair.outNextDay && outMin0);
    } else {
      // Ngày thường: chỉ dùng các lần quẹt CHƯA bị ca đêm hôm trước lấy làm giờ ra
      const punches = ciUsablePunchesOf(employeeId, date);
      if (punches.length) {
        inMin0 = punches[0];
        outMin0 = punches.length > 1 ? punches[punches.length - 1] : 0;
      }
    }
    // Ca đêm (không có bố trí) còn thiếu giờ ra → ghép lần quẹt sáng ngày kế
    if (!outMin0 && inMin0) {
      const cfg0 = hrShiftCfg(dept);
      const idx0 = plan.hasPlan ? plan.shiftIdx : ciShiftGuess(dept, inMin0 % 1440);
      const range0 = hrShiftRange(cfg0, idx0);
      if (cfg0.type === 'lamca' && range0.endMin > 1440) {
        const endD0 = range0.endMin - 1440;
        const next = ciPunchListOf(employeeId, hrShiftDateISO(date, 1))
          .filter(m => m < 12 * 60 && m >= endD0 - CI_NIGHT_OUT_EARLY_MIN && m <= endD0 + CI_NIGHT_OUT_LATE_MIN);
        if (next.length) { outMin0 = next[next.length - 1] + 1440; crossNight = true; }
      }
    }
    if (!inMin0 && !outMin0) {
      return { hasPunch: false, incomplete: true, inMin: 0, outMin: 0, hc: null, tc: null,
        tcRaw: null, workedMin: null, dept, shiftIdx: 0, crossNight: false,
        flags: [], lateMin: 0, earlyOutMin: 0, planStart: 0, nightPair: null, nightOutOfPrev: consumed,
        inRaw: 0, outRaw: 0 };
    }
    // ── GIỜ QUẸT THÔ (để đối chiếu / xuất Excel) — trước khi làm tròn mốc 30'
    const inRaw = inMin0, outRaw = outMin0;
    // ── LÀM TRÒN MỐC 30 PHÚT (20/10/2026, chốt với người dùng):
    //    • GIỜ VÀO → mốc 30' KẾ TIẾP (12:31…12:59 = 13:00; 06:47 = 07:00)
    //    • GIỜ RA  → mốc 30' TRƯỚC ĐÓ  (17:34 = 17:30; 11:31 = 11:30)
    //    Áp SAU khi ghép ca đêm (19:46 → 20:00 · 06:02 → 06:00).
    if (inMin0) inMin0 = Math.ceil(inMin0 / CI_OT_BLOCK_MIN) * CI_OT_BLOCK_MIN;
    if (outMin0) outMin0 = Math.max(CI_OT_BLOCK_MIN, Math.floor(outMin0 / CI_OT_BLOCK_MIN) * CI_OT_BLOCK_MIN);
    const shiftIdx = plan.hasPlan ? plan.shiftIdx : ciShiftGuess(dept, (inMin0 || outMin0) % 1440);
    const range = hrShiftRange(hrShiftCfg(dept), shiftIdx);
    const planStart = plan.hasPlan ? plan.startMin : range.startMin;
    const ot = ciOtOf(employeeId, date);
    const flags = [];
    // ── CHẤM SỚM: máy cho phép quẹt trước < 30' → tính từ giờ bắt đầu ca.
    // Nếu có ĐƠN TĂNG CA đã duyệt bắt đầu TRƯỚC ca thì giữ phần trong đơn.
    let inMin = inMin0;
    if (inMin && planStart && inMin < planStart) {
      const early = planStart - inMin;
      if (ot.earlyStartMin != null && ot.earlyStartMin < planStart) {
        inMin = Math.max(inMin, ot.earlyStartMin);
      } else {
        inMin = planStart;
      }
      if (early >= CI_EARLY_ALLOW_MIN) flags.push('early_punch');
    }
    const incomplete = !outMin0 || !inMin0;
    let hc = null, tc = null, tcRaw = null, workedMin = null;
    if (inMin && outMin0) {
      let outMin = outMin0;
      // +1 ngày CHỈ khi giờ ra THÔ nhỏ hơn giờ vào THÔ (ca đêm vắt qua nửa đêm
      // thật). KHÔNG cộng bừa khi quy tắc chấm sớm đã kéo giờ vào vượt giờ ra
      // (từng sinh "đoạn làm việc 24 giờ" → HC 9h · TC 13h30 cho 0 phút làm).
      if (outMin <= inMin && outRaw && inRaw && outRaw <= inRaw) outMin += 1440;
      if (outMin > inMin) {
        workedMin = outMin - inMin;
        const r = ciSplitForDate(dept, date, inMin, outMin, shiftIdx);
        hc = r.hc; tcRaw = r.tc;
        // TC tính theo khối 30' — ngày nghỉ/lễ giữ nguyên (đó là ngày công)
        tc = hrIsRestDay(date) ? r.tc : Math.floor(r.tc / CI_OT_BLOCK_MIN) * CI_OT_BLOCK_MIN;
      } else {
        // ĐOẠN LÀM VIỆC 0 PHÚT (VD quẹt 06:48–17:30 nhưng bố trí 17:30–19:30):
        // không tính giờ nào cả — KHÔNG để hàm chia giờ phình thành "cả ca".
        workedMin = 0; hc = 0; tc = 0; tcRaw = 0;
        flags.push('zero_span');
      }
    }
    return {
      hasPunch: true, incomplete, inMin, outMin: outMin0,
      inRaw, outRaw,
      hc, tc, tcRaw, workedMin, dept, shiftIdx, crossNight, flags, planStart,
      nightPair: nightPair ? { inMin: nightPair.inMin, outMin: nightPair.outMin, outNextDay: nightPair.outNextDay } : null,
      nightOutOfPrev: consumed,
      lateMin: (plan.hasPlan && inMin0 && plan.startMin) ? Math.max(0, inMin0 - plan.startMin) : 0,
      earlyOutMin: (plan.hasPlan && outMin0 && plan.endMin) ? Math.max(0, plan.endMin - outMin0) : 0
    };
  }

  // Đơn nghỉ ĐÃ DUYỆT phủ ngày — tách cả ngày / theo giờ
  function ciLeaveInfoOf(employeeId, date) {
    const lv = ciApprovedLeaveOf(employeeId, date);
    if (!lv) return null;
    const mode = lv.durationMode || 'full';
    let hours = 0;
    if (mode === 'hours') hours = Number(lv.hours) || 0;
    else if (mode === 'half') hours = Number(lv.hours) || LEAVE_WORK_HOURS_PER_DAY / 2;
    return {
      leave: lv, mode, hours,
      fullDay: mode === 'full' || !hours,
      label: leaveDurationText(lv)
    };
  }

  // ĐỐI CHIẾU 1 NGÀY: bố trí ⟷ máy ⟷ chấm tay ⟷ nghỉ phép ⟷ tăng ca
  function ciCompareDay(employeeId, date) {
    const plan = ciPlannedOf(employeeId, date);
    const rec = ciCheckinOf(employeeId, date);
    const act = ciActualSplit(employeeId, date, plan);
    const leave = ciLeaveInfoOf(employeeId, date);
    const att = ciAttStatusOf(employeeId, date);
    const ot = ciOtOf(employeeId, date);
    const ack = ciAckOf(employeeId, date);
    const machineHas = ciMachineDays().has(String(date));
    // Đã tính trong ciActualSplit (dùng lại, không quét lại toàn bộ bảng)
    const consumed = act.nightOutOfPrev || null;   // chỉ có giờ ra của ca đêm HÔM TRƯỚC
    const night = !!ciPlanNightOf(plan);
    const flags = [];
    let verdict = 'ok';
    if (leave && leave.fullDay && rec) { verdict = 'leave_punch'; flags.push('leave_punch'); }
    else if (leave && leave.fullDay) { verdict = 'leave_ok'; }
    // Chỉ còn lần quẹt SÁNG của ca đêm hôm trước → KHÔNG phải ngày làm riêng
    else if (consumed && !act.hasPunch && !plan.hasPlan) { verdict = 'night_out'; flags.push('night_out'); }
    else if (plan.hasPlan && !rec && machineHas && !hrIsRestDay(date)) { verdict = 'no_punch'; flags.push('no_punch'); }
    else if (consumed && !act.hasPunch && plan.hasPlan) {
      // Có bố trí hôm nay nhưng chỉ quẹt giờ ra của ca đêm hôm trước
      verdict = 'no_punch'; flags.push('night_out_only');
    }
    // Ca đêm: không có lần quẹt buổi tối → thiếu GIỜ VÀO
    else if (night && rec && !act.hasPunch) { verdict = 'no_in'; flags.push('no_in'); }
    else if (night && act.hasPunch && !act.inMin) { verdict = 'no_in'; flags.push('no_in'); }
    else if (act.hasPunch && act.incomplete) { verdict = 'no_out'; flags.push('no_out'); }
    else if (att === 'absent' && rec) { verdict = 'absent_punch'; flags.push('absent_punch'); }
    else {
      // Ngày KHÔNG có bố trí nhưng đã chấm tay "Đi làm" → coi là khớp (chỉ nhắc
      // nhẹ "chưa bố trí"), tránh báo động cả tháng khi Bảng bố trí chưa nhập.
      if (!plan.hasPlan && rec) flags.push('no_plan_info');
      if (!plan.hasPlan && rec && att !== 'work') { verdict = 'no_plan'; flags.push('no_plan'); }
      // Nghỉ THEO GIỜ: không so "về sớm" theo giờ hết ca (nghỉ buổi chiều là đúng)
      const partialLeave = !!(leave && !leave.fullDay);
      if (!partialLeave && act.lateMin > CI_LATE_TOL_MIN) { verdict = 'late'; flags.push('late'); }
      if (!partialLeave && act.earlyOutMin > CI_LATE_TOL_MIN) { if (verdict === 'ok') verdict = 'early'; flags.push('early'); }
      if (rec && att === '' && !leave) { if (verdict === 'ok') verdict = 'unmarked'; flags.push('unmarked'); }
      if (act.flags && act.flags.indexOf('early_punch') !== -1) flags.push('early_punch');
    }
    // Nghỉ theo GIỜ — so phần còn phải làm
    let leaveDeltaMin = 0;
    if (leave && !leave.fullDay && act.workedMin != null && plan.hasPlan) {
      const expected = plan.hc + plan.tc - Math.round(leave.hours * 60);
      leaveDeltaMin = act.workedMin - expected;
      if (Math.abs(leaveDeltaMin) > CI_LATE_TOL_MIN) {
        flags.push('leave_mismatch');
        if (verdict === 'ok' || verdict === 'unmarked') verdict = 'leave_hours';
      }
    }
    // Tăng ca: TC máy ⟷ Σ đơn đã duyệt
    let otStatus = 'none';
    if (ot.pending.length) otStatus = 'pending';
    if (ot.approvedMin > 0) {
      if (act.incomplete) otStatus = 'waiting';
      else {
        const d = (act.tc || 0) - ot.approvedMin;
        otStatus = d < -(CI_OT_BLOCK_MIN / 2) ? 'short' : (d > (CI_OT_BLOCK_MIN / 2) ? 'over' : 'ok');
      }
    } else if ((act.tc || 0) > 0 && !ot.pending.length) {
      otStatus = 'unregistered';
    }
    const otDelta = (act.tc || 0) - ot.approvedMin;
    const needsReview = !ack && (
      ['late', 'early', 'no_out', 'no_in', 'no_punch', 'no_plan', 'leave_punch', 'absent_punch',
        'unmarked', 'leave_hours'].indexOf(verdict) !== -1
      || ['short', 'over', 'unregistered', 'pending'].indexOf(otStatus) !== -1
      || flags.indexOf('early_punch') !== -1
    );
    const em = hrEmpById(employeeId);
    const row = {
      employeeId, employeeName: hrEmpName(employeeId), dept: hrEmpDept(employeeId),
      empCode: em ? (em.code || '') : '', date, rec, plan, actual: act, leave, att, ot,
      otStatus, otDelta, ack, verdict, flags, needsReview, machineHas, leaveDeltaMin,
      timeText: ciMachineTimeTextOf(rec, act, consumed)
    };
    row.anomalies = ciAnomalyOf(row);
    return row;
  }
  // Chuỗi giờ máy hiển thị trên bảng: ưu tiên cặp ĐÃ GHÉP của ca đêm
  function ciMachineTimeTextOf(rec, act, consumed) {
    if (act && act.nightPair && (act.nightPair.inMin || act.nightPair.outMin)) {
      const a = act.nightPair.inMin ? ciFromMin(act.nightPair.inMin % 1440) : '?';
      const b = act.nightPair.outMin ? ciFromMin(act.nightPair.outMin % 1440) : '';
      return `${a}${b ? '–' + b + (act.nightPair.outNextDay ? ' (+1)' : '') : ''}`;
    }
    if (consumed && act && !act.hasPunch) {
      return `${consumed.times.map(m => ciFromMin(m)).join(', ')} (ra ca đêm hôm trước)`;
    }
    if (!rec) return '';
    return `${rec.in || '?'}${rec.out ? '–' + rec.out : ''}`;
  }

  // ── RÀ SOÁT BẤT THƯỜNG (20/10/2026) ──────────────────────────────
  // Liệt kê các dòng số VÔ LÝ để người dùng tìm nhanh phần còn sai
  // (thay vì soi tay cả tháng). CHỈ ĐỌC — không đổi số liệu.
  const CI_ANOMALY_LABEL = {
    zero_span: 'Vào = ra (0 phút làm)',
    hc_no_work: 'Có HC nhưng 0 phút làm',
    too_long: 'HC+TC > 16 giờ',
    punch_over_plan: 'Quẹt dài hơn bố trí > 2h (thiếu vị trí?)',
    out_before_in: 'Giờ ra ≤ giờ vào',
    ot_far_over: 'TC vượt đơn > 4h'
  };
  function ciAnomalyOf(r) {
    const out = [];
    if (!r) return out;
    const a = r.actual || {};
    const plan = r.plan || {};
    const worked = a.workedMin;
    if (a.hasPunch && worked === 0) out.push('zero_span');
    if (a.hc > 0 && worked != null && worked <= 0) out.push('hc_no_work');
    if ((Number(a.hc) || 0) + (Number(a.tc) || 0) > CI_WORK_DAY_MAX_MIN) out.push('too_long');
    // Quẹt THÔ dài hơn bố trí > 4h → nghi THIẾU vị trí bố trí (VD ai đó xoá
    // mất lượt bố trí 9h, chỉ còn lượt TC 2h — đúng ca của Lương Thị Mùng).
    // Lưu ý: `outRaw` của ca đêm ĐÃ là giờ ngày kế (>1440) → chỉ +1440 khi ra ≤ vào.
    const rawSpan = (a.inRaw && a.outRaw)
      ? Math.max(0, (a.outRaw > a.inRaw) ? (a.outRaw - a.inRaw) : (a.outRaw + 1440 - a.inRaw))
      : 0;
    if (plan.hasPlan && rawSpan > (plan.hc + plan.tc) + 240) out.push('punch_over_plan');
    if (a.hasPunch && a.inMin && a.outMin && a.outMin <= a.inMin) out.push('out_before_in');
    if ((Number(a.tc) || 0) - (r.ot ? (r.ot.approvedMin || 0) : 0) > 240) out.push('ot_far_over');
    return out;
  }

  // ── DANH SÁCH DÒNG ĐỐI CHIẾU (hợp của Bố trí ∪ Giờ máy ∪ Đơn tăng ca) ──
  function ciRowsForRange(from, to, opts) {
    return ciWithCtx(() => ciRowsForRangeInner(from, to, opts), { from, to });
  }
  function ciRowsForRangeInner(from, to, opts) {
    const o = opts || {};
    const inRange = d => (!from || d >= from) && (!to || d <= to);
    const keys = new Map();
    const add = (empId, date) => {
      if (!empId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return;
      if (!inRange(date)) return;
      keys.set(`${empId}|${date}`, { employeeId: empId, date });
    };
    (state.hrAssignments || []).forEach(a => add(a.employeeId, a.date));
    (state.hrCheckins || []).forEach(c => add(c.employeeId, c.date));
    (state.hrOvertimes || []).forEach(ov => add(ov.employeeId, ov.date));
    // Ngày nghỉ có phép (chỉ khi bật "Hiện ngày nghỉ có phép")
    if (o.includeLeave) {
      (state.hrLeaves || []).forEach(l => {
        if (!l || (l.status || 'pending') !== 'approved') return;
        const d0 = String(l.from || '');
        const d1 = String(l.to || l.from || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d0) || !/^\d{4}-\d{2}-\d{2}$/.test(d1)) return;
        if (from && d1 < from) return;
        if (to && d0 > to) return;
        let d = d0, guard = 0;
        for (; d <= d1 && guard < 400; d = hrShiftDateISO(d, 1), guard++) {
          if (inRange(d)) add(l.employeeId, d);
        }
      });
    }
    const dept = o.dept || 'all';
    const q = hrStripDiacritics(o.q || '');
    let rows = [];
    keys.forEach(k => {
      const em = hrEmpById(k.employeeId);
      if (dept !== 'all' && (!em || (em.department || '—') !== dept)) return;
      if (q) {
        const hay = hrStripDiacritics(`${em ? em.name : ''} ${em ? em.code : ''} ${k.date} ${(em && em.department) || ''}`);
        if (hay.indexOf(q) === -1) return;
      }
      rows.push(ciCompareDay(k.employeeId, k.date));
    });
    if (!o.includeLeave) rows = rows.filter(r => r.verdict !== 'leave_ok');
    if (o.onlyIssues) rows = rows.filter(r => r.needsReview);
    if (o.onlyAnomaly) rows = rows.filter(r => r.anomalies && r.anomalies.length);
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) ||
      String(a.employeeName).localeCompare(String(b.employeeName), 'vi'));
    return rows;
  }

  function ciSummaryOf(rows) {
    const s = { total: rows.length, ok: 0, review: 0, late: 0, early: 0, noOut: 0, noIn: 0,
      nightOut: 0, noPunch: 0, noPlan: 0, leavePunch: 0, absent: 0, otDiff: 0, ack: 0, bad: 0 };
    rows.forEach(r => {
      if (r.ack) s.ack++;
      if (r.needsReview) s.review++;
      if (r.anomalies && r.anomalies.length) s.bad++;
      if (!r.ack && r.verdict === 'ok') s.ok++;
      if (r.flags.indexOf('late') !== -1) s.late++;
      if (r.flags.indexOf('early') !== -1) s.early++;
      if (r.verdict === 'no_out') s.noOut++;
      if (r.verdict === 'no_in') s.noIn++;
      if (r.verdict === 'night_out') s.nightOut++;
      if (r.verdict === 'no_punch') s.noPunch++;
      if (r.verdict === 'no_plan') s.noPlan++;
      if (r.verdict === 'leave_punch') s.leavePunch++;
      if (r.verdict === 'absent_punch') s.absent++;
      if (['short', 'over', 'unregistered', 'pending'].indexOf(r.otStatus) !== -1) s.otDiff++;
    });
    return s;
  }

  // ── TRẠNG THÁI BỘ LỌC (nhớ theo MÁY — thuần UI, không mây/backup) ──
  function ciUiSaved() {
    try { return JSON.parse(localStorage.getItem(HR_CI_UI_KEY)) || {}; } catch (e) { return {}; }
  }
  function ciSaveUi(patch) {
    try { localStorage.setItem(HR_CI_UI_KEY, JSON.stringify(Object.assign({}, ciUiSaved(), patch || {}))); } catch (e) {}
  }
  function ciMonthRange(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return { from: '', to: '' };
    const [y, m] = month.split('-').map(Number);
    const n = new Date(y, m, 0).getDate();
    return { from: `${month}-01`, to: `${month}-${ciPad2(n)}` };
  }
  // Tháng mặc định = tháng có dữ liệu (máy hoặc bố trí) MỚI NHẤT — mở thẻ là thấy ngay
  function ciDefaultMonth() {
    const ds = (state.hrCheckins || []).map(c => String(c.date || '').slice(0, 7))
      .concat((state.hrAssignments || []).map(a => String(a.date || '').slice(0, 7)))
      .filter(m => /^\d{4}-\d{2}$/.test(m)).sort();
    return ds.length ? ds[ds.length - 1] : hrTodayISO().slice(0, 7);
  }
  // ─── KỲ ĐỐI CHIẾU: NGÀY / TUẦN / THÁNG (21/10/2026) ─────────────
  // Mặc định 'month' để KHÔNG đổi hành vi cũ. Tuần theo ISO 8601
  // (Thứ 2 → Chủ nhật, tuần chứa Thứ 5). Tự tính tại đây — KHÔNG import
  // planning/report-center (tránh vòng import).
  function ciShiftDays(iso, days) {
    const s = String(iso || '').slice(0, 10);
    const d = new Date(s + 'T00:00:00');
    if (isNaN(d.getTime())) return s;
    d.setDate(d.getDate() + Number(days || 0));
    return `${d.getFullYear()}-${ciPad2(d.getMonth() + 1)}-${ciPad2(d.getDate())}`;
  }
  function ciDefaultDay() {
    const ds = (state.hrCheckins || []).map(c => String(c.date || ''))
      .concat((state.hrAssignments || []).map(a => String(a.date || '')))
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    return ds.length ? ds[ds.length - 1] : hrTodayISO();
  }
  function ciIsoWeekOf(iso) {
    const s = String(iso || '').slice(0, 10);
    const d = new Date(s + 'T00:00:00');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(d.getTime())) return { year: 0, week: 0 };
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dow = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dow);
    const year = t.getUTCFullYear();
    const y0 = new Date(Date.UTC(year, 0, 1));
    return { year, week: Math.ceil((((t - y0) / 86400000) + 1) / 7) };
  }
  function ciIsoWeekKey(iso) {
    const w = ciIsoWeekOf(iso);
    return (w.year && w.week) ? `${w.year}-W${ciPad2(w.week)}` : '';
  }
  function ciIsoWeekRange(weekKey) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(String(weekKey || ''));
    if (!m) return { from: '', to: '' };
    const y = Number(m[1]), w = Math.min(53, Math.max(1, Number(m[2])));
    const mon = new Date(Date.UTC(y, 0, 4));
    const dow = mon.getUTCDay() || 7;
    mon.setUTCDate(mon.getUTCDate() - dow + 1 + (w - 1) * 7);
    const from = mon.toISOString().slice(0, 10);
    const sun = new Date(mon); sun.setUTCDate(sun.getUTCDate() + 6);
    return { from, to: sun.toISOString().slice(0, 10) };
  }
  function ciPeriodLabelOf(mode, from, to) {
    if (!from) return 'Tất cả thời gian';
    if (mode === 'day') return fmtDateDMY(from);
    if (mode === 'week') {
      const w = ciIsoWeekOf(from);
      return `Tuần ${w.week} · ${fmtDateDMY(from)} – ${fmtDateDMY(to)}`;
    }
    return `Tháng ${from.slice(5, 7)}/${from.slice(0, 4)}`;
  }
  // Khoảng ngày đang xem — nguồn CHÂN LÝ cho bảng + thao tác hàng loạt
  function ciRangeOf(uiIn) {
    const u = uiIn || ciReadUi();
    if (u.mode === 'day') {
      const day = /^\d{4}-\d{2}-\d{2}$/.test(u.day || '') ? u.day : ciDefaultDay();
      return { mode: 'day', from: day, to: day, label: ciPeriodLabelOf('day', day, day) };
    }
    if (u.mode === 'week') {
      const key = /^\d{4}-W\d{1,2}$/.test(u.week || '') ? u.week : ciIsoWeekKey(u.day || ciDefaultDay());
      const r = ciIsoWeekRange(key);
      return { mode: 'week', key, from: r.from, to: r.to, label: ciPeriodLabelOf('week', r.from, r.to) };
    }
    const mr = ciMonthRange(u.month);
    return { mode: 'month', from: mr.from, to: mr.to, label: ciPeriodLabelOf('month', mr.from, mr.to) };
  }

  function ciReadUi() {
    const gv = id => { const el = document.getElementById(id); return el ? String(el.value || '') : ''; };
    const saved = ciUiSaved();
    // KỲ = đã lưu (đổi qua ô nhập/nút ‹ › đều ghi vào đây); chưa có → tháng có dữ
    // liệu máy MỚI NHẤT. KHÔNG đọc thẳng value ô nhập (ô chỉ là hiển thị — nếu
    // đọc, dữ liệu của tháng khác vừa nạp sẽ bị lọc mất).
    const mode = ['day', 'week', 'month'].indexOf(saved.mode) !== -1 ? saved.mode : 'month';
    const month = /^\d{4}-\d{2}$/.test(saved.month || '') ? saved.month : ciDefaultMonth();
    const day = /^\d{4}-\d{2}-\d{2}$/.test(saved.day || '') ? saved.day : ciDefaultDay();
    const week = /^\d{4}-W\d{1,2}$/.test(saved.week || '') ? saved.week : ciIsoWeekKey(day);
    // Bộ phận: ưu tiên lựa chọn đã lưu (mọi thay đổi đều được ghi lại) — ô select
    // trên giao diện chỉ là hiển thị, tránh bị snap về "Tất Cả" khi render lại.
    let dept = saved.dept || gv('hr-ci-filter-dept') || 'all';
    // Bộ phận đã lưu không còn nhân viên nào → về "Tất Cả" (tránh bảng trống khó hiểu)
    if (dept !== 'all' && !(state.hrEmployees || []).some(e => (e.department || '—') === dept)) dept = 'all';
    const onlyEl = document.getElementById('hr-ci-only-issues');
    const leaveEl = document.getElementById('hr-ci-show-leave');
    const badEl = document.getElementById('hr-ci-only-anomaly');
    return {
      mode, day, week, month, dept, q: gv('hr-ci-search'),
      chip: typeof saved.chip === 'string' ? saved.chip : '',
      onlyIssues: onlyEl ? !!onlyEl.checked : true,
      includeLeave: leaveEl ? !!leaveEl.checked : false,
      onlyAnomaly: badEl ? !!badEl.checked : false
    };
  }
  // Ngày "neo" khi đổi chế độ: tuần → Thứ 2 của tuần; tháng → hôm nay nếu cùng tháng
  function ciBaseDayOf(ui) {
    if (ui.mode === 'week' && ui.week) return ciIsoWeekRange(ui.week).from || ui.day;
    if (ui.mode === 'day') return ui.day;
    const today = hrTodayISO();
    return (today.slice(0, 7) === ui.month) ? today : `${ui.month}-01`;
  }
  function applyCiPeriodUi(ui) {
    const mode = ui.mode || 'month';
    const dayEl = document.getElementById('hr-ci-day');
    const monEl = document.getElementById('hr-ci-month');
    if (dayEl) dayEl.hidden = (mode === 'month');
    if (monEl) monEl.hidden = (mode !== 'month');
    if (typeof document.querySelectorAll === 'function') {
      document.querySelectorAll('[data-ci-mode]').forEach(b => {
        if (!b || !b.classList) return;
        const on = b.getAttribute('data-ci-mode') === mode;
        b.classList.toggle('is-active', on);
        try { b.setAttribute('aria-pressed', on ? 'true' : 'false'); } catch (e) {}
      });
    }
  }
  function ciSyncToolbar(ui) {
    const mEl = document.getElementById('hr-ci-month');
    if (mEl && mEl.value !== ui.month) mEl.value = ui.month;
    const dayEl = document.getElementById('hr-ci-day');
    if (dayEl) {
      const dayVal = (ui.mode === 'week') ? (ciIsoWeekRange(ui.week).from || ui.day) : ui.day;
      if (dayEl.value !== dayVal) dayEl.value = dayVal;
    }
    const dEl = document.getElementById('hr-ci-filter-dept');
    if (dEl && ui.dept && dEl.value !== ui.dept) dEl.value = ui.dept;
    const qEl = document.getElementById('hr-ci-search');
    if (qEl && !qEl.value && ui.q) qEl.value = ui.q;
    // Ô tick phải phản ánh đúng trạng thái đã lưu (bấm chip sẽ tự bỏ tick)
    const oi = document.getElementById('hr-ci-only-issues');
    if (oi && oi.checked !== ui.onlyIssues) oi.checked = ui.onlyIssues;
    const ol = document.getElementById('hr-ci-show-leave');
    if (ol && ol.checked !== ui.includeLeave) ol.checked = ui.includeLeave;
    const oa = document.getElementById('hr-ci-only-anomaly');
    if (oa && oa.checked !== ui.onlyAnomaly) oa.checked = ui.onlyAnomaly;
    const lbl = document.getElementById('hr-ci-period-label');
    if (lbl) lbl.textContent = ciRangeOf(ui).label;
    applyCiPeriodUi(ui);
  }
  // Đổi chế độ kỳ (Ngày/Tuần/Tháng) — giữ ngày đang xem làm mốc
  function ciSetPeriodMode(mode) {
    if (['day', 'week', 'month'].indexOf(mode) === -1) return false;
    const ui = ciReadUi();
    const base = ciBaseDayOf(ui);
    const patch = { mode };
    if (mode === 'week') { patch.week = ciIsoWeekKey(base); patch.day = base; }
    else if (mode === 'day') { patch.day = base; }
    else { patch.month = String(base).slice(0, 7); }
    ciSaveUi(patch);
    ciRenderCheckinTable();
    return true;
  }
  // ‹ › nhảy theo ĐÚNG chế độ đang xem
  function ciShiftPeriod(delta) {
    const d = Number(delta) || 0;
    if (!d) return;
    const ui = ciReadUi();
    if (ui.mode === 'day') {
      const day = ciShiftDays(ui.day, d);
      ciSaveUi({ day, month: day.slice(0, 7), week: ciIsoWeekKey(day) });
    } else if (ui.mode === 'week') {
      const day = ciShiftDays(ciBaseDayOf(ui), d * 7);
      ciSaveUi({ day, week: ciIsoWeekKey(day), month: day.slice(0, 7) });
    } else {
      const [y, m] = ui.month.split('-').map(Number);
      const nd = new Date(y, m - 1 + d, 1);
      const month = `${nd.getFullYear()}-${ciPad2(nd.getMonth() + 1)}`;
      const el = document.getElementById('hr-ci-month');
      if (el) el.value = month;
      ciSaveUi({ month });
    }
    ciRenderCheckinTable();
  }
  // Giữ tên cũ (test/legacy) — nay mode-aware
  function ciShiftMonth(delta) { ciShiftPeriod(delta); }
  function ciGoToday() {
    const today = hrTodayISO();
    ciSaveUi({ mode: 'day', day: today, month: today.slice(0, 7), week: ciIsoWeekKey(today) });
    ciRenderCheckinTable();
  }
  // Đổi ô NGÀY: chế độ Ngày → đúng ngày đó; chế độ Tuần → tuần chứa ngày đó
  function ciOnDayInput(val) {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(String(val || '')) ? String(val) : ciDefaultDay();
    const ui = ciReadUi();
    const patch = { day, month: day.slice(0, 7) };
    if (ui.mode === 'week') patch.week = ciIsoWeekKey(day);
    ciSaveUi(patch);
    ciRenderCheckinTable();
  }
  // Điều hướng ngược: bấm Ô NGÀY → xem riêng ngày đó (bỏ lọc chip)
  function ciGotoDay(date) {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) ? String(date) : hrTodayISO();
    ciSaveUi({ mode: 'day', day, month: day.slice(0, 7), week: ciIsoWeekKey(day), chip: '' });
    ciRenderCheckinTable();
  }
  // Điều hướng ngược: bấm TÊN NV → lọc nhanh theo người đó
  function ciFilterByEmployee(employeeId) {
    const name = hrEmpName(employeeId);
    const el = document.getElementById('hr-ci-search');
    if (el) el.value = name || '';
    ciRenderCheckinTable();
  }

  // ── Ô HIỂN THỊ ─────────────────────────────────────────────────
  function ciChip(label, cls, title) {
    return `<span class="hr-chip ${escapeHTML(cls || '')}"${title ? ` title="${escapeHTML(title)}"` : ''}>${escapeHTML(label)}</span>`;
  }
  function ciPlanCell(r) {
    if (!r.plan.hasPlan) return '<span class="ci-none">— chưa bố trí —</span>';
    const schedule = hrAssignmentScheduleOf(r.plan.assignments);
    const items = r.plan.assignments.map(a => {
      const range = hrShiftRange(hrShiftCfg(a.department || r.dept), a.shiftIdx || 0);
      const end = schedule.endById.get(a.id) || '';
      const time = `${fmtHour(a.start)}${end ? '–' + fmtHour(end) : ' → hết ca (' + fmtHour(range.end) + ')'}`;
      return `<span class="ci-plan-item" title="${escapeHTML(hrPosName(a.positionId) + ' · ' + time)}">
        <strong>${escapeHTML(hrPosName(a.positionId))}</strong> ${escapeHTML(time)}</span>`;
    }).join('');
    const total = r.plan.hc + r.plan.tc;
    return `<div class="ci-plan-list">${items}</div>
      <div class="ci-sub">Bố trí <strong>${escapeHTML(fmtHm(total))}</strong>${r.plan.tc ? ` · HC ${escapeHTML(fmtHm(r.plan.hc))} + TC ${escapeHTML(fmtHm(r.plan.tc))}` : ''}</div>`;
  }
  function ciMachineCell(r) {
    if (!r.rec) return '<span class="ci-none ci-none-off">Không quẹt máy</span>';
    const extras = [];
    if (r.rec.punches > 2) extras.push(`${r.rec.punches} lần quét`);
    if (r.actual.crossNight) extras.push('ghép qua đêm');
    if (r.verdict === 'night_out') extras.push('của ca đêm hôm trước');
    if (r.actual.incomplete && r.verdict !== 'night_out') extras.push(r.actual.inMin ? 'thiếu giờ ra' : 'thiếu giờ vào');
    // Bấm giờ máy = mở luôn "Xử lý dòng công" (chỉ khi có quyền chốt công)
    const timeHtml = canPayLock()
      ? `<button type="button" class="ci-cell-link hr-emp-code" data-ci-open-pay="1" data-ci-emp="${escapeHTML(r.employeeId)}" data-ci-date="${escapeHTML(r.date)}" title="Bấm để mở Xử lý dòng công">${escapeHTML(r.timeText)}</button>`
      : `<span class="hr-emp-code">${escapeHTML(r.timeText)}</span>`;
    return timeHtml +
      (extras.length ? `<div class="ci-sub">${escapeHTML(extras.join(' · '))}</div>` : '');
  }
  function ciActualCell(r) {
    const a = r.actual;
    if (!a.hasPunch) return '<span class="ci-none">—</span>';
    if (a.hc == null) return '<span class="ci-none">— chờ giờ ra —</span>';
    const rounded = (a.tcRaw != null && a.tc != null && a.tc !== a.tcRaw)
      ? `<div class="ci-sub">TC gốc ${escapeHTML(fmtHm(a.tcRaw))} → tròn 30' = ${escapeHTML(fmtHm(a.tc))}</div>` : '';
    return `<strong>HC ${escapeHTML(fmtHm(a.hc))}</strong> · <strong>TC ${escapeHTML(fmtHm(a.tc))}</strong>${rounded}`;
  }
  function ciDiffCell(r) {
    const v = CI_VERDICT[r.verdict] || CI_VERDICT.ok;
    let html = ciChip(v.label, v.cls, r.needsReview ? 'Cần xác nhận' : (r.ack ? 'Đã xác nhận' : 'Khớp'));
    if (r.verdict === 'late' && r.actual.lateMin) html += ` <span class="ci-min">+${r.actual.lateMin}'</span>`;
    if (r.flags.indexOf('early') !== -1 && r.actual.earlyOutMin) html += ` <span class="ci-min">−${r.actual.earlyOutMin}'</span>`;
    if (r.flags.indexOf('early_punch') !== -1) html += ` <span class="ci-min ci-min-hint" title="Quẹt sớm hơn giờ bắt đầu ca từ 30 phút trở lên">quẹt sớm</span>`;
    if (r.flags.indexOf('no_plan_info') !== -1) html += ` <span class="ci-min ci-min-hint" title="Ngày này chưa có bố trí trong Bảng bố trí — chỉ để tham khảo, không tính là lỗi khi chấm tay đã Đi làm">chưa bố trí</span>`;
    if (r.flags.indexOf('night_out_only') !== -1) html += ` <span class="ci-min ci-min-hint" title="Lần quẹt buổi sáng này là GIỜ RA của ca đêm HÔM TRƯỚC — hôm nay chưa có giờ vào. Hãy kiểm tra lại hoặc đánh dấu đã xác nhận.">chỉ có giờ ra ca đêm hôm trước</span>`;
    if (r.anomalies && r.anomalies.length) {
      const t = r.anomalies.map(k => CI_ANOMALY_LABEL[k] || k).join(' · ');
      html += ` <span class="ci-min ci-bad-hint" title="⚠ Dòng bất thường — ${escapeHTML(t)}">⚠ bất thường</span>`;
    }
    if (r.flags.indexOf('leave_mismatch') !== -1) {
      html += ` <span class="ci-min ci-min-hint" title="Giờ làm thực tế lệch với phần còn phải làm sau khi trừ giờ nghỉ">lệch ${escapeHTML(fmtHm(Math.abs(r.leaveDeltaMin || 0)))}</span>`;
    }
    if (r.ack) html += ` <span class="ci-ack-chip" title="${escapeHTML('Xác nhận bởi ' + (r.ack.by || '') + (r.ack.at ? ' lúc ' + String(r.ack.at).slice(0, 16).replace('T', ' ') : '') + (r.ack.note ? ' — ' + r.ack.note : ''))}">✓ đã xác nhận</span>`;
    // Trạng thái XỬ LÝ DÒNG CÔNG (20/10/2026): Chờ duyệt / Đã chốt / Bị từ chối / Miễn trừ
    const payChip = payRowChipHtml(r.employeeId, r.date);
    if (payChip) html += ' ' + payChip;
    return html;
  }
  function ciLeaveOtCell(r) {
    const parts = [];
    if (r.leave) {
      const title = `${r.leave.label}${r.leave.fullDay ? '' : ' — còn phải làm ' + fmtHm(Math.max(0, r.plan.hc + r.plan.tc - Math.round(r.leave.hours * 60)))}`
        + (r.leave.leave.approvedBy ? ' · duyệt bởi ' + r.leave.leave.approvedBy : '');
      parts.push(ciChip(r.leave.label, r.leave.fullDay ? 'ok' : 'warn', title));
    }
    if (r.ot.approvedMin > 0) parts.push(ciChip(`TC đơn ${fmtHm(r.ot.approvedMin)}`, 'warn', 'Tổng giờ tăng ca đã được duyệt trong ngày'));
    if (r.ot.pending.length) {
      const pendMin = r.ot.pending.reduce((s, o) => s + (Number(o.plannedMin) || 0), 0);
      parts.push(ciChip(`TC chờ duyệt ${fmtHm(pendMin)}`, 'warn', 'Đơn tăng ca chưa được duyệt'));
    }
    if (r.otStatus === 'short' || r.otStatus === 'over') {
      const sign = r.otDelta > 0 ? '+' : '−';
      parts.push(ciChip(`${CI_OT_LABEL[r.otStatus]} ${sign}${fmtHm(Math.abs(r.otDelta))}`, r.otDelta > 0 ? 'warn' : 'off',
        `Máy ${fmtHm(r.actual.tc || 0)} · đơn ${fmtHm(r.ot.approvedMin)}`));
    } else if (r.otStatus === 'unregistered') {
      parts.push(ciChip(CI_OT_LABEL.unregistered, 'off', `Máy ${fmtHm(r.actual.tc || 0)} nhưng chưa có đơn tăng ca được duyệt`));
    } else if (r.otStatus === 'pending') {
      if (!r.ot.pending.length) parts.push(ciChip(CI_OT_LABEL.pending, 'warn'));
    }
    return parts.length ? parts.join(' ') : '<span class="ci-none">—</span>';
  }
  function ciActionCell(r) {
    const btns = [];
    const canApply = r.rec && !r.leave && r.verdict !== 'night_out' && (r.att === '' || r.att === 'absent');
    if (canApply) {
      btns.push(`<button class="btn btn-success btn-sm" data-pay="apply" onclick="app.hrApplyCheckin('${escapeHTML(r.employeeId)}','${escapeHTML(r.date)}')" title="Chấm tay thành Đi làm theo máy"><i data-lucide="check"></i> Áp Dụng</button>`);
    }
    // XỬ LÝ DÒNG CÔNG — thay nút "Xác Nhận" cũ (20/10/2026): ghi nhận giờ để
    // tính lương / bổ sung đơn TC / sửa giờ máy / hủy TC vượt / miễn trừ.
    const pr = payRowOf(r.employeeId, r.date);
    const empA = escapeHTML(r.employeeId);
    const dateA = escapeHTML(r.date);
    btns.push(`<button class="btn btn-outline btn-sm" data-pay="lock" data-ci-pay="1" data-ci-emp="${empA}" data-ci-date="${dateA}" title="Xử lý dòng công: chấp nhận giờ làm · bổ sung đơn TC · sửa giờ máy · hủy TC vượt · miễn trừ"><i data-lucide="clipboard-check"></i> Xử lý</button>`);
    if (pr && pr.status === 'cho_duyet') {
      btns.push(`<button class="btn btn-success btn-sm" data-manager-only data-ci-pay-approve="1" data-ci-emp="${empA}" data-ci-date="${dateA}" title="Duyệt đề nghị của dòng này (Admin / Ban Quản Lý)"><i data-lucide="badge-check"></i> Duyệt</button>`);
      btns.push(`<button class="btn btn-outline btn-sm" data-manager-only data-ci-pay-reject="1" data-ci-emp="${empA}" data-ci-date="${dateA}" title="Từ chối đề nghị của dòng này" style="color:var(--danger);"><i data-lucide="x"></i></button>`);
    }
    if (r.rec) {
      btns.push(`<button class="btn btn-outline btn-icon btn-sm" data-pay="apply" onclick="app.hrDeleteCheckin('${escapeHTML(r.rec.id)}')" title="Xóa bản ghi giờ này" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>`);
    }
    return `<div class="ci-actions">${btns.join('')}</div>`;
  }

  // ── RENDER BẢNG ĐỐI CHIẾU ──────────────────────────────────────
  // ── CHÍP LỌC NHANH (21/10/2026) ─────────────────────────────────
  // Bấm chíp = LỌC theo nhóm + tự bỏ tick "Chỉ dòng cần xác nhận/bất thường"
  // + nhảy tới dòng đầu tiên (tô sáng). Bấm lại / chíp Tổng = bỏ lọc.
  const CI_CHIP_DEFS = [
    { key: 'ok', label: 'Khớp' },
    { key: 'review', label: 'Cần xác nhận', cls: 'is-warn' },
    { key: 'bad', label: '⚠ Bất thường', cls: 'is-danger' },
    { key: 'late', label: 'Đi muộn' },
    { key: 'early', label: 'Về sớm' },
    { key: 'noOut', label: 'Thiếu giờ ra' },
    { key: 'noIn', label: 'Thiếu giờ vào' },
    { key: 'nightOut', label: 'Ca đêm (ra hôm trước)', cls: 'is-off' },
    { key: 'noPunch', label: 'Không quẹt máy' },
    { key: 'noPlan', label: 'Chưa bố trí' },
    { key: 'leavePunch', label: 'Nghỉ có quẹt' },
    { key: 'absent', label: 'Chấm tay Vắng' },
    { key: 'otDiff', label: 'TC lệch' }
  ];
  const CI_CHIP_MATCH = {
    ok: r => !r.ack && r.verdict === 'ok',
    review: r => !!r.needsReview,
    bad: r => !!(r.anomalies && r.anomalies.length),
    late: r => (r.flags || []).indexOf('late') !== -1,
    early: r => (r.flags || []).indexOf('early') !== -1,
    noOut: r => r.verdict === 'no_out',
    noIn: r => r.verdict === 'no_in',
    nightOut: r => r.verdict === 'night_out',
    noPunch: r => r.verdict === 'no_punch',
    noPlan: r => r.verdict === 'no_plan',
    leavePunch: r => r.verdict === 'leave_punch',
    absent: r => r.verdict === 'absent_punch',
    otDiff: r => ['short', 'over', 'unregistered', 'pending'].indexOf(r.otStatus) !== -1
  };
  let ciPendingFlash = false;   // đặt = true khi bấm chíp → render sau tô sáng dòng đầu
  function ciChipCountOf(key, sum) {
    const map = {
      ok: sum.ok, review: sum.review, bad: sum.bad, late: sum.late, early: sum.early,
      noOut: sum.noOut, noIn: sum.noIn, nightOut: sum.nightOut, noPunch: sum.noPunch,
      noPlan: sum.noPlan, leavePunch: sum.leavePunch, absent: sum.absent, otDiff: sum.otDiff
    };
    return map[key] || 0;
  }
  function ciChipLabelOf(key) {
    const d = CI_CHIP_DEFS.find(x => x.key === key);
    return d ? d.label : key;
  }
  function ciChipsHtml(sum, total, ui) {
    const active = ui.chip || '';
    const totalOn = !active || active === 'all';
    let html = `<button type="button" class="hr-stat-chip ci-chip${totalOn ? ' is-active' : ''}"`
      + ` data-ci-chip="all" aria-pressed="${totalOn ? 'true' : 'false'}" title="Bấm để bỏ lọc chip — xem tất cả">`
      + `<i data-lucide="rows-3"></i> Tổng: <strong>${total}</strong></button>`;
    html += CI_CHIP_DEFS.map(d => {
      const n = ciChipCountOf(d.key, sum);
      if (!n && active !== d.key) return '';
      const on = active === d.key;
      return `<button type="button" class="hr-stat-chip ci-chip${d.cls ? ' ' + d.cls : ''}${on ? ' is-active' : ''}"`
        + ` data-ci-chip="${d.key}" aria-pressed="${on ? 'true' : 'false'}"`
        + ` title="Bấm để lọc ${escapeHTML(d.label)} + nhảy tới dòng đầu tiên">`
        + `${escapeHTML(d.label)}: <strong>${n}</strong></button>`;
    }).join('');
    if (active && active !== 'all') {
      html += `<button type="button" class="hr-stat-chip ci-chip ci-chip-clear" data-ci-chip="all" title="Bỏ lọc chip">✕ Bỏ lọc</button>`;
    }
    return html;
  }
  function ciOnChipClick(key) {
    const ui = ciReadUi();
    const k = String(key || '');
    const cur = ui.chip || '';
    const patch = { onlyIssues: false, onlyAnomaly: false };
    if (!k || k === 'all' || k === cur) {
      patch.chip = '';
      patch.onlyIssues = true;      // về mặc định: chỉ dòng cần xác nhận
    } else {
      patch.chip = k;
    }
    ciSaveUi(patch);
    // PHẢI cập nhật ô tick NGAY: ciReadUi() đọc trạng thái checkbox từ DOM, nếu
    // không render kế tiếp sẽ đọc lại giá trị CŨ và ghi đè quyết định vừa lưu.
    const oiEl = document.getElementById('hr-ci-only-issues');
    if (oiEl) oiEl.checked = !!patch.onlyIssues;
    const oaEl = document.getElementById('hr-ci-only-anomaly');
    if (oaEl) oaEl.checked = false;
    ciPendingFlash = !!patch.chip;
    ciRenderCheckinTable();
    ciScrollToFirstRow();
  }
  function ciScrollToFirstRow() {
    try {
      const tbody = document.getElementById('hr-ci-body');
      const tr = (tbody && typeof tbody.querySelector === 'function') ? tbody.querySelector('tr[data-ci-row]') : null;
      if (!tr || typeof tr.scrollIntoView !== 'function') return false;
      tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    } catch (e) { return false; }
  }
  function ciRenderCheckinTable() {
    const tbody = document.getElementById('hr-ci-body');
    if (!tbody) return;
    const ui = ciReadUi();
    ciSyncToolbar(ui);
    // KỲ = Ngày / Tuần / Tháng (nguồn chân lý chung cho cả thao tác hàng loạt)
    const range = ciRangeOf(ui);
    const allRows = ciRowsForRange(range.from, range.to, Object.assign({}, ui, { onlyIssues: false, onlyAnomaly: false }));
    const sum = ciSummaryOf(allRows);
    let rows = ui.onlyIssues ? allRows.filter(r => r.needsReview) : allRows;
    if (ui.onlyAnomaly) rows = rows.filter(r => r.anomalies && r.anomalies.length);
    // CHÍP đang chọn là bộ lọc CUỐI (đã tự bỏ 2 ô tick khi bấm chíp)
    if (ui.chip && ui.chip !== 'all' && CI_CHIP_MATCH[ui.chip]) rows = rows.filter(CI_CHIP_MATCH[ui.chip]);
    if (hrRowsLimit.ci < 1) hrRowsLimit.ci = HR_ROWS_PAGE;
    // Tô sáng dòng ĐẦU TIÊN sau khi bấm chíp (dòng đầu luôn nằm trong trang 1)
    const flashKey = ciPendingFlash && rows.length ? `${rows[0].employeeId}|${rows[0].date}` : '';
    ciPendingFlash = false;
    const countEl = document.getElementById('hr-ci-count');
    if (countEl) {
      countEl.textContent = `${range.label} · ${allRows.length} dòng · ${sum.review} cần xác nhận`
        + (sum.ack ? ` · ${sum.ack} đã xác nhận` : '')
        + (sum.bad ? ` · ⚠ ${sum.bad} bất thường` : '')
        + (ui.chip && ui.chip !== 'all' ? ` · đang lọc: ${ciChipLabelOf(ui.chip)}` : '');
    }
    const chipsEl = document.getElementById('hr-ci-chips');
    if (chipsEl) chipsEl.innerHTML = ciChipsHtml(sum, allRows.length, ui);
    if (!rows.length) {
      const msg = !allRows.length
        ? 'Chưa có dữ liệu trong kỳ. Bấm “Nạp Giờ Máy” để chọn file Excel máy chấm công xuất ra.'
        : (ui.chip && ui.chip !== 'all'
          ? `Không có dòng nào thuộc nhóm “${escapeHTML(ciChipLabelOf(ui.chip))}” trong kỳ này — bấm chíp “Tổng” để bỏ lọc.`
          : (ui.onlyAnomaly
            ? 'Không có dòng nào BẤT THƯỜNG trong kỳ này — bỏ tích “Chỉ dòng bất thường” (hoặc bấm chíp “Tổng”).'
            : 'Không có dòng nào cần xác nhận trong kỳ này — bỏ tích “Chỉ dòng cần xác nhận” (hoặc bấm chíp “Tổng”).'));
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="clock" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>${msg}</p></td></tr>`;
      hrScheduleIcons();
      return;
    }
    const shown = rows.slice(0, hrRowsLimit.ci);
    tbody.innerHTML = shown.map(r => {
      const key = `${r.employeeId}|${r.date}`;
      const cls = [r.needsReview ? 'ci-row-review' : '', (r.anomalies && r.anomalies.length) ? 'ci-row-bad' : '',
        (flashKey && key === flashKey) ? 'ci-row-flash' : ''].filter(Boolean).join(' ');
      return `<tr class="${cls}" data-ci-row="${escapeHTML(key)}">
        <td><button type="button" class="ci-cell-link" data-ci-emp="${escapeHTML(r.employeeId)}" title="Bấm để lọc theo nhân viên này"><strong>${escapeHTML(r.employeeName)}</strong></button><br><span class="ci-sub">${escapeHTML(r.dept || '—')}${r.empCode ? ' · ' + escapeHTML(r.empCode) : ''}</span></td>
        <td><button type="button" class="ci-cell-link" data-ci-goto-day="${escapeHTML(r.date)}" title="Bấm để xem riêng ngày ${escapeHTML(fmtDateDMY(r.date))}">${escapeHTML(fmtDateDMY(r.date))}</button></td>
        <td>${ciPlanCell(r)}</td>
        <td>${ciMachineCell(r)}</td>
        <td>${ciActualCell(r)}</td>
        <td>${ciDiffCell(r)}</td>
        <td>${ciLeaveOtCell(r)}</td>
        <td class="text-right">${ciActionCell(r)}</td>
      </tr>`;
    }).join('') +
      hrMoreRowHtml('ci', shown.length, rows.length, 8);
    hrScheduleIcons();
  }

  // ── TỰ ĐIỀN GIỜ KẾT THÚC THỰC TẾ VÀO BẢNG BỐ TRÍ ───────────────
  // Chỉ: ngày TRƯỚC hôm nay · lô đang để trống `end` · là LƯỢT BỐ TRÍ CUỐI
  // của ngày · có giờ ra từ máy · thời lượng hợp lý. KHÔNG ghi đè ô đã nhập.
  function ciSuggestEndFills(opts) {
    const o = opts || {};
    return ciWithCtx(() => ciSuggestEndFillsInner(opts), { from: o.from, to: o.to });
  }
  function ciSuggestEndFillsInner(opts) {
    const o = opts || {};
    const today = hrTodayISO();
    const from = o.from || '', to = o.to || '';
    const deptFilter = o.dept || 'all';
    const round = !!o.round;
    const out = [];
    (state.hrAssignments || []).forEach(a => {
      if (!a || a.end) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a.date || ''))) return;
      if (a.date >= today) return;                       // chỉ ngày đã qua
      if (from && a.date < from) return;
      if (to && a.date > to) return;
      const em = hrEmpById(a.employeeId);
      if (deptFilter !== 'all' && (!em || (em.department || '—') !== deptFilter)) return;
      const act = ciActualSplit(a.employeeId, a.date);
      if (!act.hasPunch || !act.outMin) return;          // chưa có giờ ra → chờ file sau
      const list = ciAssignmentsOn(a.employeeId, a.date);
      if (!list.length || list[list.length - 1].id !== a.id) return; // chỉ lượt cuối
      const dept = a.department || (em && em.department) || '';
      const range = hrShiftRange(hrShiftCfg(dept), a.shiftIdx || 0);
      const startM = ciToMin(a.start) || range.startMin;
      // Giờ ra ĐÃ GHÉP cho ca đêm (VD 19:40 → 06:01 hôm sau = 1801)
      let outM = act.outMin;
      if (!outM) return;
      if (outM <= startM) outM += 1440;
      const dur = outM - startM;
      if (dur < CI_OT_BLOCK_MIN || dur > CI_WORK_DAY_MAX_MIN) return;
      // Làm tròn: TỔNG thời lượng làm việc xuống khối 30' (khớp quy tắc TC)
      const newEndM = round ? startM + Math.floor(dur / CI_OT_BLOCK_MIN) * CI_OT_BLOCK_MIN : outM;
      let oldEndM = ciToMin(a.end);
      if (!oldEndM || oldEndM <= startM) oldEndM = range.endMin;
      if (oldEndM <= startM) oldEndM += 1440;
      const before = ciSplitForDate(dept, a.date, startM, oldEndM, a.shiftIdx || 0);
      const after = ciSplitForDate(dept, a.date, startM, newEndM, a.shiftIdx || 0);
      out.push({
        assignId: a.id, employeeId: a.employeeId, employeeName: hrEmpName(a.employeeId),
        dept: em ? (em.department || '') : '', date: a.date,
        positionName: hrPosName(a.positionId),
        startText: fmtHour(a.start), oldEndText: `hết ca (${fmtHour(range.end)})`,
        newEnd: ciFromMin(newEndM % 1440), punchOut: ciFromMin(act.outMin % 1440),
        deltaMin: newEndM - oldEndM, before, after
      });
    });
    out.sort((x, y) => String(y.date).localeCompare(String(x.date)) ||
      String(x.employeeName).localeCompare(String(y.employeeName), 'vi'));
    return out;
  }

  // Ghi giờ kết thúc vào Bảng bố trí — KHÔNG đụng ô đã có `end`
  function ciApplyEndFills(list) {
    if (!requireEditPermission()) return 0;
    const rows = Array.isArray(list) ? list : [];
    if (!rows.length) return 0;
    const now = new Date().toISOString();
    let n = 0;
    rows.forEach(it => {
      const a = (state.hrAssignments || []).find(x => x.id === it.assignId);
      if (!a || a.end) return;
      a.end = it.newEnd;
      a.endSource = 'machine';   // đánh dấu: giờ kết thúc lấy từ máy chấm công
      a.updatedAt = now;
      n++;
    });
    if (n) { saveHrData(); renderHrView(); }
    return n;
  }

  // Modal xem trước "Điền Giờ Kết Thúc" (bắt buộc xem trước — đổi giờ công đoạn)
  function openCiEndfillModal() {
    // Ghi giờ kết thúc vào BẢNG BỐ TRÍ ⇒ đổi giờ công đoạn ⇒ phải có quyền
    // "Áp dụng chấm công theo máy" (20/10/2026), không chỉ quyền tab Nhân sự.
    if (!requirePayApply()) return;
    const modal = document.getElementById('modal-ci-endfill');
    if (!modal) return;
    const f = document.getElementById('ci-endfill-from');
    if (f && !f.value) f.value = '';
    const t = document.getElementById('ci-endfill-to');
    if (t && !t.value) t.value = hrShiftDateISO(hrTodayISO(), -1);
    renderCiEndfillList();
    modal.classList.add('show');
    hrScheduleIcons();
  }
  function closeCiEndfillModal() {
    document.getElementById('modal-ci-endfill')?.classList.remove('show');
  }
  function renderCiEndfillList() {
    const body = document.getElementById('ci-endfill-body');
    if (!body) return;
    const round = (document.getElementById('ci-endfill-round')?.value || 'exact') === 'round30';
    const from = document.getElementById('ci-endfill-from')?.value || '';
    const to = document.getElementById('ci-endfill-to')?.value || '';
    const dept = document.getElementById('hr-ci-filter-dept')?.value || 'all';
    ciEndfillRows = ciSuggestEndFills({ from, to, dept, round });
    const sumEl = document.getElementById('ci-endfill-summary');
    if (sumEl) {
      sumEl.innerHTML = ciEndfillRows.length
        ? `<span class="hr-stat-chip"><i data-lucide="list-checks"></i> <strong>${ciEndfillRows.length}</strong> lượt bố trí đang để trống giờ kết thúc &amp; đã có giờ ra từ máy</span>
           <span class="hr-stat-chip"><i data-lucide="info"></i> Chỉ áp dụng cho <strong>ngày trước hôm nay</strong> · lượt bố trí <strong>cuối</strong> của ngày · không đè ô đã nhập tay</span>`
        : `<div style="padding:10px 12px;background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:var(--radius-md);font-size:0.78rem;color:var(--text-muted);">
             Không có lượt bố trí nào cần điền. (Cần: ngày đã qua + ô “Giờ kết thúc” đang để trống + máy đã có giờ ra.)</div>`;
    }
    body.innerHTML = ciEndfillRows.length ? ciEndfillRows.map(r => `<tr>
        <td class="text-center"><input type="checkbox" data-ci-fill="${escapeHTML(r.assignId)}" checked></td>
        <td><strong>${escapeHTML(r.employeeName)}</strong><br><span class="ci-sub">${escapeHTML(r.dept || '—')}</span></td>
        <td>${escapeHTML(fmtDateDMY(r.date))}</td>
        <td>${escapeHTML(r.positionName)}</td>
        <td>${escapeHTML(r.startText)} → ${escapeHTML(r.oldEndText)}</td>
        <td class="hr-emp-code">…${escapeHTML(r.punchOut)}</td>
        <td><strong>${escapeHTML(r.startText)}–${escapeHTML(r.newEnd)}</strong><div class="ci-sub">HC ${escapeHTML(fmtHm(r.before.hc))}/${escapeHTML(fmtHm(r.after.hc))} · TC ${escapeHTML(fmtHm(r.before.tc))}/${escapeHTML(fmtHm(r.after.tc))}</div></td>
      </tr>`).join('') : `<tr><td colspan="7" class="text-center" style="padding:20px;color:var(--text-muted);">— không có dòng nào —</td></tr>`;
    hrScheduleIcons();
  }
  function applyCiEndfill() {
    if (!requirePayApply()) return;
    const picks = [];
    const nodes = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-ci-fill]')) : [];
    nodes.forEach(el => {
      if (!el || !el.checked) return;
      const id = el.getAttribute('data-ci-fill');
      const r = ciEndfillRows.find(x => x.assignId === id);
      if (r) picks.push(r);
    });
    if (!picks.length) { showToast('Chưa chọn dòng nào để điền giờ kết thúc.', 'error'); return; }
    if (!confirm(`Điền giờ kết thúc thực tế cho ${picks.length} lượt bố trí theo máy chấm công?\n\nLƯU Ý: giờ công đoạn của các ngày này sẽ thay đổi theo (công suất / hiệu suất).`)) return;
    const n = ciApplyEndFills(picks);
    closeCiEndfillModal();
    showToast(`Đã điền giờ kết thúc cho ${n} lượt bố trí theo máy chấm công`, 'success');
  }

  // ── ĐÁNH DẤU "ĐÃ XÁC NHẬN" DÒNG ĐỐI CHIẾU (Admin / Ban Quản Lý) ──
  function ciAckDay(employeeId, date, note) {
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý (ban lãnh đạo) mới được xác nhận dòng đối chiếu!', 'error');
      return null;
    }
    if (!employeeId || !date) return null;
    if (!Array.isArray(state.hrCiAcks)) state.hrCiAcks = [];
    const id = `ciack-${date}-${employeeId}`;
    const now = new Date().toISOString();
    const who = (state.currentUser && (state.currentUser.fullname || state.currentUser.email)) || 'Ban lãnh đạo';
    let rec = state.hrCiAcks.find(a => a && a.id === id);
    if (rec) {
      rec.note = note || rec.note || '';
      rec.by = who; rec.at = now; rec.updatedAt = now;
    } else {
      rec = { id, employeeId, date, note: note || '', by: who, at: now, createdAt: now, updatedAt: now };
      state.hrCiAcks.push(rec);
    }
    saveHrData();
    renderHrView();
    showToast(`Đã xác nhận đối chiếu ${hrEmpName(employeeId)} ngày ${fmtDateDMY(date)}`, 'success');
    return rec;
  }
  function ciUnackDay(employeeId, date) {
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý mới được bỏ xác nhận!', 'error');
      return;
    }
    const id = `ciack-${date}-${employeeId}`;
    const rec = (state.hrCiAcks || []).find(a => a && a.id === id);
    if (!rec) return;
    trackDeleted('hrCiAcks', rec.id);
    state.hrCiAcks = (state.hrCiAcks || []).filter(a => a.id !== id);
    saveHrData();
    renderHrView();
    showToast(`Đã bỏ xác nhận ${hrEmpName(employeeId)} ngày ${fmtDateDMY(date)}`, 'info');
  }
  // ═══════════════════════════════════════════════════════════════
  // 8c) XỬ LÝ DÒNG CÔNG — CƠ SỞ CHỐT CÔNG ĐỂ TÍNH LƯƠNG (20/10/2026)
  // ───────────────────────────────────────────────────────────────
  // Mỗi dòng (NV, ngày) có lệch/TC chưa có đơn PHẢI được "Xử lý" trước khi
  // chốt công tháng. 5 hình thức (chốt với người dùng 20/10/2026):
  //   accept    : Chấp nhận giờ làm (ghi nhận HC/TC để tính lương) — hiệu lực ngay
  //   add_ot    : Bổ sung đơn TC (mở form đơn, KHÔNG giới hạn ngày) — chờ duyệt đơn
  //   edit      : Sửa giờ máy (đề xuất in/out) — chờ Admin/BQL duyệt
  //   reject_ot : Hủy phần TC vượt đơn — chờ Admin/BQL duyệt
  //   waive     : Miễn trừ (chỉ Admin) — vẫn ghi số hiện tại + lý do
  // TẤT CẢ đều lưu before/after + người/lúc/lý do ⇒ hồ sơ đối chiếu khi tính lương.
  const PAY_ROW_STATUS = {
    cho_duyet: { label: 'Chờ duyệt', cls: 'wait' },
    da_chot:   { label: 'Đã chốt',  cls: 'ok' },
    tu_choi:   { label: 'Bị từ chối', cls: 'bad' },
    mien:      { label: 'Miễn trừ', cls: 'mien' }
  };
  const PAY_ACTION_LABEL = {
    accept:    'Chấp nhận giờ làm',
    add_ot:    'Bổ sung đơn TC',
    edit:      'Sửa thông tin giờ máy',
    reject_ot: 'Hủy phần TC vượt đơn',
    waive:     'Miễn trừ'
  };
  function payWho() {
    return (state.currentUser && (state.currentUser.fullname || state.currentUser.email || state.currentUser.username)) || '';
  }
  function payRowId(employeeId, date) { return `payrow-${date}-${employeeId}`; }
  function payRowOf(employeeId, date) {
    return (state.hrPayRows || []).find(pr => pr && pr.employeeId === employeeId && pr.date === date) || null;
  }
  function payRowsOfMonth(month) {
    const m = String(month || '');
    return (state.hrPayRows || []).filter(pr => pr && String(pr.month || String(pr.date || '').slice(0, 7)) === m);
  }
  function paySaveRow(rec) {
    const list = state.hrPayRows || (state.hrPayRows = []);
    const i = list.findIndex(pr => pr && pr.id === rec.id);
    if (i >= 0) list[i] = Object.assign({}, list[i], rec); else list.push(rec);
    saveHrData(['hrPayRows']);
  }
  // Ảnh chụp "trước khi xử lý" — lấy từ engine đối chiếu (1 dòng, không quét bảng)
  function paySnapshotOf(employeeId, date) {
    const r = ciCompareDay(employeeId, date);
    const a = (r && r.actual) || {};
    return {
      row: r,
      before: {
        hc: Number(a.hc) || 0,
        tc: Number(a.tc) || 0,
        otApprovedMin: Number(r && r.ot ? r.ot.approvedMin : 0) || 0,
        attStatus: (r && r.att) || '',
        verdict: (r && r.verdict) || '',
        anomalies: (r && r.anomalies) ? r.anomalies.slice() : []
      }
    };
  }
  // Số giờ ĐƯỢC GHI NHẬN của 1 dòng (dùng cho bản chốt công + xuất Excel)
  function payEffectiveOf(row) {
    const a = (row && row.after) || {};
    return {
      hc: Math.max(0, Number(a.hc) || 0),
      tc: Math.max(0, Number(a.tc) || 0),
      otAcceptedMin: Math.max(0, Number(a.otAcceptedMin) || 0),
      otRejectedMin: Math.max(0, Number(a.otRejectedMin) || 0)
    };
  }
  // ① CHẤP NHẬN GIỜ LÀM
  function payAcceptRow(employeeId, date, opts) {
    if (!requirePayLock()) return false;
    const o = opts || {};
    const snap = paySnapshotOf(employeeId, date);
    const r = snap.row;
    if (!r) return false;
    if (!r.actual || (!r.actual.hasPunch && !(r.leave && r.leave.fullDay))) {
      showToast('Dòng này không có giờ máy để chấp nhận. Hãy dùng "Sửa thông tin" hoặc "Miễn trừ".', 'error');
      return false;
    }
    const tc = Number(r.actual.tc) || 0;
    const approved = Number(r.ot.approvedMin) || 0;
    const otMode = o.otMode === 'orderOnly' ? 'orderOnly' : 'asIs';
    const otAccepted = otMode === 'orderOnly' ? Math.min(tc, approved) : tc;
    const old = payRowOf(employeeId, date);
    const now = new Date().toISOString();
    const who = payWho();
    paySaveRow({
      id: payRowId(employeeId, date), employeeId, date, month: String(date).slice(0, 7),
      action: 'accept', status: 'da_chot',
      before: snap.before,
      after: { hc: Number(r.actual.hc) || 0, tc, otAcceptedMin: otAccepted, otRejectedMin: Math.max(0, tc - otAccepted) },
      otMode, reason: String(o.reason || '').trim(), note: String(o.reason || '').trim(),
      requestedBy: who, requestedAt: now, approvedBy: who, approvedAt: now,
      version: (old && old.version ? old.version : 0) + 1, updatedAt: now
    });
    renderHrView();
    showToast(`Đã CHẤP NHẬN giờ làm ${hrEmpName(employeeId)} · ${fmtDateDMY(date)}: HC ${fmtHm(Number(r.actual.hc) || 0)} · TC ghi nhận ${fmtHm(otAccepted)}${tc > otAccepted ? ` (hủy ${fmtHm(tc - otAccepted)})` : ''}`, 'success');
    return true;
  }
  // ④ HỦY PHẦN TC VƯỢT ĐƠN — cần Admin/BQL duyệt
  function payRejectOtRow(employeeId, date, reason) {
    if (!requirePayLock()) return false;
    const why = String(reason || '').trim();
    if (!why) { showToast('Vui lòng nhập lý do hủy giờ tăng ca.', 'error'); return false; }
    const snap = paySnapshotOf(employeeId, date);
    const r = snap.row;
    if (!r) return false;
    const tc = Number(r.actual.tc) || 0;
    const approved = Number(r.ot.approvedMin) || 0;
    const otAccepted = Math.min(tc, approved);
    const old = payRowOf(employeeId, date);
    const now = new Date().toISOString();
    paySaveRow({
      id: payRowId(employeeId, date), employeeId, date, month: String(date).slice(0, 7),
      action: 'reject_ot', status: 'cho_duyet',
      before: snap.before,
      after: { hc: Number(r.actual.hc) || 0, tc, otAcceptedMin: otAccepted, otRejectedMin: Math.max(0, tc - otAccepted) },
      reason: why, note: why,
      requestedBy: payWho(), requestedAt: now,
      version: (old && old.version ? old.version : 0) + 1, updatedAt: now
    });
    renderHrView();
    showToast(`Đã gửi đề nghị HỦY ${fmtHm(Math.max(0, tc - otAccepted))} TC vượt đơn — chờ Admin/Ban Quản Lý duyệt.`, 'success');
    return true;
  }
  // ⑤ MIỄN TRỪ — chỉ Admin
  function payWaiveRow(employeeId, date, reason) {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Chỉ Quản Trị mới được MIỄN TRỪ dòng công.', 'error');
      return false;
    }
    const why = String(reason || '').trim();
    if (!why) { showToast('Vui lòng nhập lý do miễn trừ.', 'error'); return false; }
    const snap = paySnapshotOf(employeeId, date);
    if (!snap.row) return false;
    const tc = Number(snap.row.actual.tc) || 0;
    const approved = Number(snap.row.ot.approvedMin) || 0;
    const old = payRowOf(employeeId, date);
    const now = new Date().toISOString();
    paySaveRow({
      id: payRowId(employeeId, date), employeeId, date, month: String(date).slice(0, 7),
      action: 'waive', status: 'mien',
      before: snap.before,
      after: { hc: Number(snap.row.actual.hc) || 0, tc, otAcceptedMin: Math.min(tc, approved), otRejectedMin: Math.max(0, tc - approved) },
      reason: why, note: why,
      requestedBy: payWho(), requestedAt: now, approvedBy: payWho(), approvedAt: now,
      version: (old && old.version ? old.version : 0) + 1, updatedAt: now
    });
    renderHrView();
    showToast(`Đã MIỄN TRỪ dòng ${hrEmpName(employeeId)} · ${fmtDateDMY(date)} (lý do: ${why})`, 'success');
    return true;
  }
  // ③ SỬA GIỜ MÁY — đề xuất giá trị mới, chờ Admin/BQL duyệt rồi mới ghi
  function payEditRequest(employeeId, date, proposed, reason) {
    if (!requirePayLock()) return false;
    const why = String(reason || '').trim();
    if (!why) { showToast('Vui lòng nhập lý do sửa giờ máy.', 'error'); return false; }
    const inT = String((proposed && proposed.in) || '').trim();
    const outT = String((proposed && proposed.out) || '').trim();
    if (!inT && !outT) { showToast('Nhập ít nhất Giờ vào hoặc Giờ ra mới.', 'error'); return false; }
    const snap = paySnapshotOf(employeeId, date);
    const old = payRowOf(employeeId, date);
    const now = new Date().toISOString();
    paySaveRow({
      id: payRowId(employeeId, date), employeeId, date, month: String(date).slice(0, 7),
      action: 'edit', status: 'cho_duyet',
      before: snap.before,
      after: { hc: 0, tc: 0, otAcceptedMin: 0, otRejectedMin: 0 },   // tính lại khi duyệt
      proposed: { in: inT, out: outT },
      reason: why, note: why,
      requestedBy: payWho(), requestedAt: now,
      version: (old && old.version ? old.version : 0) + 1, updatedAt: now
    });
    renderHrView();
    showToast(`Đã gửi đề nghị SỬA GIỜ MÁY (${inT || '?'}–${outT || '?'}) — chờ Admin/Ban Quản Lý duyệt.`, 'success');
    return true;
  }
  // ② BỔ SUNG ĐƠN TC: ghi nhận "đang chờ duyệt đơn" + mã đơn
  function payMarkAddOt(employeeId, date, otId, reason) {
    const snap = paySnapshotOf(employeeId, date);
    if (!snap.row) return false;
    const tc = Number(snap.row.actual.tc) || 0;
    const approved = Number(snap.row.ot.approvedMin) || 0;
    const old = payRowOf(employeeId, date);
    const now = new Date().toISOString();
    paySaveRow({
      id: payRowId(employeeId, date), employeeId, date, month: String(date).slice(0, 7),
      action: 'add_ot', status: 'cho_duyet',
      before: snap.before,
      after: { hc: Number(snap.row.actual.hc) || 0, tc, otAcceptedMin: Math.min(tc, approved), otRejectedMin: Math.max(0, tc - approved) },
      otId: otId || '',
      reason: String(reason || '').trim(), note: String(reason || '').trim(),
      requestedBy: payWho(), requestedAt: now,
      version: (old && old.version ? old.version : 0) + 1, updatedAt: now
    });
    return true;
  }
  // DUYỆT / TỪ CHỐI dòng công (Admin + Ban Quản Lý)
  function payApproveRow(employeeId, date) {
    if (!canApproveLeave()) { showToast('Chỉ Admin & Ban Quản Lý mới được duyệt dòng công.', 'error'); return false; }
    const row = payRowOf(employeeId, date);
    if (!row) return false;
    if (row.status !== 'cho_duyet') { showToast('Dòng này không ở trạng thái chờ duyệt.', 'info'); return false; }
    if (row.action === 'add_ot') { showToast('Dòng này chờ duyệt ĐƠN TĂNG CA — hãy duyệt đơn TC, hệ thống tự chốt dòng.', 'info'); return false; }
    const now = new Date().toISOString();
    if (row.action === 'edit') {
      // Ghi giờ máy đã duyệt rồi tính lại số
      const rec = (state.hrCheckins || []).find(c => c.employeeId === employeeId && c.date === date);
      if (!rec) { showToast('Không còn bản ghi giờ máy cho ngày này.', 'error'); return false; }
      // ⚠ punchTimes ĐƯỢC ƯU TIÊN hơn in/out khi tính giờ (xem ciPunchListOf)
      // ⇒ phải cập nhật CẢ danh sách lần quẹt, nếu không sửa giờ sẽ KHÔNG có tác dụng.
      const prevIn = rec.in, prevOut = rec.out;
      const newIn = (row.proposed && row.proposed.in) ? row.proposed.in : prevIn;
      const newOut = (row.proposed && row.proposed.out) ? row.proposed.out : prevOut;
      rec.in = newIn; rec.out = newOut;
      if (Array.isArray(rec.punchTimes) && rec.punchTimes.length) {
        const times = rec.punchTimes.map(t => (t === prevIn ? newIn : (t === prevOut ? newOut : t)));
        if (newIn && times.indexOf(newIn) === -1) times.push(newIn);
        if (newOut && times.indexOf(newOut) === -1) times.push(newOut);
        rec.punchTimes = [...new Set(times)].filter(Boolean).sort();
      }
      rec.editedBy = payWho(); rec.editedAt = now;
      const snap = paySnapshotOf(employeeId, date);
      const tc = Number(snap.row.actual.tc) || 0;
      const approved = Number(snap.row.ot.approvedMin) || 0;
      row.after = { hc: Number(snap.row.actual.hc) || 0, tc, otAcceptedMin: tc, otRejectedMin: Math.max(0, tc - approved) };
      row.status = 'da_chot';
      saveHrData(['hrCheckins']);
    } else {
      row.status = row.action === 'waive' ? 'mien' : 'da_chot';
    }
    row.approvedBy = payWho(); row.approvedAt = now; row.updatedAt = now;
    row.version = (Number(row.version) || 0) + 1;
    paySaveRow(row);
    renderHrView();
    showToast(`Đã DUYỆT ${PAY_ACTION_LABEL[row.action] || row.action}: ${hrEmpName(employeeId)} · ${fmtDateDMY(date)}`, 'success');
    return true;
  }
  function payRejectRow(employeeId, date, reason) {
    if (!canApproveLeave()) { showToast('Chỉ Admin & Ban Quản Lý mới được từ chối dòng công.', 'error'); return false; }
    const row = payRowOf(employeeId, date);
    if (!row || row.status !== 'cho_duyet') return false;
    const why = String(reason || '').trim();
    const now = new Date().toISOString();
    row.status = 'tu_choi';
    row.rejectReason = why;
    row.approvedBy = payWho(); row.approvedAt = now; row.updatedAt = now;
    row.version = (Number(row.version) || 0) + 1;
    paySaveRow(row);
    renderHrView();
    showToast(`Đã TỪ CHỐI ${PAY_ACTION_LABEL[row.action] || row.action}: ${hrEmpName(employeeId)} · ${fmtDateDMY(date)}${why ? ` — ${why}` : ''}`, 'info');
    return true;
  }
  // Đơn TC được DUYỆT → tự chốt dòng "add_ot" nếu TC thực tế đã được phủ đủ
  function paySyncOtApproved(ot) {
    if (!ot || !ot.employeeId || !ot.date) return;
    const row = payRowOf(ot.employeeId, ot.date);
    if (!row || row.action !== 'add_ot' || row.otId !== ot.id) return;
    const snap = paySnapshotOf(ot.employeeId, ot.date);
    const tc = Number(snap.row && snap.row.actual ? snap.row.actual.tc : 0) || 0;
    const approved = Number(snap.row && snap.row.ot ? snap.row.ot.approvedMin : 0) || 0;
    const now = new Date().toISOString();
    row.after = { hc: Number(snap.row && snap.row.actual ? snap.row.actual.hc : 0) || 0, tc,
      otAcceptedMin: Math.min(tc, approved), otRejectedMin: Math.max(0, tc - approved) };
    row.updatedAt = now;
    row.version = (Number(row.version) || 0) + 1;
    if (approved >= tc) {
      row.status = 'da_chot';
      row.approvedBy = payWho(); row.approvedAt = now;
    } else {
      row.status = 'cho_duyet';
      row.note = `Đơn TC đã duyệt ${fmtHm(approved)} nhưng TC thực tế ${fmtHm(tc)} — còn vượt ${fmtHm(tc - approved)}`;
    }
    paySaveRow(row);
  }
  function paySyncOtRejected(ot, reason) {
    if (!ot || !ot.employeeId || !ot.date) return;
    const row = payRowOf(ot.employeeId, ot.date);
    if (!row || row.action !== 'add_ot' || row.otId !== ot.id) return;
    const now = new Date().toISOString();
    row.status = 'tu_choi';
    row.rejectReason = reason || 'Đơn tăng ca bị từ chối';
    row.updatedAt = now;
    row.version = (Number(row.version) || 0) + 1;
    paySaveRow(row);
  }
  // Nhãn/chip trạng thái dòng công cho bảng đối chiếu
  function payRowChipHtml(employeeId, date) {
    const row = payRowOf(employeeId, date);
    if (!row) return '';
    const st = PAY_ROW_STATUS[row.status] || PAY_ROW_STATUS.cho_duyet;
    const title = `${PAY_ACTION_LABEL[row.action] || row.action} · ${st.label}`
      + (row.reason ? ` · lý do: ${row.reason}` : '')
      + (row.requestedBy ? ` · gửi bởi ${row.requestedBy}` : '')
      + (row.approvedBy ? ` · duyệt bởi ${row.approvedBy}` : '');
    return `<span class="ci-pay-chip is-${st.cls}" title="${escapeHTML(title)}">${escapeHTML(st.label)}</span>`;
  }
  // ── MODAL "XỬ LÝ DÒNG CÔNG" ─────────────────────────────────────
  function ciPayInfoHtml(r) {
    const a = r.actual || {};
    const planTxt = r.plan.hasPlan
      ? `${r.plan.assignments.map(x => hrPosName(x.positionId)).join(' + ')} · ${fmtHm(r.plan.hc + r.plan.tc)}`
      : '— chưa bố trí —';
    const approved = Number(r.ot ? r.ot.approvedMin : 0) || 0;
    const tc = Number(a.tc) || 0;
    const gap = Math.max(0, tc - approved);
    const v = CI_VERDICT[r.verdict] || CI_VERDICT.ok;
    const bad = (r.anomalies && r.anomalies.length)
      ? `<div class="ci-pay-bad">⚠ ${escapeHTML(r.anomalies.map(k => CI_ANOMALY_LABEL[k] || k).join(' · '))}</div>` : '';
    return `<div class="ci-pay-grid">
        <div><span>Nhân viên</span><strong>${escapeHTML(hrEmpName(r.employeeId))}</strong></div>
        <div><span>Ngày</span><strong>${escapeHTML(fmtDateDMY(r.date))}</strong></div>
        <div><span>Bố trí</span><strong>${escapeHTML(planTxt)}</strong></div>
        <div><span>Giờ máy</span><strong>${escapeHTML(r.timeText || '—')}</strong></div>
        <div><span>Thực tế</span><strong>HC ${escapeHTML(fmtHm(a.hc || 0))} · TC ${escapeHTML(fmtHm(tc))}</strong></div>
        <div><span>Đơn TC đã duyệt</span><strong>${escapeHTML(fmtHm(approved))}</strong></div>
      </div>
      <div class="ci-pay-tags">${ciChip(v.label, v.cls)}
        ${gap > 0 ? `<span class="ci-pay-gap">TC vượt đơn ${escapeHTML(fmtHm(gap))}</span>` : '<span class="ci-pay-ok">TC nằm trong đơn</span>'}
        ${r.leave ? ciChip(r.leave.label, 'warn') : ''}
      </div>${bad}`;
  }
  function openCiPayModal(employeeId, date) {
    if (!requirePayLock()) return;
    const modal = document.getElementById('modal-ci-pay');
    if (!modal) return;
    const r = ciCompareDay(employeeId, date);
    if (!r) return;
    const empEl = document.getElementById('ci-pay-emp');
    const dateEl = document.getElementById('ci-pay-date');
    if (empEl) empEl.value = employeeId;
    if (dateEl) dateEl.value = date;
    const info = document.getElementById('ci-pay-info');
    if (info) info.innerHTML = ciPayInfoHtml(r);
    const tc = Number(r.actual ? r.actual.tc : 0) || 0;
    const approved = Number(r.ot ? r.ot.approvedMin : 0) || 0;
    const act = document.getElementById('ci-pay-action');
    if (act) act.value = (!r.actual || !r.actual.hasPunch) ? 'waive' : (tc > approved ? 'add_ot' : 'accept');
    const waiveOpt = document.getElementById('ci-pay-waive-opt');
    if (waiveOpt) waiveOpt.hidden = !(state.currentUser && state.currentUser.role === 'admin');
    const inEl = document.getElementById('ci-pay-in');
    const outEl = document.getElementById('ci-pay-out');
    if (inEl) inEl.value = (r.rec && r.rec.in) ? r.rec.in : '';
    if (outEl) outEl.value = (r.rec && r.rec.out) ? r.rec.out : '';
    const reasonEl = document.getElementById('ci-pay-reason');
    if (reasonEl) reasonEl.value = '';
    syncCiPayForm();
    modal.classList.add('show');
    hrScheduleIcons();
  }
  function closeCiPayModal() {
    document.getElementById('modal-ci-pay')?.classList.remove('show');
  }
  function syncCiPayForm() {
    const act = (document.getElementById('ci-pay-action') || {}).value || 'accept';
    const reqEl = document.getElementById('ci-pay-req');
    if (reqEl) reqEl.style.display = act === 'accept' ? 'none' : '';
    const otMode = document.getElementById('ci-pay-otmode-group');
    if (otMode) otMode.hidden = act !== 'accept';
    const editG = document.getElementById('ci-pay-edit-group');
    if (editG) editG.hidden = act !== 'edit';
    const hint = document.getElementById('ci-pay-hint');
    const HINT = {
      accept: 'Ghi nhận HC/TC của dòng này làm CƠ SỞ TÍNH LƯƠNG. Nếu TC máy > đơn đã duyệt, chọn phần TC được tính.',
      add_ot: 'Mở form đơn tăng ca (điền sẵn từ giờ hết ca → giờ ra thực tế). Đơn được duyệt thì dòng TỰ CHỐT; KHÔNG giới hạn ngày bổ sung.',
      edit: 'Đề xuất giờ vào/ra đúng thực tế. Chỉ ghi vào dữ liệu máy SAU KHI Admin/Ban Quản Lý duyệt.',
      reject_ot: 'Không tính phần TC vượt đơn (quy định: tăng ca phải đăng ký trước). Cần Admin/Ban Quản Lý duyệt.',
      waive: 'Chỉ Quản Trị: chấp nhận ngoại lệ, VẪN ghi số hiện tại + lý do vào biên bản chốt công.'
    };
    if (hint) hint.textContent = HINT[act] || '';
  }
  function ciPaySubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emp = (document.getElementById('ci-pay-emp') || {}).value || '';
    const date = (document.getElementById('ci-pay-date') || {}).value || '';
    const act = (document.getElementById('ci-pay-action') || {}).value || 'accept';
    const reason = String((document.getElementById('ci-pay-reason') || {}).value || '').trim();
    if (!emp || !date) return;
    const otRadio = (typeof document.querySelector === 'function')
      ? document.querySelector('input[name="ci-pay-otmode"]:checked') : null;
    const otMode = (otRadio && otRadio.value) || 'asIs';
    if (act !== 'accept' && !reason) { showToast('Vui lòng nhập LÝ DO (bắt buộc với hình thức này).', 'error'); return; }
    if (act === 'accept') {
      if (payAcceptRow(emp, date, { otMode, reason })) closeCiPayModal();
      return;
    }
    if (act === 'reject_ot') {
      if (payRejectOtRow(emp, date, reason)) closeCiPayModal();
      return;
    }
    if (act === 'waive') {
      if (payWaiveRow(emp, date, reason)) closeCiPayModal();
      return;
    }
    if (act === 'edit') {
      const inT = String((document.getElementById('ci-pay-in') || {}).value || '').trim();
      const outT = String((document.getElementById('ci-pay-out') || {}).value || '').trim();
      if (payEditRequest(emp, date, { in: inT, out: outT }, reason)) closeCiPayModal();
      return;
    }
    if (act === 'add_ot') {
      const r = ciCompareDay(emp, date);
      const dept = (r && r.dept) || hrEmpDept(emp);
      const range = hrShiftRange(hrShiftCfg(dept), (r && r.actual ? r.actual.shiftIdx : 0) || 0);
      const planEnd = (r && r.plan && r.plan.hasPlan && r.plan.endMin) ? r.plan.endMin : range.endMin;
      const outMin = (r && r.actual && r.actual.outMin) ? r.actual.outMin : 0;
      const startT = ciFromMin(planEnd % 1440);
      const endT = outMin ? ciFromMin(outMin % 1440) : '';
      const tc = Number(r && r.actual ? r.actual.tc : 0) || 0;
      const approved = Number(r && r.ot ? r.ot.approvedMin : 0) || 0;
      closeCiPayModal();
      openOvertimeModal({
        employeeId: emp, employeeName: hrEmpName(emp), date,
        start: startT, end: endT,
        reason: reason || 'Bổ sung đơn TC từ bảng đối chiếu',
        gapMin: Math.max(0, tc - approved)
      });
      return;
    }
  }
  // ═══════════════════════════════════════════════════════════════
  // 8d) CHỐT CÔNG THEO THÁNG (20/10/2026)
  // ───────────────────────────────────────────────────────────────
  // 1 bản chốt / THÁNG (phạm vi chốt với người dùng). Quy trình:
  //   Trình chốt (payLock) → DUYỆT (Admin/Ban Quản Lý) → ĐÃ CHỐT (bất biến)
  //   → Mở khóa (chỉ Admin, có lý do, version + 1) → phải trình lại.
  // Bản chốt lưu ẢNH CHỤP từng dòng + LUẬT TÍNH + CẤU HÌNH CA lúc chốt + băm
  // ⇒ in lại/đối chiếu sau nhiều tháng vẫn ra đúng số cũ.
  const PAY_LOCK_STATUS = {
    cho_duyet:  { label: 'Chờ duyệt',  cls: 'wait' },
    da_chot:    { label: 'Đã chốt',    cls: 'ok' },
    da_mo_khoa: { label: 'Đã mở khóa', cls: 'mien' }
  };
  function payLockOf(month) {
    const m = String(month || '');
    const list = (state.hrPayLocks || []).filter(l => l && l.month === m);
    if (!list.length) return null;
    list.sort((a, b) => (Number(a.version) || 0) - (Number(b.version) || 0));
    return list[list.length - 1];
  }
  function payRuleSetOf() {
    return {
      earlyAllowMin: CI_EARLY_ALLOW_MIN,
      otBlockMin: CI_OT_BLOCK_MIN,
      lateTolMin: CI_LATE_TOL_MIN,
      workDayMaxMin: CI_WORK_DAY_MAX_MIN,
      breakMode: 'mid',              // nghỉ của ca đặt GIỮA CA (quy tắc 85)
      roundIn: 'up30', roundOut: 'down30',
      nightPair: true,               // ghép ca đêm qua ngày
      restDayAllTc: true             // ngày nghỉ/lễ: toàn bộ giờ = TC
    };
  }
  function payShiftSnapOf() {
    const out = {};
    (HR_DEPARTMENTS || []).forEach(dept => {
      try {
        const cfg = hrShiftCfg(dept);
        out[dept] = {
          type: cfg.type,
          shifts: (cfg.shifts || []).map((sh, i) => ({ name: sh.name, start: sh.start, end: sh.end, brk: hrShiftBrkH(cfg, i) }))
        };
      } catch (e) { /* bỏ qua bộ phận lỗi cấu hình */ }
    });
    return out;
  }
  function payHashStr(str) {
    const s = String(str || '');
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 ^= c; h1 = (h1 * 16777619) >>> 0;
      h2 = (h2 + c * (i + 1)) >>> 0;
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0') + s.length.toString(16);
  }
  // Quét 1 lượt: dòng công + chặn + cảnh báo
  function payLockScan(month) {
    const m = String(month || '');
    const range = ciMonthRange(m);
    const list = (range.from && range.to)
      ? ciRowsForRange(range.from, range.to, { onlyIssues: false, onlyAnomaly: false, includeLeave: false })
      : [];
    const rows = [], blockers = [], warns = [];
    // Chỉ mục theo (NV|ngày) — tránh quét tuyến tính hrPayRows cho từng dòng công
    const prMap = new Map();
    (state.hrPayRows || []).forEach(pr => {
      if (pr && pr.employeeId && pr.date) prMap.set(`${pr.employeeId}|${pr.date}`, pr);
    });
    list.forEach(r => {
      const a = r.actual || {};
      const pr = prMap.get(`${r.employeeId}|${r.date}`) || null;
      const tc = Number(a.tc) || 0;
      const approved = Number(r.ot ? r.ot.approvedMin : 0) || 0;
      const done = pr && (pr.status === 'da_chot' || pr.status === 'mien');
      // SỐ HiỆU LỰC = số SỐNG hiện tại + QUYẾT ĐỊNH của dòng xử lý:
      //  • accept (tính TC theo máy) / waive  → ghi nhận TOÀN BỘ TC thực tế
      //  • accept (chỉ theo đơn) / reject_ot / add_ot → tối đa bằng TC đơn đã duyệt
      // Nhờ vậy sửa giờ máy SAU khi chốt vẫn phát hiện được LỆCH (payDriftOfLock).
      let otAccepted = Math.min(tc, approved);
      if (done) {
        if (pr.action === 'accept') otAccepted = (pr.otMode === 'orderOnly') ? Math.min(tc, approved) : tc;
        else if (pr.action === 'waive') otAccepted = tc;
        else otAccepted = Math.min(tc, approved);
      }
      const eff = {
        hc: Number(a.hc) || 0, tc,
        otAcceptedMin: Math.max(0, otAccepted),
        otRejectedMin: Math.max(0, tc - otAccepted)
      };
      const em = hrEmpById(r.employeeId);
      const has = eff.hc > 0 || eff.tc > 0 || approved > 0 || !!r.leave || a.hasPunch || r.plan.hasPlan;
      if (!has) return;
      const row = {
        employeeId: r.employeeId, employeeName: hrEmpName(r.employeeId), empCode: (em && em.code) || '',
        dept: r.dept || '', date: r.date,
        hc: eff.hc, tc: eff.tc,
        otApprovedMin: approved, otAcceptedMin: eff.otAcceptedMin, otRejectedMin: eff.otRejectedMin,
        attStatus: r.att || '', verdict: r.verdict || '', note: pr ? (pr.reason || '') : '',
        payStatus: pr ? pr.status : '', payRowId: pr ? pr.id : '', anomalies: (r.anomalies || []).slice()
      };
      rows.push(row);
      // ── CHẶN CHỐT (đúng ma trận đã chốt với người dùng) ──
      const why = [];
      if (pr && pr.status === 'cho_duyet') why.push('Đề nghị xử lý đang CHỜ DUYỆT');
      if (pr && pr.status === 'tu_choi') why.push('Đề nghị xử lý BỊ TỪ CHỐI');
      if (!done && tc > approved) why.push(`TC vượt đơn ${fmtHm(tc - approved)} chưa có đơn`);
      if (!done && row.anomalies.some(k => ['zero_span', 'too_long', 'out_before_in'].indexOf(k) !== -1)) why.push('Bất thường nặng (vào = ra / >16h / ra trước vào)');
      if (!done && (r.verdict === 'no_out' || r.verdict === 'no_in')) why.push('Thiếu giờ vào/ra');
      if (!done && r.verdict === 'no_punch') why.push('Không quẹt máy (có bố trí)');
      if (why.length) blockers.push({ employeeId: r.employeeId, employeeName: row.employeeName, date: r.date, reasons: why });
      // ── CẢNH BÁO (cho phép chốt kèm lý do) ──
      if (!done && ['late', 'early', 'no_plan', 'unmarked', 'leave_punch'].indexOf(r.verdict) !== -1) {
        warns.push({ employeeId: r.employeeId, employeeName: row.employeeName, date: r.date, verdict: r.verdict });
      }
    });
    const totalsMap = new Map();
    rows.forEach(r => {
      const t = totalsMap.get(r.employeeId) || { employeeId: r.employeeId, employeeName: r.employeeName, empCode: r.empCode, dept: r.dept, days: 0, hcMin: 0, tcMin: 0, otMin: 0, otRejectedMin: 0 };
      if (r.hc > 0 || r.tc > 0 || r.attStatus === 'work' || r.attStatus === 'leave') t.days += 1;
      t.hcMin += r.hc; t.tcMin += r.tc; t.otMin += r.otAcceptedMin; t.otRejectedMin += r.otRejectedMin;
      totalsMap.set(r.employeeId, t);
    });
    const totals = [...totalsMap.values()].sort((x, y) => String(x.dept).localeCompare(String(y.dept), 'vi') || String(x.employeeName).localeCompare(String(y.employeeName), 'vi'));
    return { month: m, rows, totals, blockers, warns };
  }
  // ── TRÌNH CHỐT → DUYỆT → MỞ KHÓA ────────────────────────────────
  function payPrepareLock(month, opts) {
    if (!requirePayLock()) return { ok: false };
    const m = String(month || '');
    if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Kỳ chốt công không hợp lệ.', 'error'); return { ok: false }; }
    const o = opts || {};
    const active = payLockOf(m);
    if (active && active.status === 'da_chot') {
      showToast(`Kỳ ${ciMonthShort(m)} đã CHỐT CÔNG — phải Mở Khóa Kỳ trước khi trình lại.`, 'error');
      return { ok: false, locked: true };
    }
    const scan = payLockScan(m);
    if (scan.blockers.length) {
      showToast(`Còn ${scan.blockers.length} dòng PHẢI xử lý trước khi chốt công (TC vượt đơn / thiếu giờ / bất thường). Mở bảng đối chiếu để xử lý.`, 'error');
      return { ok: false, blockers: scan.blockers };
    }
    const now = new Date().toISOString();
    const who = payWho();
    const days = (o.disputeDays != null && Number.isFinite(Number(o.disputeDays))) ? Math.max(0, Number(o.disputeDays)) : 3;
    let disputeUntil = '';
    try { const d = new Date(); d.setDate(d.getDate() + days); disputeUntil = d.toISOString().slice(0, 10); } catch (e) {}
    const ruleSet = payRuleSetOf();
    const shiftSnap = payShiftSnapOf();
    const rows = scan.rows;
    const lock = {
      id: `paylock-${m}`, month: m,
      status: 'cho_duyet',
      version: active ? (Number(active.version) || 0) + 1 : 1,
      ruleSet, shiftSnap, rows, totals: scan.totals,
      hash: payHashStr(JSON.stringify({ month: m, rows, ruleSet, shiftSnap })),
      preparedBy: who, preparedByName: who, preparedAt: now,
      note: String(o.note || '').trim(),
      disputeDays: days, disputeUntil,
      warnings: scan.warns.length,
      paperSigned: [],
      reopenHistory: (active && Array.isArray(active.reopenHistory)) ? active.reopenHistory.slice() : [],
      appVersion: (typeof APP_VERSION === 'string') ? APP_VERSION : '',
      createdAt: (active && active.createdAt) ? active.createdAt : now,
      updatedAt: now
    };
    const list = state.hrPayLocks || (state.hrPayLocks = []);
    const i = list.findIndex(l => l && l.month === m);
    if (i >= 0) list[i] = lock; else list.push(lock);
    saveHrData(['hrPayLocks']);
    renderHrView();
    showToast(`Đã TRÌNH CHỐT CÔNG kỳ ${ciMonthShort(m)}: ${rows.length} dòng · ${scan.totals.length} nhân viên — chờ Admin/Ban Quản Lý duyệt.`, 'success');
    return { ok: true, lock };
  }
  function payDriftOfLock(lock) {
    if (!lock || !lock.month) return { changedCount: 0, changed: [], same: true };
    const scan = payLockScan(lock.month);
    const keyOf = r => `${r.employeeId}|${r.date}`;
    const nowMap = new Map(scan.rows.map(r => [keyOf(r), r]));
    const lockMap = new Map((lock.rows || []).map(r => [keyOf(r), r]));
    const changed = [];
    lockMap.forEach((lr, k) => {
      const nr = nowMap.get(k);
      if (!nr) { changed.push({ key: k, employeeName: lr.employeeName, date: lr.date, type: 'missing' }); return; }
      if (lr.hc !== nr.hc || lr.tc !== nr.tc || lr.otAcceptedMin !== nr.otAcceptedMin) {
        changed.push({ key: k, employeeName: nr.employeeName, date: nr.date, type: 'value',
          before: { hc: lr.hc, tc: lr.tc, ot: lr.otAcceptedMin }, after: { hc: nr.hc, tc: nr.tc, ot: nr.otAcceptedMin } });
      }
    });
    nowMap.forEach((nr, k) => { if (!lockMap.has(k)) changed.push({ key: k, employeeName: nr.employeeName, date: nr.date, type: 'new' }); });
    return {
      changedCount: changed.length, changed: changed.slice(0, 100),
      hashNow: payHashStr(JSON.stringify({ month: lock.month, rows: scan.rows, ruleSet: lock.ruleSet, shiftSnap: lock.shiftSnap })),
      hashLocked: lock.hash || '',
      same: changed.length === 0
    };
  }
  function payApproveLock(month, opts) {
    if (!canApproveLeave()) { showToast('Chỉ Admin & Ban Quản Lý mới được DUYỆT chốt công.', 'error'); return false; }
    const m = String(month || '');
    const lock = payLockOf(m);
    if (!lock) { showToast('Chưa có bản trình chốt công cho kỳ này.', 'info'); return false; }
    if (lock.status !== 'cho_duyet') { showToast('Bản chốt công không ở trạng thái chờ duyệt.', 'info'); return false; }
    const drift = payDriftOfLock(lock);
    if (drift.changedCount > 0) {
      showToast(`Số liệu đã ĐỔI sau khi trình (${drift.changedCount} dòng) — cần TRÌNH LẠI bản chốt trước khi duyệt.`, 'error');
      return false;
    }
    const now = new Date().toISOString();
    const who = payWho();
    lock.status = 'da_chot';
    lock.approvedBy = who; lock.approvedByName = who; lock.approvedAt = now;
    lock.selfApproved = (lock.preparedBy === who);
    lock.approveNote = String((opts && opts.note) || '').trim();
    lock.updatedAt = now;
    saveHrData(['hrPayLocks']);
    renderHrView();
    showToast(`Đã DUYỆT CHỐT CÔNG kỳ ${ciMonthShort(m)} (${lock.rows.length} dòng)${lock.selfApproved ? ' — người trình cũng là người duyệt' : ''}.`, 'success');
    return true;
  }
  function payReopenLock(month, reason) {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Chỉ Quản Trị mới được MỞ KHÓA kỳ công.', 'error');
      return false;
    }
    const why = String(reason || '').trim();
    if (!why) { showToast('Vui lòng nhập lý do mở khóa kỳ công.', 'error'); return false; }
    const m = String(month || '');
    const lock = payLockOf(m);
    if (!lock) return false;
    const now = new Date().toISOString();
    lock.reopenHistory = Array.isArray(lock.reopenHistory) ? lock.reopenHistory : [];
    lock.reopenHistory.push({ by: payWho(), at: now, reason: why, version: Number(lock.version) || 0 });
    lock.status = 'da_mo_khoa';
    lock.version = (Number(lock.version) || 0) + 1;
    lock.updatedAt = now;
    saveHrData(['hrPayLocks']);
    renderHrView();
    showToast(`Đã MỞ KHÓA kỳ ${ciMonthShort(m)} (version ${lock.version}) — cần trình chốt lại. Lý do: ${why}`, 'info');
    return true;
  }
  // ── GIAO DIỆN THẺ "CHỐT CÔNG LƯƠNG" ────────────────────────────
  function payLockMonthOf() {
    const el = document.getElementById('hr-pay-month');
    const v = el ? String(el.value || '') : '';
    if (/^\d{4}-\d{2}$/.test(v)) return v;
    return ciReadUi().month || ciDefaultMonth();
  }
  function payLockBtnStateHtml(lock) {
    const st = lock ? (PAY_LOCK_STATUS[lock.status] || PAY_LOCK_STATUS.cho_duyet) : { label: 'Chưa chốt', cls: 'none' };
    let html = `<span class="pay-lock-state is-${st.cls}">${escapeHTML(st.label)}</span>`;
    if (lock) {
      html += `<span class="pay-lock-meta">v${Number(lock.version) || 1} · băm ${escapeHTML(String(lock.hash || '').slice(0, 10))}…</span>`;
      if (lock.preparedByName) html += `<span class="pay-lock-meta">Trình: ${escapeHTML(lock.preparedByName)}${lock.preparedAt ? ' · ' + escapeHTML(String(lock.preparedAt).slice(0, 16).replace('T', ' ')) : ''}</span>`;
      if (lock.approvedByName) html += `<span class="pay-lock-meta">Duyệt: ${escapeHTML(lock.approvedByName)}${lock.approvedAt ? ' · ' + escapeHTML(String(lock.approvedAt).slice(0, 16).replace('T', ' ')) : ''}</span>`;
      if (lock.selfApproved) html += `<span class="pay-lock-meta is-warn">⚠ Người trình cũng là người duyệt</span>`;
      if (lock.disputeUntil) html += `<span class="pay-lock-meta">Hạn khiếu nại: ${escapeHTML(fmtDateDMY(lock.disputeUntil))}</span>`;
    }
    return html;
  }
  function hrPayCardIsOpen() {
    const el = document.getElementById('hr-pay-card');
    return !!(el && el.classList && !el.classList.contains('hr-card-hidden'));
  }
  function renderHrPayCard() {
    const body = document.getElementById('hr-pay-body');
    if (!body) return;
    const month = payLockMonthOf();
    const mEl = document.getElementById('hr-pay-month');
    if (mEl && mEl.value !== month) mEl.value = month;
    const lock = payLockOf(month);
    const scan = payLockScan(month);
    const locked = !!(lock && lock.status === 'da_chot');
    const drift = lock ? payDriftOfLock(lock) : { changedCount: 0 };
    const totalHc = scan.totals.reduce((s, t) => s + t.hcMin, 0);
    const totalTc = scan.totals.reduce((s, t) => s + t.tcMin, 0);
    const totalOt = scan.totals.reduce((s, t) => s + t.otMin, 0);
    const chips = `<div class="hr-stat-chips">
        <span class="hr-stat-chip">Kỳ: <strong>${escapeHTML(ciMonthShort(month))}</strong></span>
        <span class="hr-stat-chip">Dòng: <strong>${scan.rows.length}</strong></span>
        <span class="hr-stat-chip">Nhân viên: <strong>${scan.totals.length}</strong></span>
        <span class="hr-stat-chip">Giờ HC: <strong>${escapeHTML(fmtHm(totalHc))}</strong></span>
        <span class="hr-stat-chip">TC ghi nhận: <strong>${escapeHTML(fmtHm(totalOt))}</strong> / ${escapeHTML(fmtHm(totalTc))}</span>
        ${scan.blockers.length ? `<span class="hr-stat-chip is-danger">Phải xử lý: <strong>${scan.blockers.length}</strong></span>` : '<span class="hr-stat-chip">Đủ điều kiện chốt ✓</span>'}
        ${scan.warns.length ? `<span class="hr-stat-chip is-warn">Ngoại lệ: <strong>${scan.warns.length}</strong></span>` : ''}
      </div>`;
    const driftHtml = (drift.changedCount > 0)
      ? `<div class="pay-lock-drift">⚠ Số liệu đã ĐỔI sau khi chốt/trình: <strong>${drift.changedCount}</strong> dòng
          — bản đã chốt KHÔNG tự đổi (dùng để đối chiếu). Xem chi tiết ở bảng đối chiếu hoặc trình lại bản chốt.</div>` : '';
    const blockerHtml = scan.blockers.length
      ? `<div class="pay-lock-blockers"><div class="pay-lock-blockers-head">Phải xử lý trước khi chốt (${scan.blockers.length})</div>
          <ul>${scan.blockers.slice(0, 40).map(b => `<li><strong>${escapeHTML(b.employeeName)}</strong> · ${escapeHTML(fmtDateDMY(b.date))} — ${escapeHTML(b.reasons.join(' · '))}</li>`).join('')}
          ${scan.blockers.length > 40 ? `<li>… và ${scan.blockers.length - 40} dòng khác</li>` : ''}</ul></div>` : '';
    const signSet = new Set(((lock && lock.paperSigned) || []).map(x => x && x.employeeId));
    const rowsHtml = scan.totals.map(t => `<tr>
        <td><strong>${escapeHTML(t.employeeName)}</strong><div class="ci-sub">${escapeHTML(t.dept || '—')}${t.empCode ? ' · ' + escapeHTML(t.empCode) : ''}</div></td>
        <td class="text-right">${t.days}</td>
        <td class="text-right">${escapeHTML(fmtHm(t.hcMin))}</td>
        <td class="text-right"><strong>${escapeHTML(fmtHm(t.tcMin))}</strong></td>
        <td class="text-right">${escapeHTML(fmtHm(t.otMin))}</td>
        <td class="text-right">${t.otRejectedMin ? escapeHTML(fmtHm(t.otRejectedMin)) : '—'}</td>
        <td class="text-right">${lock
          ? `<button type="button" class="btn btn-outline btn-sm" data-pay="lock" data-pay-paper="${escapeHTML(t.employeeId)}" title="Đánh dấu đã thu phiếu giấy đã ký">${signSet.has(t.employeeId) ? '✓ Đã thu' : 'Chưa thu'}</button>`
          : '—'}</td>
      </tr>`).join('');
    body.innerHTML = `${chips}
      <div class="pay-lock-statebar">${payLockBtnStateHtml(lock)}</div>
      ${driftHtml}${blockerHtml}
      <div class="table-responsive table-scroll" style="max-height:46vh;">
        <table class="data-table tbl-pin1">
          <thead><tr>
            <th>Nhân Viên</th><th class="text-right">Ngày công</th><th class="text-right">Giờ HC</th>
            <th class="text-right">Giờ TC</th><th class="text-right">TC ghi nhận</th><th class="text-right">TC hủy</th>
            <th class="text-right">Phiếu giấy</th>
          </tr></thead>
          <tbody>${rowsHtml || '<tr><td colspan="7" class="text-center" style="padding:18px;color:var(--text-muted);">Chưa có dữ liệu công trong kỳ này.</td></tr>'}</tbody>
        </table>
      </div>
      <p class="ci-pay-hint" style="margin-top:8px;">
        ${locked ? 'Kỳ đã CHỐT CÔNG: số liệu trên là BẢN ĐÃ CHỐT (bất biến). Muốn sửa phải Mở Khóa Kỳ (chỉ Quản Trị).'
          : 'Chốt công yêu cầu: mọi dòng TC vượt đơn / thiếu giờ / bất thường phải được Xử lý trước. Bản chốt lưu ảnh chụp + luật tính + cấu hình ca + mã băm.'}
      </p>`;
    hrScheduleIcons();
  }
  // ── MODAL TRÌNH / DUYỆT / MỞ KHÓA CHỐT CÔNG ─────────────────────
  function payLockModalInfoHtml(act, month) {
    const lock = payLockOf(month);
    const scan = payLockScan(month);
    const totalHc = scan.totals.reduce((s, t) => s + t.hcMin, 0);
    const totalTc = scan.totals.reduce((s, t) => s + t.tcMin, 0);
    const totalOt = scan.totals.reduce((s, t) => s + t.otMin, 0);
    let html = `<div class="ci-pay-grid">
        <div><span>Kỳ</span><strong>${escapeHTML(ciMonthShort(month))}</strong></div>
        <div><span>Dòng công</span><strong>${scan.rows.length} · ${scan.totals.length} nhân viên</strong></div>
        <div><span>Giờ HC</span><strong>${escapeHTML(fmtHm(totalHc))}</strong></div>
        <div><span>TC ghi nhận / TC máy</span><strong>${escapeHTML(fmtHm(totalOt))} / ${escapeHTML(fmtHm(totalTc))}</strong></div>
      </div>`;
    if (act === 'prepare') {
      html += `<div class="ci-pay-tags">
        ${scan.blockers.length ? `<span class="ci-pay-gap">Còn ${scan.blockers.length} dòng phải xử lý</span>` : '<span class="ci-pay-ok">Đủ điều kiện chốt ✓</span>'}
        ${scan.warns.length ? `<span class="ci-pay-gap">${scan.warns.length} dòng ngoại lệ (đi muộn/về sớm/chưa bố trí…)</span>` : ''}
      </div>`;
      if (scan.blockers.length) {
        html += `<ul class="pay-lock-modal-list">${scan.blockers.slice(0, 8).map(b => `<li><strong>${escapeHTML(b.employeeName)}</strong> · ${escapeHTML(fmtDateDMY(b.date))} — ${escapeHTML(b.reasons.join(' · '))}</li>`).join('')}
          ${scan.blockers.length > 8 ? `<li>… và ${scan.blockers.length - 8} dòng khác</li>` : ''}</ul>`;
      }
    } else if (act === 'approve') {
      const drift = lock ? payDriftOfLock(lock) : { changedCount: 0 };
      html += `<div class="ci-pay-tags">
        ${lock ? `<span class="ci-pay-ok">Bản trình v${Number(lock.version) || 1}</span>
          <span class="ci-pay-ok">Người trình: ${escapeHTML(lock.preparedByName || '—')}</span>
          <span class="ci-pay-ok">Băm ${escapeHTML(String(lock.hash || '').slice(0, 12))}…</span>` : '<span class="ci-pay-gap">Chưa có bản trình</span>'}
        ${drift.changedCount ? `<span class="ci-pay-gap">⚠ Số liệu đã đổi ${drift.changedCount} dòng — phải trình lại</span>` : ''}
      </div>`;
    } else {
      html += `<div class="ci-pay-tags">
        ${lock ? `<span class="ci-pay-ok">Trạng thái: ${escapeHTML((PAY_LOCK_STATUS[lock.status] || {}).label || lock.status)}</span>
          <span class="ci-pay-ok">v${Number(lock.version) || 1}</span>
          ${lock.approvedByName ? `<span class="ci-pay-ok">Duyệt: ${escapeHTML(lock.approvedByName)}</span>` : ''}` : ''}
      </div>`;
      const hist = (lock && Array.isArray(lock.reopenHistory)) ? lock.reopenHistory.slice(-3) : [];
      if (hist.length) html += `<ul class="pay-lock-modal-list">${hist.map(h => `<li>${escapeHTML(String(h.at || '').slice(0, 16).replace('T', ' '))} · ${escapeHTML(h.by || '')} — ${escapeHTML(h.reason || '')}</li>`).join('')}</ul>`;
    }
    return html;
  }
  function openPayLockModal(action) {
    const act = action === 'approve' ? 'approve' : (action === 'reopen' ? 'reopen' : 'prepare');
    if (act === 'prepare' && !requirePayLock()) return;
    if (act === 'approve' && !canApproveLeave()) { showToast('Chỉ Admin & Ban Quản Lý mới được duyệt chốt công.', 'error'); return; }
    if (act === 'reopen' && !(state.currentUser && state.currentUser.role === 'admin')) { showToast('Chỉ Quản Trị mới được mở khóa kỳ công.', 'error'); return; }
    const modal = document.getElementById('modal-pay-lock');
    if (!modal) return;
    const month = payLockMonthOf();
    const actEl = document.getElementById('pay-lock-action');
    if (actEl) actEl.value = act;
    const mEl = document.getElementById('pay-lock-month');
    if (mEl) mEl.value = month;
    const info = document.getElementById('pay-lock-info');
    if (info) info.innerHTML = payLockModalInfoHtml(act, month);
    const title = document.getElementById('pay-lock-title');
    if (title) title.innerHTML = act === 'approve' ? '<i data-lucide="badge-check"></i> Duyệt Chốt Công'
      : (act === 'reopen' ? '<i data-lucide="lock-open"></i> Mở Khóa Kỳ Công' : '<i data-lucide="send"></i> Trình Chốt Công');
    const disputeG = document.getElementById('pay-lock-dispute-group');
    if (disputeG) disputeG.hidden = act !== 'prepare';
    const reqEl = document.getElementById('pay-lock-req');
    if (reqEl) reqEl.style.display = act === 'reopen' ? '' : 'none';
    const note = document.getElementById('pay-lock-note');
    if (note) note.value = '';
    const ok = document.getElementById('btn-pay-lock-ok');
    if (ok) {
      ok.className = act === 'reopen' ? 'btn btn-danger' : (act === 'approve' ? 'btn btn-success' : 'btn btn-primary');
      ok.innerHTML = act === 'reopen' ? '<i data-lucide="lock-open"></i> Mở Khóa'
        : (act === 'approve' ? '<i data-lucide="badge-check"></i> Duyệt Chốt' : '<i data-lucide="send"></i> Trình Chốt');
    }
    modal.classList.add('show');
    hrScheduleIcons();
  }
  function closePayLockModal() {
    document.getElementById('modal-pay-lock')?.classList.remove('show');
  }
  function payLockSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const act = (document.getElementById('pay-lock-action') || {}).value || 'prepare';
    const month = String((document.getElementById('pay-lock-month') || {}).value || '').trim();
    const note = String((document.getElementById('pay-lock-note') || {}).value || '').trim();
    const days = Number((document.getElementById('pay-lock-dispute') || {}).value || 0);
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Chọn kỳ (tháng) hợp lệ.', 'error'); return; }
    if (act === 'prepare') { if (payPrepareLock(month, { note, disputeDays: days }).ok) closePayLockModal(); return; }
    if (act === 'approve') { if (payApproveLock(month, { note })) closePayLockModal(); return; }
    if (act === 'reopen') {
      if (!note) { showToast('Bắt buộc nhập LÝ DO mở khóa.', 'error'); return; }
      if (payReopenLock(month, note)) closePayLockModal();
    }
  }
  // ── IN PHIẾU CÔNG CÁ NHÂN (ký giấy) — 20/10/2026 ────────────────
  function paySlipRowsOf(month) {
    const lock = payLockOf(month);
    const useLock = !!(lock && Array.isArray(lock.rows) && lock.rows.length && (lock.status === 'da_chot' || lock.status === 'cho_duyet'));
    const scan = useLock ? null : payLockScan(month);
    const rows = useLock ? lock.rows.slice() : scan.rows.slice();
    return { lock, rows, fromLock: useLock };
  }
  function paySlipPagesHtml(month) {
    const { lock, rows, fromLock } = paySlipRowsOf(month);
    const byEmp = new Map();
    rows.forEach(r => {
      if (!byEmp.has(r.employeeId)) byEmp.set(r.employeeId, []);
      byEmp.get(r.employeeId).push(r);
    });
    const signedSet = new Set(((lock && lock.paperSigned) || []).map(x => x && x.employeeId));
    const statusTxt = fromLock
      ? (lock.status === 'da_chot' ? `ĐÃ CHỐT · ${lock.approvedByName || ''}` : `BẢN TRÌNH CHỜ DUYỆT · ${lock.preparedByName || ''}`)
      : 'BẢN NHÁP — CHƯA CHỐT';
    const hashTxt = fromLock ? String(lock.hash || '') : payHashStr(JSON.stringify(rows));
    const dispute = (fromLock && lock.disputeUntil) ? fmtDateDMY(lock.disputeUntil) : '';
    const pages = [...byEmp.entries()].map(([empId, list]) => {
      list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const name = list[0].employeeName || hrEmpName(empId);
      const code = list[0].empCode || '';
      const dept = list[0].dept || '';
      let hc = 0, tc = 0, ot = 0, days = 0;
      const body = list.map(r => {
        hc += Number(r.hc) || 0; tc += Number(r.tc) || 0; ot += Number(r.otAcceptedMin) || 0;
        if ((Number(r.hc) || 0) > 0 || (Number(r.tc) || 0) > 0) days += 1;
        const dow = (() => { try { return HR_DOW_SHORT[new Date(r.date + 'T00:00:00').getDay()] || ''; } catch (e) { return ''; } })();
        return `<tr>
          <td class="ps-c">${escapeHTML(fmtDateDMY(r.date))}</td>
          <td class="ps-c">${escapeHTML(dow)}</td>
          <td class="ps-c">${escapeHTML(fmtHm(r.hc))}</td>
          <td class="ps-c">${escapeHTML(fmtHm(r.tc))}</td>
          <td class="ps-c"><strong>${escapeHTML(fmtHm(r.otAcceptedMin))}</strong></td>
          <td>${escapeHTML((r.verdict === 'ok' ? '' : (r.note || '')) + (r.otRejectedMin ? ` (hủy TC ${fmtHm(r.otRejectedMin)})` : ''))}</td>
        </tr>`;
      }).join('');
      return `<div class="payslip-page" data-pay-slip="${escapeHTML(empId)}">
        <div class="ps-head">
          <div class="ps-brand">NHÀ MÁY NGỌC SƠN THANH HÓA</div>
          <div class="ps-title">PHIẾU XÁC NHẬN CÔNG THÁNG ${escapeHTML(ciMonthShort(month))}</div>
          <div class="ps-status">${escapeHTML(statusTxt)}</div>
        </div>
        <div class="ps-info">
          <span><strong>Họ tên:</strong> ${escapeHTML(name)}</span>
          <span><strong>Mã NV:</strong> ${escapeHTML(code || '—')}</span>
          <span><strong>Bộ phận:</strong> ${escapeHTML(dept || '—')}</span>
        </div>
        <table class="ps-table">
          <thead><tr>
            <th>Ngày</th><th>Thứ</th><th>Giờ HC</th><th>Giờ TC</th><th>TC ghi nhận</th><th>Ghi chú</th>
          </tr></thead>
          <tbody>${body}</tbody>
          <tfoot><tr>
            <td colspan="2" class="ps-c"><strong>TỔNG (${days} ngày)</strong></td>
            <td class="ps-c"><strong>${escapeHTML(fmtHm(hc))}</strong></td>
            <td class="ps-c"><strong>${escapeHTML(fmtHm(tc))}</strong></td>
            <td class="ps-c"><strong>${escapeHTML(fmtHm(ot))}</strong></td>
            <td></td>
          </tr></tfoot>
        </table>
        <div class="ps-rules">
          Quy tắc tính: giờ vào làm tròn LÊN mốc 30 phút, giờ ra làm tròn XUỐNG mốc 30 phút ·
          nghỉ của ca đặt giữa ca · ngày nghỉ/lễ đi làm tính toàn bộ là TC ·
          tăng ca chỉ tính phần sau giờ hết ca theo khối 30 phút (làm tròn xuống) và phải đăng ký trước.
          ${dispute ? `<br><strong>Hạn khiếu nại: ${escapeHTML(dispute)}.</strong>` : ''}
        </div>
        <div class="ps-sign">
          <div><span>Người lao động</span><em>(Ký, ghi rõ họ tên)</em></div>
          <div><span>Trưởng bộ phận</span><em>(Ký, ghi rõ họ tên)</em></div>
          <div><span>Kế toán / Quản trị</span><em>(Ký, ghi rõ họ tên)</em></div>
        </div>
        <div class="ps-foot">
          Mã đối chiếu: <strong>${escapeHTML(hashTxt)}</strong> · In lúc ${escapeHTML(new Date().toLocaleString('vi-VN'))}
          · Trạng thái phiếu giấy: <strong>${signedSet.has(empId) ? 'ĐÃ THU' : 'CHƯA THU'}</strong>
        </div>
      </div>`;
    }).join('');
    return pages || '<div class="payslip-page"><p style="padding:24px;text-align:center;">Chưa có dữ liệu công trong kỳ này.</p></div>';
  }
  function renderPayPrintPreview(month) {
    const m = /^\d{4}-\d{2}$/.test(String(month || '')) ? String(month) : payLockMonthOf();
    const prev = document.getElementById('pay-print-preview');
    if (prev) prev.innerHTML = paySlipPagesHtml(m);
    const title = document.getElementById('pay-print-title');
    if (title) title.textContent = `Phiếu Công Tháng ${ciMonthShort(m)}`;
    return m;
  }
  function openPayPrintModal() {
    if (!requirePayLock()) return;
    const modal = document.getElementById('modal-pay-print');
    if (!modal) return;
    const month = payLockMonthOf();
    renderPayPrintPreview(month);
    const mEl = document.getElementById('pay-print-month');
    if (mEl) mEl.value = month;
    modal.classList.add('show');
    hrScheduleIcons();
  }
  function closePayPrintModal() {
    document.getElementById('modal-pay-print')?.classList.remove('show');
  }
  function doPayPrint() {
    const area = document.getElementById('pay-print-area');
    const prev = document.getElementById('pay-print-preview');
    if (!area || !prev) return;
    area.innerHTML = prev.innerHTML;
    document.body.classList.add('pay-printing');
    try {
      if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
    } finally {
      setTimeout(() => document.body.classList.remove('pay-printing'), 900);
    }
  }
  // Đánh dấu ĐÃ THU phiếu giấy (ký xong) — lưu vào bản chốt để đối chiếu
  function payMarkPaperSigned(employeeId, on) {
    if (!requirePayLock()) return false;
    if (!employeeId) return false;
    const month = payLockMonthOf();
    const lock = payLockOf(month);
    if (!lock) { showToast('Chưa có bản chốt công cho kỳ này — không đánh dấu được phiếu giấy.', 'error'); return false; }
    lock.paperSigned = Array.isArray(lock.paperSigned) ? lock.paperSigned : [];
    const i = lock.paperSigned.findIndex(x => x && x.employeeId === employeeId);
    if (on) {
      const rec = { employeeId, at: new Date().toISOString(), by: payWho() };
      if (i >= 0) lock.paperSigned[i] = rec; else lock.paperSigned.push(rec);
    } else if (i >= 0) {
      lock.paperSigned.splice(i, 1);
    }
    lock.updatedAt = new Date().toISOString();
    saveHrData(['hrPayLocks']);
    renderHrPayCard();
    return true;
  }
  function paySlipCount(month) {
    const { rows } = paySlipRowsOf(month || payLockMonthOf());
    return new Set(rows.map(r => r.employeeId)).size;
  }
  // Giờ chấm công máy dùng cho BẢNG CHẤM CÔNG THÁNG (khi ngày đó KHÔNG có bố trí)
  function ciTimesheetHours(e, dept, date) {
    // Dùng ENGINE ghép ca đêm: ngày chỉ có lần quẹt sáng của ca đêm hôm trước
    // KHÔNG phải ngày làm riêng; ca đêm lấy giờ ra từ lần quẹt sáng NGÀY KẾ.
    const act = ciActualSplit(e.id, date);
    if (!act || !act.hasPunch || act.hc == null) return { hc: 0, tc: 0, worked: false };
    return { hc: act.hc, tc: act.tc || 0, worked: (act.hc + (act.tc || 0)) > 0 };
  }












  // Modal nạp file Excel máy chấm công
  let checkinImportSheet = null;
  let ciImporting = false;      // đang ghi dữ liệu máy → chặn bấm lặp (nút Nạp Dữ Liệu)
  function openCheckinImportModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-checkin-import');
    if (!modal) return;
    if (!(state.hrEmployees || []).length) {
      showToast('Chưa có nhân viên nào — máy chấm công cần MÃ NV trùng "Mã Nhân Viên" trong danh sách!', 'error');
      return;
    }
    checkinImportSheet = null;
    const fileEl = document.getElementById('checkin-import-file');
    if (fileEl) fileEl.value = '';
    document.getElementById('checkin-import-summary').innerHTML = '';
    document.getElementById('btn-do-checkin-import').disabled = true;
    modal.classList.add('show');
    hrScheduleIcons();
  }
  function closeCheckinImportModal() {
    document.getElementById('modal-checkin-import')?.classList.remove('show');
  }
  function handleCheckinImportFile(e) {
    const file = e.target && e.target.files && e.target.files[0];
    const box = document.getElementById('checkin-import-summary');
    const doBtn = document.getElementById('btn-do-checkin-import');
    if (!file || !box || !doBtn) return;
    if (file.size > 30 * 1024 * 1024) {
      checkinImportSheet = null;
      doBtn.disabled = true;
      box.innerHTML = `<div style="font-size:0.75rem;color:var(--danger);padding:8px 10px;background:#fee2e2;border-radius:var(--radius-md);">File quá lớn (${Math.round(file.size / 1024 / 1024)} MB). Hãy xuất Excel theo từng tháng (tối đa 30 MB).</div>`;
      return;
    }
    // LOADING "nông dân chặt tre" + câu vui xoay vòng: hiện NGAY khi chọn file
    // (FileReader + XLSX.read là đồng bộ/nặng — nếu chỉ hiện trong onload thì
    // người dùng thấy màn hình "đứng" mà không biết máy đang làm gì).
    const funLabels = [
      'Chờ xíu nha… đang bê file Excel của máy chấm công về 🎋',
      'Suýt xong rồi… nông dân đang chẻ từng dòng dữ liệu 🌿',
      'Ráng chờ chút nha… tre sắp đổ rồi! 💪'
    ];
    checkinImportSheet = null;
    doBtn.disabled = true;
    box.innerHTML = `<div style="font-size:0.75rem; padding:8px 10px; background:var(--bg-subtle); border:1px dashed var(--border-color); border-radius:var(--radius-md); color:var(--text-muted);">⏳ Chờ xíu nha… đang đọc file “${escapeHTML(file.name)}” (file càng lớn càng lâu).</div>`;
    showTreLoading(funLabels[0], { dur: 800, phrases: funLabels });
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buf = ev.target.result;
      setTimeout(() => {
        let treOk = false;
        try {
          const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          // VÙNG DÙNG THẬT của sheet (chống treo khi file có !ref phình) + trần dòng/cột
          const used = hrSheetUsedRange(ws);
          if (!used.rows) throw new Error('File rỗng');
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false, range: used.range });
          if (!aoa.length) throw new Error('File rỗng');
          // File máy chấm công thường có các dòng đầu trang (tên công ty, "Từ ngày... Đến ngày...")
          const headerRow = ciFindHeaderRow(aoa);
          if (headerRow === -1) throw new Error('Không tìm thấy dòng tiêu đề (cần cột Mã NV / Họ Tên và Ngày)');
          const headers = (aoa[headerRow] || []).map(h => String(h ?? ''));
          const col = ciAutoMapCols(headers);
          if (col.code === -1 && col.name === -1) throw new Error('Không nhận ra cột Mã NV / Họ tên');
          if (col.date === -1) throw new Error('Không nhận ra cột Ngày');
          const dataAoa = aoa.slice(headerRow); // nạp từ dòng tiêu đề trở xuống
          // Đếm nhanh số dòng hợp lệ + khớp NV để hiển thị trước khi nạp
          let valid = 0, empOk = 0;
          const missing = [];
          for (let r = 1; r < dataAoa.length; r++) {
            const row = dataAoa[r];
            if (!row || !row.length) continue;
            const dt = ciNormDateTime(col.date >= 0 ? row[col.date] : '');
            if (!dt.date) continue;
            valid++;
            const emp = ciResolveEmployee(col.code >= 0 ? row[col.code] : '', col.name >= 0 ? row[col.name] : '');
            if (emp) empOk++;
            else if (missing.length < 8) {
              missing.push({
                code: String(col.code >= 0 ? (row[col.code] ?? '') : '').trim(),
                name: String(col.name >= 0 ? (row[col.name] ?? '') : '').trim(),
                dept: String(col.dept >= 0 ? (row[col.dept] ?? '') : '').trim()
              });
            }
          }
          checkinImportSheet = { aoa: dataAoa, col, fileName: file.name };
          doBtn.disabled = false;
          const colDesc = [
            col.code !== -1 ? `Mã NV "${headers[col.code]}"` : null,
            col.name !== -1 ? `Họ tên "${headers[col.name]}"` : null,
            `Ngày "${headers[col.date]}"`,
            col.timeIn !== -1
              ? `Giờ vào "${headers[col.timeIn]}"` + (col.timeOut !== -1 ? ` / Giờ ra "${headers[col.timeOut]}"` : '')
              : (col.punchCols && col.punchCols.length
                ? `${col.punchCols.length} cột lần quét ("Lần 1" → "Lần ${col.punchCols.length}") → đầu = vào, cuối = ra`
                : `Từng lần quét "${col.dateTime !== -1 ? headers[col.dateTime] : headers[col.date]}" → đầu = vào, cuối = ra`)
          ].filter(Boolean).join(' · ');
          const missHtml = missing.length
            ? `<div class="ci-miss-list" style="margin-top:6px;padding:6px 8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:var(--radius-sm);">
                 <strong>Không khớp hồ sơ (${valid - empOk} dòng):</strong>
                 ${missing.map(m => `<div>• ${escapeHTML(m.code || '(không mã)')} — ${escapeHTML(m.name || '(không tên)')}${m.dept ? ' · ' + escapeHTML(m.dept) : ''}</div>`).join('')}
                 ${valid - empOk > missing.length ? `<div>… và ${valid - empOk - missing.length} dòng khác</div>` : ''}
                 <div style="margin-top:4px;color:var(--text-muted);">Sửa “Mã Nhân Viên” trong hồ sơ cho khớp, hoặc kiểm tra lại Họ tên (khớp theo mã đã chuẩn hoá, sau đó theo họ tên bỏ dấu).</div>
               </div>` : '';
          box.innerHTML = `<div style="font-size:0.75rem; line-height:1.7; padding:8px 10px; background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md);">
            <strong>${escapeHTML(file.name)}</strong> — tiêu đề tại dòng ${headerRow + 1}, nhận cột: ${escapeHTML(colDesc)}<br>
            ${valid} dòng có ngày hợp lệ · <strong>${empOk} khớp nhân viên</strong>${valid - empOk > 0 ? ` · <span style="color:var(--danger);">${valid - empOk} dòng không khớp Mã NV/Tên (bỏ qua)</span>` : ''}
            ${used.rowsCapped || used.colsCapped ? `<br><span style="color:var(--danger);">File có ${used.rows} dòng / ${used.cols} cột — chỉ đọc tối đa ${HR_IMPORT_MAX_ROWS} dòng × ${HR_IMPORT_MAX_COLS} cột. Hãy xuất theo từng tháng.</span>` : ''}
          </div>${missHtml}`;
          treOk = true;
        } catch (err) {
          checkinImportSheet = null;
          doBtn.disabled = true;
          box.innerHTML = `<div style="font-size:0.75rem; color:var(--danger); padding:8px 10px; background:#fee2e2; border-radius:var(--radius-md);">Không đọc được file: ${escapeHTML(err.message || String(err))}. Hãy xuất file Excel (.xlsx/.xls/.csv) từ máy chấm công.</div>`;
        } finally {
          hideTreLoading(treOk, { minShow: 800 });
          hrScheduleIcons();
        }
      }, 0);
    };
    reader.onerror = () => {
      checkinImportSheet = null;
      doBtn.disabled = true;
      box.innerHTML = `<div style="font-size:0.75rem; color:var(--danger); padding:8px 10px; background:#fee2e2; border-radius:var(--radius-md);">Không đọc được file (lỗi đọc ổ đĩa / file đang mở ở chương trình khác). Hãy đóng file rồi chọn lại.</div>`;
      hideTreLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }

  function doCheckinImport() {
    if (!requireEditPermission()) return;
    if (!checkinImportSheet || ciImporting) return;   // chống bấm 2 lần
    const sheet = checkinImportSheet;
    const col = sheet.col;
    const doBtn = document.getElementById('btn-do-checkin-import');
    const mode = col.timeIn !== -1 ? 'theo ngày (giờ vào/ra riêng)'
      : (col.punchCols && col.punchCols.length ? `lưới "Lần 1..N" (${col.punchCols.length} cột lần quét, đầu = vào, cuối = ra)`
      : 'gộp từng lần quét (đầu = vào, cuối = ra)');
    const nRows = Math.max(0, (sheet.aoa || []).length - 1);
    // LOADING "nông dân chặt tre" — ghi hàng nghìn dòng + saveHrData (12 key
    // localStorage) + renderHrView (11 bảng) chạy ĐỒNG BỘ nên nếu không che,
    // người dùng tưởng máy bị treo.
    const funLabels = [
      `Chờ xíu nha… đang ghi ${nRows.toLocaleString('vi-VN')} dòng chấm công vào máy 🧾`,
      'Nông dân đang xếp từng ngày công vào sổ… sắp xong! 🌿',
      'Đừng tắt trang nha… tre sắp đổ rồi! 🎋'
    ];
    ciImporting = true;
    if (doBtn) doBtn.disabled = true;
    showTreLoading(funLabels[0], { dur: 800, phrases: funLabels });
    setTimeout(() => {
      let treOk = false;
      try {
        const res = importCheckinsFromSheet(sheet.aoa, col, sheet.fileName);
        // Tùy chọn ngay trong modal: tự điền giờ kết thúc thực tế cho NGÀY ĐÃ QUA
        const autoEl = document.getElementById('checkin-import-autofill');
        const roundEl = document.getElementById('checkin-import-round');
        const autoFill = !!(autoEl && autoEl.checked);
        const round = !!(roundEl && roundEl.value === 'round30');
        closeCheckinImportModal();
        // Nhảy kỳ sang THÁNG MỚI NHẤT có dữ liệu máy (file vừa nạp thường là tháng mới)
        const latestMonth = (state.hrCheckins || [])
          .map(c => String(c.date || '').slice(0, 7))
          .filter(m => /^\d{4}-\d{2}$/.test(m)).sort().pop();
        if (latestMonth) ciSaveUi({ month: latestMonth, mode: 'month', chip: '', dept: 'all' });
        renderHrView();
        showToast(`Nạp xong từ "${sheet.fileName}" (${mode}): ${res.matched} ngày khớp nhân viên` +
          (res.unmatched.length ? ` · ${res.unmatched.length} dòng KHÔNG khớp Mã NV/Tên đã bỏ qua` : ''), 'success');
        treOk = true;
        if (autoFill) {
          // Mở XEM TRƯỚC (không tự ghi) — người dùng xác nhận từng dòng
          const rows = ciSuggestEndFills({ from: '', to: '', dept: 'all', round });
          if (!rows.length) {
            showToast('Không có lượt bố trí nào cần điền giờ kết thúc (chưa có giờ ra hoặc đã điền).', 'info');
          } else {
            const fEl = document.getElementById('ci-endfill-from'); if (fEl) fEl.value = '';
            const tEl = document.getElementById('ci-endfill-to'); if (tEl) tEl.value = hrShiftDateISO(hrTodayISO(), -1);
            const rEl = document.getElementById('ci-endfill-round'); if (rEl) rEl.value = round ? 'round30' : 'exact';
            renderCiEndfillList();
            const modal = document.getElementById('modal-ci-endfill');
            if (modal) { modal.classList.add('show'); hrScheduleIcons(); }
          }
        }
      } catch (err) {
        showToast('Nạp dữ liệu lỗi: ' + (err && err.message ? err.message : String(err)), 'error');
      } finally {
        ciImporting = false;
        if (doBtn) doBtn.disabled = false;
        hideTreLoading(treOk, { minShow: 800 });
        hrScheduleIcons();
      }
    }, 0);
  }


  // ─── 6) THỐNG KÊ ĐI LÀM THEO THÁNG ───────────────────────────────
  // Tính theo ngày dương lịch trong tháng: đi làm / nghỉ có phép (đơn duyệt) /
  // vắng / chưa chấm. Tỷ lệ đi làm = đi làm / (đi làm + nghỉ phép + vắng).
  // Tháng hiện tại chỉ tính tới hôm nay; bỏ ngày trước ngày vào làm. Người ĐÃ
  // NGHỈ VIỆC vẫn tính đến hết tháng nghỉ (ngày sau ngày nghỉ không tính gì).
  function computeAttendanceStats(month) {
    const [y, m] = String(month || '').split('-').map(Number);
    if (!y || !m) return [];
    const today = hrTodayISO();
    const monthStart = `${month}-01`;
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;
    const lastDay = monthEnd > today ? today : monthEnd;
    const dates = [];
    for (let d = monthStart; d <= lastDay; d = hrShiftDateISO(d, 1)) dates.push(d);

    return (state.hrEmployees || [])
      .filter(e => {
        const st = e.status || 'active';
        if (st === 'active') return true;
        if (st === 'quit') {
          const qd = String(e.quitDate || '');
          return /^\d{4}-\d{2}-\d{2}$/.test(qd) && qd >= monthStart; // còn trong tháng nghỉ
        }
        return false;
      })
      .map(e => {
        const join = e.joinDate || '';
        const quit = (e.status || 'active') === 'quit' ? String(e.quitDate || '') : '';
        let work = 0, leave = 0, absent = 0, unmarked = 0;
        dates.forEach(d => {
          if (join && d < join) return; // ngày trước khi vào làm
          if (quit && d > quit) return; // ngày sau khi nghỉ việc — không tính
          const st = attStatusOf(e.id, d);
          if (st === 'work') work++;
          else if (st === 'leave') leave++;
          else if (st === 'absent') absent++;
          else unmarked++;
        });
        const counted = work + leave + absent;
        return { emp: e, work, leave, absent, unmarked, counted, rate: counted ? Math.round(work * 1000 / counted) / 10 : null };
      })
      .filter(s => s.counted > 0 || s.unmarked > 0)
      .sort((a, b) => (b.absent - a.absent) || ((a.rate ?? 101) - (b.rate ?? 101)) ||
        String(a.emp.name || '').localeCompare(String(b.emp.name || ''), 'vi'));
  }

  // Tỷ lệ đi làm GỘP THEO BỘ PHẬN (không phụ thuộc bộ lọc): gộp ngày công /
  // nghỉ phép / vắng của tất cả NV cùng bộ phận rồi tính % — mỗi NV trong
  // bảng hiển thị tỷ lệ của bộ phận mình đang thuộc.
  function computeDeptAttendanceRates(month) {
    const stats = computeAttendanceStats(month);
    const map = new Map(); // dept -> { work, leave, absent }
    stats.forEach(s => {
      const d = s.emp.department || '—';
      if (!map.has(d)) map.set(d, { work: 0, leave: 0, absent: 0 });
      const t = map.get(d);
      t.work += s.work; t.leave += s.leave; t.absent += s.absent;
    });
    const rates = new Map();
    map.forEach((t, d) => {
      const counted = t.work + t.leave + t.absent;
      rates.set(d, counted ? Math.round(t.work * 1000 / counted) / 10 : null);
    });
    return rates;
  }

  function isHrMechanicalDepartment(department) {
    const dept = hrDeptAliasOf(department);
    return dept === 'Cơ Điện';
  }

  function setWorkerEvaluationEfficiencyProvider(provider) {
    if (provider !== null && typeof provider !== 'function') {
      throw new TypeError('Nguồn hiệu suất đánh giá phải là hàm hoặc null.');
    }
    workerEvaluationEfficiencyProvider = provider;
  }

  function workerEvaluationAttendance(month, employee) {
    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const join = String(employee.joinDate || '');
    const quit = (employee.status || 'active') === 'quit' ? String(employee.quitDate || '') : '';
    const today = hrTodayISO();
    let standardDays = 0, workedStandardDays = 0, workedRestDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      if ((join && date < join) || (quit && date > quit)) continue;
      const isRest = hrIsRestDay(date);
      if (!isRest) standardDays++;
      if (date <= today && attStatusOf(employee.id, date) === 'work') {
        if (isRest) workedRestDays++;
        else workedStandardDays++;
      }
    }
    return { standardDays, workedStandardDays, workedRestDays };
  }

  function computeWorkerEvaluation(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) {
      return { rows: [], summary: { employees: 0, attendanceCount: 0, averageAttendance: null, verifiedTasks: 0, employeesWithStageEfficiency: 0 } };
    }

    const attendanceRows = computeAttendanceStats(month).filter(s =>
      hrDeptAliasOf(s.emp.department) !== 'Văn Phòng');
    const stageEfficiencyByEmployee = workerEvaluationEfficiencyProvider
      ? workerEvaluationEfficiencyProvider(month)
      : new Map();
    if (!(stageEfficiencyByEmployee instanceof Map)) {
      throw new TypeError('Nguồn hiệu suất đánh giá phải trả về Map theo employeeId.');
    }
    const tasksByEmployee = new Map();
    const taskStatusLabels = {
      not_started: 'Chưa bắt đầu',
      in_progress: 'Đang xử lý',
      completed: 'Đã hoàn thành',
      verified: 'Đã nghiệm thu'
    };

    (state.x2IncidentReports || []).forEach(report => {
      if (!report || !Array.isArray(report.repairAssigneeIds)) return;
      const taskDate = String(report.repairCompletedAt || report.repairAssignedAt ||
        report.repairStartedAt || report.date || '').slice(0, 10);
      if (taskDate.slice(0, 7) !== month) return;
      const status = Object.prototype.hasOwnProperty.call(taskStatusLabels, report.repairStatus)
        ? report.repairStatus : 'not_started';
      const task = {
        id: String(report.id || ''),
        date: taskDate,
        stage: String(report.stage || ''),
        description: String(report.description || report.fixAction || report.cause || ''),
        status,
        statusLabel: taskStatusLabels[status],
        priority: String(report.repairPriority || ''),
        dueAt: String(report.repairDueAt || ''),
        completedAt: String(report.repairCompletedAt || ''),
        recurrence: typeof report.repairRecurrence === 'boolean' ? report.repairRecurrence : null,
        outcome: String(report.repairOutcome || '')
      };
      [...new Set(report.repairAssigneeIds.map(id => String(id || '').trim()).filter(Boolean))]
        .forEach(employeeId => {
          if (!tasksByEmployee.has(employeeId)) tasksByEmployee.set(employeeId, []);
          tasksByEmployee.get(employeeId).push(task);
        });
    });

    const evaluationByEmployee = new Map((state.hrWorkerEvaluations || [])
      .filter(record => record && record.month === month)
      .map(record => [
        String(record.employeeId || ''),
        ['A', 'B', 'C'].includes(record.grade) ? record.grade : ''
      ]));
    const rows = attendanceRows.map(s => {
      const department = hrDeptAliasOf(s.emp.department) || '—';
      const attendance = workerEvaluationAttendance(month, s.emp);
      const stageEfficiency = stageEfficiencyByEmployee.get(String(s.emp.id)) || null;
      const employeeTasks = isHrMechanicalDepartment(department)
        ? (tasksByEmployee.get(String(s.emp.id)) || []) : [];
      const verified = employeeTasks.filter(t => t.status === 'verified');
      const dueTasks = verified.filter(t => t.dueAt && t.completedAt);
      const recurrenceTasks = verified.filter(t => t.recurrence !== null);
      const onTime = dueTasks.filter(t => Date.parse(t.completedAt) <= Date.parse(t.dueAt)).length;
      const noRecurrence = recurrenceTasks.filter(t => !t.recurrence).length;
      return {
        emp: s.emp,
        department,
        work: s.work,
        leave: s.leave,
        absent: s.absent,
        unmarked: s.unmarked,
        standardDays: attendance.standardDays,
        workedStandardDays: attendance.workedStandardDays,
        workedRestDays: attendance.workedRestDays,
        attendanceRate: attendance.standardDays && s.counted
          ? Math.round(attendance.workedStandardDays * 1000 / attendance.standardDays) / 10
          : null,
        individualEfficiency: null,
        stageEfficiency: stageEfficiency && Number.isFinite(stageEfficiency.efficiency)
          ? stageEfficiency.efficiency : null,
        stageEfficiencyValidHours: stageEfficiency && Number.isFinite(stageEfficiency.validHours) ? stageEfficiency.validHours : null,
        stageEfficiencyAssignedHours: stageEfficiency && Number.isFinite(stageEfficiency.assignedHours) ? stageEfficiency.assignedHours : null,
        stageEfficiencyCoverageRate: stageEfficiency && Number.isFinite(stageEfficiency.coverageRate)
          ? stageEfficiency.coverageRate : null,
        stageEfficiencyEstimatedHours: stageEfficiency && Number.isFinite(stageEfficiency.estimatedHours) ? stageEfficiency.estimatedHours : null,
        stageEfficiencyOverlapCount: stageEfficiency ? Number(stageEfficiency.overlapCount) || 0 : 0,
        stageEfficiencyUnmatchedCount: stageEfficiency ? Number(stageEfficiency.unmatchedCount) || 0 : 0,
        stageEfficiencyOverlapAssignments: stageEfficiency && Array.isArray(stageEfficiency.overlapAssignments)
          ? stageEfficiency.overlapAssignments : [],
        stageEfficiencyUnmatchedAssignments: stageEfficiency && Array.isArray(stageEfficiency.unmatchedAssignments)
          ? stageEfficiency.unmatchedAssignments : [],
        stageEfficiencyTieMissing: !!(stageEfficiency && stageEfficiency.tieMissing),
        stageEfficiencyDetails: stageEfficiency && Array.isArray(stageEfficiency.stageDetails) ? stageEfficiency.stageDetails : [],
        stageEfficiencyStages: stageEfficiency ? Number(stageEfficiency.stages) || 0 : 0,
        evaluationGrade: evaluationByEmployee.get(String(s.emp.id)) || '',
        tasks: employeeTasks,
        assignedTasks: employeeTasks.length,
        inProgressTasks: employeeTasks.filter(t => t.status === 'in_progress').length,
        completedTasks: employeeTasks.filter(t => t.status === 'completed' || t.status === 'verified').length,
        verifiedTasks: verified.length,
        onTimeEligibleTasks: dueTasks.length,
        onTimeTasks: onTime,
        noRecurrenceEligibleTasks: recurrenceTasks.length,
        noRecurrenceTasks: noRecurrence
      };
    });
    const departmentOrder = new Map(HR_DEPARTMENTS.filter(d => d !== 'Văn Phòng').map((d, i) => [d, i]));
    rows.sort((a, b) =>
      (departmentOrder.has(a.department) ? departmentOrder.get(a.department) : 99) -
        (departmentOrder.has(b.department) ? departmentOrder.get(b.department) : 99) ||
      String(a.department).localeCompare(String(b.department), 'vi') ||
      String(a.emp.name || '').localeCompare(String(b.emp.name || ''), 'vi'));
    const rates = rows.map(r => r.attendanceRate).filter(v => v !== null);
    return {
      rows,
      summary: {
        employees: rows.length,
        attendanceCount: rates.length,
        averageAttendance: rates.length
          ? Math.round(rates.reduce((a, b) => a + b, 0) * 10 / rates.length) / 10
          : null,
        verifiedTasks: rows.reduce((sum, r) => sum + r.verifiedTasks, 0),
        employeesWithStageEfficiency: rows.filter(r => r.stageEfficiency !== null).length
      }
    };
  }

  function readWorkerEvaluationView() {
    try { return localStorage.getItem(HR_EVAL_VIEW_KEY) === 'cards' ? 'cards' : 'table'; }
    catch (e) { return 'table'; }
  }
  let workerEvaluationView = readWorkerEvaluationView();

  function setWorkerEvaluationView(view) {
    if (view !== 'table' && view !== 'cards') return false;
    workerEvaluationView = view;
    try { localStorage.setItem(HR_EVAL_VIEW_KEY, view); }
    catch (e) { console.warn('[NHÂN SỰ] Không lưu được tùy chọn kiểu hiển thị đánh giá:', e); }
    renderWorkerEvaluation();
    return true;
  }

  function setWorkerEvaluationGrade(employeeId, month, grade) {
    if (!canApproveLeave()) {
      showToast('Chỉ Quản Trị / Ban Quản Lý được đánh giá nhân viên.', 'error');
      renderWorkerEvaluation();
      return false;
    }
    const employeeKey = String(employeeId || '').trim();
    const monthKey = String(month || '');
    const gradeKey = String(grade || '').trim().toUpperCase();
    if (!employeeKey || !/^\d{4}-\d{2}$/.test(monthKey) || !['', 'A', 'B', 'C'].includes(gradeKey)) {
      showToast('Thông tin đánh giá không hợp lệ. Hãy chọn kỳ và mức A, B hoặc C.', 'error');
      renderWorkerEvaluation();
      return false;
    }
    const eligible = computeWorkerEvaluation(monthKey).rows.some(row => String(row.emp.id) === employeeKey);
    if (!eligible) {
      showToast('Không tìm thấy nhân viên ngoài Văn Phòng trong kỳ đánh giá này.', 'error');
      renderWorkerEvaluation();
      return false;
    }

    const id = `worker-evaluation:${monthKey}:${employeeKey}`;
    const records = Array.isArray(state.hrWorkerEvaluations) ? state.hrWorkerEvaluations : [];
    const existing = records.find(record => record && record.id === id);
    const now = new Date().toISOString();
    const user = state.currentUser || {};
    const by = String(user.displayName || user.fullName || user.username || 'Quản lý');
    const record = {
      id,
      employeeId: employeeKey,
      month: monthKey,
      grade: gradeKey,
      createdBy: existing && existing.createdBy ? existing.createdBy : by,
      createdAt: existing && existing.createdAt ? existing.createdAt : now,
      updatedBy: by,
      updatedAt: now
    };
    state.hrWorkerEvaluations = records.filter(item => !item || item.id !== id).concat(record);
    saveHrData(['hrWorkerEvaluations']);
    renderWorkerEvaluation();
    showToast(gradeKey ? `Đã lưu đánh giá ${gradeKey} cho nhân viên.` : 'Đã xóa mức đánh giá của nhân viên.', 'success');
    return true;
  }

  function workerEvaluationGradeControl(row, month) {
    const selected = row.evaluationGrade;
    const options = [
      ['', 'Chưa đánh giá'],
      ['A', 'A'],
      ['B', 'B'],
      ['C', 'C']
    ];
    const optionsHtml = options.map(([value, label]) =>
      `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`
    ).join('');
    return `<select class="hr-eval-grade-select" data-worker-eval-grade="1" data-eval-employee="${escapeHTML(row.emp.id)}" data-eval-month="${escapeHTML(month)}" aria-label="Đánh giá ${escapeHTML(row.emp.name || row.emp.code || '')}">${optionsHtml}</select>`;
  }

  function openWorkerEvaluationAttendance(month, department) {
    if (!canApproveLeave() || !/^\d{4}-\d{2}$/.test(String(month || ''))) {
      showToast('Không thể mở thống kê chấm công cho kỳ này.', 'error');
      return false;
    }
    state.hrAttMonth = month;
    const filter = document.getElementById('hr-attstats-filter-dept');
    if (filter) {
      const option = Array.from(filter.options || []).find(item => item.value === department);
      filter.value = option ? department : 'all';
    }
    if (!hrOpenCard('hr-att-stats-card')) {
      showToast('Không thể mở bảng thống kê chấm công.', 'error');
      return false;
    }
    return true;
  }

  function openWorkerEvaluationAssignmentDate(date, department) {
    const dateKey = String(date || '');
    const dept = hrDeptAliasOf(department);
    if (!canApproveLeave() || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
        (dept !== 'Xưởng 1' && dept !== 'Xưởng 2')) {
      showToast('Không thể mở bảng bố trí cho phân công này.', 'error');
      return false;
    }
    state.hrBoardDate = dateKey;
    state.hrBoardDept = dept;
    return revealHrBoardInline();
  }

  function revealHrBoardInline() {
    const boardCard = document.getElementById('hr-board-card');
    const hrView = document.getElementById('hr-view');
    if (!boardCard || !hrView) {
      showToast('Không tìm thấy bảng bố trí vị trí trong tab Nhân Sự.', 'error');
      return false;
    }

    hrCloseOpenCard();
    hrDockClose();
    const stack = document.getElementById('hr-details-stack');
    if (boardCard.parentElement !== hrView) {
      if (stack && stack.parentElement === hrView && typeof hrView.insertBefore === 'function') {
        hrView.insertBefore(boardCard, stack);
      } else if (typeof hrView.appendChild === 'function') {
        hrView.appendChild(boardCard);
      }
    }
    boardCard.classList.remove('hr-card-hidden');
    boardCard.classList.remove('rate-table-collapsed');
    renderHrBoard();
    if (typeof boardCard.scrollIntoView === 'function') {
      boardCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return true;
  }

  function renderWorkerEvaluation() {
    const monthEl = document.getElementById('hr-eval-month');
    if (!monthEl) return;
    if (!/^\d{4}-\d{2}$/.test(monthEl.value || '')) monthEl.value = hrTodayISO().slice(0, 7);
    const result = computeWorkerEvaluation(monthEl.value);
    const deptSelect = document.getElementById('hr-eval-filter-dept');
    const deptFilter = deptSelect && deptSelect.value ? deptSelect.value : 'all';
    const search = hrStripDiacritics(document.getElementById('hr-eval-search')?.value || '').toLowerCase().trim();
    const summaryEl = document.getElementById('hr-eval-summary');
    const tbody = document.getElementById('hr-eval-body');
    const tableWrap = document.getElementById('hr-eval-table-wrap');
    const cardsEl = document.getElementById('hr-eval-cards');
    const tableViewBtn = document.getElementById('hr-eval-view-table');
    const cardsViewBtn = document.getElementById('hr-eval-view-cards');
    if (!summaryEl || !tbody || !tableWrap || !cardsEl) return;
    const isCardsView = workerEvaluationView === 'cards';
    tableWrap.hidden = isCardsView;
    cardsEl.hidden = !isCardsView;
    if (tableViewBtn) {
      tableViewBtn.classList.toggle('active', !isCardsView);
      tableViewBtn.setAttribute('aria-pressed', String(!isCardsView));
    }
    if (cardsViewBtn) {
      cardsViewBtn.classList.toggle('active', isCardsView);
      cardsViewBtn.setAttribute('aria-pressed', String(isCardsView));
    }
    if (!canApproveLeave()) {
      summaryEl.innerHTML = '';
      tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:22px;color:var(--text-muted);">Chỉ Quản Trị / Ban Quản Lý được xem đánh giá nhân sự.</td></tr>';
      cardsEl.innerHTML = '<div class="hr-eval-empty">Chỉ Quản Trị / Ban Quản Lý được xem đánh giá nhân sự.</div>';
      return;
    }

    const rows = result.rows.filter(r =>
      (deptFilter === 'all' || r.department === deptFilter) &&
      (!search || hrStripDiacritics(`${r.emp.name || ''} ${r.emp.code || ''}`).toLowerCase().includes(search)));
    summaryEl.innerHTML = `<strong>${rows.length}</strong> nhân viên · <strong>${rows.filter(r => r.evaluationGrade).length}</strong> đã đánh giá` +
      ' <span class="hr-eval-summary-note">· Hạng do quản lý chọn</span>';
    if (!rows.length) {
      const emptyMessage = result.rows.length
        ? 'Không có nhân viên khớp bộ lọc hoặc từ khóa.'
        : 'Chưa có nhân viên ngoài Văn Phòng trong kỳ này.';
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:22px;color:var(--text-muted);">${emptyMessage}</td></tr>`;
      cardsEl.innerHTML = `<div class="hr-eval-empty">${emptyMessage}</div>`;
      return;
    }
    const renderRow = row => {
      const isMechanical = isHrMechanicalDepartment(row.department);
      const formatEfficiencyNumber = value => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
      const attendance = `<details class="hr-eval-disclosure"><summary title="Xem chi tiết chuyên cần">` +
        (row.attendanceRate === null
          ? `<span class="hr-eval-badge needs-data">${row.standardDays === 0 ? 'Không có công chuẩn' : 'Chưa có dữ liệu'}</span>`
          : `<strong class="hr-eval-rate">${row.attendanceRate}%</strong>`) +
        (row.unmarked ? ` <span class="hr-eval-badge needs-data">${row.unmarked} chưa chấm</span>` : '') +
        `</summary><div class="hr-eval-detail-panel"><strong>Chuyên cần</strong>` +
        `<p>${row.workedStandardDays} ngày đi làm trong lịch chuẩn / ${row.standardDays} công chuẩn · ${row.workedRestDays} ngày làm vào ngày nghỉ</p>` +
        `<p>${row.leave} nghỉ có phép · ${row.absent} vắng (chưa xác định phép) · ${row.unmarked} chưa chấm</p>` +
        `<p>Công chuẩn tính theo lịch cả tháng, trong thời gian làm việc của nhân viên; ngày làm vào ngày nghỉ không tính vào chuyên cần. Ngày chưa chấm được đếm đến hôm nay, kể cả ngày nghỉ. Kết quả tháng hiện tại là tạm thời.</p>` +
        `<p>Bảng thống kê chấm công dùng mẫu số khác nên tỷ lệ có thể khác.</p>` +
        `<button type="button" class="hr-eval-source" data-eval-attendance-source="1" data-eval-month="${escapeHTML(monthEl.value)}" data-eval-department="${escapeHTML(row.department)}">Mở thống kê chấm công theo tháng →</button></div></details>`;
      const verifiedMetrics = row.onTimeEligibleTasks
        ? `<span class="hr-eval-meta">${row.onTimeTasks}/${row.onTimeEligibleTasks} việc nghiệm thu đúng hạn (có đủ mốc hạn/hoàn thành)</span>` : '';
      const recurrenceMetrics = row.noRecurrenceEligibleTasks
        ? `<span class="hr-eval-meta">${row.noRecurrenceTasks}/${row.noRecurrenceEligibleTasks} việc không ghi nhận tái phát</span>` : '';
      const hasAssignmentIssues = row.stageEfficiencyOverlapCount > 0 || row.stageEfficiencyUnmatchedCount > 0;
      const assignmentIssueList = (items, fallback, showConflicts) => {
        if (!items.length) return fallback;
        return `<ul class="hr-eval-task-list">${items.map(issue => {
          const date = fmtDateDMY(issue.date);
          const position = escapeHTML(issue.positionName || 'Vị trí chưa rõ');
          const hours = `${escapeHTML(issue.start || '—')}–${escapeHTML(issue.end || 'hết ca')}`;
          const conflicts = showConflicts && issue.conflicts && issue.conflicts.length
            ? ` · Trùng với ${issue.conflicts.map(other => `${escapeHTML(other.positionName || 'Vị trí chưa rõ')} ${escapeHTML(other.start || '—')}–${escapeHTML(other.end || 'hết ca')}`).join(', ')}`
            : '';
          return `<li>${escapeHTML(date)} · ${position} · ${hours} — ${escapeHTML(issue.reason || '')}${conflicts}` +
            ` <button type="button" class="hr-eval-source" data-eval-assignment-date="${escapeHTML(issue.date)}" data-eval-assignment-department="${escapeHTML(issue.department)}">Mở bảng bố trí ngày →</button></li>`;
        }).join('')}</ul>`;
      };
      const taskDetails = row.tasks.length
        ? `<ul class="hr-eval-task-list">${row.tasks.map(t =>
            `<li>${escapeHTML(t.date)} · ${escapeHTML(t.stage || 'Sự cố')} · ${escapeHTML(t.statusLabel)}${t.priority ? ` · ${escapeHTML(t.priority)}` : ''}${t.description ? ` — ${escapeHTML(t.description)}` : ''}${t.outcome ? `<span class="hr-eval-meta">Kết quả: ${escapeHTML(t.outcome)}</span>` : ''}</li>`
          ).join('')}</ul>`
        : '';
      const efficiency = isMechanical
        ? `<details class="hr-eval-disclosure"><summary title="Xem công việc Cơ Điện"><strong>${row.assignedTasks} việc</strong> · ${row.verifiedTasks} nghiệm thu</summary>` +
          `<div class="hr-eval-detail-panel"><strong>Công việc Cơ Điện</strong><p>${row.inProgressTasks} đang xử lý · ${row.completedTasks} hoàn thành/đã nghiệm thu</p>${verifiedMetrics}${recurrenceMetrics}${taskDetails}</div></details>`
        : `<details class="hr-eval-disclosure"><summary title="Xem chi tiết hiệu suất tham chiếu và cảnh báo phân công">` +
          (row.stageEfficiency === null
            ? `<span class="hr-eval-badge needs-data">Chưa đủ dữ liệu hiệu suất</span>`
            : `<span class="hr-eval-badge has-data">${formatEfficiencyNumber(row.stageEfficiency)}% công đoạn</span>` +
              `<span class="hr-eval-coverage">${escapeHTML(row.stageEfficiencyDetails.filter(stage => stage.selected).map(stage => stage.label).join(' · '))}</span>`) +
          (row.stageEfficiencyDetails.some(stage => stage.estimatedHours > 0) ? '<span class="hr-eval-badge needs-data">Có ước tính</span>' : '') +
          (row.stageEfficiencyOverlapCount > 0 ? `<span class="hr-eval-badge needs-data" title="Mở chi tiết để xem ngày và phân công bị trùng">Có lịch trùng (${row.stageEfficiencyOverlapCount})</span>` : '') +
          (row.stageEfficiencyUnmatchedCount ? `<span class="hr-eval-badge needs-data" title="Mở chi tiết để xem vị trí/giờ chưa nhận diện">Có phân công chưa xác định (${row.stageEfficiencyUnmatchedCount})</span>` : '') +
          (row.stageEfficiencyTieMissing ? '<span class="hr-eval-badge needs-data">Chưa đủ dữ liệu so sánh</span>' : '') +
          `</summary><div class="hr-eval-detail-panel"><strong>Hiệu suất tham chiếu</strong>` +
          (row.stageEfficiencyDetails.length
            ? row.stageEfficiencyDetails.map(stage => `<p><strong>${escapeHTML(stage.label)}</strong>${stage.selected ? (hasAssignmentIssues ? ' · nhiều giờ nhất trong dữ liệu nhận diện' : ' · công đoạn chính') : row.stageEfficiencyDetails.length > 1 ? ' · đồng giờ' : ' · nhiều giờ nhất trong dữ liệu nhận diện'}: ${stage.efficiency === null ? 'chưa đủ dữ liệu hiệu suất' : formatEfficiencyNumber(stage.efficiency) + '%'}; ${formatEfficiencyNumber(stage.validHours)} / ${formatEfficiencyNumber(stage.assignedHours)} giờ phân công có hiệu suất · độ phủ ${stage.coverageRate === null ? '—' : formatEfficiencyNumber(stage.coverageRate) + '%'}.${stage.estimatedHours > 0 ? ` ${formatEfficiencyNumber(stage.estimatedHours)} giờ dùng sản lượng quy đổi/ước tính.` : ''}${stage.rawEfficiency !== null && row.stageEfficiencyDetails.length > 1 ? ` Tỷ lệ trước làm tròn: ${stage.rawEfficiency.toLocaleString('vi-VN', { maximumFractionDigits: 12 })}%.` : ''}</p>`).join('')
            : '<p>Không đủ phân công có công đoạn và giờ được nhận diện để xác định công đoạn chính.</p>') +
          (hasAssignmentIssues
            ? '<p>Tỷ lệ hiển thị được tính trên phần phân công nhận diện được và không trùng. Công đoạn nêu trên có nhiều giờ nhất trong dữ liệu này; chưa thể xác nhận là công đoạn chính của toàn bộ lịch.</p>'
            : '<p>Chọn công đoạn theo giờ phân công nhiều nhất; chỉ tính hiệu suất nhóm trong ngày/ca đã tham gia, không phải sản lượng riêng. Công đoạn hỗ trợ không được tính.</p>') +
          (row.stageEfficiencyTieMissing ? '<p>Các công đoạn bằng giờ nhưng có công đoạn thiếu dữ liệu; không thể khẳng định công đoạn được chọn có hiệu suất cao hơn.</p>' : '') +
          (row.stageEfficiencyUnmatchedCount
            ? `<p>Có ${row.stageEfficiencyUnmatchedCount} phân công chưa nhận diện được công đoạn hoặc giờ; không đưa vào tỷ lệ.</p>${assignmentIssueList(row.stageEfficiencyUnmatchedAssignments, '<p>Không có chi tiết phân công để truy vết.</p>', false)}`
            : '') +
          (row.stageEfficiencyOverlapCount > 0
            ? `<p>Đã loại ${row.stageEfficiencyOverlapCount} phân công bị trùng giờ; mở bảng bố trí để kiểm tra các khoảng giờ giao nhau.</p>${assignmentIssueList(row.stageEfficiencyOverlapAssignments, '<p>Không có chi tiết lịch trùng để truy vết.</p>', true)}`
            : '') +
          `</div></details>`;
      const gradeControl = workerEvaluationGradeControl(row, monthEl.value);
      return {
        table: `<tr>
        <td class="hr-eval-employee"><strong>${escapeHTML(row.emp.name || '')}</strong>${row.emp.code ? `<span class="hr-eval-meta">${escapeHTML(row.emp.code)}</span>` : ''}</td>
        <td>${escapeHTML(row.department)}</td>
        <td>${attendance}</td>
        <td>${efficiency}</td>
        <td>${gradeControl}</td>
      </tr>`,
        card: `<article class="hr-eval-worker-card">
          <div class="hr-eval-card-head">
            <div><h5>${escapeHTML(row.emp.name || 'Chưa có tên')}</h5><span class="hr-eval-card-identity">${escapeHTML(row.emp.code || 'Chưa có mã')} · ${escapeHTML(row.department)}</span></div>
            <span class="hr-eval-card-grade grade-${row.evaluationGrade || 'none'}">${row.evaluationGrade || '—'}</span>
          </div>
          <div class="hr-eval-card-metrics">
            <div class="hr-eval-card-metric"><span>Chuyên cần</span>${attendance}</div>
            <div class="hr-eval-card-metric"><span>${isMechanical ? 'Công việc Cơ Điện' : 'Hiệu suất công đoạn chính'}</span>${efficiency}</div>
          </div>
          <div class="hr-eval-card-assessment"><span>Đánh giá của quản lý</span>${gradeControl}</div>
        </article>`
      };
    };
    const renderedRows = rows.map(renderRow);
    tbody.innerHTML = renderedRows.map(row => row.table).join('');
    cardsEl.innerHTML = renderedRows.map(row => row.card).join('');
    hrScheduleIcons();
  }

  function renderHrAttendanceStats() {
    if (!/^\d{4}-\d{2}$/.test(state.hrAttMonth || '')) state.hrAttMonth = hrTodayISO().slice(0, 7);
    const monthInput = document.getElementById('hr-att-month');
    if (monthInput && monthInput.value !== state.hrAttMonth) monthInput.value = state.hrAttMonth;

    const allStats = computeAttendanceStats(state.hrAttMonth);
    // Bộ lọc bộ phận chỉ THU HẸP bảng hiển thị; chips + tỷ lệ bộ phận vẫn tính từ toàn bộ nhân viên
    const deptFilter = document.getElementById('hr-attstats-filter-dept')?.value || 'all';
    const stats = deptFilter === 'all' ? allStats : allStats.filter(s => (s.emp.department || '—') === deptFilter);
    const t = { work: 0, leave: 0, absent: 0, unmarked: 0 };
    allStats.forEach(s => { t.work += s.work; t.leave += s.leave; t.absent += s.absent; t.unmarked += s.unmarked; });
    const countedAll = t.work + t.leave + t.absent;
    const deptRates = computeDeptAttendanceRates(state.hrAttMonth);

    const chipsEl = document.getElementById('hr-att-stats-chips');
    if (chipsEl) {
      chipsEl.innerHTML =
        `<span class="hr-stat-chip"><i data-lucide="check-circle-2"></i> Ngày công: <strong>${t.work}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="calendar-check"></i> Nghỉ phép: <strong>${t.leave}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="user-x"></i> Vắng: <strong>${t.absent}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="circle-dashed"></i> Chưa chấm: <strong>${t.unmarked}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="percent"></i> Tỷ lệ đi làm: <strong>${countedAll ? (Math.round(t.work * 1000 / countedAll) / 10) + '%' : '—'}</strong></span>`;
    }

    const tbody = document.getElementById('hr-att-stats-body');

    // ── TẦNG 1: THẺ TÓM TẮT TỪNG BỘ PHẬN (bấm thẻ = lọc bảng cá nhân tầng 2;
    //    bấm lại đúng thẻ đang lọc = về "Tất Cả") ──
    // Số liệu gộp TOÀN BỘ NV từng bộ phận (không phụ thuộc bộ lọc dưới).
    const deptsBox = document.getElementById('hr-att-stats-depts');
    if (deptsBox) {
      const totals = new Map(); // dept -> { work, leave, absent }
      allStats.forEach(s => {
        const d = s.emp.department || '—';
        if (!totals.has(d)) totals.set(d, { work: 0, leave: 0, absent: 0 });
        const g = totals.get(d);
        g.work += s.work; g.leave += s.leave; g.absent += s.absent;
      });
      // Thứ tự chuẩn theo HR_DEPARTMENTS, bộ phận ngoài danh mục (nếu có) xếp sau
      const order = HR_DEPARTMENTS.concat([...totals.keys()].filter(d => !HR_DEPARTMENTS.includes(d)));
      deptsBox.innerHTML = order.filter(d => totals.has(d)).map(d => {
        const g = totals.get(d);
        const counted = g.work + g.leave + g.absent;
        const rate = counted ? Math.round(g.work * 1000 / counted) / 10 : null;
        const tone = rate === null ? 'na' : (rate >= 90 ? 'good' : (rate >= 70 ? 'mid' : 'low'));
        const active = deptFilter === d;
        return `<button type="button" class="hr-att-dept tone-${tone}${active ? ' active' : ''}" data-attstats-dept="${escapeHTML(d)}"` +
          ` title="Bấm để lọc bảng cá nhân theo bộ phận ${escapeHTML(d)}${active ? ' (bấm lại = Tất Cả)' : ''}">` +
          `<span class="hr-att-dept-name">${escapeHTML(d)}</span>` +
          `<span class="hr-att-dept-rate">${rate === null ? '—' : rate + '%'}</span>` +
          `<span class="hr-att-dept-bar"><span style="width:${rate === null ? 0 : Math.min(100, rate)}%"></span></span>` +
          `<span class="hr-att-dept-meta">${g.work} công · ${g.leave} nghỉ · ${g.absent} vắng</span>` +
        `</button>`;
      }).join('');
    }
    if (!tbody) return;
    if (!stats.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:22px;color:var(--text-muted);">${allStats.length ? 'Không có nhân viên nào khớp bộ lọc bộ phận trong tháng này.' : 'Chưa có dữ liệu chấm công trong tháng này.'}</td></tr>`;
      return;
    }
    tbody.innerHTML = stats.map(s => {
      const deptRate = deptRates.get(s.emp.department || '—');
      return `<tr>
        <td><strong>${escapeHTML(s.emp.name || '')}</strong>${s.emp.code ? ` <span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(s.emp.code)}</span>` : ''}</td>
        <td>${escapeHTML(s.emp.department || '—')}</td>
        <td><strong>${s.work}</strong></td>
        <td>${s.leave}</td>
        <td>${s.absent ? `<strong style="color:var(--danger);">${s.absent}</strong>` : '0'}</td>
        <td>${s.unmarked}</td>
        <td>${s.rate === null ? '—' : `<strong>${s.rate}%</strong>`}</td>
        <td>${deptRate === null || deptRate === undefined ? '—' : `<strong>${deptRate}%</strong>`}</td>
      </tr>`;
    }).join('');
  }

  // ─── 7) VỊ TRÍ LÀM VIỆC & KỸ NĂNG ────────────────────────────────
  // Danh mục vị trí của xưởng (Ép ván, Bào tinh, Sấy, Lò hơi...). Nhân viên
  // đánh dấu kỹ năng theo vị trí này (1-nhiều) và được phân vị theo ngày.
  function renderHrPositionsTable() {
    const tbody = document.getElementById('hr-positions-body');
    if (!tbody) return;
    const list = state.hrPositions || [];
    const countEl = document.getElementById('hr-positions-count');
    if (countEl) countEl.textContent = `${list.length} vị trí`;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="git-branch" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có vị trí làm việc nào. Bấm "Thêm Vị Trí" (VD: Ép ván, Bào tinh, Sấy, Lò hơi, Đóng gói...).</p></td></tr>`;
      hrScheduleIcons();
      return;
    }
    tbody.innerHTML = list.map(p => {
      const skilled = (state.hrEmployees || []).filter(e => (e.status || 'active') === 'active' && (e.skills || []).includes(p.id));
      // Số NV "từng được phân" vị trí này theo ngày (lịch sử chấm công) — gợi ý để đồng bộ
      const everSet = new Set((state.hrAttendance || [])
        .filter(a => Array.isArray(a.positions) && a.positions.includes(p.id))
        .map(a => a.employeeId)
        .filter(id => { const e = hrEmpById(id); return e && (e.status || 'active') === 'active'; }));
      const cellTitle = skilled.length
        ? skilled.map(x => x.name).join(', ')
        : (everSet.size
          ? `Chưa ai được TICK kỹ năng này trong hồ sơ. Nhưng ${everSet.size} NV từng được phân vị theo ngày — bấm "Đồng Bộ Kỹ Năng" để tự cập nhật.`
          : 'Chưa có ai được tick kỹ năng — mở Sửa Nhân Viên để tick, hoặc phân vị theo ngày rồi bấm "Đồng Bộ Kỹ Năng".');
      return `<tr>
        <td><strong>${escapeHTML(p.name)}</strong></td>
        <td>${escapeHTML(p.department || '—')}</td>
        <td title="${escapeHTML(cellTitle)}"><span class="hr-chip ${skilled.length ? 'ok' : 'off'}">${skilled.length} NV</span>
          <span style="font-size:0.72rem;color:var(--text-muted);">${escapeHTML(skilled.slice(0, 3).map(x => x.name).join(', '))}${skilled.length > 3 ? ` +${skilled.length - 3}` : ''}</span>${(!skilled.length && everSet.size) ? `<br><span style="font-size:0.68rem;color:#a16207;" title="Bấm Đồng Bộ Kỹ Năng để tự thêm từ lịch sử phân vị">từng phân: ${everSet.size} NV</span>` : ''}</td>
        <td class="hr-notes" title="${escapeHTML(p.note || '')}">${escapeHTML(p.note || '—')}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrEditPosition('${p.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrDeletePosition('${p.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
    hrScheduleIcons();
  }

  // Đồng bộ kỹ năng từ lịch sử phân vị: quét toàn bộ bản ghi chấm công
  // (hrAttendance.positions), gộp cặp (NV, vị trí) đã từng phân vào
  // hrEmployees.skills. Tường minh (bấm nút) — không tự ghi khi bấm chip
  // để tránh kỹ năng "ảo" từ phân ca tạm thời 1 ngày.
  function syncSkillsFromAssignments() {
    if (!requireEditPermission()) return;
    // Lập kế hoạch trước (chưa đụng dữ liệu) để confirm đúng số liệu
    const plan = new Map(); // empId -> Set(posId cần thêm)
    (state.hrAttendance || []).forEach(a => {
      if (!a.employeeId || !Array.isArray(a.positions)) return;
      if (!hrEmpById(a.employeeId)) return;
      const skills = Array.isArray(hrEmpById(a.employeeId).skills) ? hrEmpById(a.employeeId).skills : [];
      a.positions.forEach(pid => {
        if (!pid || !hrPosById(pid)) return;
        if (!skills.includes(pid)) {
          if (!plan.has(a.employeeId)) plan.set(a.employeeId, new Set());
          plan.get(a.employeeId).add(pid);
        }
      });
    });
    const empCount = plan.size;
    const posCount = [...plan.values()].reduce((s, set) => s + set.size, 0);
    if (!empCount) {
      showToast('Không có kỹ năng mới nào để đồng bộ — lịch sử phân vị đã khớp với kỹ năng hiện có.', 'info');
      return;
    }
    if (!confirm(`Đồng bộ kỹ năng từ lịch sử phân vị theo ngày?\n\nSẽ thêm ${posCount} kỹ năng cho ${empCount} nhân viên (kỹ năng đã có giữ nguyên, không tự xóa kỹ năng nào).`)) return;
    plan.forEach((set, empId) => {
      const emp = hrEmpById(empId);
      emp.skills = Array.isArray(emp.skills) ? emp.skills : [];
      set.forEach(pid => emp.skills.push(pid));
      emp.updatedAt = new Date().toISOString();
    });
    saveHrData();
    renderHrView();
    showToast(`Đã đồng bộ: thêm ${posCount} kỹ năng cho ${empCount} nhân viên (theo lịch sử phân vị)`, 'success');
  }

  function openPositionModal(id) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-position');
    const form = document.getElementById('position-form');
    if (!modal || !form) return;
    form.reset();
    const deptSel = document.getElementById('position-department');
    if (deptSel) deptSel.innerHTML = '<option value="">— Không phân bộ phận —</option>' +
      HR_DEPARTMENTS.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
    const titleEl = document.getElementById('position-modal-title');
    if (id) {
      const p = hrPosById(id);
      if (!p) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Vị Trí: ${escapeHTML(p.name)}`;
      document.getElementById('position-id').value = p.id;
      document.getElementById('position-name').value = p.name || '';
      document.getElementById('position-department').value = p.department || '';
      document.getElementById('position-note').value = p.note || '';
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="git-branch-plus"></i> Thêm Vị Trí Làm Việc`;
      document.getElementById('position-id').value = '';
      // Mặc định Bộ Phận theo bộ phận ĐANG XEM trên Board (nếu có) — tránh
      // thêm nhầm vào "Không phân bộ phận" rồi không thấy vị trí trên Board
      const defDept = state.hrBoardDept || '';
      if (deptSel && defDept && HR_DEPARTMENTS.includes(defDept)) deptSel.value = defDept;
    }
    modal.classList.add('show');
    hrScheduleIcons();
  }

  function closePositionModal() {
    document.getElementById('modal-position')?.classList.remove('show');
  }

  function handlePositionSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const id = document.getElementById('position-id').value;
    const name = document.getElementById('position-name').value.trim();
    const department = document.getElementById('position-department').value;
    if (!name) { showToast('Tên vị trí không được để trống!', 'error'); return; }
    // Trùng = cùng TÊN + cùng BỘ PHẬN (khác bộ phận vẫn thêm được — VD
    // "Ép ván" có ở cả Xưởng 1 và Xưởng 2 là 2 vị trí riêng biệt)
    const dup = (state.hrPositions || []).find(p =>
      hrStripDiacritics(p.name) === hrStripDiacritics(name) &&
      (p.department || '') === (department || '') && p.id !== id);
    if (dup) { showToast(`Đã có vị trí "${dup.name}" tại bộ phận ${department || 'chưa phân bộ phận'}!`, 'error'); return; }
    const data = {
      name,
      department,
      note: document.getElementById('position-note').value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (id) {
      const p = hrPosById(id);
      if (!p) return;
      Object.assign(p, data);
      showToast(`Đã cập nhật vị trí ${name}!`, 'success');
    } else {
      data.id = `pos-${Date.now()}`;
      data.createdAt = new Date().toISOString();
      state.hrPositions.push(data);
      showToast(`Đã thêm vị trí ${name}!`, 'success');
    }
    // Chỉ ghi key THAY ĐỔI (không ghi lại 12 key) + chỉ vẽ bảng bố trí
    saveHrData(['hrPositions']);
    closePositionModal();
    renderHrAfterBoardChange();
  }

  function deletePosition(id) {
    if (!requireEditPermission()) return;
    const p = hrPosById(id);
    if (!p) return;
    const users = (state.hrEmployees || []).filter(e => (e.skills || []).includes(id)).length;
    if (!confirm(`Xóa vị trí "${p.name}"? Kỹ năng này sẽ gỡ khỏi ${users} nhân viên và khỏi phân vị đã lưu.`)) return;
    trackDeleted('hrPositions', id);
    state.hrPositions = (state.hrPositions || []).filter(x => x.id !== id);
    (state.hrEmployees || []).forEach(e => { if (Array.isArray(e.skills)) e.skills = e.skills.filter(s => s !== id); });
    (state.hrAttendance || []).forEach(a => { if (Array.isArray(a.positions)) a.positions = a.positions.filter(s => s !== id); });
    saveHrData(['hrPositions', 'hrEmployees', 'hrAttendance']);
    renderHrAfterBoardChange();
    showToast(`Đã xóa vị trí ${p.name}`, 'info');
  }

  // ─── 4) NHÂN SỰ CẦN — TUYỂN DỤNG ────────────────────────────────
  // Dữ liệu cho biểu đồ kiểm soát mảng nhân sự (tích hợp sau).
  function renderHrRecruitmentTable() {
    const tbody = document.getElementById('hr-recruit-body');
    if (!tbody) return;
    const dept = document.getElementById('hr-recruit-filter-dept')?.value || 'all';
    const list = (state.hrRecruitment || []).filter(r => dept === 'all' || r.department === dept);

    const countEl = document.getElementById('hr-recruit-count');
    if (countEl) {
      const can = (state.hrRecruitment || []).reduce((s, r) => s + (r.needQty || 0), 0);
      const hired = (state.hrRecruitment || []).reduce((s, r) => s + (r.hiredQty || 0), 0);
      countEl.textContent = `Cần ${can} — đã tuyển ${hired} — còn thiếu ${Math.max(0, can - hired)} (đang tuyển ${list.filter(r => (r.status || 'open') === 'open').length} vị trí)`;
    }

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding:22px;color:var(--text-muted);">
        <i data-lucide="user-search" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có nhu cầu tuyển dụng nào. Bấm "Nhân Sự Cần" để thêm.</p></td></tr>`;
      hrScheduleIcons();
      return;
    }

    tbody.innerHTML = [...list].sort((a, b) =>
      String(a.department || '').localeCompare(String(b.department || ''), 'vi')).map(r => {
      const missing = Math.max(0, (r.needQty || 0) - (r.hiredQty || 0));
      const st = r.status || 'open';
      return `<tr>
        <td>${escapeHTML(r.department || '—')}</td>
        <td><strong>${escapeHTML(r.position || '—')}</strong></td>
        <td>${r.needQty || 0}</td>
        <td>${r.hiredQty || 0}</td>
        <td><strong style="color:${missing > 0 ? 'var(--danger)' : '#16a34a'};">${missing}</strong></td>
        <td>${fmtDateDMY(r.needDate)}</td>
        <td><span class="hr-chip ${st === 'open' ? 'warn' : 'ok'}">${RECRUIT_STATUS[st]}</span></td>
        <td class="hr-notes" title="${escapeHTML(r.notes || '')}">${escapeHTML(r.notes || '—')}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrEditRecruitment('${r.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrDeleteRecruitment('${r.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function openRecruitmentModal(id) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-recruitment');
    const form = document.getElementById('recruitment-form');
    if (!modal || !form) return;
    form.reset();
    const deptSel = document.getElementById('recruit-department');
    if (deptSel) deptSel.innerHTML = HR_DEPARTMENTS.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
    const titleEl = document.getElementById('recruitment-modal-title');

    if (id) {
      const r = (state.hrRecruitment || []).find(x => x.id === id);
      if (!r) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Nhu Cầu: ${escapeHTML(r.position || '')}`;
      document.getElementById('recruit-id').value = r.id;
      document.getElementById('recruit-department').value = r.department || HR_DEPARTMENTS[0];
      document.getElementById('recruit-position').value = r.position || '';
      document.getElementById('recruit-need').value = r.needQty || 1;
      document.getElementById('recruit-hired').value = r.hiredQty || 0;
      document.getElementById('recruit-needdate').value = r.needDate || '';
      document.getElementById('recruit-status').value = r.status || 'open';
      document.getElementById('recruit-notes').value = r.notes || '';
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="user-search"></i> Thêm Nhu Cầu Nhân Sự`;
      document.getElementById('recruit-id').value = '';
      document.getElementById('recruit-need').value = 1;
      document.getElementById('recruit-hired').value = 0;
      document.getElementById('recruit-status').value = 'open';
    }
    modal.classList.add('show');
    hrScheduleIcons();
  }

  function closeRecruitmentModal() {
    document.getElementById('modal-recruitment')?.classList.remove('show');
  }

  function handleRecruitmentSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const id = document.getElementById('recruit-id').value;
    const position = document.getElementById('recruit-position').value.trim();
    const needQty = parseInt(document.getElementById('recruit-need').value) || 0;
    if (!position) { showToast('Vị trí tuyển không được để trống!', 'error'); return; }
    if (needQty <= 0) { showToast('Số người cần phải lớn hơn 0!', 'error'); return; }

    const data = {
      id: id || `rec-${Date.now()}`,
      department: document.getElementById('recruit-department').value,
      position,
      needQty,
      hiredQty: parseInt(document.getElementById('recruit-hired').value) || 0,
      needDate: document.getElementById('recruit-needdate').value,
      status: document.getElementById('recruit-status').value,
      notes: document.getElementById('recruit-notes').value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (id) {
      const idx = state.hrRecruitment.findIndex(x => x.id === id);
      if (idx !== -1) state.hrRecruitment[idx] = { ...state.hrRecruitment[idx], ...data };
      showToast(`Đã cập nhật nhu cầu tuyển "${position}"!`, 'success');
    } else {
      data.createdAt = new Date().toISOString();
      state.hrRecruitment.push(data);
      showToast(`Đã thêm nhu cầu tuyển "${position}"!`, 'success');
    }
    saveHrData();
    closeRecruitmentModal();
    renderHrView();
  }

  function deleteRecruitment(id) {
    if (!requireEditPermission()) return;
    trackDeleted('hrRecruitment', id);
    state.hrRecruitment = (state.hrRecruitment || []).filter(r => r.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa nhu cầu tuyển dụng', 'info');
  }

  // ─── 4b) NHÂN SỰ CẦN TẠI CÁC VỊ TRÍ — SƠ ĐỒ BONG BÓNG 3 CẤP ──────
  // Bảng cũ (Cần / Hiện có / Còn thiếu) đã được thay bằng sơ đồ 3 cấp:
  //   cấp 1 bong bóng bộ phận → cấp 2 thẻ vị trí (sửa "Cần" tại chỗ) →
  //   cấp 3 người (đang bố trí · dự bị · dùng chung · trùng giờ).
  // Số liệu LIVE 100% từ Bảng bố trí của NGÀY đang xem — xem khối 4c.
  function renderPositionNeedsTable() {
    // Lưới an toàn: dữ liệu vừa về từ MÂY/backup có thể còn nhãn cũ "Lò Hơi"
    // (migrate chỉ chạy 1 lần/phiên ở đây; loadHrData đã chạy sẵn lúc boot).
    if (!hrDeptMergeChecked) {
      hrDeptMergeChecked = true;
      try { migrateHrDeptMerge(); } catch (e) { /* không chặn render */ }
    }
    // TỰ ĐỘNG NẠP: mỗi vị trí trong danh mục (hrPositions) có 1 dòng trong bảng
    // (chỉ thêm lần đầu / khi có vị trí mới — dòng đã xóa tay không hồi sinh).
    ensurePositionNeedsFromPositions();
    renderHrNeedCard();
  }

  // ════════════════════════════════════════════════════════════════
  // 4c) NHU CẦU NHÂN SỰ THEO CA + SƠ ĐỒ BONG BÓNG 3 CẤP (21/10/2026)
  // ────────────────────────────────────────────────────────────────
  // Người dùng phản ánh 3 điểm sai của bảng cũ:
  //   (1) "Số người hiện có" thực chất là ĐẾM NGƯỜI CÓ KỸ NĂNG ⇒ 1 người
  //       3 kỹ năng bị đếm 3 lần, không phải số người đang làm thật;
  //   (2) bộ phận để "Làm ca" thì Bảng bố trí dùng nguyên needQty cho TỪNG ca
  //       ("cần 1" × 2 ca = 2 suất) nhưng bảng vẫn ghi "cần 1" ⇒ lệch sổ;
  //   (3) không thấy ai làm nhiều vị trí / ai bị xếp trùng giờ / ai bố trí
  //       ngoài kỹ năng.
  // CHUẨN MỚI:
  //   • needQty = NHU CẦU CẢ NGÀY; chia ca bằng hrNeedSplitOf():
  //       'even' (mặc định): 4 → 2+2 · 3 → 2+1 · 1 → 1+1 · 0 → 0+0
  //       (need > 0 thì MỖI CA tối thiểu 1 suất — đúng yêu cầu người dùng)
  //       'each': mỗi ca đủ N (vị trí trực 24/24)
  //   • TÁCH 3 CON SỐ: Có kỹ năng (hồ sơ, distinct) · Đang bố trí (Bảng bố trí
  //     của NGÀY đang xem, theo ca) · Dùng chung (≥2 vị trí/ngày)
  //   • Còn thiếu = Σ theo ca max(0, cần_ca − có_ca) — KHÔNG dùng số unique
  //   • Ngày chưa có lượt bố trí nào → trạng thái 'no-data' (xám), KHÔNG báo thiếu
  //   • haveQty GIỮ trong dữ liệu (mây/file/Excel tương thích) nhưng KHÔNG dùng
  //     để kết luận thiếu/đủ nữa.
  // ════════════════════════════════════════════════════════════════
  const HR_NEED_UI_KEY = 'bamboo_tracker_hr_need_ui_v1'; // thuần UI theo MÁY
  const HR_NEED_MIN_PER_SHIFT = 1;                       // need > 0 ⇒ mỗi ca ≥ 1

  function hrNeedReadUi() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(HR_NEED_UI_KEY) || 'null'); } catch (e) { raw = null; }
    const ui = Object.assign({ dept: '', date: '', onlyShort: false, showSkillLinks: false, q: '', openPos: null }, (raw && typeof raw === 'object') ? raw : {});
    if (!Array.isArray(ui.openPos)) ui.openPos = null;
    return ui;
  }
  function hrNeedWriteUi(patch) {
    const ui = Object.assign(hrNeedReadUi(), patch || {});
    try { localStorage.setItem(HR_NEED_UI_KEY, JSON.stringify(ui)); } catch (e) { /* bỏ qua */ }
    return ui;
  }
  function hrNeedDateISO() {
    const ui = hrNeedReadUi();
    if (/^\d{4}-\d{2}-\d{2}$/.test(ui.date || '')) return ui.date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(state.hrBoardDate || '')) return state.hrBoardDate;
    return hrTodayISO();
  }

  // CHIA NHU CẦU NGÀY → TỪNG CA (nguồn chân lý duy nhất cho sơ đồ + Bảng bố trí)
  function hrNeedSplitOf(need, colCount, mode) {
    const n = Math.max(0, parseInt(need, 10) || 0);
    const cols = Math.max(1, parseInt(colCount, 10) || 1);
    if (cols <= 1) return [n];
    if (mode === 'each') return Array.from({ length: cols }, () => n);
    if (n <= 0) return Array.from({ length: cols }, () => 0);
    const base = Math.floor(n / cols);
    const rem = n % cols;
    return Array.from({ length: cols }, (_, i) => Math.max(HR_NEED_MIN_PER_SHIFT, base + (i < rem ? 1 : 0)));
  }
  function hrNeedModeOf(row) { return (row && row.needMode === 'each') ? 'each' : 'even'; }
  function hrNeedColCount(dept) {
    const cfg = hrShiftCfg(dept || '');
    return cfg.type === 'lamca' ? Math.max(1, (cfg.shifts || []).length) : 1;
  }

  // Nhân viên có kỹ năng / đang giữ vị trí này?
  function hrEmployeeHasPos(e, positionId, positionName) {
    if (!e) return false;
    const skills = Array.isArray(e.skills) ? e.skills : [];
    if (positionId && skills.includes(positionId)) return true;
    return !!(positionName && (e.position || '').trim() === String(positionName).trim());
  }

  // Bối cảnh 1 NGÀY: bố trí theo vị trí / theo người / người dùng chung / trùng giờ
  function hrNeedCtx(dateISO) {
    const assigns = hrAssignmentsOf(dateISO).filter(a => a && a.positionId && a.employeeId);
    const schedule = hrAssignmentScheduleOf(assigns);
    const byPos = new Map();
    const byEmp = new Map();
    assigns.forEach(a => {
      if (!byPos.has(a.positionId)) byPos.set(a.positionId, []);
      byPos.get(a.positionId).push(a);
      if (!byEmp.has(a.employeeId)) byEmp.set(a.employeeId, []);
      byEmp.get(a.employeeId).push(a);
    });
    // DÙNG CHUNG = 1 người ở ≥ 2 VỊ TRÍ KHÁC NHAU (khác ca cùng vị trí không tính)
    const shared = new Map();
    byEmp.forEach((list, empId) => {
      const posIds = [...new Set(list.map(a => a.positionId))];
      if (posIds.length >= 2) shared.set(empId, posIds);
    });
    // TRÙNG GIỜ = 2 lượt KHÁC VỊ TRÍ có khoảng giờ chồng nhau
    const conflict = schedule.conflictIds;
    return { dateISO, assigns, byPos, byEmp, shared, conflict, schedule, hasData: assigns.length > 0 };
  }

  // Số liệu 1 dòng (vị trí) — LIVE, không lưu vào state
  function hrNeedRowMetrics(r, ctx) {
    const pos = r.positionId ? hrPosById(r.positionId) : null;
    const dept = hrDeptAliasOf(r.department || (pos && pos.department) || '');
    const cols = hrNeedColCount(dept || '');
    const needDay = Math.max(0, parseInt(r.needQty, 10) || 0);
    const mode = hrNeedModeOf(r);
    const needPerShift = hrNeedSplitOf(needDay, cols, mode);
    const positionName = String(r.position || (pos && pos.name) || '').trim();
    const positionId = r.positionId || '';
    const mine = positionId ? (ctx.byPos.get(positionId) || []) : [];
    const perShift = Array.from({ length: cols }, (_, si) => mine.filter(a => (a.shiftIdx || 0) === si));
    const extraShift = mine.filter(a => (a.shiftIdx || 0) >= cols);
    const counts = perShift.map(l => l.length);
    let needTotal = 0, covered = 0, shortage = 0, over = 0;
    needPerShift.forEach((n, si) => {
      needTotal += n;
      covered += Math.min(n, counts[si]);
      shortage += Math.max(0, n - counts[si]);
      if (n > 0) over += Math.max(0, counts[si] - n);
    });
    over += extraShift.length;
    // CÓ KỸ NĂNG (distinct, KHÔNG lọc bộ phận — 1 người có thể làm nhiều nơi)
    const emps = state.hrEmployees || [];
    const skilledList = emps.filter(e => (e.status || 'active') === 'active' && hrEmployeeHasPos(e, positionId, positionName));
    const skilledIds = skilledList.map(e => e.id);
    const skilledSame = skilledList.filter(e => hrDeptAliasOf(e.department) === dept).length;
    const assignedIds = [...new Set(mine.map(a => a.employeeId))];
    const assignedSet = new Set(assignedIds);
    const reserveIds = skilledIds.filter(id => !assignedSet.has(id));
    const reserveIdleIds = reserveIds.filter(id => !ctx.byEmp.has(id)); // rảnh hẳn trong ngày
    const sharedEmpIds = assignedIds.filter(id => ctx.shared.has(id));
    const conflictIds = [...new Set(mine.filter(a => ctx.conflict.has(a.id)).map(a => a.employeeId))];
    const unskilledIds = assignedIds.filter(id => {
      const e = hrEmpById(id);
      if (!e) return false;
      const skills = Array.isArray(e.skills) ? e.skills : [];
      if (!skills.length) return false;           // chưa khai kỹ năng → không kết luận
      return !hrEmployeeHasPos(e, positionId, positionName);
    });
    let status = 'ok';
    if (!ctx.hasData) status = 'no-data';
    else if (needDay <= 0) status = 'none';
    else if (shortage > 0) status = 'short';
    else if (over > 0) status = 'over';
    // NGÀY CHƯA CÓ LƯỢT BỐ TRÍ NÀO → KHÔNG kết luận thiếu (tránh báo đỏ oan)
    if (status === 'no-data') { shortage = 0; over = 0; }
    return {
      key: positionId || r.id,
      row: r, dept, cols, mode,
      positionId, positionName,
      needDay, needPerShift, needTotal,
      assigned: mine, perShift, counts, assignedIds, assignedTotal: mine.length,
      covered, shortage, over,
      rate: needTotal ? covered / needTotal : null,
      skilled: skilledList.length, skilledSame,
      skilledIds, reserveIds, reserveIdleIds,
      sharedEmpIds, conflictIds,
      unskilledIds,
      status
    };
  }

  function hrNeedAllRows(dateISO) {
    const ctx = hrNeedCtx(dateISO);
    const rows = (state.hrPositionNeeds || []).map(r => hrNeedRowMetrics(r, ctx));
    return { ctx, rows };
  }

  // Tổng hợp (1 bộ phận hoặc toàn bộ) — cộng theo CA, không cộng unique
  function hrNeedTotalsOf(rows, dept) {
    const list = dept ? rows.filter(rm => rm.dept === dept) : rows;
    const t = { need: 0, assigned: 0, covered: 0, shortage: 0, over: 0, positions: list.length, shared: 0, unskilled: 0, reserveIdle: 0, rows: list };
    const shared = new Set(), unskilled = new Set(), reserve = new Set();
    list.forEach(rm => {
      t.need += rm.needTotal;
      t.assigned += rm.assignedTotal;
      t.covered += rm.covered;
      t.shortage += rm.shortage;
      t.over += rm.over;
      rm.sharedEmpIds.forEach(id => shared.add(id));
      rm.unskilledIds.forEach(id => unskilled.add(id));
      rm.reserveIdleIds.forEach(id => reserve.add(id));
    });
    t.shared = shared.size;
    t.unskilled = unskilled.size;
    t.reserveIdle = reserve.size;
    return t;
  }

  // Tổng hợp theo TỪNG bộ phận (cho bong bóng cấp 1)
  function hrNeedDeptSummaries(rows, ctx) {
    return HR_DEPARTMENTS.map(dept => {
      const list = rows.filter(rm => rm.dept === dept);
      const t = hrNeedTotalsOf(list);
      let status = 'empty';
      if (!ctx.hasData) status = 'no-data';
      else if (!list.length) status = 'empty';
      else if (t.shortage > 0) status = 'short';
      else if (t.over > 0) status = 'over';
      else status = 'ok';
      return Object.assign({ dept, status }, t);
    });
  }

  // Nhãn + màu trạng thái dùng chung
  function hrNeedStatusMeta(status) {
    const map = {
      ok:      { label: 'Đủ người', cls: 'is-ok' },
      short:   { label: 'Còn thiếu', cls: 'is-short' },
      over:    { label: 'Dư người', cls: 'is-over' },
      none:    { label: 'Không cần', cls: 'is-none' },
      'no-data': { label: 'Chưa có bố trí', cls: 'is-nodata' },
      empty:   { label: 'Chưa có vị trí', cls: 'is-empty' }
    };
    return map[status] || map.ok;
  }

  // ── RENDER: SƠ ĐỒ 3 CẤP ─────────────────────────────────────────
  // Cấp 1 = bong bóng bộ phận (nước dâng = % độ phủ) → bấm 1 bộ phận thì
  // thu 4 bộ phận còn lại về chùm chấm nhỏ, bong bóng đang chọn co lại bên
  // trái và xòe cấp 2 (thẻ vị trí) + cấp 3 (người + đường nối SVG).
  function hnmToolbarHtml(ui, dateISO) {
    const hasData = hrNeedCtx(dateISO).hasData;
    return `
      <div class="hnm-toolbar">
        <div class="hnm-period">
          <button type="button" class="hnm-btn" data-hnm-day="-1" title="Ngày trước"><i data-lucide="chevron-left"></i></button>
          <input type="date" id="hnm-date" class="hnm-date" value="${escapeHTML(dateISO)}" title="Ngày xem bố trí">
          <button type="button" class="hnm-btn" data-hnm-day="1" title="Ngày sau"><i data-lucide="chevron-right"></i></button>
          <button type="button" class="hnm-btn hnm-today" data-hnm-today title="Về hôm nay">Hôm nay</button>
        </div>
        <label class="hnm-check" title="Chỉ hiện vị trí còn thiếu người">
          <input type="checkbox" id="hnm-only-short" ${ui.onlyShort ? 'checked' : ''}> Chỉ chỗ thiếu
        </label>
        <label class="hnm-check" title="Vẽ đường nét đứt tới các vị trí người dự bị có thể làm">
          <input type="checkbox" id="hnm-skill-links" ${ui.showSkillLinks ? 'checked' : ''}> Đường kỹ năng
        </label>
        <input type="search" id="hnm-search" class="hnm-search" value="${escapeHTML(ui.q || '')}" placeholder="Tìm người / vị trí…">
        <span class="hnm-live ${hasData ? 'is-live' : 'is-nodata'}">
          <i data-lucide="${hasData ? 'radio' : 'cloud-off'}"></i>${hasData ? 'Số liệu sống từ Bảng bố trí' : 'Chưa có bố trí ngày này'}
        </span>
      </div>`;
  }

  function hnmKpiHtml(t, dept) {
    return `
      <span class="hnm-kpi is-need"><i data-lucide="target"></i><b>${t.need}</b><em>suất cần${dept ? '' : ' (toàn bộ)'}</em></span>
      <span class="hnm-kpi is-have"><i data-lucide="user-check"></i><b>${t.assigned}</b><em>đang bố trí</em></span>
      <span class="hnm-kpi ${t.shortage ? 'is-bad' : 'is-ok'}"><i data-lucide="alert-triangle"></i><b>${t.shortage}</b><em>còn thiếu</em></span>
      <span class="hnm-kpi is-shared"><i data-lucide="link-2"></i><b>${t.shared}</b><em>người làm nhiều vị trí</em></span>
      <span class="hnm-kpi is-unskilled"><i data-lucide="user-x"></i><b>${t.unskilled}</b><em>bố trí ngoài kỹ năng</em></span>
      <span class="hnm-kpi is-reserve"><i data-lucide="sprout"></i><b>${t.reserveIdle}</b><em>dự bị rảnh</em></span>`;
  }

  // Bong bóng bộ phận — nước dâng = tỷ lệ phủ (đã bố trí / cần), màu theo trạng thái
  function hnmBubblesHtml(rows, ctx, activeDept) {
    const list = hrNeedDeptSummaries(rows, ctx);
    return list.map(d => {
      const meta = hrNeedStatusMeta(d.status);
      const pct = d.need ? Math.round(d.covered * 100 / d.need) : (d.status === 'empty' ? 0 : 100);
      const size = 76 + Math.min(28, (d.positions || 0) * 4);
      const sub = d.positions ? `${d.positions} vị trí` : 'chưa có vị trí';
      const title = `${d.dept} — cần ${d.need} suất · đang bố trí ${d.assigned} · thiếu ${d.shortage}`
        + (ctx.hasData ? '' : ' · chưa có dữ liệu bố trí ngày này');
      return `<button type="button" class="hnm-bubble ${meta.cls}${d.dept === activeDept ? ' is-on' : ''}"
          data-hnm-dept="${escapeHTML(d.dept)}" style="--fill:${pct}%;--hs:${size}px" title="${escapeHTML(title)}"
          aria-pressed="${d.dept === activeDept ? 'true' : 'false'}">
        <span class="hnm-bubble-fill" aria-hidden="true"></span>
        <span class="hnm-bubble-in">
          <b>${ctx.hasData ? `${d.assigned}/${d.need}` : '—'}</b>
          <i>${escapeHTML(d.dept)}</i>
          <u>${escapeHTML(sub)}${d.shortage ? ` · thiếu ${d.shortage}` : ''}</u>
        </span>
        ${d.shortage ? '<span class="hnm-bubble-dot" aria-hidden="true"></span>' : ''}
      </button>`;
    }).join('');
  }

  // Bong bóng đang chọn (thu nhỏ) + chùm chấm 4 bộ phận còn lại để đổi nhanh
  function hnmFocusHtml(rows, ctx, dept) {
    const sums = hrNeedDeptSummaries(rows, ctx);       // tính 1 lần
    const sum = sums.find(d => d.dept === dept) || { dept, need: 0, assigned: 0, covered: 0, shortage: 0, status: 'empty', positions: 0 };
    const meta = hrNeedStatusMeta(sum.status);
    const pct = sum.need ? Math.round((sum.covered || 0) * 100 / sum.need) : 0;
    const others = sums.filter(d => d.dept !== dept).map(d => {
      const m = hrNeedStatusMeta(d.status);
      return `<button type="button" class="hnm-dot ${m.cls}" data-hnm-dept="${escapeHTML(d.dept)}" title="${escapeHTML(d.dept)} — ${escapeHTML(m.label)}">${escapeHTML(d.dept.slice(0, 2))}</button>`;
    }).join('');
    return `
      <button type="button" class="hnm-back" data-hnm-back title="Quay lại chùm bong bóng bộ phận">
        <i data-lucide="chevron-left"></i> Bộ phận
      </button>
      <div class="hnm-bubble hnm-bubble-sm ${meta.cls} is-on" style="--fill:${pct}%">
        <span class="hnm-bubble-fill" aria-hidden="true"></span>
        <span class="hnm-bubble-in"><b>${sum.assigned}/${sum.need}</b><i>${escapeHTML(dept)}</i><u>${escapeHTML(meta.label)}</u></span>
      </div>
      <div class="hnm-dots">${others}</div>`;
  }

  // Cấp 2 — 1 THẺ VỊ TRÍ (pill) + cấp 3 (chip người) nằm ngay bên phải
  function hnmPosRowHtml(rm, ctx, ui) {
    const meta = hrNeedStatusMeta(rm.status);
    const open = hnmIsPosOpen(ui, rm.key);
    const q = hnmNormQ(ui.q);
    const hitPos = q && hnmNormQ(rm.positionName).includes(q);
    const split = rm.needPerShift.join('+');
    const badge = `${rm.assignedTotal}/${rm.needTotal}`;
    const modeTip = rm.mode === 'each'
      ? 'Đang chia: MỖI CA ĐỦ N (bấm để chuyển sang chia đều)'
      : 'Đang chia: CHIA ĐỀU theo ca (bấm để chuyển sang mỗi ca đủ N)';
    const gauges = rm.needPerShift.map((n, si) => {
      const have = rm.counts[si];
      const w = n > 0 ? Math.min(100, Math.round(have * 100 / n)) : 0;
      const gcls = n <= 0 ? 'is-off' : (have >= n ? 'is-full' : (have ? 'is-part' : 'is-empty'));
      const label = rm.cols > 1 ? `Ca ${si + 1}` : 'Suất';
      return `<span class="hnm-gauge ${gcls}" title="${label}: ${have}/${n} người">
        <span class="hnm-gauge-bar"><i style="width:${w}%"></i></span><em>${label}</em><b>${have}/${n}</b>
      </span>`;
    }).join('');
    const chips = [];
    rm.assigned.forEach(a => chips.push(hnmPersonChipHtml(a, rm, ctx, q)));
    // Ô thiếu: bấm để mở hộp bố trí đúng ca
    rm.needPerShift.forEach((n, si) => {
      for (let k = rm.counts[si]; k < n; k++) {
        chips.push(`<button type="button" class="hnm-slot" data-hnm-add="${escapeHTML(rm.positionId)}" data-shift="${si}"
          title="Thiếu người — bấm để bố trí cho ${rm.cols > 1 ? 'ca ' + (si + 1) : 'vị trí này'}">
          <span>?</span><em>${rm.cols > 1 ? 'Ca ' + (si + 1) : 'Thiếu'}</em></button>`);
      }
    });
    if (!chips.length) {
      chips.push(`<span class="hnm-empty-chip">${ctx.hasData ? 'Chưa bố trí ai' : 'Chưa có dữ liệu bố trí ngày này'}</span>`);
    }
    return `<div class="hnm-pos ${meta.cls}${open ? ' is-open' : ''}${hitPos ? ' is-hit' : ''}" data-hnm-row="${escapeHTML(rm.key)}">
      <div class="hnm-pos-line">
        <button type="button" class="hnm-pos-pill" data-hnm-toggle="${escapeHTML(rm.key)}" aria-expanded="${open ? 'true' : 'false'}"
          title="${escapeHTML(rm.positionName)} — ${escapeHTML(meta.label)}">
          <span class="hnm-pos-ic"><i data-lucide="git-branch"></i></span>
          <span class="hnm-pos-name">${escapeHTML(rm.positionName || '—')}</span>
          <span class="hnm-pos-badge">${badge}</span>
        </button>
        <span class="hnm-pos-tools">
          <label class="hnm-need hnm-edit-only" title="Số suất cần cho CẢ NGÀY (tự chia theo ca)">Cần
            <input type="number" min="0" max="999" step="1" value="${rm.needDay}" data-hnm-need="${escapeHTML(rm.row.id)}">
          </label>
          <span class="hnm-split${rm.cols > 1 ? '' : ' is-off'}" title="Chia theo ca">${rm.cols > 1 ? split : '1 ca'}</span>
          <button type="button" class="hnm-mini hnm-edit-only${rm.mode === 'each' ? ' is-each' : ''}" data-hnm-mode="${escapeHTML(rm.row.id)}" title="${modeTip}">
            <i data-lucide="${rm.mode === 'each' ? 'copy' : 'columns'}"></i>
          </button>
          ${rm.positionId ? `<button type="button" class="hnm-mini hnm-edit-only" data-hnm-add="${escapeHTML(rm.positionId)}" data-shift="0" title="Bố trí người cho vị trí này">
            <i data-lucide="user-plus"></i>
          </button>
          <button type="button" class="hnm-mini" data-hnm-board="${escapeHTML(rm.positionId)}" title="Mở Bảng bố trí đúng ngày/bộ phận">
            <i data-lucide="external-link"></i>
          </button>` : ''}
        </span>
      </div>
      <div class="hnm-pos-detail"${open ? '' : ' hidden'}>
        <div class="hnm-gauges">${gauges}</div>
        <div class="hnm-chips">${chips.join('')}</div>
        <div class="hnm-pos-foot">
          <span class="hnm-foot-item" title="Số người ĐANG LÀM VIỆC có kỹ năng vị trí này (đếm 1 người 1 lần, không phụ thuộc bộ phận)">
            <i data-lucide="award"></i>${rm.skilled} có kỹ năng${rm.skilledSame !== rm.skilled ? ` (${rm.skilledSame} cùng BP)` : ''}
          </span>
          ${rm.sharedEmpIds.length ? `<span class="hnm-foot-item is-shared"><i data-lucide="link-2"></i>${rm.sharedEmpIds.length} làm nhiều vị trí</span>` : ''}
          ${rm.unskilledIds.length ? `<span class="hnm-foot-item is-warn"><i data-lucide="user-x"></i>${rm.unskilledIds.length} ngoài kỹ năng</span>` : ''}
          ${rm.conflictIds.length ? `<span class="hnm-foot-item is-bad"><i data-lucide="alarm-clock"></i>${rm.conflictIds.length} trùng giờ</span>` : ''}
          ${rm.status === 'no-data' ? '<span class="hnm-foot-item is-muted"><i data-lucide="cloud-off"></i>chưa có bố trí</span>' : ''}
        </div>
      </div>
    </div>`;
  }

  // Chip 1 NGƯỜI trong thẻ vị trí (cấp 3) — dùng chung/ngoài kỹ năng/trùng giờ có dấu riêng
  function hnmPersonChipHtml(a, rm, ctx, q) {
    const emp = hrEmpById(a.employeeId);
    const name = emp ? (emp.name || '') : 'Đã xóa';
    const shared = ctx.shared.has(a.employeeId);
    const conflict = ctx.conflict.has(a.id);
    const unskilled = rm.unskilledIds.includes(a.employeeId);
    const hit = q && (hnmNormQ(name).includes(q) || hnmNormQ(emp ? emp.code : '').includes(q));
    const end = ctx.schedule.endById.get(a.id) || '';
    const timeTxt = `${fmtHour(a.start)}${end ? '–' + fmtHour(end) : ' → hết ca'}`;
    const cls = ['hnm-person'];
    if (shared) cls.push('is-shared');
    if (conflict) cls.push('is-conflict');
    if (unskilled) cls.push('is-unskilled');
    if (hit) cls.push('is-hit');
    const tip = `${name}${emp && emp.code ? ' · ' + emp.code : ''} · ${timeTxt}`
      + (shared ? ' · làm nhiều vị trí' : '') + (conflict ? ' · TRÙNG GIỜ với vị trí khác' : '')
      + (unskilled ? ' · bố trí ngoài kỹ năng' : '');
    return `<button type="button" class="${cls.join(' ')}" data-hnm-person="${escapeHTML(a.employeeId)}"
        data-hnm-pos="${escapeHTML(rm.positionId)}" data-hnm-assign="${escapeHTML(a.id)}" title="${escapeHTML(tip)}">
      <b>${escapeHTML(hrShortName(name))}</b><i>${escapeHTML(timeTxt)}</i>
      ${shared ? '<u title="Làm nhiều vị trí">↔</u>' : ''}${conflict ? '<s title="Trùng giờ">!</s>' : ''}
    </button>`;
  }

  function hnmNormQ(s) { return hrStripDiacritics(String(s || '')).toLowerCase().replace(/\s+/g, ' ').trim(); }

  function hnmIsPosOpen(ui, key) {
    if (!Array.isArray(ui.openPos)) return true;         // mặc định mở tất cả
    return ui.openPos.includes(key);
  }

  // Cột phải: NGƯỜI LÀM NHIỀU VỊ TRÍ (+ DỰ BỊ khi bật "Đường kỹ năng")
  function hnmSharedColHtml(rows, ctx, dept, ui) {
    const sharedNodes = [];
    ctx.shared.forEach((posIds, empId) => {
      const mine = rows.filter(rm => rm.assignedIds.includes(empId));
      const inDept = mine.filter(rm => rm.dept === dept);
      if (!inDept.length) return;
      const emp = hrEmpById(empId);
      const list = mine.map(rm => {
        const a = rm.assigned.find(x => x.employeeId === empId);
        const conflict = a && ctx.conflict.has(a.id);
        return `<span class="hnm-node-pos${conflict ? ' is-bad' : ''}" data-hnm-node-pos="${escapeHTML(rm.positionId)}">${escapeHTML(rm.positionName)}${conflict ? ' ⚠' : ''}</span>`;
      }).join('');
      sharedNodes.push(`<div class="hnm-node is-shared" data-hnm-person="${escapeHTML(empId)}" title="${escapeHTML(emp ? emp.name : 'Đã xóa')} — làm ${mine.length} vị trí">
        <b>${escapeHTML(hrShortName(emp ? emp.name : 'Đã xóa'))}</b>
        <span class="hnm-node-pos-list">${list}</span>
      </div>`);
    });
    const reserveNodes = [];
    if (ui.showSkillLinks) {
      const byEmp = new Map();
      rows.filter(rm => rm.dept === dept).forEach(rm => {
        rm.reserveIds.forEach(id => {
          if (!byEmp.has(id)) byEmp.set(id, []);
          byEmp.get(id).push(rm.positionId);
        });
      });
      byEmp.forEach((posIds, empId) => {
        const emp = hrEmpById(empId);
        if (!emp) return;
        reserveNodes.push(`<div class="hnm-node is-reserve" data-hnm-person="${escapeHTML(empId)}" data-hnm-reserve-pos="${escapeHTML(posIds.join(','))}"
          title="${escapeHTML(emp.name)} — có kỹ năng, chưa bố trí ở vị trí này">
          <b>${escapeHTML(hrShortName(emp.name))}</b><em>${posIds.length} kỹ năng</em>
        </div>`);
      });
    }
    if (!sharedNodes.length && !reserveNodes.length) {
      return `<div class="hnm-node-empty">${ctx.hasData ? 'Không có ai làm nhiều vị trí trong ngày này.' : 'Chưa có dữ liệu bố trí.'}</div>`;
    }
    return `
      ${sharedNodes.length ? `<div class="hnm-node-head"><i data-lucide="link-2"></i> Người làm nhiều vị trí <b>${sharedNodes.length}</b></div>${sharedNodes.join('')}` : ''}
      ${reserveNodes.length ? `<div class="hnm-node-head"><i data-lucide="sprout"></i> Dự bị (có kỹ năng) <b>${reserveNodes.length}</b></div>${reserveNodes.join('')}` : ''}`;
  }

  // Danh sách thẻ vị trí (cấp 2) của bộ phận đang chọn
  function hnmPosListHtml(rows, ctx, dept, ui) {
    const q = hnmNormQ(ui.q);
    let list = rows.filter(rm => rm.dept === dept);
    if (ui.onlyShort) list = list.filter(rm => rm.status === 'short');
    if (q) {
      list = list.filter(rm => {
        if (hnmNormQ(rm.positionName).includes(q)) return true;
        if (rm.assigned.some(a => { const e = hrEmpById(a.employeeId); return e && (hnmNormQ(e.name).includes(q) || hnmNormQ(e.code).includes(q)); })) return true;
        return rm.skilledIds.some(id => { const e = hrEmpById(id); return e && hnmNormQ(e.name).includes(q); });
      });
    }
    list = list.slice().sort((a, b) => {
      const w = x => (x.status === 'short' ? 0 : x.status === 'no-data' ? 1 : x.status === 'over' ? 2 : 3);
      return w(a) - w(b) || String(a.positionName).localeCompare(String(b.positionName), 'vi');
    });
    if (!list.length) {
      const deptRows = rows.filter(rm => rm.dept === dept);
      const msg = !deptRows.length
        ? `Bộ phận <b>${escapeHTML(dept)}</b> chưa có vị trí nào.`
        : (ui.onlyShort ? 'Không có vị trí nào đang thiếu người 🎉' : 'Không tìm thấy vị trí / người khớp từ khóa.');
      return `<div class="hnm-empty">
        <i data-lucide="git-branch"></i><p>${msg}</p>
        ${!deptRows.length ? `<button type="button" class="btn btn-outline btn-sm" data-hnm-addpos="${escapeHTML(dept)}" data-perm="hr"><i data-lucide="plus"></i> Thêm vị trí</button>` : ''}
      </div>`;
    }
    return list.map(rm => hnmPosRowHtml(rm, ctx, ui)).join('');
  }

  // BẢNG CHI TIẾT (thu gọn) — vẫn cho sửa "Cần", xem ghi chú, sửa/xóa dòng
  function renderHrNeedTable(rows, dept) {
    const tbody = document.getElementById('hr-posneed-body');
    if (!tbody) return;
    const list = (dept ? rows.filter(rm => rm.dept === dept) : rows).slice().sort((a, b) =>
      HR_DEPARTMENTS.indexOf(a.dept) - HR_DEPARTMENTS.indexOf(b.dept) ||
      String(a.positionName).localeCompare(String(b.positionName), 'vi'));
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="padding:22px;color:var(--text-muted);">
        <i data-lucide="target" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có vị trí nào — thêm Vị Trí Làm Việc ở thẻ <b>"Vị Trí &amp; Kỹ Năng"</b>, dòng sẽ tự động xuất hiện. Có thể bấm "Thêm Vị Trí Cần" để tạo dòng thủ công.</p></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(rm => {
      const meta = hrNeedStatusMeta(rm.status);
      const sharedNames = rm.sharedEmpIds.map(id => (hrEmpById(id) || {}).name || '').filter(Boolean).join(', ');
      const shiftTxt = rm.cols > 1
        ? rm.counts.map((c, i) => `Ca ${i + 1}: ${c}/${rm.needPerShift[i]}`).join(' · ')
        : `${rm.counts[0]}/${rm.needPerShift[0]}`;
      return `<tr class="${rm.status === 'short' ? 'is-short-row' : ''}">
        <td>${escapeHTML(rm.dept || '—')}</td>
        <td><strong>${escapeHTML(rm.positionName || '—')}</strong>
          <span class="hnm-status ${meta.cls}">${escapeHTML(meta.label)}</span></td>
        <td><input type="number" min="0" max="999" class="form-input" style="width:74px;padding:3px 6px;" value="${rm.needDay}"
          onchange="app.hrSetPositionNeedQty('${rm.row.id}','needQty',this.value)" title="Số suất cần cho CẢ NGÀY (tự chia theo ca)"></td>
        <td><span class="hnm-split${rm.cols > 1 ? '' : ' is-off'}">${rm.cols > 1 ? rm.needPerShift.join('+') : '1 ca'}</span></td>
        <td>${rm.skilled}${rm.skilledSame !== rm.skilled ? ` <small class="hnm-muted">(${rm.skilledSame} cùng BP)</small>` : ''}</td>
        <td>${rm.assignedTotal} <small class="hnm-muted">${escapeHTML(shiftTxt)}</small></td>
        <td>${rm.sharedEmpIds.length ? `<span class="hnm-shared-tag" title="${escapeHTML(sharedNames)}">↔ ${rm.sharedEmpIds.length}</span>` : '<span class="hnm-muted">—</span>'}</td>
        <td><strong style="color:${rm.shortage > 0 ? 'var(--danger)' : (rm.status === 'no-data' ? 'var(--text-muted)' : '#16a34a')};">${rm.status === 'no-data' ? '—' : rm.shortage}</strong></td>
        <td class="hr-notes" title="${escapeHTML(rm.row.notes || '')}">${escapeHTML(rm.row.notes || '—')}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrEditPositionNeed('${rm.row.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrDeletePositionNeed('${rm.row.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ĐIỂM RENDER DUY NHẤT của thẻ (gọi trong renderPositionNeedsTable)
  function renderHrNeedCard() {
    const ui = hrNeedReadUi();
    const dateISO = hrNeedDateISO();
    const { ctx, rows } = hrNeedAllRows(dateISO);
    const dept = HR_DEPARTMENTS.includes(ui.dept) ? ui.dept : '';
    const totals = hrNeedTotalsOf(rows, dept);
    const countEl = document.getElementById('hr-posneed-count');
    if (countEl) {
      if (!ctx.hasData) {
        countEl.textContent = `${dept || 'Tất cả bộ phận'} · ${fmtDateDMY(dateISO)} — chưa có dữ liệu bố trí ngày này`;
      } else {
        countEl.textContent = `${dept || 'Tất cả bộ phận'} · ${fmtDateDMY(dateISO)} — cần ${totals.need} suất · đang bố trí ${totals.assigned} · còn thiếu ${totals.shortage}`
          + ` · ${totals.shared} người làm nhiều vị trí (${totals.positions} vị trí)`;
      }
    }
    const tb = document.getElementById('hnm-toolbar');
    if (tb) tb.innerHTML = hnmToolbarHtml(ui, dateISO);
    const wrap = document.getElementById('hr-need-map');
    if (wrap) {
      wrap.dataset.dept = dept;
      const kpi = document.getElementById('hnm-kpi');
      if (kpi) kpi.innerHTML = hnmKpiHtml(totals, dept);
      const bub = document.getElementById('hnm-dept-bubbles');
      if (bub) bub.innerHTML = hnmBubblesHtml(rows, ctx, dept);
      const focus = document.getElementById('hnm-focus');
      if (focus) focus.innerHTML = dept ? hnmFocusHtml(rows, ctx, dept) : '';
      const posCol = document.getElementById('hnm-pos-col');
      if (posCol) posCol.innerHTML = dept ? hnmPosListHtml(rows, ctx, dept, ui) : '';
      const sharedCol = document.getElementById('hnm-shared-col');
      if (sharedCol) sharedCol.innerHTML = dept ? hnmSharedColHtml(rows, ctx, dept, ui) : '';
      const legend = document.getElementById('hnm-legend');
      if (legend) {
        legend.innerHTML = dept ? `
          <span class="hnm-lg is-ok">Đủ người</span>
          <span class="hnm-lg is-short">Thiếu</span>
          <span class="hnm-lg is-over">Dư</span>
          <span class="hnm-lg is-nodata">Chưa có bố trí</span>
          <span class="hnm-lg-note">Thanh = suất theo ca · chip ↔ = người làm nhiều vị trí · nét đứt = đường kỹ năng · bấm chip để tô sáng người đó</span>` : '';
      }
      // Đường nối vẽ SAU khi trình duyệt bố cục xong
      const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : (cb => setTimeout(cb, 0));
      raf(() => hnmDrawLinks());
    }
    renderHrNeedTable(rows, dept);
    hrScheduleIcons();
  }

  // ── TƯƠNG TÁC SƠ ĐỒ 3 CẤP ──────────────────────────────────────
  function hnmSelectDept(dept) {
    if (!HR_DEPARTMENTS.includes(dept)) return;
    hrNeedWriteUi({ dept, q: '' });
    renderHrNeedCard();
    updateHrCardGrid();
  }
  function hnmBack() {
    hrNeedWriteUi({ dept: '' });
    renderHrNeedCard();
    updateHrCardGrid();
  }
  function hnmSetDate(d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) return;
    hrNeedWriteUi({ date: d });
    renderHrNeedCard();
  }
  function hnmShiftDay(days) { hnmSetDate(hrShiftDateISO(hrNeedDateISO(), Number(days) || 0)); }
  function hnmToday() { hnmSetDate(hrTodayISO()); }
  function hnmSetSearch(val) { hrNeedWriteUi({ q: String(val || '') }); renderHrNeedCard(); }
  function hnmSetOnlyShort(on) { hrNeedWriteUi({ onlyShort: !!on }); renderHrNeedCard(); }
  function hnmSetSkillLinks(on) { hrNeedWriteUi({ showSkillLinks: !!on }); renderHrNeedCard(); }
  function hnmTogglePos(key) {
    const ui = hrNeedReadUi();
    const all = (state.hrPositionNeeds || []).map(r => r.positionId || r.id);
    let open = Array.isArray(ui.openPos) ? ui.openPos.slice() : all;
    if (open.includes(key)) open = open.filter(x => x !== key);
    else open.push(key);
    hrNeedWriteUi({ openPos: open });
    renderHrNeedCard();
  }
  function hnmNeedRow(rowId) { return (state.hrPositionNeeds || []).find(r => r.id === rowId) || null; }
  function hnmSetNeed(rowId, val) {
    if (!requireEditPermission()) return;
    const r = hnmNeedRow(rowId);
    if (!r) return;
    const v = Math.max(0, Math.min(999, parseInt(val, 10) || 0));
    if (v === (parseInt(r.needQty, 10) || 0)) return;
    r.needQty = v;
    r.updatedAt = new Date().toISOString();
    saveHrData(['hrPositionNeeds']);
    renderHrNeedCard();
    updateHrCardGrid();
    try { renderHrBoard(); } catch (e) { /* bảng bố trí đang đóng */ }
  }
  function hnmToggleMode(rowId) {
    if (!requireEditPermission()) return;
    const r = hnmNeedRow(rowId);
    if (!r) return;
    r.needMode = hrNeedModeOf(r) === 'each' ? 'even' : 'each';
    r.updatedAt = new Date().toISOString();
    saveHrData(['hrPositionNeeds']);
    renderHrNeedCard();
    updateHrCardGrid();
    try { renderHrBoard(); } catch (e) { /* bảng bố trí đang đóng */ }
  }
  // Mở Bảng bố trí đúng NGÀY + BỘ PHẬN của vị trí (bấm từ pill)
  function hnmOpenBoard(posId) {
    const pos = posId ? hrPosById(posId) : null;
    state.hrBoardDate = hrNeedDateISO();
    if (pos && pos.department) state.hrBoardDept = hrDeptAliasOf(pos.department);
    else if (HR_DEPARTMENTS.includes(hrNeedReadUi().dept)) state.hrBoardDept = hrNeedReadUi().dept;
    revealHrBoardInline();
  }
  function hnmOpenAssign(posId, shiftIdx) {
    if (!requireEditPermission()) return;
    const pos = posId ? hrPosById(posId) : null;
    state.hrBoardDate = hrNeedDateISO();
    if (pos && pos.department) state.hrBoardDept = hrDeptAliasOf(pos.department);
    else if (HR_DEPARTMENTS.includes(hrNeedReadUi().dept)) state.hrBoardDept = hrNeedReadUi().dept;
    try { renderHrBoard(); } catch (e) {}
    try { hrBoardOpenAssign(posId, Number(shiftIdx) || 0, ''); } catch (e) {}
  }
  function hnmAddPosition(dept) {
    if (!requireEditPermission()) return;
    try { openPositionModal(); } catch (e) { return; }
    const sel = document.getElementById('position-department');
    if (sel && dept) sel.value = dept;
  }

  // Bấm 1 người → tô sáng MỌI chip/node của người đó (thấy ngay ai làm nhiều vị trí)
  function hnmHotPerson(empId) {
    if (!empId || !document.querySelectorAll) return;
    const nodes = Array.from(document.querySelectorAll('[data-hnm-person]'));
    const anyHot = nodes.some(el => el.classList && el.classList.contains('is-hot'));
    const same = nodes.some(el => el.classList && el.classList.contains('is-hot') && el.getAttribute('data-hnm-person') === empId);
    const on = !(anyHot && same);            // bấm lại đúng người đang tô = bỏ tô
    nodes.forEach(el => {
      if (!el.classList) return;
      el.classList.toggle('is-hot', on && el.getAttribute('data-hnm-person') === empId);
    });
    if (document.querySelectorAll) {
      Array.from(document.querySelectorAll('.hnm-pos')).forEach(el => { if (el.classList) el.classList.remove('is-hot-pos'); });
    }
    if (on) {
      nodes.forEach(el => {
        if (!el.classList || el.getAttribute('data-hnm-person') !== empId) return;
        const rowEl = el.closest ? el.closest('.hnm-pos') : null;
        if (rowEl && rowEl.classList) rowEl.classList.add('is-hot-pos');
      });
    }
    hnmDrawLinks();
  }

  // NỐI ĐƯỜNG (SVG): pill ↔ node "người làm nhiều vị trí" + nét đứt tới "dự bị"
  function hnmDrawLinks() {
    const svg = document.getElementById('hnm-links');
    if (!svg || !document.querySelector) return;
    const stage = document.querySelector('.hnm-stage');
    if (!stage || typeof stage.getBoundingClientRect !== 'function') return;
    let base = null;
    try { base = stage.getBoundingClientRect(); } catch (e) { base = null; }
    if (!base || !base.width) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', `0 0 ${Math.round(base.width)} ${Math.round(base.height)}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const rectOf = el => { try { return el.getBoundingClientRect(); } catch (e) { return null; } };
    const pillOf = pid => document.querySelector(`.hnm-pos[data-hnm-row="${pid}"] .hnm-pos-pill`);
    const draw = (from, to, cls) => {
      if (!from || !to) return;
      const a = rectOf(from), b = rectOf(to);
      if (!a || !b) return;
      if (typeof document.createElementNS !== 'function') return;
      const x1 = a.right - base.left, y1 = a.top - base.top + a.height / 2;
      const x2 = b.left - base.left, y2 = b.top - base.top + b.height / 2;
      const dx = Math.max(24, Math.abs(x2 - x1) * 0.45);
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
      p.setAttribute('class', 'hnm-link ' + (cls || ''));
      svg.appendChild(p);
    };
    // 1) người làm nhiều vị trí: nối tới TỪNG thẻ vị trí của họ
    Array.from(document.querySelectorAll('.hnm-node.is-shared')).forEach(node => {
      Array.from(node.querySelectorAll('[data-hnm-node-pos]')).forEach(tag => {
        draw(pillOf(tag.getAttribute('data-hnm-node-pos')), node, 'is-shared');
      });
    });
    // 2) dự bị: nét đứt tới các vị trí họ có kỹ năng
    Array.from(document.querySelectorAll('.hnm-node.is-reserve')).forEach(node => {
      String(node.getAttribute('data-hnm-reserve-pos') || '').split(',').filter(Boolean).forEach(pid => {
        draw(pillOf(pid), node, 'is-skill');
      });
    });
  }

  function openPositionNeedModal(id) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-position-need');
    const form = document.getElementById('position-need-form');
    if (!modal || !form) return;
    form.reset();
    const deptSel = document.getElementById('posneed-department');
    if (deptSel) deptSel.innerHTML = hrDeptOptions();
    const titleEl = document.getElementById('posneed-modal-title');

    if (id) {
      const r = (state.hrPositionNeeds || []).find(x => x.id === id);
      if (!r) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Vị Trí Cần: ${escapeHTML(r.position || '')}`;
      document.getElementById('posneed-id').value = r.id;
      document.getElementById('posneed-department').value = hrDeptAliasOf(r.department) || HR_DEPARTMENTS[0];
      fillPosNeedPositionSelect(r.positionId, r.position);
      document.getElementById('posneed-need').value = r.needQty || 1;
      const modeEl = document.getElementById('posneed-mode');
      if (modeEl) modeEl.value = hrNeedModeOf(r);
      document.getElementById('posneed-have').value = r.haveQty || 0;
      document.getElementById('posneed-notes').value = r.notes || '';
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="target"></i> Thêm Vị Trí Cần Nhân Sự`;
      document.getElementById('posneed-id').value = '';
      fillPosNeedPositionSelect();
      document.getElementById('posneed-need').value = 1;
      const modeEl = document.getElementById('posneed-mode');
      if (modeEl) modeEl.value = 'even';
      document.getElementById('posneed-have').value = 0;
    }
    modal.classList.add('show');
    hrScheduleIcons();
  }

  // Điền select Vị Trí trong modal (lọc theo bộ phận đang chọn; vị trí
  // "chung" không gán bộ phận luôn hiển thị). Giữ lại tên vị trí cũ nếu
  // không còn trong danh mục (dòng dữ liệu cũ vẫn sửa được).
  function fillPosNeedPositionSelect(positionId, keepName) {
    const sel = document.getElementById('posneed-position');
    if (!sel) return;
    const dept = document.getElementById('posneed-department')?.value || '';
    const opts = (state.hrPositions || [])
      .filter(p => !dept || !p.department || hrDeptAliasOf(p.department) === dept)
      .map(p => `<option value="${escapeHTML(p.name)}" data-pos-id="${escapeHTML(p.id)}">${escapeHTML(p.name)}${p.department ? ' — ' + escapeHTML(p.department) : ''}</option>`).join('');
    sel.innerHTML = '<option value="">— Chọn vị trí —</option>' + opts +
      (keepName && !(state.hrPositions || []).some(p => p.name === keepName)
        ? `<option value="${escapeHTML(keepName)}">${escapeHTML(keepName)} (không còn trong danh mục)</option>` : '');
    if (keepName) sel.value = keepName; else if (positionId) {
      const p = (state.hrPositions || []).find(x => x.id === positionId);
      if (p) sel.value = p.name;
    }
  }

  function closePositionNeedModal() {
    document.getElementById('modal-position-need')?.classList.remove('show');
  }

  function handlePositionNeedSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const id = document.getElementById('posneed-id').value;
    const position = document.getElementById('posneed-position').value.trim();
    const department = hrDeptAliasOf(document.getElementById('posneed-department').value);
    const needQty = parseInt(document.getElementById('posneed-need').value) || 0;
    const needModeEl = document.getElementById('posneed-mode');
    const needMode = needModeEl && needModeEl.value === 'each' ? 'each' : 'even';
    if (!position) { showToast('Vị trí không được để trống!', 'error'); return; }
    // Trùng (bộ phận + vị trí): yêu cầu sửa dòng có sẵn thay vì tạo dòng trùng lặp
    const dup = (state.hrPositionNeeds || []).find(r =>
      r.id !== id && hrDeptAliasOf(r.department) === department && (r.position || '').trim() === position);
    if (dup) { showToast(`Vị trí "${position}" của bộ phận ${department} đã có trong bảng — sửa dòng đã có nhé!`, 'error'); return; }
    if (needQty <= 0) { showToast('Số người cần phải lớn hơn 0!', 'error'); return; }
    const posDef = (state.hrPositions || []).find(p => p.name === position);
    const data = {
      id: id || `posneed-${Date.now()}`,
      department,
      position,
      positionId: posDef ? posDef.id : '',
      needQty,
      needMode,
      haveQty: parseInt(document.getElementById('posneed-have').value) || 0,
      notes: document.getElementById('posneed-notes').value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (id) {
      const idx = state.hrPositionNeeds.findIndex(x => x.id === id);
      if (idx !== -1) state.hrPositionNeeds[idx] = { ...state.hrPositionNeeds[idx], ...data };
      showToast(`Đã cập nhật "${position}" (${department})!`, 'success');
    } else {
      data.createdAt = new Date().toISOString();
      state.hrPositionNeeds.push(data);
      showToast(`Đã thêm "${position}" (${department})!`, 'success');
    }
    saveHrData();
    closePositionNeedModal();
    renderHrView();
  }

  function deletePositionNeed(id) {
    if (!requireEditPermission()) return;
    trackDeleted('hrPositionNeeds', id);
    state.hrPositionNeeds = (state.hrPositionNeeds || []).filter(r => r.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa dòng "Nhân sự cần tại vị trí" (vị trí sẽ không tự nạp lại)', 'info');
  }

  // ── TỰ ĐỘNG NẠP VỊ TRÍ VÀO BẢNG TRUNG GIAN ──────────────────────
  // Mỗi vị trí trong danh mục (hrPositions) được bảo đảm có 1 dòng trong
  // bảng "Nhân sự cần tại các vị trí": gọi khi mở tab (nạp lần đầu / vị trí
  // mới) và khi thêm vị trí mới trong thẻ "Vị Trí & Kỹ Năng". Dòng dùng id
  // ổn định `posneed-pos-<vị trí id>` — nếu người dùng XÓA dòng đó, dấu vết
  // xóa (tombstone) giữ cho vị trí không được nạp lại. Số người hiện có
  // mặc định được đếm tự động từ hồ sơ; số người cần = 1 (chỉnh sửa tay).
  function posNeedIdForPosition(posId) { return `posneed-pos-${posId}`; }

  function ensurePositionNeedsFromPositions() {
    const positions = state.hrPositions || [];
    if (!positions.length) return false;
    const have = new Set((state.hrPositionNeeds || []).map(r => r.id));
    // Đã có dòng (nhập tay hoặc tự nạp) cho vị trí này ⇒ KHÔNG nạp thêm dòng trùng
    const havePos = new Set((state.hrPositionNeeds || []).map(r => r.positionId).filter(Boolean));
    const dead = (state.deletedIds && state.deletedIds.hrPositionNeeds) || {};
    let added = false;
    positions.forEach(p => {
      const id = posNeedIdForPosition(p.id);
      if (have.has(id) || havePos.has(p.id) || dead[id]) return;
      state.hrPositionNeeds = state.hrPositionNeeds || [];
      state.hrPositionNeeds.push({
        id,
        department: hrDeptAliasOf(p.department) || 'Chung',
        position: p.name,
        positionId: p.id,
        needQty: 1,
        haveQty: hrCountEmployeesAtPosition(p.department || '', p.id, p.name),
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        autoFrom: 'hrPositions' // nguồn dữ liệu (bảng khác) — dùng cho chức năng sắp bổ sung
      });
      added = true;
    });
    if (added) {
      saveHrData(['hrPositionNeeds']);
      updateHrCardGrid();
    }
    return added;
  }

  // CHỈNH SỬA TAY từng ô "Số người cần" / "Số người hiện có" ngay trên bảng
  function hrSetPositionNeedQty(id, field, rawVal) {
    if (!requireEditPermission()) return;
    const r = (state.hrPositionNeeds || []).find(x => x.id === id);
    if (!r || (field !== 'needQty' && field !== 'haveQty')) return;
    const v = Math.max(0, parseInt(rawVal, 10) || 0);
    r[field] = v;
    r.updatedAt = new Date().toISOString();
    saveHrData();
    renderHrView();
  }

  // LẤY DỮ LIỆU TỪ BẢNG KHÁC: cập nhật "Số người hiện có" của mọi dòng
  // bằng cách đếm từ danh sách nhân viên (trạng thái "Đang làm việc").
  function syncPositionNeedsFromEmployees() {
    if (!requireEditPermission()) return;
    const list = state.hrPositionNeeds || [];
    if (!list.length) { showToast('Chưa có dòng nào để đồng bộ.', 'info'); return; }
    list.forEach(r => { r.haveQty = hrCountEmployeesAtPosition(r.department, r.positionId, r.position); r.updatedAt = new Date().toISOString(); });
    saveHrData();
    renderHrView();
    showToast(`Đã đồng bộ số người hiện có cho ${list.length} dòng từ hồ sơ nhân viên.`, 'success');
  }

  // Đếm số nhân viên ĐANG LÀM VIỆC tại 1 vị trí của 1 bộ phận:
  //   - ưu tiên khớp kỹ năng (skills chứa positionId), nếu không có
  //     positionId thì khớp theo tên vị trí trong hồ sơ nhân viên.
  function hrCountEmployeesAtPosition(department, positionId, positionName) {
    const dept = hrDeptAliasOf(department);
    return (state.hrEmployees || []).filter(e => {
      if ((e.status || 'active') !== 'active') return false;
      if (dept && hrDeptAliasOf(e.department) !== dept) return false;
      if (positionId && Array.isArray(e.skills) && e.skills.includes(positionId)) return true;
      return positionName && (e.position || '').trim() === positionName.trim();
    }).length;
  }



  // ─── 9) BỐ TRÍ VỊ TRÍ THEO NGÀY — BẢNG ĐIỀU KHIỂN TRỰC QUAN ──────
  // Cột Y = số người (ô xếp chồng theo "Số Người Cần" của bảng trung gian),
  // cột X = các vị trí, mỗi bộ phận hiển thị riêng (mặc định Xưởng 2).
  // Ô trống = "?" màu xám; ô đã gán người = xanh + tên rút gọn (Hà Văn Chiến
  // → H.V.Chiến) + giờ làm. Bộ phận "Hành chính" hiển thị 1 cột/vị trí,
  // "Làm ca" hiển thị 2 cột (Ca ngày / Ca đêm — chỉnh trong Cài Đặt Ca).
  // Dữ liệu giờ (hrAssignments) là nguồn cho bảng chấm công: công thường + tăng ca.
  const BOARD_SHIFT_PRESETS = {
    hanhchinh: { type: 'hanhchinh', shifts: [
      { name: 'Sáng',  start: '07:00', end: '11:30' },
      { name: 'Chiều', start: '13:00', end: '17:30' }
    ] },
    // brk = số GIỜ NGHỈ của ca (CHỈ chế độ Làm ca) — TRỪ VÀO GIỮA CA
    // (20/10/2026: trước đây trừ ở cuối ca nên người làm nửa ngày bị trừ oan):
    // cửa sổ nghỉ = [bắt đầu + (dài ca − nghỉ)/2 , + nghỉ]; giờ nghỉ KHÔNG
    // tính vào HC lẫn TC (xem hrSplitHoursHC). Sửa được trong Cài Đặt Ca.
    lamca: { type: 'lamca', shifts: [
      { name: 'Ca ngày', start: '07:00', end: '19:00', brk: 1.5 },
      { name: 'Ca đêm',  start: '19:00', end: '07:00', brk: 1 }
    ] }
  };

  // Cấu hình ca của 1 bộ phận (mặc định Hành chính cho mọi bộ phận)
  function hrShiftCfg(dept) {
    return (state.hrShifts || []).find(s => s.id === dept) || { id: dept, type: 'hanhchinh', shifts: BOARD_SHIFT_PRESETS.hanhchinh.shifts };
  }
  // Số GIỜ NGHỈ của 1 ca (chỉ chế độ Làm ca; Hành chính = 0 vì nghỉ trưa nằm
  // giữa 2 buổi, đã tự loại). Cấu hình CŨ chưa khai `brk` → mặc định ca 1 =
  // 1h30 (bằng nghỉ trưa hành chính 11:30–13:00), các ca sau = 1h.
  function hrShiftBrkH(cfg, shiftIdx) {
    if (!cfg || cfg.type !== 'lamca') return 0;
    const idx = Number(shiftIdx) || 0;
    const sh = cfg.shifts[idx] || cfg.shifts[0];
    if (!sh) return 0;
    const raw = sh.brk;
    if (raw === '' || raw == null) return idx === 0 ? 1.5 : 1;
    const v = Number(raw);
    return (Number.isFinite(v) && v > 0) ? v : 0;
  }
  // Tên rút gọn "Hà Văn Chiến" → "H.V.Chiến" (chữ cuối nguyên vẹn, các chữ đầu lấy nguyên âm đầu)
  function hrShortName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return parts[0] || '';
    const cap = w => (w[0] || '').toUpperCase() + (w.length > 1 ? w.slice(1) : '');
    return parts.slice(0, -1).map(w => cap(w[0]) + '.').join('') + cap(parts[parts.length - 1]);
  }
  // '07:00' → '7h00' (hiển thị trên board & chấm công)
  function fmtHour(t) {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? `${+m[1]}h${m[2]}` : (t || '—');
  }
  // Danh sách mốc giờ 30 phút (05:00 → 23:30) cho select giờ bắt đầu/kết thúc
  function hrHalfHourOptions() {
    const out = [];
    for (let h = 5; h <= 23; h++) { out.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`); }
    return out;
  }
  // Khoảng giờ làm của 1 cột (shift) trong ngày: hành chính gộp Sáng+Chiều.
  //  • Ca đêm (giờ ra <= giờ vào) tự hiểu là VẮT QUA NỬA ĐÊM → endMin = end + 1440
  //  • startMin/endMin = mốc phút ĐÃ CHUẨN HOÁ (nguồn duy nhất để tính giờ —
  //    xem hrSplitHoursHC + handleBoardAssignSubmit)
  //  • brkH = số giờ NGHỈ của ca (0 với Hành chính) — trừ GIỮA CA
  function hrShiftRange(cfg, shiftIdx) {
    const toM = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
    if (!cfg.shifts.length) return { start: '07:00', end: '17:30', label: 'Hành chính', brkH: 0, startMin: 420, endMin: 1050 };
    if (cfg.type === 'hanhchinh') {
      const last = cfg.shifts[cfg.shifts.length - 1];
      return { start: cfg.shifts[0].start, end: last.end, label: 'Hành chính', brkH: 0, startMin: toM(cfg.shifts[0].start), endMin: toM(last.end) };
    }
    const idx = Number(shiftIdx) || 0;
    const s = cfg.shifts[idx] || cfg.shifts[0];
    const startMin = toM(s.start);
    let endMin = toM(s.end);
    if (!endMin || endMin <= startMin) endMin += 1440;   // ca đêm vắt qua nửa đêm
    return { start: s.start, end: s.end, label: s.name, brkH: hrShiftBrkH(cfg, idx), startMin, endMin };
  }
  const HR_ASSIGN_END_BASE = '_hrEndBase';

  function hrAssignmentStartMin(a) {
    const cfg = hrShiftCfg(a.department || hrEmpDept(a.employeeId));
    const range = hrShiftRange(cfg, a.shiftIdx || 0);
    const start = toMinT(a.start);
    return range.endMin > 1440 && start < range.startMin ? start + 1440 : start;
  }

  function hrAssignmentInterval(a, endValue) {
    const cfg = hrShiftCfg(a.department || hrEmpDept(a.employeeId));
    const range = hrShiftRange(cfg, a.shiftIdx || 0);
    const startMin = hrAssignmentStartMin(a);
    const rawEnd = endValue !== undefined
      ? endValue
      : (Object.prototype.hasOwnProperty.call(a, HR_ASSIGN_END_BASE) ? a[HR_ASSIGN_END_BASE] : a.end);
    if (!rawEnd) {
      return { startMin, endMin: range.endMin > startMin ? range.endMin : startMin };
    }
    let endMin = toMinT(rawEnd);
    if (range.endMin > 1440 && endMin < range.startMin) endMin += 1440;
    if (endMin < startMin || endMin === startMin) endMin += 1440;
    return { startMin, endMin };
  }

  function hrAssignmentBaseEnd(a, next) {
    if (Object.prototype.hasOwnProperty.call(a, HR_ASSIGN_END_BASE)) return a[HR_ASSIGN_END_BASE] || '';
    // Older versions replaced an implicit end-of-shift with the next start.
    if (next && hrAssignmentStartMin(next) > hrAssignmentStartMin(a) && a.end === next.start) return '';
    return a.end || '';
  }

  function hrAssignmentScheduleOf(assignments) {
    const groups = new Map();
    (assignments || []).forEach(a => {
      if (!a || !a.employeeId || !a.date) return;
      const key = `${a.date}|${a.employeeId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    });
    const endById = new Map();
    const nextById = new Map();
    const intervals = new Map();
    const conflictIds = new Set();
    const conflictPairs = [];
    groups.forEach(items => {
      items.sort((a, b) => hrAssignmentStartMin(a) - hrAssignmentStartMin(b) || String(a.id).localeCompare(String(b.id)));
      items.forEach((a, i) => {
        const next = items[i + 1];
        const startMin = hrAssignmentStartMin(a);
        const nextStartMin = next ? hrAssignmentStartMin(next) : startMin;
        const end = next && nextStartMin > startMin ? next.start : hrAssignmentBaseEnd(a, next);
        nextById.set(a.id, next || null);
        endById.set(a.id, end || '');
        intervals.set(a.id, hrAssignmentInterval(a, end));
      });
      for (let i = 0; i < items.length; i++) {
        const first = items[i];
        const firstTime = intervals.get(first.id);
        for (let j = i + 1; j < items.length; j++) {
          const second = items[j];
          const secondTime = intervals.get(second.id);
          const sameStart = firstTime.startMin === secondTime.startMin;
          const overlap = firstTime.startMin < secondTime.endMin && secondTime.startMin < firstTime.endMin;
          if (sameStart || overlap) {
            conflictIds.add(first.id);
            conflictIds.add(second.id);
            conflictPairs.push([first, second]);
          }
        }
      }
    });
    return { endById, nextById, intervals, conflictIds, conflictPairs };
  }

  function hrReconcileAssignmentGroup(items) {
    items.sort((a, b) => hrAssignmentStartMin(a) - hrAssignmentStartMin(b) || String(a.id).localeCompare(String(b.id)));
    let changed = false;
    items.forEach((a, i) => {
      const next = items[i + 1];
      let itemChanged = false;
      if (next && hrAssignmentStartMin(next) > hrAssignmentStartMin(a)) {
        if (!Object.prototype.hasOwnProperty.call(a, HR_ASSIGN_END_BASE)) {
          a[HR_ASSIGN_END_BASE] = a.end === next.start ? '' : (a.end || '');
          changed = true;
          itemChanged = true;
        }
        if (a.end !== next.start) {
          a.end = next.start;
          changed = true;
          itemChanged = true;
        }
        if (itemChanged) a.updatedAt = new Date().toISOString();
      } else if (Object.prototype.hasOwnProperty.call(a, HR_ASSIGN_END_BASE)) {
        const restoredEnd = a[HR_ASSIGN_END_BASE] || '';
        if (a.end !== restoredEnd) {
          a.end = restoredEnd;
          changed = true;
          itemChanged = true;
        }
        delete a[HR_ASSIGN_END_BASE];
        changed = true;
        itemChanged = true;
        if (itemChanged) a.updatedAt = new Date().toISOString();
      }
    });
    return changed;
  }

  function hrReconcileAssignmentEnds(assignments, employeeId, date) {
    const items = (assignments || []).filter(a => a && a.employeeId === employeeId && a.date === date);
    return hrReconcileAssignmentGroup(items);
  }

  function hrReconcileAllAssignmentEnds() {
    const groups = new Map();
    (state.hrAssignments || []).forEach(a => {
      if (!a || !a.employeeId || !a.date) return;
      const key = `${a.employeeId}|${a.date}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    });
    let changed = false;
    groups.forEach(items => {
      if (hrReconcileAssignmentGroup(items)) changed = true;
    });
    return changed;
  }

  function hrCommitAssignmentProposal(current, proposed) {
    const currentById = new Map((current || []).map(a => [a.id, a]));
    return (proposed || []).map(next => {
      const existing = currentById.get(next.id);
      if (!existing) return next;
      Object.keys(existing).forEach(key => {
        if (!Object.prototype.hasOwnProperty.call(next, key)) delete existing[key];
      });
      Object.assign(existing, next);
      return existing;
    });
  }

  function hrSplitAssignmentHoursDate(a, date, schedule) {
    const interval = schedule?.intervals.get(a.id) || hrAssignmentInterval(a, schedule?.endById.get(a.id));
    if (interval.endMin <= interval.startMin) return { hc: 0, tc: 0 };
    const r = hrSplitHoursHCMin(a.department || hrEmpDept(a.employeeId), interval.startMin, interval.endMin, a.shiftIdx || 0);
    if (date && hrIsRestDay(date) && r.hc > 0) return { hc: 0, tc: r.hc + r.tc };
    return r;
  }

  // Các bản ghi gán người của 1 ngày (tùy chọn lọc vị trí)
  // → đã chuyển sang CHỈ MỤC Map ở đầu file (hrAssignmentsOf — tránh quét
  //   toàn bộ state.hrAssignments mỗi lần vẽ bảng chấm công).
  // Giờ làm của 1 nhân viên trong ngày (từ board) — nguồn cho chấm công/tăng ca:
  // [{ position, positionId, start, end, shiftLabel }] đã sắp theo giờ bắt đầu
  function hrAssignTimesOf(employeeId, date) {
    const assignments = hrAssignmentsOf(date).filter(a => a.employeeId === employeeId);
    const schedule = hrAssignmentScheduleOf(assignments);
    return assignments.slice().sort((a, b) => hrAssignmentStartMin(a) - hrAssignmentStartMin(b))
      .map(a => ({ position: hrPosName(a.positionId), positionId: a.positionId, start: a.start, end: schedule.endById.get(a.id) || '', shiftLabel: a.shiftLabel || '' }));
  }

  // '540' phút -> '9h' / '390' -> '6h30'
  function fmtHm(min) {
    min = Math.max(0, Math.round(min));
    const h = Math.floor(min / 60), m = min % 60;
    return `${h}h${m ? String(m).padStart(2, '0') : ''}`;
  }

  // Tách giờ làm việc thành HC (hành chính) và TC (tăng ca) theo quy tắc:
  //  • HC  = phần làm việc NẰM TRONG giờ ca chuẩn của bộ phận (theo Cài Đặt
  //    Ca). Hành chính 07:00–17:30 có 1h30 nghỉ trưa 11:30–13:00 — nghỉ trưa
  //    KHÔNG tính vào HC lẫn TC → làm đủ ngày = 9h HC.
  //  • TC  = chỉ tính phần NGOÀI giờ ca chuẩn (trước giờ vào / sau giờ ra,
  //    VD làm đến 18h00 → 9h HC + 0h30 TC). Làm ca: ngoài khung ca đã chọn.
  //  • CA ĐÊM (giờ ra <= giờ vào) tự động tính sang ngày hôm sau.
  //  • GIỜ RA TRỐNG = làm đến HẾT CA (kể cả ca đêm) — KHÔNG còn đoán 8h.
  //  • NGHỈ (chế độ Làm ca — ô "Nghỉ (giờ)" ở Cài Đặt Ca) TRỪ VÀO GIỮA CA:
  //    cửa sổ nghỉ = [bắt đầu + (dài ca − nghỉ)/2 , + nghỉ]; phần nghỉ KHÔNG
  //    vào HC lẫn TC ⇒ người làm nửa ngày KHÔNG bị trừ oan giờ nghỉ.
  //    VD Ca ngày 07:00–17:30 nghỉ 1h30 → nghỉ 11:30–13:00; đủ ca = 9h HC;
  //       nửa ngày 13:00–17:30 = 4h30 HC; Ca đêm 20:00–06:00 nghỉ 1h = 9h HC.
  // Trả về phút: { hc, tc } (giờ nghỉ không nằm trong cả hai).
  function hrSplitHoursHC(dept, start, end, shiftIdx) {
    const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
    const cfg = hrShiftCfg(dept);
    const range = hrShiftRange(cfg, shiftIdx);
    let startMin = toMin(start);
    let endMin = toMin(end);
    if (range.endMin > 1440) {
      if (startMin < range.startMin) startMin += 1440;
      if (end && endMin < range.startMin) endMin += 1440;
    }
    return hrSplitHoursHCMin(dept, startMin, endMin, shiftIdx);
  }
  // Bản dùng PHÚT trực tiếp — engine đối chiếu chấm công cần mốc > 1440 (ca đêm)
  function hrSplitHoursHCMin(dept, startMin, endMin, shiftIdx) {
    const cfg = hrShiftCfg(dept);
    const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
    let s = Number(startMin) || 0;
    let e = Number(endMin) || 0;
    // Khung ca của cột ca đang dùng — mốc phút ĐÃ CHUẨN HOÁ (ca đêm vắt đêm)
    const range = hrShiftRange(cfg, shiftIdx);
    const rStart = range.startMin, rEnd = range.endMin;
    // Giờ ra TRỐNG = HẾT CA. LƯU Ý (20/10/2026): CHỈ `!e` mới là "hết ca" —
    // KHÔNG còn `e === s` (đoạn làm việc 0 phút từng bị phình thành cả ca →
    // "HC 9h · TC 13h30" cho người vào muộn hơn cả giờ bắt đầu bố trí).
    if (!e) e = rEnd;
    if (e <= s) e += 1440;        // làm qua nửa đêm

    // Các cửa sổ giờ HC (hành chính: từng buổi, đã loại nghỉ trưa)
    const hcWindows = [];
    if (cfg.type === 'lamca') {
      hcWindows.push([rStart, rEnd]);
    } else {
      cfg.shifts.forEach(sh => hcWindows.push([toMin(sh.start), toMin(sh.end)]));
    }
    // HC = giao của giờ làm với các cửa sổ HC
    let hc = 0;
    hcWindows.forEach(([ws, we]) => {
      [0, 1440].forEach(off => {
        const a = Math.max(s, ws + off), b = Math.min(e, we + off);
        if (b > a) hc += b - a;
      });
    });
    // ─── PHẦN NGHỈ (không tính vào HC lẫn TC) ───
    //  • Hành chính: khoảng hở GIỮA các buổi (nghỉ trưa 11:30–13:00)
    //  • Làm ca: số giờ nghỉ khai ở Cài Đặt Ca, đặt GIỮA CA (20/10/2026 —
    //    trước đây trừ ở CUỐI CA nên người làm nửa ngày bị trừ oan cả giờ
    //    nghỉ: 12:59–17:34 bị ra 3h01 thay vì 4h30).
    //    Cửa sổ nghỉ = [bắt đầu + (dài ca − nghỉ)/2 , + nghỉ]
    //    VD ca 07:00–17:30 nghỉ 1h30 → nghỉ 11:30–13:00 (đúng nghỉ trưa);
    //       ca đêm 20:00–06:00 nghỉ 1h → nghỉ 00:30–01:30.
    //    Ca ĐỦ NGÀY không đổi (dài ca − nghỉ như cũ).
    let gap = 0;
    if (cfg.type === 'lamca') {
      const brk = Math.max(0, Number(range.brkH) || 0) * 60;
      if (brk > 0) {
        const len = Math.max(0, rEnd - rStart);
        const b = Math.min(brk, len);
        const gs0 = rStart + Math.round((len - b) / 2);
        const ge0 = gs0 + b;
        [0, 1440].forEach(off => {
          const a = Math.max(s, gs0 + off), b2 = Math.min(e, ge0 + off);
          if (b2 > a) gap += b2 - a;
        });
      }
      // Nghỉ nằm GIỮA cửa sổ ca → phải TRỪ khỏi HC (khác nghỉ trưa hành chính
      // nằm NGOÀI các buổi nên HC không bị trừ)
      hc = Math.max(0, hc - gap);
    } else {
      for (let i = 0; i < hcWindows.length - 1; i++) {
        const gs = hcWindows[i][1], ge = hcWindows[i + 1][0];
        [0, 1440].forEach(off => {
          const a = Math.max(s, gs + off), b = Math.min(e, ge + off);
          if (b > a) gap += b - a;
        });
      }
    }
    // TC = phần còn lại của giờ làm ngoài HC và ngoài nghỉ
    //     (= làm trước giờ vào / sau giờ ra của ca chuẩn)
    return { hc, tc: Math.max(0, (e - s) - hc - gap) };
  }

  // ─── LỊCH LÀM VIỆC THEO THÁNG (ngày nghỉ / lễ) ──────────────────
  // Cấu hình theo từng tháng { 'YYYY-MM': { weekdaysOff, restDays, workDays } }:
  //  • weekdaysOff: nghỉ ĐỊNH KỲ theo thứ (mặc định [0] = nghỉ Chủ nhật;
  //    mảng RỖNG = tắt hẳn nghỉ định kỳ — mọi ngày đều là ngày làm việc)
  //  • restDays   : nghỉ/LỄ RIÊNG của tháng (1/9, 2/9, nghỉ toàn nhà máy...)
  //  • workDays   : LÀM BÙ theo TỪNG ngày — đi làm bình thường dù rơi vào thứ
  //    nghỉ (VD Chủ nhật làm bù; các Chủ nhật khác vẫn nghỉ theo thứ)
  // Quy tắc tính giờ: đi làm vào ngày nghỉ/lễ → TOÀN BỘ giờ làm trong ngày
  // (theo cửa sổ ca chuẩn của bộ phận, đã trừ nghỉ trưa) được tính vào TC.
  const HR_DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; // theo Date.getDay() (0 = Chủ nhật)
  const HR_DOW_GRID  = [1, 2, 3, 4, 5, 6, 0];                      // thứ tự lưới lịch bắt đầu Thứ 2
  // Cấu hình lịch của 1 tháng (null nếu chưa cài — mặc định nghỉ Chủ nhật)
  function hrCalCfgOf(month) {
    const cal = state.hrWorkCalendar;
    if (!cal || typeof cal !== 'object') return null;
    const cfg = cal[month];
    return (cfg && typeof cfg === 'object') ? cfg : null;
  }
  // Loại ngày: 'work' (ngày làm việc — gồm cả LÀM BÙ) | 'off' (nghỉ định kỳ
  // theo thứ) | 'holiday' (nghỉ/lễ riêng). Ưu tiên: restDays > workDays > weekdaysOff.
  function hrDayKindOf(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return 'work';
    const cfg = hrCalCfgOf(String(iso).slice(0, 7));
    if (cfg && Array.isArray(cfg.restDays) && cfg.restDays.includes(iso)) return 'holiday';
    if (cfg && Array.isArray(cfg.workDays) && cfg.workDays.includes(iso)) return 'work'; // ngày làm bù
    const wdOff = (cfg && Array.isArray(cfg.weekdaysOff)) ? cfg.weekdaysOff : [0]; // mặc định nghỉ CN
    let dow = -1;
    try { dow = new Date(iso + 'T00:00:00').getDay(); } catch (e) { dow = -1; }
    return (dow >= 0 && wdOff.includes(dow)) ? 'off' : 'work';
  }
  // Ngày nghỉ (định kỳ hoặc lễ) — đi làm ngày này thì giờ làm tính vào TC
  function hrIsRestDay(iso) { return hrDayKindOf(iso) !== 'work'; }
  // Tách giờ HC/TC CÓ XÉT LỊCH THÁNG: ngày nghỉ/lễ thì phần giờ nằm trong
  // cửa sổ ca chuẩn KHÔNG tính HC nữa mà chuyển hết sang TC (hc=0, tc=hc+tc).
  function hrSplitHoursHCDate(dept, date, start, end, shiftIdx) {
    const r = hrSplitHoursHC(dept, start, end, shiftIdx);
    if (date && hrIsRestDay(date) && r.hc > 0) return { hc: 0, tc: r.hc + r.tc };
    return r;
  }

  // ── MODAL CÀI ĐẶT LỊCH LÀM VIỆC THEO THÁNG ──
  // Bản nháp đang chỉnh (Lưu mới ghi vào state + localStorage + mây)
  let hrCalDraft = { month: '', weekdaysOff: [0], restDays: [], workDays: [] };

  function openHrCalendarModal() {
    if (!requireEditPermission()) return;
    const input = document.getElementById('hr-calendar-month');
    const month = (input && /^\d{4}-\d{2}$/.test(input.value)) ? input.value
      : (/^\d{4}-\d{2}$/.test(state.hrCalMonth || '') ? state.hrCalMonth : hrTodayISO().slice(0, 7));
    hrCalSetMonth(month);
    const modal = document.getElementById('modal-hr-calendar');
    if (modal) { modal.classList.add('show'); hrScheduleIcons(); }
  }

  function closeHrCalendarModal() {
    document.getElementById('modal-hr-calendar')?.classList.remove('show');
  }

  // Đổi tháng trong modal — nạp cấu hình hiện có vào bản nháp rồi vẽ lại
  function hrCalSetMonth(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return;
    state.hrCalMonth = month;
    const cfg = hrCalCfgOf(month) || {};
    hrCalDraft = {
      month,
      weekdaysOff: Array.isArray(cfg.weekdaysOff) ? [...cfg.weekdaysOff] : [0],
      restDays: Array.isArray(cfg.restDays) ? [...cfg.restDays] : [],
      workDays: Array.isArray(cfg.workDays) ? [...cfg.workDays] : []
    };
    const input = document.getElementById('hr-calendar-month');
    if (input && input.value !== month) input.value = month;
    renderHrCalendarModal();
  }

  // Bật/tắt trạng thái của 1 ngày (click ô lịch) — chu kỳ:
  //   ngày làm việc  → nghỉ/lễ riêng → (bấm nữa) ngày làm việc
  //   nghỉ theo thứ  → LÀM BÙ (đi làm bình thường) → (bấm nữa) nghỉ theo thứ
  function hrCalToggleDay(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) || iso.slice(0, 7) !== hrCalDraft.month) return;
    let dow = -1;
    try { dow = new Date(iso + 'T00:00:00').getDay(); } catch (e) { dow = -1; }
    const iRest = hrCalDraft.restDays.indexOf(iso);
    const iWork = hrCalDraft.workDays.indexOf(iso);
    if (iRest !== -1) {
      hrCalDraft.restDays.splice(iRest, 1);              // đang nghỉ/lễ riêng -> bỏ đánh dấu
    } else if (iWork !== -1) {
      hrCalDraft.workDays.splice(iWork, 1);              // đang làm bù -> trả lại nghỉ theo thứ
    } else if (dow >= 0 && hrCalDraft.weekdaysOff.includes(dow)) {
      hrCalDraft.workDays.push(iso);                     // nghỉ theo thứ -> LÀM BÙ ngày này
      showToast(`Đã đánh dấu LÀM BÙ ngày ${iso} — đi làm bình thường, giờ tính như ngày làm việc. (Các ${HR_DOW_SHORT[dow]} khác vẫn nghỉ)`, 'info');
    } else {
      hrCalDraft.restDays.push(iso);                     // ngày làm việc -> nghỉ/lễ riêng
    }
    renderHrCalendarModal();
  }

  // Bật/tắt nghỉ định kỳ theo thứ (CN..T7)
  function hrCalToggleWeekday(dow) {
    const i = hrCalDraft.weekdaysOff.indexOf(dow);
    if (i !== -1) hrCalDraft.weekdaysOff.splice(i, 1);
    else hrCalDraft.weekdaysOff.push(dow);
    renderHrCalendarModal();
  }

  // Vẽ nội dung modal lịch (grid tháng + các nút nghỉ theo thứ)
  function renderHrCalendarModal() {
    const labelEl = document.getElementById('hr-calendar-month-label');
    if (labelEl) labelEl.textContent = hrCalDraft.month;
    // Các nút "Nghỉ định kỳ theo thứ"
    const wdBox = document.getElementById('hr-calendar-weekdays');
    if (wdBox) {
      wdBox.innerHTML = HR_DOW_GRID.map(d =>
        `<button type="button" class="hr-cal-wd${hrCalDraft.weekdaysOff.includes(d) ? ' on' : ''}" data-cal-wd="${d}" ` +
        `title="${hrCalDraft.weekdaysOff.includes(d) ? 'Nghỉ' : 'Làm việc'} định kỳ mỗi ${HR_DOW_SHORT[d]}">${HR_DOW_SHORT[d]}</button>`).join('');
    }
    // Lưới ngày của tháng (bắt đầu Thứ 2)
    const grid = document.getElementById('hr-calendar-grid');
    if (grid && /^\d{4}-\d{2}$/.test(hrCalDraft.month)) {
      const [yy, mm] = hrCalDraft.month.split('-').map(Number);
      const nDays = new Date(yy, mm, 0).getDate();
      const firstDow = new Date(yy, mm - 1, 1).getDay();        // 0 = CN
      const pad = (firstDow + 6) % 7;                            // lưới bắt đầu T2
      const todayISO = hrTodayISO();
      let html = '';
      for (let p = 0; p < pad; p++) html += '<span class="hr-cal-cell hr-cal-empty"></span>';
      for (let d = 1; d <= nDays; d++) {
        const iso = `${hrCalDraft.month}-${String(d).padStart(2, '0')}`;
        const dow = new Date(yy, mm - 1, d).getDay();
        const inRest = hrCalDraft.restDays.includes(iso);
        const inWork = hrCalDraft.workDays.includes(iso);
        const isOff = hrCalDraft.weekdaysOff.includes(dow);
        const kind = inRest ? 'holiday' : (inWork ? 'workday' : (isOff ? 'off' : 'work'));
        const cls = kind === 'holiday' ? 'hr-cal-holiday'
          : (kind === 'workday' ? 'hr-cal-workday'
          : (kind === 'off' ? 'hr-cal-off' : 'hr-cal-work'));
        const tips = {
          work: 'Ngày làm việc',
          workday: 'Ngày LÀM BÙ — đi làm bình thường dù rơi vào thứ nghỉ (bấm để trả lại nghỉ theo thứ)',
          off: `Nghỉ định kỳ (${HR_DOW_SHORT[dow]}) — bấm để đánh dấu LÀM BÙ cho riêng ngày này`,
          holiday: 'Nghỉ/Lễ riêng — đi làm sẽ tính hết giờ vào TC'
        };
        html += `<button type="button" class="hr-cal-cell ${cls}${iso === todayISO ? ' today' : ''}" data-cal-day="${iso}" title="${tips[kind]}">` +
          `<b>${d}</b><span>${HR_DOW_SHORT[dow]}${kind === 'workday' ? ' · bù' : ''}</span></button>`;
      }
      grid.innerHTML = html;
    }
    // Dòng trạng thái
    const stEl = document.getElementById('hr-calendar-status');
    if (stEl) {
      const nRest = hrCalDraft.restDays.length;
      const nWork = hrCalDraft.workDays.length;
      const wdTxt = hrCalDraft.weekdaysOff.length
        ? 'nghỉ định kỳ: ' + hrCalDraft.weekdaysOff.slice().sort((a, b) => a - b).map(d => HR_DOW_SHORT[d]).join(', ')
        : 'KHÔNG nghỉ định kỳ theo thứ nào (mọi ngày đều là ngày làm việc)';
      stEl.textContent = `${hrCalDraft.month} — ${wdTxt} · ${nRest} ngày nghỉ/lễ riêng · ${nWork} ngày làm bù`;
    }
    hrScheduleIcons();
  }

  // Lưu lịch tháng đang chỉnh vào state + localStorage (+ đồng bộ mây qua saveHrData)
  function handleHrCalendarSubmit(e) {
    e.preventDefault();
    const month = hrCalDraft.month;
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Tháng không hợp lệ — hãy chọn tháng trước khi lưu!', 'error'); return; }
    state.hrWorkCalendar[month] = {
      weekdaysOff: [...new Set(hrCalDraft.weekdaysOff)].sort((a, b) => a - b),
      restDays: [...new Set(hrCalDraft.restDays)].sort(),
      workDays: [...new Set(hrCalDraft.workDays)].sort(),
      updatedAt: new Date().toISOString(),
      updatedBy: state.currentUser ? (state.currentUser.email || state.currentUser.username || '') : ''
    };
    saveHrData();
    closeHrCalendarModal();
    renderHrView();
    const saved = state.hrWorkCalendar[month];
    showToast(`Đã lưu lịch làm việc tháng ${month} (${saved.restDays.length} ngày nghỉ/lễ riêng` +
      `${saved.workDays.length ? ` · ${saved.workDays.length} ngày làm bù` : ''})`, 'success');
  }

  // Đồng bộ cột "Vị Trí Trong Ngày" của chấm công theo dữ liệu Board:
  // rec.positions = các vị trí ĐANG được gán trong ngày (nguồn cho liên kết
  // công nhân ép ván + thống kê phân vị)
  function hrSyncAttPositionsFromAssignments(employeeId, date) {
    const rec = attRecordOf(employeeId, date);
    if (!rec) return;
    rec.positions = [...new Set((state.hrAssignments || [])
      .filter(a => a.date === date && a.employeeId === employeeId)
      .map(a => a.positionId))];
    rec.updatedAt = new Date().toISOString();
  }

  // ── RENDER BOARD — BẢNG ĐIỀU KHIỂN TRỰC QUAN (kiểu Kanban) ──────
  // Mỗi VỊ TRÍ = 1 thẻ cột; bên trong là các Ô NGƯỜI xếp chồng (số ô =
  // "Số Người Cần" của bảng trung gian). Ô trống "?" xám; ô đã gán = chip
  // xanh avatar + tên rút gọn + giờ. Bộ phận "Làm ca" tách 2 cột ca/thẻ.
  function hrInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function renderHrBoard() {
    const board = document.getElementById('hr-board');
    if (!board) return;
    if (!state.hrBoardDate) state.hrBoardDate = hrTodayISO();
    if (!state.hrBoardDept) state.hrBoardDept = 'Xưởng 2';
    const dateInput = document.getElementById('hr-board-date');
    if (dateInput && dateInput.value !== state.hrBoardDate) dateInput.value = state.hrBoardDate;
    const deptTabs = document.getElementById('hr-board-dept-tabs');
    if (deptTabs) {
      deptTabs.innerHTML = HR_DEPARTMENTS.map(d =>
        `<button type="button" class="hr-board-tab${d === state.hrBoardDept ? ' on' : ''}" data-board-dept="${escapeHTML(d)}">${escapeHTML(d)}</button>`).join('');
    }
    const dept = state.hrBoardDept;
    const cfg = hrShiftCfg(dept);
    const colCount = cfg.type === 'lamca' ? Math.max(1, cfg.shifts.length) : 1;
    const positions = (state.hrPositions || []).filter(p => hrDeptAliasOf(p.department) === dept);
    const posNeedOf = pid => (state.hrPositionNeeds || []).find(r => r.positionId === pid);
    // NHU CẦU CHIA THEO CA (21/10/2026): needQty = suất CẢ NGÀY ⇒ chia đều cho
    // các ca (mỗi ca tối thiểu 1 khi need > 0) hoặc "mỗi ca đủ N" tuỳ dòng.
    const needSplitOf = p => {
      const row = posNeedOf(p.id);
      const needDay = Math.max(0, parseInt(row && row.needQty, 10) || 1);
      return hrNeedSplitOf(needDay, colCount, hrNeedModeOf(row));
    };
    const dayAssignments = hrAssignmentsOf(state.hrBoardDate);
    const schedule = hrAssignmentScheduleOf(dayAssignments);
    const assigns = dayAssignments.filter(a => positions.some(p => p.id === a.positionId));

    // Chip tổng hợp tinh gọn trên đầu board
    const countEl = document.getElementById('hr-board-count');
    if (countEl) {
      const totalNeed = positions.reduce((s, p) => s + needSplitOf(p).reduce((x, n) => x + n, 0), 0);
      const fullCols = positions.reduce((s, p) => {
        const per = needSplitOf(p);
        for (let si = 0; si < colCount; si++) {
          const c = assigns.filter(a => a.positionId === p.id && (a.shiftIdx || 0) === si).length;
          s += Math.min(c, per[si] || 0);
        }
        return s;
      }, 0);
      countEl.innerHTML =
        `<span class="hr-stat-chip"><i data-lucide="calendar-days"></i> ${fmtDateDMY(state.hrBoardDate)}</span>` +
        `<span class="hr-stat-chip"><i data-lucide="layout-panel-left"></i> ${escapeHTML(dept)}</span>` +
        `<span class="hr-stat-chip"><i data-lucide="${cfg.type === 'lamca' ? 'moon-star' : 'sun'}"></i> ${cfg.type === 'lamca' ? colCount + ' ca' : 'Hành chính'}</span>` +
        `<span class="hr-stat-chip"><i data-lucide="users"></i> Đã bố trí <strong>${assigns.length}</strong>/${totalNeed}</span>`;
    }

    if (!positions.length) {
      board.innerHTML = `<div class="board-empty">
        <i data-lucide="layout-panel-left"></i>
        <p>Chưa có vị trí nào thuộc bộ phận <b>${escapeHTML(dept)}</b>.<br>Thêm ở thẻ "Vị Trí &amp; Kỹ Năng" (chọn Bộ Phận = ${escapeHTML(dept)}) — board tự lên cột.</p>
      </div>`;
      hrScheduleIcons();
      return;
    }

    board.innerHTML = positions.map(p => {
      const needPerShift = needSplitOf(p);
      const need = needPerShift.reduce((s, n) => s + n, 0);
      let complete = true;
      const shifts = Array.from({ length: colCount }, (_, si) => {
        const range = hrShiftRange(cfg, si);
        const needSi = needPerShift[si] || 0;
        const mine = assigns.filter(a => a.positionId === p.id && (a.shiftIdx || 0) === si)
          .sort((a, b) => hrAssignmentStartMin(a) - hrAssignmentStartMin(b));
        if (mine.length < needSi) complete = false;
        const slots = mine.map(a => {
          const emp = hrEmpById(a.employeeId);
          const end = schedule.endById.get(a.id) || '';
          const timeTxt = `${fmtHour(a.start)}${end ? '–' + fmtHour(end) : ' → hết ca'}`;
          const sameEmployee = dayAssignments.filter(x => x.employeeId === a.employeeId);
          const repeatCount = sameEmployee.length;
          const repeatTxt = sameEmployee.map(x => {
            const xEnd = schedule.endById.get(x.id) || '';
            return `${hrPosName(x.positionId)} ${fmtHour(x.start)}${xEnd ? '–' + fmtHour(xEnd) : '→ hết ca'}`;
          }).join(', ');
          const conflicts = schedule.conflictPairs.filter(pair => pair.some(x => x.id === a.id));
          const conflictTxt = conflicts.map(pair => {
            const other = pair.find(x => x.id !== a.id);
            return other ? `${hrPosName(other.positionId)} ${fmtHour(other.start)}${schedule.endById.get(other.id) ? '–' + fmtHour(schedule.endById.get(other.id)) : '→ hết ca'}` : '';
          }).filter(Boolean).join(', ');
          const flag = conflicts.length
            ? `<em class="slot-repeat-badge conflict" aria-label="Trùng giờ">!</em>`
            : (repeatCount > 1 ? `<em class="slot-repeat-badge" aria-label="Được bố trí nhiều công đoạn">×${repeatCount}</em>` : '');
          const title = `${emp?.name || ''} · ${timeTxt}` +
            (repeatCount > 1 ? ` · Đã bố trí ${repeatCount} công đoạn: ${repeatTxt}` : '') +
            (conflictTxt ? ` · Trùng giờ với: ${conflictTxt}` : '');
          return `<div class="slot filled${repeatCount > 1 ? ' repeated' : ''}${conflicts.length ? ' conflict' : ''}" draggable="true" title="${escapeHTML(title)}"
            ondragstart="app.hrBoardDragStart(event, '${a.id}')" ondragend="this.classList.remove('dragging')" onclick="app.hrBoardOpenAssign('${p.id}', ${si}, '${a.id}')">
            <span class="slot-ava">${escapeHTML(hrInitials(emp?.name))}</span>
            <span class="slot-info"><b>${escapeHTML(hrShortName(emp?.name || 'Đã xóa'))}${flag}</b><i>${escapeHTML(timeTxt)}</i></span>
            <button type="button" class="slot-x" title="Bỏ người khỏi vị trí" onclick="event.stopPropagation(); app.hrBoardRemoveAssign('${a.id}')"><i data-lucide="x"></i></button>
          </div>`;
        });
        for (let k = mine.length; k < needSi; k++) {
          slots.push(`<div class="slot empty" title="Chưa có người — bấm để thêm"
            onclick="app.hrBoardOpenAssign('${p.id}', ${si}, '')"
            ondragover="event.preventDefault()" ondragenter="this.classList.add('over')" ondragleave="this.classList.remove('over')"
            ondrop="app.hrBoardDrop(event, '${p.id}', ${si})"><span>?</span></div>`);
        }
        // Nút "+" thêm nhanh nhân viên cho vị trí (mở cùng hộp thoại 3 bước)
        slots.push(`<button type="button" class="slot add" title="Thêm nhân viên cho vị trí này"
          onclick="app.hrBoardOpenAssign('${p.id}', ${si}, '')"><i data-lucide="plus"></i><span>Thêm người</span></button>`);
        return `<div class="board-shift">
          <div class="board-shift-name">${escapeHTML(colCount > 1 ? (cfg.shifts[si]?.name || ('Ca ' + (si + 1))) : 'Hành chính')}<span>${fmtHour(range.start)}–${fmtHour(range.end)}${range.brkH ? ' · nghỉ ' + fmtHm(range.brkH * 60) : ''}</span></div>
          <div class="board-slots">${slots.join('')}</div>
        </div>`;
      }).join('');
      return `<div class="board-col${complete ? ' complete' : ''}">
        <div class="board-col-head">
          <span class="board-col-title" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</span>
          <span class="board-col-need">cần ${need}${colCount > 1 ? ` → ${needPerShift.join('+')}` : ''}</span>
          <span class="board-col-dot${complete ? ' ok' : ' warn'}" title="${complete ? 'Đã đủ người' : 'Chưa đủ người'}"></span>
        </div>
        <div class="board-col-body">${shifts}</div>
      </div>`;
    }).join('');
    hrScheduleIcons();
  }

  function hrBoardSetDate(d) { state.hrBoardDate = d || hrTodayISO(); renderHrBoard(); }
  function hrBoardShiftDay(days) { state.hrBoardDate = hrShiftDateISO(state.hrBoardDate || hrTodayISO(), days); renderHrBoard(); }
  function hrBoardGoToday() { state.hrBoardDate = hrTodayISO(); renderHrBoard(); }
  function hrBoardSetDept(dept) { if (!dept) return; state.hrBoardDept = dept; renderHrBoard(); }

  // ── MODAL GÁN NGƯỜI VÀO Ô (3 bước: nhân viên → giờ bắt đầu → giờ kết thúc) ──
  // mode: '' = thêm mới (bấm ô trống) | id bản ghi = sửa | 'move:<id>' = kéo ô
  // sang vị trí khác (điền giờ bắt đầu mới tại vị trí mới, bản ghi cũ được dời)
  let hrBoardSuggestFor = ''; // positionId đang gợi ý nhân viên (ưu tiên kỹ năng)
  function hrBoardAssignCandidates(positionId, q) {
    const pos = hrPosById(positionId);
    const dept = pos?.department || '';
    const key = hrStripForMatch(q || '');
    return (state.hrEmployees || [])
      .filter(e => (e.status || 'active') === 'active')
      .filter(e => !key || hrStripForMatch(`${e.name || ''} ${e.code || ''}`).includes(key))
      .sort((a, b) => {
        const sk = x => ((x.skills || []).includes(positionId) ? 0 : 1);
        const dp = x => (x.department === dept ? 0 : 1);
        return sk(a) - sk(b) || dp(a) - dp(b) || String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      });
  }
  function renderBoardAssignSuggestions(q) {
    const box = document.getElementById('board-assign-suggest');
    if (!box || !hrBoardSuggestFor) return;
    const list = hrBoardAssignCandidates(hrBoardSuggestFor, q).slice(0, 12);
    if (!list.length) {
      box.innerHTML = '<div class="hr-combobox-empty">Không tìm thấy nhân viên nào</div>';
      box.style.display = 'block';
      return;
    }
    const dayAssignments = hrAssignmentsOf(state.hrBoardDate);
    const schedule = hrAssignmentScheduleOf(dayAssignments);
    box.innerHTML = list.map(e => {
      const skilled = (e.skills || []).includes(hrBoardSuggestFor);
      // Người đã được bố trí trong ngày -> đánh dấu "Đã bố trí: ..." ngay trên
      // dòng gợi ý (VẪN chọn được — phục vụ 1 người nhiều công đoạn theo khung giờ)
      const mine = dayAssignments.filter(a => a.employeeId === e.id)
        .sort((a, b) => hrAssignmentStartMin(a) - hrAssignmentStartMin(b));
      const mineTxt = mine.length
        ? ` · Đã bố trí: ${mine.map(a => `${hrPosName(a.positionId)} ${fmtHour(a.start)}${schedule.endById.get(a.id) ? '–' + fmtHour(schedule.endById.get(a.id)) : '→hết ca'}`).join(', ')}`
        : '';
      return `<div class="hr-combobox-item${mine.length ? ' picked' : ''}" data-emp-id="${escapeHTML(e.id)}">
        <strong>${escapeHTML(e.name)}</strong>
        <span class="hr-combobox-meta">${escapeHTML((e.code ? e.code + ' · ' : '') + (e.department || ''))}${skilled ? ' · ★ có kỹ năng' : ''}${escapeHTML(mineTxt)}</span>
      </div>`;
    }).join('');
    box.style.display = 'block';
  }
  function pickBoardAssignEmployee(id) {
    const e = hrEmpById(id);
    const input = document.getElementById('board-assign-employee');
    const hidden = document.getElementById('board-assign-employee-id');
    if (e && input) input.value = e.name;
    if (hidden) hidden.value = id;
    const box = document.getElementById('board-assign-suggest');
    if (box) box.style.display = 'none';
  }
  function fillBoardAssignTimeSelects(cfg, shiftIdx, defStart, defEnd) {
    const startSel = document.getElementById('board-assign-start');
    const endSel = document.getElementById('board-assign-end');
    if (!startSel || !endSel) return;
    const range = hrShiftRange(cfg, shiftIdx);
    const opts = hrHalfHourOptions();
    startSel.innerHTML = opts.map(t => `<option value="${t}" ${t === (defStart || range.start) ? 'selected' : ''}>${fmtHour(t)}</option>`).join('');
    endSel.innerHTML = `<option value="">— Hết ca (${fmtHour(range.end)}) —</option>` +
      opts.map(t => `<option value="${t}" ${t === defEnd ? 'selected' : ''}>${fmtHour(t)}</option>`).join('');
  }

  function hrBoardOpenAssign(positionId, shiftIdx, assignId) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-board-assign');
    const form = document.getElementById('board-assign-form');
    if (!modal || !form) return;
    form.reset();
    const dept = state.hrBoardDept || 'Xưởng 2';
    const cfg = hrShiftCfg(dept);
    hrBoardSuggestFor = positionId;
    const pos = hrPosById(positionId);
    const mode = String(assignId || '').startsWith('move:') ? 'move' : (assignId ? 'edit' : 'new');
    const srcId = mode === 'move' ? String(assignId).slice(5) : assignId;
    const src = srcId ? (state.hrAssignments || []).find(a => a.id === srcId) : null;
    const range = hrShiftRange(cfg, shiftIdx);
    const srcSchedule = src ? hrAssignmentScheduleOf(hrAssignmentsOf(src.date)) : null;
    const srcEnd = src ? hrAssignmentBaseEnd(src, srcSchedule.nextById.get(src.id)) : '';

    document.getElementById('board-assign-mode').value = mode === 'edit' ? srcId : '';
    document.getElementById('board-assign-movefrom').value = mode === 'move' ? srcId : '';
    document.getElementById('board-assign-date').value = state.hrBoardDate;
    document.getElementById('board-assign-pos').value = positionId;
    document.getElementById('board-assign-shiftidx').value = shiftIdx;
    const titleEl = document.getElementById('board-assign-title');
    if (titleEl) {
      titleEl.innerHTML = mode === 'new'
        ? `<i data-lucide="user-plus"></i> Bố Trí: ${escapeHTML(pos?.name || '')} (${escapeHTML(range.label || '')})`
        : mode === 'move'
          ? `<i data-lucide="move"></i> Dời Người → ${escapeHTML(pos?.name || '')} <span style="font-weight:400;font-size:0.72rem;">(giờ mới = giờ kết thúc tại vị trí cũ)</span>`
          : `<i data-lucide="edit-3"></i> Sửa Bố Trí: ${escapeHTML(pos?.name || '')}`;
    }
    if (src && mode !== 'new') {
      pickBoardAssignEmployee(src.employeeId);
      fillBoardAssignTimeSelects(cfg, shiftIdx, src.start, mode === 'move' ? '' : srcEnd);
    } else {
      fillBoardAssignTimeSelects(cfg, shiftIdx, range.start, '');
      const inp = document.getElementById('board-assign-employee');
      if (inp) inp.value = '';
    }
    const box = document.getElementById('board-assign-suggest');
    if (box) box.style.display = 'none';
    modal.classList.add('show');
    hrScheduleIcons();
  }

  function closeBoardAssignModal() {
    document.getElementById('modal-board-assign')?.classList.remove('show');
    hrBoardSuggestFor = '';
  }

  function handleBoardAssignSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const date = document.getElementById('board-assign-date').value;
    const positionId = document.getElementById('board-assign-pos').value;
    const shiftIdx = parseInt(document.getElementById('board-assign-shiftidx').value, 10) || 0;
    const employeeId = document.getElementById('board-assign-employee-id').value;
    const start = document.getElementById('board-assign-start').value;
    const end = document.getElementById('board-assign-end').value; // '' = mặc định hết ca
    const editId = document.getElementById('board-assign-mode').value;
    const moveFromId = document.getElementById('board-assign-movefrom').value;
    if (!employeeId) { showToast('Chọn nhân viên trước đã!', 'error'); return; }
    if (!date || !positionId) { showToast('Thiếu vị trí / ngày.', 'error'); return; }
    const dept = state.hrBoardDept || 'Xưởng 2';
    const cfg = hrShiftCfg(dept);
    const data = {
      // Khóa sinh nhật + suffix ngẫu nhiên: 2 lượt gán trong CÙNG 1 mili-giây
      // (kéo thẻ liên tiếp / máy nhanh) từng bị TRÙNG id → find(id) lấy nhầm bản
      // ghi khác → cắt sai giờ lịch sử. suffix làm id luôn DUY NHẤT.
      id: editId || `asg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date, department: dept, positionId, shiftIdx,
      employeeId, start, end,
      shiftLabel: cfg.type === 'lamca' ? (cfg.shifts[shiftIdx]?.name || '') : 'Hành chính',
      updatedAt: new Date().toISOString()
    };
    const currentAssignments = state.hrAssignments || [];
    const existing = currentAssignments.find(a => a.id === editId);
    const currentSchedule = hrAssignmentScheduleOf(currentAssignments.filter(a => a.date === date && a.employeeId === employeeId && a.id !== editId));
    const candidateInterval = hrAssignmentInterval(data, end);
    const duplicateStart = currentAssignments.find(a =>
      a.id !== editId && a.date === date && a.employeeId === employeeId &&
      hrAssignmentStartMin(a) === candidateInterval.startMin);
    const samePositionConflict = currentAssignments.find(a => {
      if (a.id === editId || a.date !== date || a.employeeId !== employeeId ||
          a.positionId !== positionId || (a.shiftIdx || 0) !== shiftIdx) return false;
      const interval = currentSchedule.intervals.get(a.id) || hrAssignmentInterval(a, currentSchedule.endById.get(a.id));
      return interval.startMin < candidateInterval.endMin && candidateInterval.startMin < interval.endMin;
    });
    const conflict = duplicateStart || samePositionConflict;
    if (conflict) {
      const conflictSchedule = currentSchedule;
      const conflictEnd = conflictSchedule.endById.get(conflict.id) || '';
      const reason = duplicateStart ? 'cùng giờ bắt đầu với một công đoạn khác' : 'trùng khung giờ tại cùng vị trí';
      showToast(`Đã bố trí ${hrEmpName(employeeId)} tại "${hrPosName(conflict.positionId)}" lúc ${fmtHour(conflict.start)}${conflictEnd ? '–' + fmtHour(conflictEnd) : ' → hết ca'} — ${reason}.`, 'error');
      return;
    }
    const proposedAssignments = currentAssignments.map(a => ({ ...a }));
    if (existing) hrReconcileAssignmentEnds(proposedAssignments, existing.employeeId, existing.date);
    const oldIndex = proposedAssignments.findIndex(a => a.id === editId);
    if (oldIndex !== -1) proposedAssignments.splice(oldIndex, 1);
    if (!editId) data.createdAt = new Date().toISOString();
    proposedAssignments.push(data);
    if (existing && (existing.employeeId !== employeeId || existing.date !== date)) {
      hrReconcileAssignmentEnds(proposedAssignments, existing.employeeId, existing.date);
    }
    hrReconcileAssignmentEnds(proposedAssignments, employeeId, date);
    const proposedSchedule = hrAssignmentScheduleOf(proposedAssignments.filter(a => a.date === date));
    const invalidPair = proposedSchedule.conflictPairs.find(pair => pair.some(a => a.id === data.id));
    if (invalidPair) {
      const other = invalidPair.find(a => a.id !== data.id);
      showToast(`Đã bố trí ${hrEmpName(employeeId)} tại "${hrPosName(other?.positionId || positionId)}" cùng giờ ${fmtHour(start)} — không thể xếp đồng thời hai vị trí.`, 'error');
      return;
    }
    const cutPos = proposedAssignments
      .filter(a => a.id !== data.id && a.date === date && a.employeeId === employeeId &&
        proposedSchedule.endById.get(a.id) === start &&
        currentSchedule.endById.get(a.id) !== start)
      .map(a => hrPosName(a.positionId));
    state.hrAssignments = hrCommitAssignmentProposal(currentAssignments, proposedAssignments);
    if (moveFromId && moveFromId !== editId) {
      const src = state.hrAssignments.find(a => a.id === moveFromId);
      if (src) hrSyncAttPositionsFromAssignments(src.employeeId, src.date);
    }
    // Gán người = có mặt làm việc: tự chấm "Đi làm" nếu ngày chưa chấm tay
    const rec = ensureAttRecord(employeeId, date);
    if (rec.status !== 'leave') rec.status = 'work';
    rec.updatedAt = new Date().toISOString();
    // Cột "Vị Trí Trong Ngày" của chấm công = đúng các vị trí được gán hôm đó
    hrSyncAttPositionsFromAssignments(employeeId, date);
    // Người làm vị trí này → tự học kỹ năng (như cơ chế phân vị chấm công)
    const emp = hrEmpById(employeeId);
    if (emp && !(emp.skills || []).includes(positionId)) emp.skills = [...(emp.skills || []), positionId];
    // Chỉ ghi key THAY ĐỔI: bố trí + chấm công (tự chấm) + kỹ năng nhân viên
    saveHrData(['hrAssignments', 'hrAttendance', 'hrEmployees']);
    closeBoardAssignModal();
    renderHrAfterBoardChange();
    showToast(`Đã bố trí ${hrEmpName(employeeId)} — ${hrPosName(positionId)} ${fmtHour(start)}${end ? '–' + fmtHour(end) : ''}`, 'success');
    if (cutPos.length) {
      showToast(`Giờ ${fmtHour(start)} tại "${hrPosName(positionId)}" cũng là giờ kết thúc tại: ${cutPos.join(', ')} — lịch sử cũ được giữ lại.`, 'info');
    }
  }

  function hrBoardRemoveAssign(id) {
    if (!requireEditPermission()) return;
    const a = (state.hrAssignments || []).find(x => x.id === id);
    if (!a) return;
    trackDeleted('hrAssignments', id);
    const currentAssignments = state.hrAssignments || [];
    const assignments = currentAssignments.map(x => ({ ...x }));
    hrReconcileAssignmentEnds(assignments, a.employeeId, a.date);
    const proposedAssignments = assignments.filter(x => x.id !== id);
    hrReconcileAssignmentEnds(proposedAssignments, a.employeeId, a.date);
    state.hrAssignments = hrCommitAssignmentProposal(currentAssignments, proposedAssignments);
    hrSyncAttPositionsFromAssignments(a.employeeId, a.date);
    saveHrData(['hrAssignments', 'hrAttendance']);
    renderHrAfterBoardChange();
    showToast(`Đã bỏ ${hrEmpName(a.employeeId)} khỏi ${hrPosName(a.positionId)}`, 'info');
  }

  // ── KÉO Ô NGƯỜI SANG VỊ TRÍ KHÁC ────────────────────────────────
  let hrBoardDraggingId = '';
  function hrBoardDragStart(ev, assignId) {
    hrBoardDraggingId = assignId;
    if (ev && ev.target && ev.target.classList) ev.target.classList.add('dragging'); // hiệu ứng mờ chip đang kéo
    if (ev && ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      try { ev.dataTransfer.setData('text/plain', assignId); } catch (e) {}
    }
  }
  function hrBoardDrop(ev, positionId, shiftIdx) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const id = hrBoardDraggingId || (ev && ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '');
    hrBoardDraggingId = '';
    if (!id) return;
    const src = (state.hrAssignments || []).find(a => a.id === id);
    if (!src) return;
    if (src.positionId === positionId && (src.shiftIdx || 0) === shiftIdx) return;
    // Dời người: giữ nguyên nhân viên, điền giờ bắt đầu mới tại vị trí mới
    hrBoardOpenAssign(positionId, shiftIdx, `move:${id}`);
    const cfg = hrShiftCfg(state.hrBoardDept || 'Xưởng 2');
    fillBoardAssignTimeSelects(cfg, shiftIdx, src.start, '');
    showToast(`Giờ chọn tại vị trí mới cũng là giờ kết thúc tại "${hrPosName(src.positionId)}" — lịch sử cũ được giữ lại.`, 'info');
  }

  // ── CÀI ĐẶT CA LÀM VIỆC THEO BỘ PHẬN (bảng cấu hình — linh hoạt chỉnh sau) ──
  function openShiftModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-shift');
    if (!modal) return;
    const dept = state.hrBoardDept || 'Xưởng 2';
    const cfg = hrShiftCfg(dept);
    document.getElementById('shift-dept').value = dept;
    const labelEl = document.getElementById('shift-dept-label');
    if (labelEl) labelEl.textContent = dept;
    renderShiftRows(cfg);
    document.getElementById('modal-shift').classList.add('show');
    hrScheduleIcons();
  }
  // Vẽ các dòng thời gian ca: hành chính = Sáng/Chiều; làm ca = Ca ngày/Ca đêm
  // Bảng cấu hình ca: Tên ca · Bắt đầu · Kết thúc · Nghỉ (giờ — chỉ Làm ca)
  function renderShiftRows(cfg) {
    const type = cfg.type || 'hanhchinh';
    const preset = BOARD_SHIFT_PRESETS[type];
    const shifts = (cfg.shifts && cfg.shifts.length) ? cfg.shifts : preset.shifts;
    document.querySelectorAll('input[name="shift-type"]').forEach(r => { r.checked = r.value === type; });
    const box = document.getElementById('shift-rows');
    if (!box) return;
    const isCa = type === 'lamca';
    box.innerHTML = `<div class="shift-row-head">
        <span>Tên ca</span><span>Bắt đầu</span><span>Kết thúc</span><span>Nghỉ (giờ)</span>
      </div>` +
      shifts.map((s, i) => {
        const brk = hrShiftBrkH({ type, shifts }, i);
        return `
      <div class="shift-row">
        <input type="text" data-shift-i="${i}" data-shift-f="name" value="${escapeHTML(s.name || '')}" placeholder="Tên ca">
        <input type="time" data-shift-i="${i}" data-shift-f="start" value="${escapeHTML(s.start || '')}" step="1800">
        <input type="time" data-shift-i="${i}" data-shift-f="end" value="${escapeHTML(s.end || '')}" step="1800">
        ${isCa
          ? `<input type="number" data-shift-i="${i}" data-shift-f="brk" value="${brk}" min="0" max="6" step="0.5"
               title="Số giờ NGHỈ của ca — trừ vào GIỮA CA, KHÔNG tính vào HC lẫn TC (VD 1.5 = 1h30)">`
          : `<span class="shift-row-na" title="Nghỉ trưa nằm giữa 2 buổi — hệ thống tự loại khỏi HC/TC">— nghỉ trưa —</span>`}
      </div>`;
      }).join('') +
      `<div style="font-size:0.72rem;color:var(--text-muted);">Hành chính: các ca gộp thành 1 cột/ngày · Làm ca: mỗi ca là 1 cột riêng — ô <b>Nghỉ (giờ)</b> chỉ dùng ở <b>Làm ca</b> và trừ vào <b>GIỮA CA</b> (VD Ca ngày 07:00–17:30 nghỉ 1h30 → nghỉ 11:30–13:00; làm đủ ca = 9h HC; làm nửa ngày 13:00–17:30 vẫn được 4h30 HC. Để trống = mặc định ca 1 nghỉ 1h30, ca sau nghỉ 1h).</div>`;
  }
  // Đổi loại ca trong modal → nạp lại giờ mặc định của loại đó (chưa lưu)
  function setShiftTypePreset(type) {
    if (!BOARD_SHIFT_PRESETS[type]) return;
    const dept = state.hrBoardDept || 'Xưởng 2';
    const cfg = hrShiftCfg(dept);
    const preset = BOARD_SHIFT_PRESETS[type];
    const cur = { ...cfg, type };
    cur.shifts = (cfg.type === type) ? (cfg.shifts || preset.shifts) : preset.shifts;
    renderShiftRows(cur);
  }
  function closeShiftModal() {
    document.getElementById('modal-shift')?.classList.remove('show');
  }
  function handleShiftSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const dept = document.getElementById('shift-dept').value;
    const typeEl = document.querySelector('input[name="shift-type"]:checked');
    const type = typeEl ? typeEl.value : 'hanhchinh';
    const rows = {};
    document.querySelectorAll('#shift-rows [data-shift-i]').forEach(inp => {
      const i = inp.getAttribute('data-shift-i');
      rows[i] = rows[i] || { name: '', start: '', end: '', brk: '' };
      rows[i][inp.getAttribute('data-shift-f')] = inp.value.trim();
    });
    // NGHỈ (giờ) của ca — chỉ Làm ca; để trống = mặc định (ca 1 = 1h30, ca sau = 1h);
    // Hành chính luôn 0 (nghỉ trưa tự loại giữa 2 buổi)
    const shifts = Object.keys(rows).sort((a, b) => a - b).map(i => rows[i]).filter(s => s.start && s.end)
      .map((s, i) => {
        const raw = String(s.brk == null ? '' : s.brk).replace(',', '.');
        let brk = Number(raw);
        if (raw === '' || !Number.isFinite(brk) || brk < 0) brk = (type === 'lamca') ? (i === 0 ? 1.5 : 1) : 0;
        return { name: s.name, start: s.start, end: s.end, brk: Math.min(brk, 6) };
      });
    if (!shifts.length) { showToast('Cần ít nhất 1 ca có giờ bắt đầu và giờ kết thúc!', 'error'); return; }
    const idx = (state.hrShifts || []).findIndex(s => s.id === dept);
    // ⚠ Engine tính giờ đọc CẤU HÌNH CA SỐNG (không lưu bản chụp) → đổi giờ /
    // giờ nghỉ sẽ TÍNH LẠI cả dữ liệu cũ (Bảng bố trí, Đối chiếu máy, Bảng
    // chấm công tháng, Thống kê đi làm). Phải cảnh báo trước khi lưu.
    if (idx !== -1) {
      const prevCfg = state.hrShifts[idx] || {};
      const pick = list => JSON.stringify((list || []).map(s => ({ start: s.start, end: s.end, brk: s.brk })));
      const hasHistory = (state.hrAssignments || []).some(a => a && a.department === dept);
      if (hasHistory && pick(prevCfg.shifts) !== pick(shifts)) {
        const ok = confirm(
          `Đổi giờ / giờ nghỉ của ca "${dept}" sẽ TÍNH LẠI toàn bộ lịch sử của bộ phận này:\n` +
          `• Bảng bố trí (giờ công các ngày đã qua)\n` +
          `• Đối chiếu Bố trí ↔ Máy chấm công (HC / TC / hiệu lực ca đêm)\n` +
          `• Bảng chấm công tháng + Thống kê đi làm\n\n` +
          `Các lượt bố trí để trống "giờ kết thúc" (= hết ca) sẽ lấy giờ kết thúc MỚI.\nTiếp tục lưu?`
        );
        if (!ok) return;
      }
    }
    const cfg = { id: dept, type, shifts, updatedAt: new Date().toISOString() };
    if (idx !== -1) state.hrShifts[idx] = { ...state.hrShifts[idx], ...cfg };
    else { cfg.createdAt = new Date().toISOString(); state.hrShifts.push(cfg); }
    saveHrData();
    closeShiftModal();
    renderHrView();
    showToast(`Đã lưu ca làm việc cho ${dept}: ${type === 'lamca' ? shifts.length + ' ca' : 'Hành chính'}`, 'success');
  }

  // ─── NHẬP NHÂN VIÊN TỪ FILE EXCEL ──────────────────────────────
  // Đọc file .xlsx/.xls/.csv → tự nhận cột theo tiêu đề → xem trước &
  // đổi ánh xạ cột → nhập: thêm mới tất cả HOẶC cập nhật theo Mã NV.
  const EMPLOYEE_IMPORT_FIELDS = [
    { key: 'code',       label: 'Mã NV',        hints: ['ma nv', 'ma nhan vien', 'manv', 'code', 'staff code', 'ma so', 'msnv'] },
    { key: 'name',       label: 'Họ và Tên',    hints: ['ho va ten', 'ho ten', 'ten nhan vien', 'full name', 'ho ten nv'] },
    { key: 'gender',     label: 'Giới Tính',    hints: ['gioi tinh', 'gender', 'gt'] },
    { key: 'birthDate',  label: 'Ngày Sinh',    hints: ['ngay sinh', 'nam sinh', 'birthday'] },
    { key: 'phone',      label: 'SĐT',          hints: ['sdt', 'so dien thoai', 'dien thoai', 'phone', 'mobile'] },
    { key: 'idCard',     label: 'CCCD / CMND',  hints: ['cccd', 'cmnd', 'so cccd', 'cmt', 'can cuoc'] },
    { key: 'address',    label: 'Địa Chỉ',       hints: ['dia chi', 'address', 'noi o', 'que quan'] },
    { key: 'department', label: 'Bộ Phận',       hints: ['bo phan', 'phong ban', 'department', 'xuong'] },
    { key: 'position',   label: 'Vị Trí',       hints: ['vi tri', 'chuc danh', 'position', 'cong viec'] },
    { key: 'title',      label: 'Chức Vụ',       hints: ['chuc vu', 'title', 'cap bac'] },
    { key: 'joinDate',   label: 'Ngày Vào Làm',  hints: ['ngay vao lam', 'ngay vao', 'ngay tuyen', 'ngay bat dau', 'join date', 'ngay vao cty'] },
    { key: 'quitDate',   label: 'Ngày Nghỉ Việc', hints: ['ngay nghi viec', 'ngay nghi', 'nghi viec', 'quit date', 'ngay ket thuc'] },
    { key: 'status',     label: 'Trạng Thái',    hints: ['trang thai', 'status', 'tinh trang'] },
    { key: 'notes',      label: 'Ghi Chú',       hints: ['ghi chu', 'note', 'notes', 'remark', 'dien giai'] }
  ];

  // Bỏ dấu tiếng Việt + lowercase để so khớp tiêu đề cột
  function hrStripDiacritics(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  }
  // Chuẩn hóa tên để SO KHỚP (gộp khoảng trắng thừa — nhập tay hay bị
  // "Nguyễn Văn  A" 2 dấu cách). Dùng chung cho HR + Xuất Excel + Biểu đồ.
  function hrStripForMatch(s) {
    return hrStripDiacritics(s).replace(/\s+/g, ' ');
  }

  // Tự ánh xạ 1 tiêu đề cột → trường nhân viên (tránh trùng trường đã dùng)
  function autoMapEmployeeField(headerText, usedKeys) {
    const t = hrStripDiacritics(headerText);
    if (!t) return null;
    for (const f of EMPLOYEE_IMPORT_FIELDS) {
      if (usedKeys.has(f.key)) continue;
      if (f.hints.some(h => t === h || t.includes(h))) return f.key;
    }
    return null;
  }

  function hrPad2(n) { return String(n).padStart(2, '0'); }

  // Chuẩn hóa ngày về yyyy-MM-dd: nhận Date, số serial Excel, dd/MM/yyyy, yyyy-MM-dd...
  function hrNormDate(v) {
    if (v === undefined || v === null || v === '') return '';
    if (v instanceof Date && !isNaN(v.getTime())) {
      return `${v.getFullYear()}-${hrPad2(v.getMonth() + 1)}-${hrPad2(v.getDate())}`;
    }
    if (typeof v === 'number' && isFinite(v)) {
      // Excel serial date (mốc 1899-12-30, theo UTC để không lệch ngày theo múi giờ)
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
      return `${d.getUTCFullYear()}-${hrPad2(d.getUTCMonth() + 1)}-${hrPad2(d.getUTCDate())}`;
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);   // yyyy-MM-dd
    if (m) return `${m[1]}-${hrPad2(m[2])}-${hrPad2(m[3])}`;
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);        // dd/MM/yyyy
    if (m) return `${m[3]}-${hrPad2(m[2])}-${hrPad2(m[1])}`;
    return '';
  }

  function hrNormGender(v) {
    const t = hrStripDiacritics(v);
    if (!t) return 'Nam';
    if (t.startsWith('nu') || t.includes('female') || t === 'f') return 'Nữ';
    return 'Nam';
  }

  function hrNormStatus(v) {
    const t = hrStripDiacritics(v);
    if (!t) return 'active';
    if (t.includes('tam nghi')) return 'pause';
    if (t.includes('nghi viec') || t.includes('da nghi')) return 'quit';
    return 'active';
  }

  // Chuẩn hóa bộ phận về 1 trong 6 bộ phận chuẩn; không khớp thì giữ nguyên tên gốc
  function hrNormDept(v) {
    const raw = String(v || '').trim();
    const t = hrStripDiacritics(raw);
    if (!t) return HR_DEPARTMENTS[0];
    if (t.includes('van phong')) return 'Văn Phòng';
    if (t.includes('qc') || t.includes('chat luong')) return 'QC';
    if (t.includes('co dien')) return 'Cơ Điện';
    // "Lò Hơi" đã gộp vào "Cơ Điện" (21/10/2026)
    if (t.includes('lo hoi')) return 'Cơ Điện';
    if (t.includes('xuong 1') || t === 'x1') return 'Xưởng 1';
    if (t.includes('xuong 2') || t === 'x2') return 'Xưởng 2';
    return hrDeptAliasOf(raw);
  }

  // Danh sách tùy chọn Bộ Phận: 5 bộ phận chuẩn + các bộ phận KHÁC có sẵn trong
  // dữ liệu (đã gom nhãn cũ "Lò Hơi" về "Cơ Điện" để không sinh lựa chọn trùng).
  function hrDeptOptions() {
    const extra = [...new Set((state.hrEmployees || []).map(e => hrDeptAliasOf(e.department)).filter(Boolean))]
      .filter(d => !HR_DEPARTMENTS.includes(d));
    return [...HR_DEPARTMENTS, ...extra].map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
  }

  // ── Luồng nhập: chọn file → đọc sheet → tự ánh xạ cột → xem trước → nhập
  // CHỐNG TREO (19/10/2026): `sheet_to_json` đọc theo `ws['!ref']` (vùng Excel tự
  // khai báo), KHÔNG theo ô có dữ liệu. File có kẻ khung/format ở cột xa hoặc
  // hàng trống rất nhiều ⇒ `!ref` phình (VD A1:ZZ20000 dù chỉ có 200 dòng thật)
  // ⇒ materialize hàng trăm nghìn ô, đo thật 10,3 giây / 283 MB → "Page
  // Unresponsive". Vì vậy: (1) tự tính VÙNG DÙNG THẬT rồi truyền `range`;
  // (2) cắt cột/dòng trống cuối + chặn trần; (3) hiện overlay chờ.
  const HR_IMPORT_MAX_COLS = 80;    // trần số cột đưa vào bảng ánh xạ
  const HR_IMPORT_MAX_ROWS = 5000;  // trần số dòng dữ liệu
  const HR_IMPORT_WARN_MB  = 12;    // cảnh báo file lớn
  const HR_IMPORT_MAX_MB   = 30;    // từ chối file quá lớn

  let employeeImportSheet = null; // { aoa, headers, rows, mapping, fileName, sheetName }

  // Đổi địa chỉ ô ("AB12") → { r, c } (0-based) — parse tay để không phụ thuộc XLSX
  function hrCellAddrToRC(addr) {
    const m = String(addr || '').match(/^([A-Za-z]+)(\d+)$/);
    if (!m) return null;
    const letters = m[1].toUpperCase();
    let c = 0;
    for (let i = 0; i < letters.length; i++) c = c * 26 + (letters.charCodeAt(i) - 64);
    return { r: parseInt(m[2], 10) - 1, c: c - 1 };
  }

  // VÙNG DÙNG THẬT của sheet (chỉ tính ô có giá trị) + cờ vượt trần cột/dòng.
  // Tuyệt đối không tin `!ref`: file thật hay khai báo tới cột XFD hàng chục
  // nghìn dòng trống ⇒ đọc hết sẽ treo trình duyệt.
  function hrSheetUsedRange(ws) {
    const empty = { range: { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }, cols: 0, rows: 0, colsCapped: false, rowsCapped: false };
    if (!ws || typeof ws !== 'object') return empty;
    let maxR = -1, maxC = -1;
    Object.keys(ws).forEach(addr => {
      if (!addr || addr.charCodeAt(0) === 33) return; // bỏ !ref / !merges / !cols / !margins…
      const cell = ws[addr];
      if (!cell || typeof cell !== 'object') return;
      const v = cell.v;
      if (v === undefined || v === null || String(v).trim() === '') return; // ô format suông / ô rỗng
      const pos = hrCellAddrToRC(addr);
      if (!pos) return;
      if (pos.r > maxR) maxR = pos.r;
      if (pos.c > maxC) maxC = pos.c;
    });
    if (maxR < 0 || maxC < 0) return empty;
    return {
      range: {
        s: { r: 0, c: 0 },
        e: { r: Math.min(maxR, HR_IMPORT_MAX_ROWS - 1), c: Math.min(maxC, HR_IMPORT_MAX_COLS - 1) }
      },
      cols: maxC + 1,
      rows: maxR + 1,
      colsCapped: (maxC + 1) > HR_IMPORT_MAX_COLS,
      rowsCapped: (maxR + 1) > HR_IMPORT_MAX_ROWS
    };
  }

  // ─── CHUẨN HÓA KHÓA SO KHỚP (chống tạo dòng trùng khi nạp) ────────
  // Mã NV: bỏ khoảng trắng/ký tự lạ, IN HOA, bỏ số 0 vô nghĩa:
  // "NV 001" · "nv001" · số 1 (Excel lưu dạng số) → cùng khóa "NV1".
  function hrNormCode(v) {
    if (v === undefined || v === null) return '';
    let s = String(v).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!s) return '';
    s = s.replace(/^([A-Z]*)0+(\d)/, '$1$2');
    return s;
  }

  // Tên để so khớp: bỏ dấu + bỏ ký tự lạ + gộp khoảng trắng + lowercase
  // ("Nguyễn  Văn A." ≡ "nguyen van a").
  function hrNormNameKey(v) {
    return hrStripForMatch(v).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Chỉ giữ chữ số, lấy 9 số cuối (SĐT/CCCD hay ghi +84 / 0… lệch đầu số)
  function hrDigits9(v) {
    const d = String(v === undefined || v === null ? '' : v).replace(/\D/g, '');
    return d.length >= 9 ? d.slice(-9) : '';
  }

  // Giới tính / Trạng thái dạng CHẶT: không nhận ra thì trả '' (KHÔNG mặc định)
  // — dùng khi CẬP NHẬT để ô ghi chữ lạ không tự đổi dữ liệu đang đúng.
  function hrNormGenderStrict(v) {
    const t = hrStripDiacritics(v);
    if (!t) return '';
    if (t.startsWith('nu') || t.includes('female') || t === 'f') return 'Nữ';
    if (t.startsWith('nam') || t.includes('male') || t === 'm') return 'Nam';
    return '';
  }
  function hrNormStatusStrict(v) {
    const t = hrStripDiacritics(v);
    if (!t) return '';
    if (t.includes('tam nghi')) return 'pause';
    if (t.includes('nghi viec') || t.includes('da nghi') || t.includes('nghi huu')) return 'quit';
    if (t.includes('dang lam') || t.includes('lam viec') || t.includes('di lam') || t === 'active' || t.includes('hoat dong')) return 'active';
    return '';
  }

  // Mã NV kế tiếp chưa dùng (NV001, NV002…) — cùng quy ước với form Thêm nhân viên.
  // `usedSet` (tùy chọn) để nạp hàng loạt không phải quét lại nhiều lần.
  function hrNextEmployeeCode(usedSet) {
    const used = usedSet || new Set((state.hrEmployees || []).map(e => hrNormCode(e.code)).filter(Boolean));
    for (let i = 1; i <= 99999; i++) {
      const code = 'NV' + String(i).padStart(3, '0');
      const key = hrNormCode(code);
      if (!used.has(key)) { used.add(key); return code; }
    }
    return 'NV' + Date.now();
  }

  // Lập chỉ mục nhân viên đã có (Mã NV · Họ tên · SĐT) — O(N) một lần cho cả file
  function hrEmpIndexBuild(list) {
    const byCode = new Map(), byName = new Map(), byPhone = new Map();
    (list || []).forEach(e => {
      const ck = hrNormCode(e.code);
      if (ck && !byCode.has(ck)) byCode.set(ck, e);
      const nk = hrNormNameKey(e.name);
      if (nk) {
        if (!byName.has(nk)) byName.set(nk, []);
        byName.get(nk).push(e);
      }
      const p9 = hrDigits9(e.phone);
      if (p9 && !byPhone.has(p9)) byPhone.set(p9, e);
    });
    return { byCode, byName, byPhone };
  }

  function hrEmpIndexAdd(index, emp) {
    const ck = hrNormCode(emp.code);
    if (ck && !index.byCode.has(ck)) index.byCode.set(ck, emp);
    const nk = hrNormNameKey(emp.name);
    if (nk) {
      if (!index.byName.has(nk)) index.byName.set(nk, []);
      index.byName.get(nk).push(emp);
    }
    const p9 = hrDigits9(emp.phone);
    if (p9 && !index.byPhone.has(p9)) index.byPhone.set(p9, emp);
  }

  // Tìm nhân viên đã có ứng với 1 dòng file.
  // Trả { emp, how:'code'|'name'|'phone' } · { emp:null, ambiguous:[...] } ·
  //      { emp:null, conflict:'trùng tên nhưng khác Mã NV' } · { emp:null }
  function hrFindEmployeeMatch(row, index) {
    const codeK = hrNormCode(row.code);
    const nameK = hrNormNameKey(row.name);
    const p9 = hrDigits9(row.phone);
    const idc = hrDigits9(row.idCard);
    if (codeK && index.byCode.has(codeK)) return { emp: index.byCode.get(codeK), how: 'code' };

    const sameName = nameK ? (index.byName.get(nameK) || []) : [];
    if (sameName.length === 1) {
      const found = sameName[0];
      // Người cũ ĐÃ CÓ mã, dòng mới có mã KHÁC ⇒ coi là người khác (trùng tên),
      // KHÔNG ghi đè lên hồ sơ người cũ.
      if (codeK && hrNormCode(found.code) && hrNormCode(found.code) !== codeK) {
        return { emp: null, conflict: 'trùng tên nhưng khác Mã NV' };
      }
      return { emp: found, how: 'name' };
    }
    if (sameName.length > 1) {
      // Nhiều người cùng tên → thu hẹp bằng SĐT / CCCD / ngày sinh; vẫn mơ hồ
      // thì KHÔNG tự sửa (tránh sửa nhầm người).
      let pool = sameName;
      if (p9) { const p = pool.filter(e => hrDigits9(e.phone) === p9); if (p.length) pool = p; }
      if (pool.length > 1 && idc) { const p = pool.filter(e => hrDigits9(e.idCard) === idc); if (p.length) pool = p; }
      if (pool.length > 1 && row.birthDate) { const p = pool.filter(e => String(e.birthDate || '') === row.birthDate); if (p.length) pool = p; }
      if (pool.length === 1) return { emp: pool[0], how: 'name' };
      return { emp: null, ambiguous: sameName.map(e => e.name) };
    }
    if (p9 && index.byPhone.has(p9)) return { emp: index.byPhone.get(p9), how: 'phone' };
    return { emp: null };
  }

  // mapping UI dạng { colIndex: fieldKey } → { fieldKey: colIndex }
  function hrImportColMap(mapping) {
    const colByField = {};
    Object.keys(mapping || {}).forEach(col => {
      const f = mapping[col];
      if (f) colByField[f] = parseInt(col, 10);
    });
    return colByField;
  }

  // Đọc 1 dòng file → giá trị ĐÃ CHUẨN HÓA; ô trống trả '' (để luật "ô trống
  // KHÔNG ghi đè dữ liệu đang có" hoạt động đúng).
  function hrImportRowValues(row, colByField) {
    if (!row || !row.length) return null;
    const get = field => {
      const col = colByField[field];
      return (col === undefined || col === null) ? '' : row[col];
    };
    const text = v => String(v === undefined || v === null ? '' : v).trim();
    const has = v => text(v) !== '';
    const name = text(get('name'));
    const incoming = {
      code: hrNormCode(get('code')) ? text(get('code')) : '',
      name,
      gender: has(get('gender')) ? hrNormGenderStrict(get('gender')) : '',
      birthDate: hrNormDate(get('birthDate')),
      phone: text(get('phone')),
      idCard: text(get('idCard')),
      address: text(get('address')),
      department: has(get('department')) ? hrNormDept(get('department')) : '',
      position: text(get('position')),
      title: text(get('title')),
      joinDate: hrNormDate(get('joinDate')),
      status: has(get('status')) ? hrNormStatusStrict(get('status')) : '',
      notes: text(get('notes'))
    };
    return { name, incoming, get };
  }

  // Đếm số dòng trong file TRÙNG nhân viên đã có (cảnh báo trước khi chọn
  // "Thêm mới tất cả" — tránh nhân đôi danh sách khi nạp lại cùng 1 file).
  function hrCountImportMatches(aoa, mapping) {
    const colByField = hrImportColMap(mapping);
    const index = hrEmpIndexBuild(state.hrEmployees || []);
    let n = 0;
    for (let r = 1; r < (aoa || []).length; r++) {
      const vals = hrImportRowValues(aoa[r], colByField);
      if (!vals || !vals.name) continue;
      if (hrFindEmployeeMatch(vals.incoming, index).emp) n++;
    }
    return n;
  }

  function openEmployeeImportModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-employee-import');
    if (!modal) return;
    employeeImportSheet = null;
    const fileInput = document.getElementById('employee-import-file');
    if (fileInput) fileInput.value = '';
    const box = document.getElementById('emp-import-mapping-box');
    if (box) box.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;margin:0;">Chưa chọn file — bấm chọn file Excel để hệ thống đọc tiêu đề cột và tự ánh xạ.</p>';
    const doBtn = document.getElementById('btn-do-employee-import');
    if (doBtn) doBtn.disabled = true;
    // Xóa kết quả của lần nạp trước (nếu có)
    const resBox = document.getElementById('emp-import-result');
    if (resBox) { resBox.hidden = true; resBox.innerHTML = ''; }
    modal.classList.add('show');
    hrScheduleIcons();
  }

  function closeEmployeeImportModal() {
    document.getElementById('modal-employee-import')?.classList.remove('show');
  }

  function handleEmployeeImportFile(e) {
    const file = e && e.target && e.target.files && e.target.files[0];
    if (!file) return;
    if (!window.XLSX) { showToast('Thư viện đọc Excel chưa sẵn sàng. Kiểm tra kết nối mạng!', 'error'); return; }
    const sizeMb = (file.size || 0) / 1048576;
    if (sizeMb > HR_IMPORT_MAX_MB) {
      showToast(`File "${file.name}" quá lớn (${sizeMb.toFixed(1)} MB > ${HR_IMPORT_MAX_MB} MB). Hãy tách bớt dữ liệu rồi nạp lại!`, 'error');
      return;
    }
    // Reset trạng thái cũ — tránh nạp nhầm file trước khi đọc file mới
    employeeImportSheet = null;
    const doBtn0 = document.getElementById('btn-do-employee-import');
    if (doBtn0) doBtn0.disabled = true;
    const box0 = document.getElementById('emp-import-mapping-box');
    if (box0) box0.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;margin:0;">Đang đọc file… (file lớn có thể mất vài giây)</p>';
    const resBox0 = document.getElementById('emp-import-result');
    if (resBox0) { resBox0.hidden = true; resBox0.innerHTML = ''; }

    const reader = new FileReader();
    showTreLoading('Đang đọc file Excel…');
    reader.onload = (evt) => {
      // Nhường 1 nhịp để overlay chờ kịp vẽ (XLSX.read + sheet_to_json là ĐỒNG BỘ)
      setTimeout(() => {
        let treOk = true;
        try {
          const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array', cellDates: true });
          const sheetName = (wb.SheetNames && wb.SheetNames[0]) || '';
          const ws = sheetName ? wb.Sheets[sheetName] : null;
          if (!ws) throw new Error('File không có sheet dữ liệu!');

          // ─── ĐỌC THEO VÙNG DÙNG THẬT (chống treo "Page Unresponsive") ───
          const used = hrSheetUsedRange(ws);
          const aoa = XLSX.utils.sheet_to_json(ws, {
            header: 1, raw: true, defval: '', blankrows: false, range: used.range
          });
          // Dòng tiêu đề = dòng đầu tiên có ≥2 ô không trống (tránh dòng trang trí)
          let headerIdx = 0;
          for (let i = 0; i < Math.min(aoa.length, 10); i++) {
            const filled = (aoa[i] || []).filter(c => String(c === undefined || c === null ? '' : c).trim() !== '').length;
            if (filled >= 2) { headerIdx = i; break; }
          }
          const rawHeaders = (aoa[headerIdx] || []).map(c => String(c === undefined || c === null ? '' : c).trim());
          if (!rawHeaders.filter(Boolean).length) throw new Error('Không tìm thấy dòng tiêu đề cột (cần ≥2 ô có chữ ở dòng đầu).');
          // Cắt cột trống ở CUỐI (Excel hay khai báo thừa cột)
          let lastCol = rawHeaders.length - 1;
          while (lastCol >= 0 && rawHeaders[lastCol] === '') lastCol--;
          const headers = rawHeaders.slice(0, lastCol + 1);
          let rows = aoa.slice(headerIdx + 1)
            .map(r => (Array.isArray(r) ? r.slice(0, lastCol + 1) : []))
            .filter(r => r.some(c => String(c === undefined || c === null ? '' : c).trim() !== ''));
          if (!rows.length) throw new Error('File không có dòng dữ liệu nào!');
          const trimmedRows = rows.length > HR_IMPORT_MAX_ROWS;
          if (trimmedRows) rows = rows.slice(0, HR_IMPORT_MAX_ROWS);

          // Tự ánh xạ cột theo tiêu đề
          const mapping = {};
          const usedKeys = new Set();
          headers.forEach((h, col) => {
            const key = h ? autoMapEmployeeField(h, usedKeys) : null;
            mapping[col] = key;
            if (key) usedKeys.add(key);
          });

          employeeImportSheet = { aoa: [headers, ...rows], headers, rows, mapping, fileName: file.name, sheetName };
          renderEmployeeImportMapping(headers, rows, mapping);
          const doBtn = document.getElementById('btn-do-employee-import');
          if (doBtn) doBtn.disabled = false;

          const warns = [];
          if (used.colsCapped) warns.push(`chỉ đọc ${HR_IMPORT_MAX_COLS}/${used.cols} cột`);
          if (trimmedRows) warns.push(`chỉ đọc ${HR_IMPORT_MAX_ROWS}/${used.rows} dòng`);
          if (sizeMb > HR_IMPORT_WARN_MB) warns.push(`file ${sizeMb.toFixed(1)} MB`);
          showToast(`Đã đọc ${rows.length} dòng từ "${file.name}"` +
            (warns.length ? ` (${warns.join(' · ')})` : '') +
            ' — kiểm tra ánh xạ cột rồi bấm Nhập', warns.length ? 'info' : 'success');
        } catch (err) {
          treOk = false;
          const box = document.getElementById('emp-import-mapping-box');
          if (box) box.innerHTML = `<p style="color:#dc2626;font-size:0.8rem;margin:0;">⚠ ${escapeHTML(String((err && err.message) || err))}</p>`;
          showToast('Không đọc được file Excel: ' + String((err && err.message) || err), 'error');
        } finally {
          hideTreLoading(treOk);
        }
      }, 0);
    };
    reader.onerror = () => {
      hideTreLoading(false);
      showToast('Không đọc được file (lỗi FileReader)!', 'error');
    };
    reader.readAsArrayBuffer(file);
  }

  function renderEmployeeImportMapping(headers, rows, mapping) {
    const box = document.getElementById('emp-import-mapping-box');
    if (!box) return;
    const fieldOptions = '<option value="">-- Bỏ qua --</option>' +
      EMPLOYEE_IMPORT_FIELDS.map(f => `<option value="${f.key}">${escapeHTML(f.label)}</option>`).join('');
    // Chỉ vẽ tối đa HR_IMPORT_MAX_COLS cột — mỗi cột là 1 <select> + 14 <option>,
    // vẽ hàng nghìn cột sẽ treo trình duyệt.
    const cols = headers.slice(0, HR_IMPORT_MAX_COLS);
    const mapRows = cols.map((h, col) => {
      const sample = String(((rows[0] || [])[col]) === undefined || ((rows[0] || [])[col]) === null ? '' : (rows[0] || [])[col]);
      return `
      <tr>
        <td><strong>${escapeHTML(h || ('Cột ' + (col + 1)))}</strong></td>
        <td><select data-import-col="${col}">${fieldOptions}</select></td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(sample)}">${escapeHTML(sample)}</td>
      </tr>`;
    }).join('');
    const droppedCols = Math.max(0, headers.length - cols.length);
    box.innerHTML = `
      <p style="font-size:0.78rem; margin:0 0 8px; font-weight:700;">Ánh xạ cột file Excel → trường nhân viên</p>
      <div class="table-responsive" style="max-height:260px; border:1px solid var(--border-color); border-radius:var(--radius-md);">
        <table class="data-table">
          <thead><tr><th>Cột trong file</th><th>Trường nhân viên</th><th>Ví dụ (dòng đầu)</th></tr></thead>
          <tbody>${mapRows}</tbody>
        </table>
      </div>
      ${droppedCols ? `<p style="font-size:0.72rem;color:var(--text-muted);margin:6px 0 0;">Đã bỏ ${droppedCols} cột vượt trần ${HR_IMPORT_MAX_COLS} cột (chỉ đọc ${HR_IMPORT_MAX_COLS} cột đầu).</p>` : ''}`;
    // Gán giá trị tự ánh xạ vào từng select
    Object.keys(mapping).forEach(col => {
      const sel = box.querySelector(`select[data-import-col="${col}"]`);
      if (sel) sel.value = mapping[col] || '';
    });
  }

  // Nhập toàn bộ sheet vào state theo ánh xạ + chế độ.
  //   mode 'upsert' : khớp Mã NV → Họ tên (→ SĐT) thì CẬP NHẬT, chưa có thì thêm mới.
  //   mode 'add'    : thêm mới tất cả (vẫn đếm dòng "nghi trùng" để báo).
  // LUẬT GỘP "chỉ điền, không xóa": ô TRỐNG trong file KHÔNG ghi đè dữ liệu đang
  // có; ô CÓ dữ liệu thì cập nhật ⇒ nạp file thiếu cột = BỔ SUNG thông tin còn thiếu.
  // Trả về { added, updated, filled, unchanged, skipped, duplicates, ambiguous,
  //          nameConflicts, addedNames, updatedNames, duplicateNames,
  //          ambiguousNames, conflictNames }.
  function importEmployeesFromSheet(aoa, mapping, mode) {
    const result = {
      added: 0, updated: 0, filled: 0, unchanged: 0, skipped: 0,
      duplicates: 0, ambiguous: 0, nameConflicts: 0,
      addedNames: [], updatedNames: [], duplicateNames: [],
      ambiguousNames: [], conflictNames: []
    };
    const colByField = hrImportColMap(mapping);
    const list = state.hrEmployees || (state.hrEmployees = []);
    const index = hrEmpIndexBuild(list);
    const usedIds = new Set(list.map(e => e.id));
    const usedCodes = new Set(list.map(e => hrNormCode(e.code)).filter(Boolean));
    const pushName = (arr, n) => { if (arr.length < 10) arr.push(n); };
    let seq = 0;
    let codeSeq = 1;
    const takeCode = () => {
      for (let i = codeSeq; i <= 99999; i++) {
        const code = 'NV' + String(i).padStart(3, '0');
        const key = hrNormCode(code);
        if (!usedCodes.has(key)) { usedCodes.add(key); codeSeq = i + 1; return code; }
      }
      return 'NV' + Date.now();
    };

    for (let r = 1; r < aoa.length; r++) {
      const vals = hrImportRowValues(aoa[r], colByField);
      if (!vals) continue;
      const { name, incoming, get } = vals;
      if (!name) { result.skipped++; continue; }

      const match = hrFindEmployeeMatch(incoming, index);

      // ── CẬP NHẬT (chỉ ở chế độ upsert) ──────────────────────────────
      if (mode === 'upsert' && match.emp) {
        const cur = match.emp;
        const patch = {};
        let filled = 0;
        ['code', 'gender', 'birthDate', 'phone', 'idCard', 'address',
          'department', 'position', 'title', 'joinDate', 'status', 'notes'].forEach(f => {
          const val = incoming[f];
          // Ô TRỐNG trong file ⇒ GIỮ NGUYÊN dữ liệu đang có (không xóa oan)
          if (val === undefined || val === null || String(val).trim() === '') return;
          const oldVal = String(cur[f] === undefined || cur[f] === null ? '' : cur[f]).trim();
          if (oldVal === String(val).trim()) return;
          patch[f] = val;
          if (!oldVal) filled++;   // đang trống → nay được BỔ SUNG
        });
        if (String(cur.name || '').trim() !== name) patch.name = name;
        // Trạng thái nghỉ việc phải khớp quitDate (giống form Thêm/Sửa nhân viên)
        const nextStatus = patch.status || (cur.status || 'active');
        if (nextStatus === 'quit') {
          const qd = hrNormDate(get('quitDate')) || String(cur.quitDate || '');
          if (qd && qd !== String(cur.quitDate || '')) patch.quitDate = qd;
        } else if (cur.quitDate) {
          patch.quitDate = '';
        }
        if (Object.keys(patch).length) {
          patch.updatedAt = new Date().toISOString();
          Object.assign(cur, patch); // giữ id / createdAt / skills / dữ liệu khác
          result.updated++;
          result.filled += filled;
          pushName(result.updatedNames, name);
        } else {
          result.unchanged++;
        }
        continue;
      }

      // ── Không rõ là ai (nhiều người trùng tên) ⇒ KHÔNG tự sửa, KHÔNG thêm ──
      if (mode === 'upsert' && match.ambiguous) {
        result.ambiguous++;
        pushName(result.ambiguousNames, name);
        continue;
      }
      if (match.emp) {
        // "Thêm mới tất cả": dòng trùng người đã có → vẫn thêm nhưng ĐẾM để báo
        result.duplicates++;
        pushName(result.duplicateNames, name);
      } else if (match.conflict) {
        result.nameConflicts++;
        pushName(result.conflictNames, name);
      }

      // ── THÊM MỚI ───────────────────────────────────────────────────
      let newId;
      do {
        newId = `emp-${Date.now().toString(36)}-${(++seq).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      } while (usedIds.has(newId));
      usedIds.add(newId);

      const emp = {
        id: newId,
        code: incoming.code || takeCode(),
        name,
        gender: incoming.gender || hrNormGender(''),         // trống → 'Nam'
        birthDate: incoming.birthDate,
        phone: incoming.phone,
        idCard: incoming.idCard,
        address: incoming.address,
        department: incoming.department || hrNormDept(''),  // trống → bộ phận đầu
        position: incoming.position,
        title: incoming.title,
        joinDate: incoming.joinDate,
        status: incoming.status || hrNormStatus(''),        // trống → 'active'
        notes: incoming.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (emp.status === 'quit') {
        const qd = hrNormDate(get('quitDate'));
        if (qd) emp.quitDate = qd;
      }
      list.push(emp);
      hrEmpIndexAdd(index, emp);
      result.added++;
      pushName(result.addedNames, name);
    }
    return result;
  }

  // Bấm "Nhập Dữ Liệu": đọc lại ánh xạ + chế độ rồi nhập vào state
  function doEmployeeImport() {
    if (!requireEditPermission()) return;
    if (!employeeImportSheet) { showToast('Chưa chọn file Excel!', 'error'); return; }
    // Ánh xạ: bắt đầu từ bản TỰ NHẬN, chỉ đè các cột người dùng đã đổi trong bảng
    const mapping = Object.assign({}, employeeImportSheet.mapping || {});
    document.querySelectorAll('#emp-import-mapping-box select[data-import-col]').forEach(sel => {
      mapping[parseInt(sel.getAttribute('data-import-col'), 10)] = sel.value || null;
    });
    const upsertEl = document.getElementById('emp-import-mode-upsert');
    const mode = (upsertEl && upsertEl.checked) ? 'upsert' : 'add';
    const fileName = employeeImportSheet.fileName;

    // CẢNH BÁO TRÙNG trước khi "Thêm mới tất cả" — tránh nhân đôi danh sách
    // khi bấm nạp 2 lần cùng một file.
    if (mode === 'add') {
      const dup = hrCountImportMatches(employeeImportSheet.aoa, mapping);
      if (dup > 0 && !confirm(`Có ${dup} dòng trong file trùng nhân viên đã có (Mã NV / Họ tên / SĐT).\n\nOK = vẫn THÊM MỚI ${dup} dòng (danh sách sẽ có 2 dòng cùng người).\nCancel = quay lại đổi sang chế độ "Cập nhật".`)) return;
    }

    const res = importEmployeesFromSheet(employeeImportSheet.aoa, mapping, mode);
    saveHrData();
    renderHrView();
    renderEmployeeImportResult(res, fileName);
    const parts = [`thêm mới ${res.added}`, `cập nhật ${res.updated}`];
    if (res.filled) parts.push(`bổ sung ${res.filled} ô trống`);
    if (res.skipped) parts.push(`bỏ qua ${res.skipped} dòng thiếu tên`);
    if (res.duplicates) parts.push(`nghi trùng ${res.duplicates}`);
    if (res.ambiguous) parts.push(`trùng tên chưa rõ ${res.ambiguous}`);
    showToast(`Nạp xong từ "${fileName}": ${parts.join(' · ')}`,
      (res.added + res.updated) > 0 ? 'success' : 'info');
  }

  // Khối KẾT QUẢ NẠP — giữ modal mở để người dùng đối chiếu (không tự đóng),
  // nhờ vậy thấy ngay có bị tạo thêm dòng mới hay không.
  function renderEmployeeImportResult(res, fileName) {
    const box = document.getElementById('emp-import-result');
    if (!box) return;
    const row = (label, val, cls) => `<div class="emp-ires-row"><span class="emp-ires-k ${cls || ''}">${label}</span><span class="emp-ires-v">${val}</span></div>`;
    const names = arr => (arr && arr.length)
      ? escapeHTML(arr.slice(0, 6).join(', ')) + (arr.length > 6 ? ` … (+${arr.length - 6})` : '')
      : '—';
    box.innerHTML = `
      <p class="emp-ires-title">Kết quả nạp từ "${escapeHTML(fileName || '')}"</p>
      ${row('Thêm mới', res.added, 'is-add')}
      ${row('Cập nhật', res.updated, 'is-upd')}
      ${row('Bổ sung ô đang trống', res.filled || 0, 'is-fill')}
      ${row('Không đổi', res.unchanged || 0)}
      ${row('Bỏ qua (thiếu tên)', res.skipped || 0)}
      ${res.duplicates ? row('Nghi trùng — đã thêm mới', `${res.duplicates}: ${names(res.duplicateNames)}`, 'is-warn') : ''}
      ${res.nameConflicts ? row('Trùng tên khác Mã NV — đã thêm mới', `${res.nameConflicts}: ${names(res.conflictNames)}`, 'is-warn') : ''}
      ${res.ambiguous ? row('Trùng tên — KHÔNG tự sửa', `${res.ambiguous}: ${names(res.ambiguousNames)}`, 'is-warn') : ''}
      <p class="emp-ires-hint">Ô trống trong file KHÔNG ghi đè dữ liệu đang có. Hãy kiểm tra danh sách nhân viên trước khi đóng.</p>`;
    box.hidden = false;
  }

// ─── 8) THẺ NÔI — LAUNCHER BẂG NHÂN SỰ ─────────────────────────
  // Każda bảng Nhân Sự ma skróconą, pływającą kartę (hr-mini-card) w siatce
  // 5 thẻ na wiersz (desktop) / 3 (tablet) / 2 (telefon w pionie).
  // Bấm thẻ → otwórz szczegółowy bảng (xem / edycja), ponowne bấm → schowaj.
  // ─── 8) THẺ NÔI — LAUNCHER BẰNG DOCK 3 CẤP (19/10/2026) ────────
  // Cấp 1: nút HOME nổi giữa dưới → Cấp 2: 4 icon nhóm → Cấp 3: dải thẻ của
  // nhóm (các .hr-mini-card cũ, giữ nguyên id + listener). Trạng thái THUẦN UI
  // theo phiên (không lưu mây/backup); rời tab Nhân Sự thì tự đóng (main.js).
  const HR_DOCK_GROUPS = [
    { id: 'hoso',      label: 'Hồ sơ',      icon: 'users',       color: '#0284c7' },
    { id: 'ngaycong',  label: 'Ngày công',  icon: 'clock',       color: '#d97706' },
    { id: 'thongke',   label: 'Thống kê',   icon: 'bar-chart-3', color: '#0d9488' },
    { id: 'tuyendung', label: 'Tuyển dụng', icon: 'user-search', color: '#db2777' }
  ];
  let hrDockLevel = 0;   // 0 = đóng · 1 = chọn nhóm · 2 = chọn thẻ
  let hrDockGroup = '';

  function hrDockState() { return { level: hrDockLevel, group: hrDockGroup }; }
  function hrDockSetHidden(el, hidden) {
    if (!el) return;
    el.hidden = !!hidden;
    try { el.setAttribute('aria-hidden', hidden ? 'true' : 'false'); } catch (e) {}
  }
  function hrDockRender() {
    const dock = document.getElementById('hr-dock');
    if (!dock) return;
    try { dock.setAttribute('data-level', String(hrDockLevel)); } catch (e) {}
    if (dock.classList) {
      dock.classList.toggle('is-open', hrDockLevel > 0);
      dock.classList.toggle('is-group', hrDockLevel === 2);
    }
    const home = document.getElementById('hr-dock-home');
    if (home) {
      try {
        home.setAttribute('aria-expanded', hrDockLevel > 0 ? 'true' : 'false');
        home.setAttribute('title', hrDockLevel > 0 ? 'Đóng bảng Nhân Sự' : 'Mở bảng Nhân Sự');
      } catch (e) {}
    }
    hrDockSetHidden(document.getElementById('hr-dock-groups'), hrDockLevel !== 1);
    hrDockSetHidden(document.getElementById('hr-dock-panel'), hrDockLevel !== 2);
    const g = HR_DOCK_GROUPS.find(x => x.id === hrDockGroup) || null;
    const title = document.getElementById('hr-dock-title');
    if (title) title.textContent = g ? g.label : 'Bảng Nhân Sự';
    const countEl = document.getElementById('hr-dock-count');
    if (countEl) {
      let n = 0;
      if (hrDockGroup && typeof document.querySelector === 'function') {
        const panelEl = document.querySelector(`[data-hr-group-panel="${hrDockGroup}"]`);
        if (panelEl && typeof panelEl.querySelectorAll === 'function') {
          n = panelEl.querySelectorAll('.hr-mini-card').length;
        }
      }
      countEl.textContent = n ? `${n} bảng` : '';
    }
    const panel = document.getElementById('hr-dock-panel');
    if (panel && panel.style && typeof panel.style.setProperty === 'function') {
      panel.style.setProperty('--dock-g', g ? g.color : 'var(--primary)');
    }
    if (typeof document.querySelectorAll === 'function') {
      document.querySelectorAll('[data-hr-group-panel]').forEach(p => {
        if (p && p.classList) p.classList.toggle('is-active', p.getAttribute('data-hr-group-panel') === hrDockGroup);
      });
      document.querySelectorAll('[data-hr-group]').forEach(b => {
        const on = b && b.getAttribute('data-hr-group') === hrDockGroup;
        if (b && b.classList) b.classList.toggle('is-active', !!on);
        if (b) { try { b.setAttribute('aria-expanded', on ? 'true' : 'false'); } catch (e) {} }
      });
    }
  }
  function hrDockToggle() {
    hrDockLevel = hrDockLevel > 0 ? 0 : 1;
    hrDockGroup = '';
    hrDockRender();
    return hrDockLevel;
  }
  function hrDockOpenGroup(id) {
    if (!HR_DOCK_GROUPS.some(g => g.id === id)) return false;
    hrDockGroup = id;
    hrDockLevel = 2;
    hrDockRender();
    return true;
  }
  function hrDockBack() {
    if (hrDockLevel !== 2) return;
    hrDockLevel = 1;
    hrDockGroup = '';
    hrDockRender();
  }
  function hrDockClose() {
    if (hrDockLevel === 0 && !hrDockGroup) return;
    hrDockLevel = 0;
    hrDockGroup = '';
    hrDockRender();
  }
  // Badge trên bong bóng nhóm — chỉ hiện khi có số đáng chú ý
  function hrDockBadges() {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text || '';
      if (el.classList) el.classList.toggle('is-on', !!text);
    };
    const emps = state.hrEmployees || [];
    const act = emps.filter(e => (e.status || 'active') === 'active').length;
    set('hr-dock-badge-hoso', emps.length ? `${act} NV` : '');
    const pendLv = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;
    const pendOt = (state.hrOvertimes || []).filter(o => (o.status || 'pending') === 'pending').length;
    set('hr-dock-badge-ngaycong', (pendLv + pendOt) ? `${pendLv + pendOt} chờ` : '');
    set('hr-dock-badge-thongke', '');
    const missing = (state.hrRecruitment || [])
      .filter(r => (r.status || 'open') === 'open')
      .reduce((s, r) => s + Math.max(0, (r.needQty || 0) - (r.hiredQty || 0)), 0);
    set('hr-dock-badge-tuyendung', missing ? `thiếu ${missing}` : '');
  }

  const HR_CARD_DEFS = {
    'hr-emp-card': { el: 'hr-mini-count-emp', count: () => {
      const all = state.hrEmployees || [];
      const act = all.filter(e => (e.status || 'active') === 'active').length;
      return all.length ? `${act}/${all.length} NV` : '0 NV';
    } },
    'hr-att-card': { el: 'hr-mini-count-att', count: () => {
      const d = state.hrAttDate || hrTodayISO();
      const work = (state.hrAttendance || []).filter(a => a.date === d && a.status === 'work').length;
      const pend = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;
      return `${fmtDateDMY(d)} · ${work} đi làm${pend ? ` · ${pend} chờ` : ''}`;
    } },
    'hr-pos-card': { el: 'hr-mini-count-pos', count: () => `${(state.hrPositions || []).length} vị trí` },
    'hr-ci-card': { el: 'hr-mini-count-ci', count: () => `${(state.hrCheckins || []).length} giờ máy` },
    'hr-pay-card': { el: 'hr-mini-count-pay', count: () => {
      const month = ciReadUi().month || ciDefaultMonth();
      const lock = payLockOf(month);
      if (lock && lock.status === 'da_chot') return `Đã chốt ${ciMonthShort(month)}`;
      if (lock && lock.status === 'cho_duyet') return `Chờ duyệt ${ciMonthShort(month)}`;
      const pend = payRowsOfMonth(month).filter(r => r && r.status === 'cho_duyet').length;
      return pend ? `${pend} chờ duyệt` : `Chưa chốt ${ciMonthShort(month)}`;
    } },
    'hr-leave-card': { el: 'hr-mini-count-leave', count: () => {
      const pend = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;
      return pend ? `${pend} chờ duyệt` : `${(state.hrLeaves || []).length} đơn`;
    } },
    'hr-ot-card': { el: 'hr-mini-count-ot', count: () => {
      const list = state.hrOvertimes || [];
      const pend = list.filter(o => (o.status || 'pending') === 'pending').length;
      return pend ? `${pend} chờ duyệt` : `${list.length} đơn`;
    } },
    'hr-stats-card': { el: 'hr-mini-count-stats', count: () => {
      const days = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'approved')
        .reduce((s, l) => s + (l.days || leaveDaysCount(l.from, l.to)), 0);
      return `${days} ngày nghỉ`;
    } },
    'hr-att-stats-card': { el: 'hr-mini-count-att-stats', count: () => {
      if (!/^\d{4}-\d{2}$/.test(state.hrAttMonth || '')) state.hrAttMonth = hrTodayISO().slice(0, 7);
      const stats = computeAttendanceStats(state.hrAttMonth);
      let work = 0, leave = 0, absent = 0;
      stats.forEach(s => { work += s.work; leave += s.leave; absent += s.absent; });
      const c = work + leave + absent;
      const rate = c ? Math.round(work * 1000 / c) / 10 : null;
      return rate === null ? `${state.hrAttMonth}` : `${rate}% đi làm`;
    } },
    'hr-worker-eval-card': { el: 'hr-mini-count-worker-eval', count: () => {
      const count = (state.hrEmployees || []).filter(e =>
        (e.status || 'active') === 'active' && hrDeptAliasOf(e.department) !== 'Văn Phòng').length;
      return `${count} NV`;
    } },
    'hr-recruit-card': { el: 'hr-mini-count-recruit', count: () => {
      const open = (state.hrRecruitment || []).filter(r => (r.status || 'open') === 'open');
      const missing = open.reduce((s, r) => s + Math.max(0, (r.needQty || 0) - (r.hiredQty || 0)), 0);
      return `${open.length} tuyển${missing ? ` · ${missing} thiếu` : ''}`;
    } },
    'hr-posneed-card': { el: 'hr-mini-count-posneed', count: () => {
      // LIVE theo Bảng bố trí của NGÀY đang xem (không còn dùng haveQty = kỹ năng)
      const { ctx, rows } = hrNeedAllRows(hrNeedDateISO());
      const t = hrNeedTotalsOf(rows);
      if (!ctx.hasData) return `${rows.length} vị trí · chưa có bố trí`;
      return `${rows.length} vị trí${t.shortage ? ` · thiếu ${t.shortage} suất` : ' · đủ người'}`;
    } }
  };

  // Odśwież liczniki na thẻ — wywoływane z renderHrView po wlożeniu danych.
  function updateHrCardGrid() {
    Object.keys(HR_CARD_DEFS).forEach(cardId => {
      try {
        const el = document.getElementById(HR_CARD_DEFS[cardId].el);
        if (el) el.textContent = String(HR_CARD_DEFS[cardId].count());
      } catch (e) { /* nie blokuj rendera tab Nhân Sự */ }
    });
    try { hrDockBadges(); } catch (e) {}
  }

  // Zsynchronizuj podświetlenie thẻ ze stanem bảng — otwarta = widoczna
  // (bez hr-card-hidden) i rozwinięta (bez rate-table-collapsed).
  function syncHrMiniActive() {
    let openId = null;
    Object.keys(HR_CARD_DEFS).forEach(cardId => {
      const c = document.getElementById(cardId);
      if (c && !c.classList.contains('hr-card-hidden') && !c.classList.contains('rate-table-collapsed')) openId = cardId;
    });
    document.querySelectorAll('.hr-mini-card').forEach(t => {
      const act = t.getAttribute('data-hr-card') === openId;
      t.classList.toggle('hr-mini-active', act);
      t.setAttribute('aria-expanded', act ? 'true' : 'false');
    });
  }

  // Bang chi tiet Nhan Su bat dang POP-UP (noi len tren overlay) thay vi
  // truot xuong duoi. Bam the → bang (DOM node, giu nguyen bang Live + su kien)
  // duoc di chuyen vao modal overlay; bam lai cung the / nut Dong / bam
  // nen mo → dong va tra bang ve stack goc (accordion: chi 1 bang mo).
    let openDetailCard = null;
  // Đặt đỉnh pop-up ngay dưới header — header không bị che / không bị làm mờ
  function hrPositionDetailOverlay() {
    const overlay = document.getElementById("hr-detail-overlay");
    if (!overlay) return;
    const header = document.querySelector('.app-header');
    if (header && typeof header.getBoundingClientRect === 'function') {
      const bottom = header.getBoundingClientRect().bottom;
      if (bottom > 0) overlay.style.top = Math.round(bottom) + 'px';
    }
  }
  function hrOpenCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return false;
    // Bam lai the dang mo → dong popup (dong = tra ve condensed view)
    if (openDetailCard === card) { hrCloseOpenCard(); return false; }
    // Dong bang dang mo (neu co) truoc khi mo bang moi (accordion)
    if (openDetailCard) hrCloseOpenCard();
    // THẺ ĐANG ĐÓNG thì bảng bên trong không được vẽ lại mỗi lần renderAll
    // (xem renderHrView(parts)) ⇒ trước khi hiện phải vẽ ĐÚNG phần của thẻ này
    // để không bao giờ hiện số liệu cũ.
    try { renderHrView(hrCardRenderParts(cardId)); }
    catch (e) { console.error('[NHÂN SỰ] lỗi vẽ nội dung thẻ', cardId, e); }
    // Mo bang: bo an + di chuyen DOM node vao trong modal overlay
    card.classList.remove('hr-card-hidden');
    card.classList.remove('rate-table-collapsed');
    const content = document.getElementById("hr-detail-content");
    if (content) content.appendChild(card);
    openDetailCard = card;
    const h4 = card.querySelector && card.querySelector('.planning-card-header h4');
    const titleText = (h4 && typeof h4.textContent === 'string') ? h4.textContent.trim() : '';
    const titleEl = document.getElementById("hr-detail-title");
    if (titleEl) titleEl.textContent = titleText || 'Chi Tiết Nhân Sự';
    const overlay = document.getElementById("hr-detail-overlay");
        if (overlay) {
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
      hrPositionDetailOverlay();
      if (typeof overlay.focus === 'function') overlay.focus({ preventScroll: true });
    }
    syncHrMiniActive();
    hrScheduleIcons();
    return true;
  }
  function hrCloseOpenCard() {
    const overlay = document.getElementById("hr-detail-overlay");
    if (!openDetailCard) {
      if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
      return;
    }
    const card = openDetailCard;
    const stack = document.getElementById("hr-details-stack");
    if (stack) stack.appendChild(card); else document.getElementById('hr-view')?.appendChild(card);
    card.classList.add('hr-card-hidden');
    openDetailCard = null;
    if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
    syncHrMiniActive();
    hrScheduleIcons();
  }

export {
  HR_DEPARTMENTS,
  HR_DEPT_ALIAS,
  hrDeptAliasOf,
  migrateHrDeptMerge,
  HR_NEED_UI_KEY,
  hrNeedReadUi,
  hrNeedWriteUi,
  hrNeedDateISO,
  hrNeedSplitOf,
  hrNeedModeOf,
  hrNeedColCount,
  hrNormDept,
  hrDeptOptions,
  hrEmployeeHasPos,
  hrNeedCtx,
  hrNeedRowMetrics,
  hrNeedAllRows,
  hrNeedTotalsOf,
  hrNeedDeptSummaries,
  hrNeedStatusMeta,
  renderHrNeedCard,
  renderHrNeedTable,
  hnmToolbarHtml,
  hnmKpiHtml,
  hnmBubblesHtml,
  hnmFocusHtml,
  hnmPosRowHtml,
  hnmPosListHtml,
  hnmPersonChipHtml,
  hnmSharedColHtml,
  hnmSelectDept,
  hnmBack,
  hnmSetDate,
  hnmShiftDay,
  hnmToday,
  hnmSetSearch,
  hnmSetOnlyShort,
  hnmSetSkillLinks,
  hnmTogglePos,
  hnmSetNeed,
  hnmToggleMode,
  hnmOpenBoard,
  hnmOpenAssign,
  hnmAddPosition,
  hnmHotPerson,
  hnmDrawLinks,
  LEAVE_TYPES,
  ATT_STATUS,
  approvedLeaveOn,
  attStatusOf,
  attRecordOf,
  autoMapEmployeeField,
  hrSheetUsedRange,
  hrCellAddrToRC,
  hrNormCode,
  hrNormNameKey,
  hrDigits9,
  hrNormGenderStrict,
  hrNormStatusStrict,
  hrEmpIndexBuild,
  hrFindEmployeeMatch,
  hrImportColMap,
  hrImportRowValues,
  hrCountImportMatches,
  hrNextEmployeeCode,
  renderEmployeeImportResult,
  HR_IMPORT_MAX_COLS,
  HR_IMPORT_MAX_ROWS,
  approveLeave,
  canApproveLeave,
  syncLeaveDurationUI,
  overtimeActualMin,
  renderHrOvertimesTable,
  openOvertimeModal,
  closeOvertimeModal,
  closeOvertimeAmendmentModal,
  handleOvertimeSubmit,
  handleOvertimeAmendmentSubmit,
  approveOvertime,
  rejectOvertime,
  deleteOvertime,
  cancelOvertime,
  requestOvertimeAmendment,
  approveOvertimeAmendment,
  rejectOvertimeAmendment,
  renderOvertimeEmployeeSuggestions,
  pickOvertimeEmployee,
  handleOvertimeEmployeeKeydown,
  hideOvertimeEmployeeSuggestions,
  closeEmployeeImportModal,
  closeEmployeeModal,
  closeLeaveModal,
  closePositionModal,
  closeRecruitmentModal,
  closePositionNeedModal,
  collectEmployeeSkills,
  computeAttendanceStats,
  computeWorkerEvaluation,
  setWorkerEvaluationEfficiencyProvider,
  setWorkerEvaluationGrade,
  setWorkerEvaluationView,
  openWorkerEvaluationAttendance,
  openWorkerEvaluationAssignmentDate,
  renderWorkerEvaluation,
  computeLeaveStats,
  deleteEmployee,
  deleteLeave,
  deletePosition,
  deleteRecruitment,
  deletePositionNeed,
  hrSetPositionNeedQty,
  ensurePositionNeedsFromPositions,
  doEmployeeImport,
  handleEmployeeImportFile,
  handleEmployeeSubmit,
  handleLeaveEmployeeKeydown,
  handleLeaveSubmit,
  handlePositionSubmit,
  handleRecruitmentSubmit,
  handlePositionNeedSubmit,
  hideLeaveEmployeeSuggestions,
  hrAttGoToday,
  hrAttSetDate,
  hrAttSetMonth,
  hrAttShiftDay,
  hrTodayISO,
  hrEmpByName,
      hrOpenCard,
  hrCloseOpenCard,
  hrPositionDetailOverlay,
  HR_CARD_DEFS,
  // DOCK 3 CẤP (Home → nhóm → thẻ)
  HR_DOCK_GROUPS,
  hrDockState,
  hrDockRender,
  hrDockToggle,
  hrDockOpenGroup,
  hrDockBack,
  hrDockClose,
  hrDockBadges,
  hrPosName,
  hrPositionsNamesOf,
  hrPressWorkersNamesOf,
    hrWorkersForPress,
  isPressEpPos,
  hrWorkersForProduct,
  pressPositionPatternFor,
  importEmployeesFromSheet,
  leaveEmployeeSuggestions,
  loadHrData,
  openEmployeeImportModal,
  openEmployeeModal,
  syncEmployeeQuitDateRow,
  openLeaveModal,
  openPositionModal,
  openRecruitmentModal,
  openPositionNeedModal,
  pendingLeaveOn,
  pickLeaveEmployee,
  renderEmployeeSkillsBox,
  renderHrAttendanceCard,
  renderHrAttendanceStats,
  renderHrEmployeesTable,
  renderHrPositionsTable,
  renderHrRecruitmentTable,
  renderPositionNeedsTable,
  renderHrBoard,
  hrBoardSetDate,
  hrBoardShiftDay,
  hrBoardGoToday,
  hrBoardSetDept,
  hrBoardOpenAssign,
  closeBoardAssignModal,
  handleBoardAssignSubmit,
  hrBoardRemoveAssign,
  hrBoardDragStart,
  hrBoardDrop,
  renderBoardAssignSuggestions,
  pickBoardAssignEmployee,
  openShiftModal,
  closeShiftModal,
  handleShiftSubmit,
  setShiftTypePreset,
  hrShiftCfg,
  hrAssignmentInterval,
  hrShiftRange,
  hrShiftBrkH,
  renderShiftRows,
  hrAssignTimesOf,
  hrSplitHoursHC,
  hrCalCfgOf,
  hrDayKindOf,
  hrIsRestDay,
  hrSplitHoursHCDate,
  openHrCalendarModal,
  closeHrCalendarModal,
  hrCalSetMonth,
  hrCalToggleDay,
  hrCalToggleWeekday,
  renderHrCalendarModal,
  handleHrCalendarSubmit,
  HR_DOW_SHORT,
  hrShortName,
  fmtHour,
  BOARD_SHIFT_PRESETS,
  renderHrView,
  renderHrVisible,
  hrShowMoreRows,
  saveHrData,
  hrCardRenderParts,
  renderHrAfterBoardChange,
  renderHrCheckinTable,
  // ĐỐI CHIẾU BỐ TRÍ ↔ MÁY CHẤM CÔNG (engine + thao tác)
  ciCompareDay,
  ciActionCell,
  ciRowsForRange,
  ciSummaryOf,
  ciSuggestEndFills,
  ciApplyEndFills,
  ciAckDay,
  ciUnackDay,
  ciActualSplit,
  CI_ANOMALY_LABEL,
  ciAnomalyOf,
  ciPunchListOf,
  ciPlanNightOf,
  ciNightPairOf,
  ciNightConsumedOf,
  ciUsablePunchesOf,
  ciPlannedOf,
  ciTimesheetHours,
  ciShiftMonth,
  ciShiftPeriod,
  ciGoToday,
  ciSetPeriodMode,
  ciRangeOf,
  ciDefaultDay,
  ciIsoWeekOf,
  ciIsoWeekKey,
  ciIsoWeekRange,
  ciPeriodLabelOf,
  ciBaseDayOf,
  ciMonthsOfRange,
  ciRequireRangeUnlocked,
  ciOnDayInput,
  ciGotoDay,
  ciFilterByEmployee,
  ciChipsHtml,
  ciChipCountOf,
  ciChipLabelOf,
  ciOnChipClick,
  ciScrollToFirstRow,
  CI_CHIP_DEFS,
  ciSaveUi,
  ciReadUi,
  ciToMin,
  ciFromMin,
  ciTimeFromNum,
  ciSerialToDateTime,
  ciResolveEmployee,
  openCiEndfillModal,
  closeCiEndfillModal,
  renderCiEndfillList,
  applyCiEndfill,
  hrSplitHoursHCMin,
  CI_EARLY_ALLOW_MIN,
  CI_OT_BLOCK_MIN,
  CI_LATE_TOL_MIN,
  CI_VERDICT,
  HR_CI_UI_KEY,
  applyAllCheckins,
  ciBulkPlanOf,
  ciBulkSubmit,
  ciMonthShort,
  ciPayLockOfMonth,
  ciRequireMonthUnlocked,
  closeCiBulkModal,
  openCiBulkModal,
  openCiPayModal,
  closeCiPayModal,
  ciPaySubmit,
  ciPayInfoHtml,
  syncCiPayForm,
  payAcceptRow,
  payApproveRow,
  payEditRequest,
  payEffectiveOf,
  payMarkAddOt,
  payRejectOtRow,
  payRejectRow,
  payRowChipHtml,
  payRowOf,
  payRowsOfMonth,
  paySnapshotOf,
  paySyncOtApproved,
  paySyncOtRejected,
  payWaiveRow,
  PAY_ACTION_LABEL,
  PAY_ROW_STATUS,
  PAY_LOCK_STATUS,
  payLockOf,
  payLockScan,
  payPrepareLock,
  payApproveLock,
  payReopenLock,
  payDriftOfLock,
  payRuleSetOf,
  payShiftSnapOf,
  payHashStr,
  payLockMonthOf,
  payLockBtnStateHtml,
  payLockModalInfoHtml,
  renderHrPayCard,
  openPayLockModal,
  closePayLockModal,
  payLockSubmit,
  paySlipRowsOf,
  paySlipPagesHtml,
  paySlipCount,
  renderPayPrintPreview,
  openPayPrintModal,
  closePayPrintModal,
  doPayPrint,
  payMarkPaperSigned,
  applyCheckinRecord,
  checkinRecordOf,
  ciAutoMapCols,
  ciFindHeaderRow,
  ciNormDateTime,
  ciNormTime,
  closeCheckinImportModal,
  deleteCheckin,
  deleteCheckinsAll,
  doCheckinImport,
  handleCheckinImportFile,
  importCheckinsFromSheet,
  openCheckinImportModal,
  renderLeaveEmployeeSuggestions,
  rejectLeave,
  syncPositionNeedsFromEmployees,
  setAttendanceNote,
  setAttendanceStatus,
  syncHrMiniActive,
  syncSkillsFromAssignments,
  toggleAttendancePosition,
  updateHrCardGrid,
  // Helpers dùng chung cho Sản Lượng Ép + Xuất Excel + Biểu đồ
  hrStripForMatch,
  hrStripDiacritics
};
