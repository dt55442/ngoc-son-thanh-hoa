// tests/report-center.test.mjs â€” TRUNG TÃ‚M XUáº¤T EXCEL (17/10/2026)
//   â€¢ 1 modal dÃ¹ng chung thay 6 modal cÅ©: Tab â†’ BÃ¡o cÃ¡o â†’ Bá»™ lá»c â†’ Xem TrÆ°á»›c/Xuáº¥t
//   â€¢ Má»i bÃ¡o cÃ¡o Ä‘i qua engine chuáº©n hoÃ¡: Ã´ Sá» = number, dÃ²ng Tá»”NG Cá»˜NG,
//     AutoFilter trÃªn vÃ¹ng dá»¯ liá»‡u, ngÃ y giá» theo GIá»œ MÃY VN
// â€¢ 9 bÃ¡o cÃ¡o XÆ°á»Ÿng 1 (8 cÃ´ng Ä‘oáº¡n + káº¿ hoáº¡ch xuáº¥t nan) xuáº¥t ÄÃšNG vÃ¹ng dá»¯ liá»‡u
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng export-stage.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: {
      _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; },
      contains(c) { return this._s.has(c); }
    },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; }, remove() {},
    setAttribute() {}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), drawImage() {} }),
    toDataURL: () => 'data:image/jpeg;base64,CANVASOK',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    focus() {}, click() {}, animate() { return { cancel() {} }; }
  };
  return el;
}
const els = new Map();
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload() {} };
global.history = { replaceState() {}, pushState() {}, back() {}, state: null };
Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
global.matchMedia = () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {} });
const storeBacking = new Map();
global.localStorage = {
  getItem: (k) => (storeBacking.has(k) ? storeBacking.get(k) : null),
  setItem: (k, v) => { storeBacking.set(k, String(v)); },
  removeItem: (k) => { storeBacking.delete(k); },
  clear: () => storeBacking.clear(),
  key: (i) => [...storeBacking.keys()][i] ?? null,
  get length() { return storeBacking.size; }
};
global.addEventListener = () => {}; global.removeEventListener = () => {}; global.dispatchEvent = () => true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global; global.self = global;
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

const fs = await import('node:fs');
const { state } = await import('../js/state.js');
const rc = await import('../js/report-center.js');
const specs = await import('../js/report-specs.js');
const x2 = await import('../js/xuong2.js');
const xlsx = await import('../js/export-xlsx.js');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

state.currentUser = { username: 'admin', role: 'admin', editTabs: ['kanban'], allowAdvanced: true };

// â”€â”€â”€ XLSX ghÃ©p Ä‘á»ƒ báº¯t file â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let writtenFiles = [];
let lastSheetAoa = null, lastSheetName = '';
global.XLSX = {
  utils: {
    book_new: () => ({ sheets: [], SheetNames: [] }),
    aoa_to_sheet: (aoa) => ({ aoa }),
    book_append_sheet: (wb, ws, name) => {
      wb.sheets.push({ name, aoa: ws.aoa }); wb.SheetNames.push(name);
      lastSheetAoa = ws.aoa; lastSheetName = name;
    }
  },
  writeFile: (wb, filename) => { writtenFiles.push({ filename, wb }); },
  write: () => new ArrayBuffer(8)
};

// â”€â”€â”€ A. DANH Má»¤C BÃO CÃO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('A1. CÃ³ Ä‘á»§ 6 nhÃ³m bÃ¡o cÃ¡o (X2/X1/Káº¿ Hoáº¡ch/NguyÃªn Liá»‡u/QC/NhÃ¢n Sá»±)',
  specs.REPORT_GROUPS.length === 6 && specs.REPORT_GROUPS.map(g => g.id).join(',') === 'x2,x1,planning,materials,qc,hr');
check('A2. Danh má»¥c bÃ¡o cÃ¡o cáº­p nháº­t sau gá»™p tháº» (47 bÃ¡o cÃ¡o)',
  specs.REPORT_SPECS.length === 47);
check('A3. 16 bÃ¡o cÃ¡o XÆ°á»Ÿng 2 (gá»“m Xá»­ lÃ½ lá»—i + sá»± cá»‘) + 9 bÃ¡o cÃ¡o XÆ°á»Ÿng 1',
  specs.reportsOfGroup('x2').length === 16 && specs.reportsOfGroup('x1').length === 9);
check('A4. Tháº» Xá»­ lÃ½ lá»—i cÃ³ bÃ¡o cÃ¡o riÃªng vÃ  hai alias cÅ© váº«n cÃ³ vÃ¹ng dá»¯ liá»‡u',
  specs.reportIdForCard('x2-xu-ly-loi-card') === 'xulyloi' &&
  Object.keys(x2.X2_CARD_EXPORT_SOURCE).some(cardId => cardId === 'x2-xu-ly-loi-card'));
check('A5. Tháº» XÆ°á»Ÿng 1 trá» ÄÃšNG bÃ¡o cÃ¡o X1 (khÃ´ng cÃ²n rÆ¡i vá» batch)',
  specs.reportIdForCard('x1-cat-ong-card') === 'x1catong' &&
  specs.reportIdForCard('x1-loc-thanh-card') === 'x1locthanh' &&
  specs.reportIdForCard('x1-kho-card') === 'x1locthanh' &&
  specs.reportIdForCard('x1-nan-plan-card') === 'x1nanplan' &&
  specs.reportById('x1nanplan').source === 'x1nanplan' &&
  specs.reportById('x1catong').source === 'x1catong');
check('A5b. Export káº¿ hoáº¡ch nan bá» TT La MÃ£ vÃ  gom A+A1 thÃ nh má»™t quy cÃ¡ch',
  (() => {
    state.x1NanPlans = [
      { id: 'rp-a', year: 2026, romanNo: 'I', productName: 'Thanh gom', material: 'Váº§u', width: 11, length: 50, classification: 'A', weeks: { '38': 80 } },
      { id: 'rp-a1', year: 2026, romanNo: 'II', productName: 'Thanh gom', material: 'Váº§u', width: 11, length: 50, classification: 'A1', weeks: { '38': 20 } }
    ];
    const data = xlsx.buildX2ExportData('x1nanplan', { year: '2026', from: '', to: '' });
    const aoa = data && Array.isArray(data.aoa) ? data.aoa : [];
    const header = aoa.find(row => Array.isArray(row) && row.includes('TÃªn Sáº£n Pháº©m')) || [];
    const productRows = aoa.filter(row => Array.isArray(row) && row.includes('Thanh gom'));
    const ok = !header.includes('TT La MÃ£') &&
      header.includes('TÃªn Sáº£n Pháº©m') &&
      header.includes('PhÃ¢n Loáº¡i') &&
      productRows.length === 1 &&
      productRows[0][6] === 'A / A1';
    state.x1NanPlans = [];
    return ok;
  })());

// â”€â”€â”€ B. Dá»® LIá»†U MáºªU + Dá»°NG BÃO CÃO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.materialRecords = [
  { id: 'm1', type: 'Luá»“ng cÃ¢y tÆ°Æ¡i', supplier: 'NhÃ  Táº¿', location: 'xuong-2', weight: 1000, date: '2026-10-05' }
];
state.xuong2CutRecords = [
  { id: 'c1', materialId: 'm1', date: '2026-10-05', inputWeight: 1000, klOngLuong: 450, klCuiDot: 50, klCayLoai: 20, note: '' }
];
state.xuong1CatOngRecords = [
  { id: 'x1a', materialId: 'm1', date: '2026-10-06', inputWeight: 500, klDat: 300, klLoai: 50, klMat: 20, klNgon: 30, note: '' }
];
state.batches = [
  { id: 'b1', code: 'L1', stage: 'kho', location: 'K1', quantity: 100, length: 1250, width: 18, thickness: 7, date: '2026-10-01', createdAt: '2026-10-01T01:00:00.000Z' }
];

rc.openReportCenter('cut');
check('B1. Má»Ÿ Trung TÃ¢m Xuáº¥t: modal hiá»‡n + tiÃªu Ä‘á» Ä‘Ãºng bÃ¡o cÃ¡o',
  document.getElementById('modal-report-center').classList.contains('show') &&
  String(document.getElementById('report-center-subtitle').textContent).includes('Nháº­t kÃ½ Cáº¯t'));
check('B2. Váº½ 6 tab nhÃ³m + chip bÃ¡o cÃ¡o cá»§a nhÃ³m Ä‘ang chá»n',
  String(document.getElementById('report-center-tabs').innerHTML).includes('data-rc-group="x2"') &&
  String(document.getElementById('report-center-list').innerHTML).includes('data-rc-report="cut"'));
check('B3. Bá»™ lá»c Ká»² tá»± sinh (chá»n kiá»ƒu ká»³ + giÃ¡ trá»‹ + nÃºt â€¹ â€º)',
  String(document.getElementById('report-center-filters').innerHTML).includes('id="rc-f-period-mode"'));

rc.rcValues.periodMode = 'all';
rc.rcValues.periodKey = '';
const dCut = rc.buildReportData();
check('B4. BÃ¡o cÃ¡o Cáº¯t Chá»n: header hÃ ng 5 (index 4) + 1 dÃ²ng dá»¯ liá»‡u (cÃ³ cá»™t LOáº I Äáº¦U VÃ€O + Sá» XE)',
  !!dCut && dCut.headerRow === 4 && dCut.aoa[4][0] === 'Stt' &&
  dCut.aoa[4][5] === 'Loáº¡i Äáº§u VÃ o' && dCut.aoa[4][6] === 'Sá»‘ Xe' &&
  dCut.aoa[4][7] === 'KL Äáº§u VÃ o (kg)' &&
  dCut.aoa.length === 7);
check('B5. Ã” Sá» lÃ  NUMBER THáº¬T (1000 kg vÃ o + 450 kg á»‘ng Ä‘áº¡t) â€” khÃ´ng cÃ²n chuá»—i "1.000"',
  typeof dCut.aoa[5][7] === 'number' && dCut.aoa[5][7] === 1000 &&
  typeof dCut.aoa[5][8] === 'number' && dCut.aoa[5][8] === 450);
check('B6. CÃ³ dÃ²ng Tá»”NG Cá»˜NG + tá»•ng KL Ä‘áº§u vÃ o = 1000',
  String(dCut.aoa[6][1]).includes('Tá»”NG Cá»˜NG') && dCut.aoa[6][7] === 1000);
check('B7. AutoFilter chá»‰ trÃªn VÃ™NG Dá»® LIá»†U, KHÃ”NG gá»“m dÃ²ng tá»•ng (A5:T6)',
  dCut.autofilter === 'A5:T6');
check('B8. CÃ³ zCells Ä‘á»‹nh dáº¡ng sá»‘ cho cá»™t kg (2 chá»¯ sá»‘ tháº­p phÃ¢n)',
  Object.keys(dCut.zCells || {}).length > 0 && dCut.zCells['5,7'] === '#,##0.00');
check('B9. NgÃ y xuáº¥t dÃ¹ng GIá»œ MÃY (dd/mm/yyyy HH:mm), khÃ´ng pháº£i UTC ISO',
  /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(String(dCut.aoa[1][0]).replace('NgÃ y xuáº¥t: ', '')));
// â”€â”€â”€ C. XÆ¯á»žNG 1 KHÃ”NG CÃ’N XUáº¤T NHáº¦M LÃ” NAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
rc.openReportCenter('x1catong');
const dX1 = rc.buildReportData();
check('C1. Tháº» Cáº¯t á»ng xuáº¥t ÄÃšNG dá»¯ liá»‡u XÆ°á»Ÿng 1 (khÃ´ng pháº£i LÃ´ nan)',
  !!dX1 && String(dX1.aoa[0][0]).includes('XÆ¯á»žNG 1') && String(dX1.aoa[0][0]).includes('Cáº®T á»NG') &&
  !String(dX1.aoa[0][0]).includes('LÃ” NAN'));
check('C2. Cá»™t Ä‘Ãºng cÃ´ng Ä‘oáº¡n Cáº¯t á»ng (KL LÃ´ Äáº§u VÃ o Â· KL Äáº¡t Â· KL Máº¯t Â· KL Ngá»n)',
  dX1.aoa[4].join('|').includes('KL Äáº¡t (kg)') && dX1.aoa[4].join('|').includes('KL Máº¯t (kg)') &&
  dX1.aoa[4].join('|').includes('KL Ngá»n (kg)'));
check('C3. Sá»‘ liá»‡u X1 lÃ  number tháº­t (KL lÃ´ Ä‘áº§u vÃ o láº¥y tá»« NguyÃªn liá»‡u = 1000)',
  typeof dX1.aoa[5][5] === 'number' && dX1.aoa[5][5] === 1000);

// LÆ°á»£t Lá»c á»ng (cÃ´ng Ä‘oáº¡n Ä‘uÃ´i X1) â€” dÃ¹ng spec chung X1_CHAIN_SPECS
state.xuong1LocOngRecords = [
  { id: 'lo1', bocId: '', date: '2026-10-07', qtyIn: 100, qtyOk: 80, qtyLoai: 20, srcType: 'Váº§u/ná»©a', srcSupplier: 'NhÃ  Táº¿', note: '' }
];
rc.openReportCenter('x1locong');
const dX1Chain = rc.buildReportData();
check('C4. BÃ¡o cÃ¡o 5 cÃ´ng Ä‘oáº¡n Ä‘uÃ´i X1 dÃ¹ng spec chung (cÃ³ cá»™t KL VÃ o/Äáº¡t/Loáº¡i + Nguá»“n)',
  !!dX1Chain && dX1Chain.aoa[4].join('|').includes('KL VÃ o (kg)') &&
  dX1Chain.aoa[4].join('|').includes('KL Äáº¡t (kg)'));

// â”€â”€â”€ D. Ká»² Lá»ŒC (NgÃ y/Tuáº§n/ThÃ¡ng/NÄƒm) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('D1. Tuáº§n ISO: khÃ³a dáº¡ng YYYY-Www + khoáº£ng Ä‘Ãºng 7 ngÃ y',
  (function () {
    const k = rc.isoWeekKey('2026-10-17');
    const r = rc.periodRange('week', k);
    const days = (new Date(r.to) - new Date(r.from)) / 86400000;
    return /^2026-W\d{2}$/.test(k) && days === 6;
  })());
check('D2. ThÃ¡ng 10/2026 = 01/10 â†’ 31/10',
  JSON.stringify(rc.periodRange('month', '2026-10')) === JSON.stringify({ from: '2026-10-01', to: '2026-10-31' }));
check('D3. NÄƒm 2026 = 01/01 â†’ 31/12',
  JSON.stringify(rc.periodRange('year', '2026')) === JSON.stringify({ from: '2026-01-01', to: '2026-12-31' }));
check('D4. "Táº¥t cáº£ thá»i gian" = khÃ´ng lá»c',
  rc.periodRange('all', '') .from === '' && rc.periodRange('all', '').to === '');

rc.openReportCenter('cut');
rc.rcValues.periodMode = 'month';
rc.rcValues.periodKey = '2026-11';
check('D5. Chá»n thÃ¡ng KHÃ”NG cÃ³ dá»¯ liá»‡u â†’ khÃ´ng dá»±ng bÃ¡o cÃ¡o (khÃ´ng táº¡o file rá»—ng)',
  rc.buildReportData() === null);
rc.rcValues.periodKey = '2026-10';
check('D6. Chá»n Ä‘Ãºng thÃ¡ng cÃ³ dá»¯ liá»‡u â†’ dá»±ng Ä‘Æ°á»£c bÃ¡o cÃ¡o',
  !!rc.buildReportData());

// â”€â”€â”€ E. XEM TRÆ¯á»šC / XUáº¤T FILE / XUáº¤T Cáº¢ NHÃ“M â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
rc.openReportCenter('cut');
rc.rcValues.periodMode = 'all';
rc.openReportPreview();
check('E1. "Xem TrÆ°á»›c" má»Ÿ mÃ n xem trÆ°á»›c dÃ¹ng chung + Ä‘Ã³ng modal xuáº¥t',
  document.getElementById('modal-export-preview').classList.contains('show') &&
  !document.getElementById('modal-report-center').classList.contains('show'));
check('E2. Báº£ng xem trÆ°á»›c cÃ³ <thead> cho hÃ ng tiÃªu Ä‘á» (in láº·p trang)',
  String(document.getElementById('export-preview-table-box').innerHTML).includes('<thead>'));

writtenFiles = [];
rc.openReportCenter('cut');
rc.handleReportSubmit({ preventDefault() {} });
check('E3. Xuáº¥t file .xlsx Ä‘Ãºng tÃªn + sheet name KHÃ”NG chá»©a kÃ½ tá»± cáº¥m',
  writtenFiles.length === 1 && /^Xuong2_cut_\d{4}-\d{2}-\d{2}\.xlsx$/.test(writtenFiles[0].filename) &&
  !/[\\/?*[\]:]/.test(lastSheetName));
check('E4. Xuáº¥t xong Ä‘Ã³ng Trung TÃ¢m Xuáº¥t',
  !document.getElementById('modal-report-center').classList.contains('show'));

writtenFiles = [];
rc.openReportCenter('x1catong');
rc.exportReportGroup();
check('E5. "Xuáº¥t Cáº£ NhÃ³m": 1 file nhiá»u sheet (chá»‰ bÃ¡o cÃ¡o CÃ“ dá»¯ liá»‡u â€” X1: Cáº¯t á»ng + Lá»c á»ng)',
  writtenFiles.length === 1 && /^BaoCao_X1_\d{4}-\d{2}-\d{2}\.xlsx$/.test(writtenFiles[0].filename) &&
  writtenFiles[0].wb.SheetNames.length === 2 &&
  writtenFiles[0].wb.SheetNames.some(n => n.includes('Cáº¯t á»ng')) &&
  writtenFiles[0].wb.SheetNames.some(n => n.includes('Lá»c á»ng')));


// â”€â”€â”€ F. Cáº¤U TRÃšC (index / events / sw / css / engine) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('F1. index.html cÃ³ modal Trung TÃ¢m Xuáº¥t + ÄÃƒ XÃ“A 6 modal xuáº¥t cÅ©',
  idxHtml.includes('id="modal-report-center"') && idxHtml.includes('id="report-center-filters"') &&
  idxHtml.includes('id="btn-report-export"') && idxHtml.includes('id="btn-report-preview"') &&
  idxHtml.includes('id="btn-report-multi"') &&
  !idxHtml.includes('id="modal-custom-export"') && !idxHtml.includes('id="modal-export-planning"') &&
  !idxHtml.includes('id="modal-export-press"') && !idxHtml.includes('id="modal-export-materials"') &&
  !idxHtml.includes('id="modal-export-qc"') && !idxHtml.includes('id="modal-export-hr"'));
check('F2. NÃºt xuáº¥t á»Ÿ tá»«ng tab váº«n cÃ²n (Ä‘á»•i ruá»™t sang center, khÃ´ng Ä‘á»•i vá»‹ trÃ­)',
  idxHtml.includes('id="btn-open-export-modal"') && idxHtml.includes('id="btn-export-x2"') &&
  idxHtml.includes('id="btn-open-export-planning"') && idxHtml.includes('id="btn-open-export-materials"') &&
  idxHtml.includes('id="btn-open-export-qc"') && idxHtml.includes('id="btn-open-export-hr"') &&
  idxHtml.includes('id="btn-preview-x2"'));
check('F3. events.js ná»‘i center: má»Ÿ theo tháº»/tab + 4 nÃºt + lá»c',
  evSrc.includes("safeOn('btn-report-export'") && evSrc.includes("safeOn('btn-report-preview'") &&
  evSrc.includes("safeOn('btn-report-multi'") && evSrc.includes("openReportCenter(x2OpenCardExportSource())") &&
  evSrc.includes("openReportCenter('plan-items')") && evSrc.includes("openReportCenter('qc-export')") &&
  evSrc.includes("safeOn('report-center-filters',      'change', onReportFilterChange)"));
check('F4. sw.js: cache v275 + náº¡p report-specs.js/report-center.js vÃ o APP_SHELL',
  swSrc.includes("nha-may-ngoc-son-v486") && swSrc.includes("./js/report-specs.js") &&
  swSrc.includes("./js/report-center.js"));
check('F5. CSS cÃ³ khá»‘i .rc-* + in láº·p tiÃªu Ä‘á» + JS ghi rÃµ giá»›i háº¡n viá»n/mÃ u',
  cssSrc.includes('.rc-card') && cssSrc.includes('.rc-filter-grid') &&
  cssSrc.includes('#export-preview-print-area thead { display: table-header-group; }') &&
  fs.readFileSync(new URL('../js/report-center.js', import.meta.url), 'utf8')
    .includes('KHÃ”NG ghi Ä‘Æ°á»£c viá»n/mÃ u'));
// F5b. CSS KHÃ”NG ÄÆ¯á»¢C Lá»’NG SAI trong @media: khá»‘i .rc-* pháº£i á»Ÿ Cáº¤P CAO NHáº¤T.
// Lá»—i tháº­t 18/10/2026: thiáº¿u "}" Ä‘Ã³ng @media (max-width: 639.98px) cá»§a khá»‘i
// .kho-warn-* â‡’ TOÃ€N Bá»˜ .rc-* bá»‹ cuá»‘n vÃ o media query Ä‘iá»‡n thoáº¡i â†’ má»Ÿ Trung TÃ¢m
// Xuáº¥t trÃªn mÃ¡y tÃ­nh thÃ¬ modal KHÃ”NG cÃ³ style (chip bÃ¡o cÃ¡o dÃ­nh thÃ nh 1 dÃ²ng chá»¯).
// â†’ Test pháº£i kiá»ƒm Cáº¤U TRÃšC NGOáº¶C, khÃ´ng chá»‰ "includes(.rc-card)".
function cssDepthOfNeedle(src, needle) {
  const lines = String(src).split(/\r?\n/);
  let depth = 0;
  for (const line of lines) {
    if (line.includes(needle)) return depth;
    depth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    if (depth < 0) return -999; // ngoáº·c Ä‘Ã³ng thá»«a
  }
  return -1; // khÃ´ng tÃ¬m tháº¥y
}
const cssOpenBraces = (cssSrc.match(/{/g) || []).length;
const cssCloseBraces = (cssSrc.match(/}/g) || []).length;
check('F5b. CSS .rc-* á»Ÿ Cáº¤P CAO NHáº¤T (khÃ´ng lá»“ng trong @media) + ngoáº·c cÃ¢n báº±ng',
  cssDepthOfNeedle(cssSrc, '.rc-card {') === 0 &&
  cssDepthOfNeedle(cssSrc, '.rc-list {') === 0 &&
  cssDepthOfNeedle(cssSrc, '.rc-filter-grid {') === 0 &&
  cssOpenBraces === cssCloseBraces);
check('F6. Engine ghi AutoFilter + chuáº©n hoÃ¡ tÃªn sheet (Excel khÃ´ng cho \\ / ? * [ ] :)',
  (function () {
    const src = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
    return src.includes("ws['!autofilter'] = { ref: d.autofilter }") &&
      src.includes("String(d.sheetName || 'Sheet').replace(/[\\\\/?*[\\]:]/g, ' ')");
  })());

// BÃ¡o cÃ¡o tab Káº¿ Hoáº¡ch (Äá»‹nh Má»©c NVL) dá»±ng Ä‘Æ°á»£c tá»« state
state.materialRates = [{
  id: 'rate-1', product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Táº¥m',
  productCode: 'SP1', fullName: 'VÃ¡n 1200x382x12', pressType: 'Ã‰p nÃ³ng',
  nan1: '1250x18x7', nan1Qty: 1 / 6, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0,
  glue: 1.2, additive: 0.3, efficiency: 70
}];
rc.openReportCenter('plan-rates');
const dRates = rc.buildReportData();
check('F7. BÃ¡o cÃ¡o Äá»‹nh Má»©c NVL: Ä‘á»§ cá»™t + cá»¡ sáº£n pháº©m KHÃ”NG cÃ²n tiá»n tá»‘ "VÃ¡n"',
  !!dRates && dRates.aoa[4].join('|').includes('Sá»­ Dá»¥ng Nan') &&
  dRates.aoa[4].join('|').includes('Sá»‘ LÆ°á»£ng Nan 1') &&
  dRates.aoa[5][1] === '1200x382x12' && dRates.aoa[5][2] === 'VÃ¡n');

console.log(`\n=== TRUNG TÃ‚M XUáº¤T EXCEL: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed ? 1 : 0);

