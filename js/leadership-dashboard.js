import { initLucide } from './cloud.js';
import { capMonthShift, capPeriodKeyValid, capPeriodLabel, capWeekKeyOf, capWeekShift, leadershipCapacitySnapshot } from './capacity.js';
import { HR_DEPARTMENTS } from './hr.js';
import { MATERIAL_LOCATIONS } from './materials.js';
import { rateNanUse, rateUnit } from './planning.js';
import { dimVolume } from './press.js';
import { qcRowWeeks } from './qc.js';
import { qcFinalDisplay } from './qc-final.js';
import { state } from './state.js';
import { bulligDisplay, boluongDisplay, cutDisplay } from './xuong2.js';
import { calculateVolume, escapeHTML, khoStockSummary, showToast } from './utils.js';

let periodMode = 'week';
let periodKey = capWeekKeyOf(todayISO());

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizePeriod(mode, key) {
  const safeMode = mode === 'month' ? 'month' : 'week';
  const safeKey = capPeriodKeyValid(key, safeMode) ? String(key) : (
    safeMode === 'month' ? todayISO().slice(0, 7) : capWeekKeyOf(todayISO())
  );
  return { mode: safeMode, key: safeKey };
}

function localISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekRange(key) {
  const match = /^(\d{4})-W(\d{1,2})$/.exec(String(key || ''));
  if (!match) return { from: '', to: '' };
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return { from: '', to: '' };
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(year, 0, 4 - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { from: localISO(monday), to: localISO(sunday) };
}

function periodRange(mode, key) {
  if (mode === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    if (!match) return { from: '', to: '' };
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return { from: '', to: '' };
    return {
      from: `${match[1]}-${match[2]}-01`,
      to: `${match[1]}-${match[2]}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
    };
  }
  return weekRange(key);
}

function inRange(date, range) {
  const value = String(date || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= range.from && value <= range.to;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (Number(row && row[field]) || 0), 0);
}

function recordAmount(record, amountField, quantityField, priceField) {
  const saved = Number(record && record[amountField]);
  if (Number.isFinite(saved) && saved !== 0) return saved;
  return Math.round(((Number(record && record[quantityField]) || 0)
    * (Number(record && record[priceField]) || 0)) * 100) / 100;
}

function isoWeekMonday(year, week) {
  const jan4 = new Date(Number(year), 0, 4);
  return localISO(new Date(Number(year), 0, 4 - ((jan4.getDay() + 6) % 7) + (Number(week) - 1) * 7));
}

const SHIPMENT_CATEGORIES = [
  { key: 'bullig', label: 'Bullig', unit: 'thanh' },
  { key: 'thanh', label: 'Thanh', unit: 'thanh' },
  { key: 'van', label: 'Ván', unit: 'tấm' }
];

function shipmentPairEvenWeek(weeks) {
  if (weeks.length !== 2) return 0;
  const [first, second] = [...weeks].sort((a, b) => a - b);
  if (second !== first + 1) return 0;
  return first % 2 === 0 ? first : second;
}

function shipmentRateForRow(row, ratesById, ratesByName) {
  const productId = String(row && row.productId || '');
  const rate = productId ? ratesById.get(productId) : null;
  if (rate) return rate;
  const name = String(row && row.name || '').trim().toLocaleLowerCase('vi');
  return name ? ratesByName.get(name) || null : null;
}

function shipmentCategoryForRate(rate) {
  if (!rate) return '';
  if (rateNanUse(rate) === 'Bullig') return 'bullig';
  if (rateUnit(rate) === 'Thanh') return 'thanh';
  if (rateUnit(rate) === 'Tấm') return 'van';
  return '';
}

function shipmentVolumeForRate(rate, quantity) {
  const dimensions = String(rate && rate.product || '').match(
    /(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i
  );
  if (!dimensions) return null;
  const dimensionKey = dimensions[0].replace(/,/g, '.').replace(/[x*]/gi, '×');
  return dimVolume(dimensionKey, quantity);
}

function summarizeShipments(records, mode, key, rates = [], planningItems = []) {
  const range = periodRange(mode, key);
  const targetWeek = mode === 'week' ? Number(key.slice(6)) : 0;
  const targetYear = Number(key.slice(0, 4));
  const matched = [];
  let unattributedRows = 0;
  const ratesById = new Map((rates || []).filter(rate => rate && rate.id).map(rate => [String(rate.id), rate]));
  const ratesByName = new Map((rates || []).filter(rate => rate && rate.product)
    .map(rate => [String(rate.product).trim().toLocaleLowerCase('vi'), rate]));
  (records || []).forEach(row => {
    const weeks = qcRowWeeks(row);
    const year = Number(row && row.year);
    if (!year || !weeks.length) return;
    const weekRanges = weeks.map(week => {
      const from = isoWeekMonday(year, week);
      const end = new Date(`${from}T00:00:00`);
      end.setDate(end.getDate() + 6);
      return { from, to: localISO(end) };
    });
    const overlaps = weekRanges.some(weekRange => weekRange.to >= range.from && weekRange.from <= range.to);
    if (mode === 'week') {
      if (year !== targetYear || !weeks.includes(targetWeek)) return;
      if (weeks.length === 1) {
        matched.push({ row, weeks });
        return;
      }
      const evenWeek = shipmentPairEvenWeek(weeks);
      if (evenWeek) {
        if (targetWeek === evenWeek) matched.push({ row, weeks });
        return;
      }
      unattributedRows++;
      return;
    }
    const fullyInsideMonth = weekRanges.length > 0
      && weekRanges.every(weekRange => weekRange.from >= range.from && weekRange.to <= range.to);
    if (fullyInsideMonth) matched.push({ row, weeks });
    else if (overlaps) unattributedRows++;
  });
  const categoryRows = new Map(SHIPMENT_CATEGORIES.map(category => [category.key, {
    ...category,
    quantity: 0,
    volumeM3: 0,
    volumeKnown: true,
    rows: 0,
    planWeeks: new Set()
  }]));
  const planningRows = (planningItems || []).filter(item => Number(item && item.year) === targetYear);
  const planWeekOf = item => qcRowWeeks({ week: item && item.week })[0] || 0;
  const initialPlanWeeks = new Set();
  if (mode === 'week' && targetWeek) initialPlanWeeks.add(targetWeek);
  else {
    planningRows.forEach(item => {
      const week = planWeekOf(item);
      if (!week) return;
      const from = isoWeekMonday(targetYear, week);
      const end = new Date(`${from}T00:00:00`);
      end.setDate(end.getDate() + 6);
      if (from >= range.from && localISO(end) <= range.to) initialPlanWeeks.add(week);
    });
  }
  categoryRows.forEach(category => { category.planWeeks = new Set(initialPlanWeeks); });
  let unclassifiedRows = 0;
  const byProduct = new Map();
  matched.forEach(({ row, weeks }) => {
    const rate = shipmentRateForRow(row, ratesById, ratesByName);
    const categoryKey = shipmentCategoryForRate(rate);
    const quantity = Number(row && row.qty) || 0;
    const label = String(rate && rate.product || row && row.name || 'Chưa phân loại');
    const product = byProduct.get(label) || { label, quantity: 0, rows: 0 };
    product.quantity += quantity;
    product.rows++;
    byProduct.set(label, product);
    if (!categoryKey) {
      unclassifiedRows++;
      return;
    }
    const category = categoryRows.get(categoryKey);
    category.quantity += quantity;
    category.rows++;
    if (categoryKey === 'van') {
      const volume = shipmentVolumeForRate(rate, quantity);
      if (volume == null) category.volumeKnown = false;
      else category.volumeM3 += volume;
    }
    weeks.forEach(week => category.planWeeks.add(week));
  });
  planningRows.forEach(item => {
    const week = planWeekOf(item);
    if (!week) return;
    const rate = ratesById.get(String(item.productId || ''));
    const category = categoryRows.get(shipmentCategoryForRate(rate));
    if (!category || !category.planWeeks.has(week)) return;
    category.planQuantity = (category.planQuantity || 0) + (Number(item.qty) || 0);
  });
  const byCategory = SHIPMENT_CATEGORIES.map(definition => {
    const category = categoryRows.get(definition.key);
    const planQuantity = category.planQuantity || 0;
    return {
      key: category.key,
      label: category.label,
      unit: category.unit,
      quantity: category.quantity,
      volumeM3: category.volumeM3,
      volumeKnown: category.volumeKnown,
      rows: category.rows,
      planQuantity,
      attainment: planQuantity > 0 ? category.quantity / planQuantity * 100 : null,
      planWeeks: [...category.planWeeks].sort((a, b) => a - b)
    };
  });
  return {
    quantity: matched.reduce((total, item) => total + (Number(item.row && item.row.qty) || 0), 0),
    rows: matched.length,
    unattributedRows,
    unclassifiedRows,
    workshop: 'Xưởng 2',
    byCategory,
    byProduct: [...byProduct.values()].sort((a, b) => b.quantity - a.quantity)
  };
}

function buildPurchases(records, range) {
  const dated = (records || []).filter(row => inRange(row && row.date, range));
  const summarizeLocation = (key, label, rows) => {
    const byType = [...rows.reduce((types, row) => {
      const type = String(row.type || '').trim() || 'Chưa phân loại';
      const item = types.get(type) || { label: type, weight: 0, amount: 0, rows: 0 };
      item.weight += Number(row.weight) || 0;
      item.amount += recordAmount(row, 'totalAmount', 'weight', 'unitPrice');
      item.rows++;
      types.set(type, item);
      return types;
    }, new Map()).values()].sort((a, b) => b.weight - a.weight);
    return {
      key, label, weight: sum(rows, 'weight'),
      amount: rows.reduce((total, row) => total + recordAmount(row, 'totalAmount', 'weight', 'unitPrice'), 0),
      rows: rows.length, byType
    };
  };
  const byLocation = MATERIAL_LOCATIONS.map(location => summarizeLocation(
    location.key,
    location.label,
    dated.filter(row => row.location === location.key || row.location === location.label)
  ));
  const knownLocations = new Set(MATERIAL_LOCATIONS.flatMap(location => [location.key, location.label]));
  const otherByLocation = new Map();
  dated.filter(row => !knownLocations.has(row.location)).forEach(row => {
    const label = String(row.location || '').trim() || 'Chưa phân loại vị trí';
    if (!otherByLocation.has(label)) otherByLocation.set(label, []);
    otherByLocation.get(label).push(row);
  });
  otherByLocation.forEach((rows, label) => byLocation.push(summarizeLocation(`other:${label}`, label, rows)));
  return {
    weight: sum(dated, 'weight'),
    amount: dated.reduce((total, row) => total + recordAmount(row, 'totalAmount', 'weight', 'unitPrice'), 0),
    rows: dated.length,
    undatedRows: (records || []).filter(row => !String(row && row.date || '').slice(0, 10)).length,
    byLocation
  };
}

function buildByproductSales(records, range) {
  const byKind = new Map();
  const rows = (records || []).filter(row => row && inRange(row.date, range)
    && row.outType !== 'dispose');
  rows.forEach(row => {
    const kind = String(row.kind || 'khac');
    const item = byKind.get(kind) || { kind, label: ({
      ngon: 'Ngọn', mat: 'Mắt luồng', ong_loi: 'Ống lỗi băm', khac: 'Khác'
    })[kind] || 'Khác', amount: 0, weight: 0, rows: 0 };
    item.amount += recordAmount(row, 'amount', 'kg', 'price');
    item.weight += Number(row.kg) || 0;
    item.rows++;
    byKind.set(kind, item);
  });
  return {
    amount: rows.reduce((total, row) => total + recordAmount(row, 'amount', 'kg', 'price'), 0),
    weight: sum(rows, 'kg'),
    rows: rows.length,
    byKind: [...byKind.values()].sort((a, b) => b.amount - a.amount)
  };
}

function qualityBucket(label) {
  return { label, checked: 0, passed: 0, rejected: 0, exception: 0, rows: 0 };
}

function addQualityCounts(bucket, checked, passed, rejected, exception = 0) {
  bucket.checked += Number(checked) || 0;
  bucket.passed += Number(passed) || 0;
  bucket.rejected += Number(rejected) || 0;
  bucket.exception += Number(exception) || 0;
  bucket.rows++;
}

function finishQualityBucket(bucket) {
  bucket.passRate = bucket.checked > 0 ? bucket.passed / bucket.checked * 100 : null;
  bucket.rejectRate = bucket.checked > 0 ? bucket.rejected / bucket.checked * 100 : null;
  return bucket;
}

function dimensionsOf(value) {
  const numbers = String(value || '').match(/\d+(?:\.\d+)?/g);
  return numbers && numbers.length >= 3 ? numbers.slice(-3).map(Number) : [];
}

function qcRecordIsBullig(record, display, rates) {
  const byId = (rates || []).find(rate => rate && String(rate.id) === String(record.productId || ''));
  if (byId) return String(byId.nanUse || '').trim().toLowerCase() === 'bullig';
  const dimensions = dimensionsOf(display.sizeKey || record.sizeKey || display.productName || record.productName);
  if (!dimensions.length) return false;
  return (rates || []).some(rate => {
    if (!rate || String(rate.nanUse || '').trim().toLowerCase() !== 'bullig') return false;
    const rateDimensions = dimensionsOf(rate.product);
    return rateDimensions.length === 3 && rateDimensions.every((value, index) => value === dimensions[index]);
  });
}

function buildQuality(records, bulligRecords, range, rates) {
  const x1 = qualityBucket('Xưởng 1');
  const x2ByKind = {
    van: qualityBucket('Ván'),
    thanh: qualityBucket('Thanh'),
    bullig: qualityBucket('Bullig')
  };
  const qcRows = (records || []).filter(row => row && inRange(row.date, range));
  qcRows.forEach(record => {
    const display = qcFinalDisplay(record);
    if (display.workshop === 'x1') {
      addQualityCounts(x1, display.qtyChecked, display.qtyPass, display.qtyReject, display.qtyExcept);
      return;
    }
    if (display.kind === 'van') {
      addQualityCounts(x2ByKind.van, display.qtyChecked, display.qtyPass, display.qtyReject, display.qtyExcept);
    } else if (display.kind === 'thanh' && !qcRecordIsBullig(record, display, rates)) {
      addQualityCounts(x2ByKind.thanh, display.qtyChecked, display.qtyPass, display.qtyReject, display.qtyExcept);
    }
  });
  (bulligRecords || []).filter(row => row && row.kind === 'ct' && inRange(row.date, range)).forEach(record => {
    const display = bulligDisplay(record);
    addQualityCounts(x2ByKind.bullig, display.qtyOk + display.qtyErr, display.qtyOk, display.qtyErr);
  });
  Object.values(x2ByKind).forEach(finishQualityBucket);
  const x2 = Object.values(x2ByKind).reduce((total, item) => {
    total.checked += item.checked;
    total.passed += item.passed;
    total.rejected += item.rejected;
    total.exception += item.exception;
    total.rows += item.rows;
    return total;
  }, Object.assign(qualityBucket('Xưởng 2'), { byKind: x2ByKind }));
  finishQualityBucket(x1);
  finishQualityBucket(x2);
  return { x1, x2 };
}

function buildLabor(employees, range) {
  const rows = employees || [];
  const active = rows.filter(employee => (employee.status || 'active') === 'active');
  const departments = HR_DEPARTMENTS.map(department => ({
    department,
    active: active.filter(employee => employee.department === department).length
  }));
  const otherDepartments = [...new Set(active.map(employee => String(employee.department || '').trim())
    .filter(department => department && !HR_DEPARTMENTS.includes(department)))];
  otherDepartments.forEach(department => departments.push({
    department,
    active: active.filter(employee => employee.department === department).length
  }));
  return {
    active: active.length,
    departments,
    joined: rows.filter(employee => inRange(employee.joinDate, range)).length,
    left: rows.filter(employee => inRange(employee.quitDate, range)).length,
    netChange: rows.filter(employee => inRange(employee.joinDate, range)).length
      - rows.filter(employee => inRange(employee.quitDate, range)).length,
    missingJoinDate: rows.filter(employee => !String(employee.joinDate || '').slice(0, 10)).length
  };
}

export function canAccessLeadershipDashboard() {
  const role = state.currentUser && state.currentUser.role;
  return role === 'admin' || role === 'manager';
}

function reportCapacityForPeriod(capacityRows, source, range) {
  return capacityRows.map(workshop => ({
    ...workshop,
    stages: workshop.stages.map(stage => {
      if (workshop.id !== 'x2' || !['boluong', 'cut'].includes(stage.id)) return stage;
      const sourceRows = stage.id === 'boluong'
        ? source.xuong2BoluongRecords || []
        : source.xuong2CutRecords || [];
      const display = stage.id === 'boluong' ? boluongDisplay : cutDisplay;
      const rows = sourceRows.filter(row => row && inRange(row.date, range)).map(display);
      let weight = 0;
      let carts = 0;
      let estimated = false;
      rows.forEach(row => {
        const rowWeight = Number(row.inputWeight) || 0;
        const rowCarts = Number(row.cartsEq) || 0;
        if (rowWeight > 0) weight += rowWeight;
        else if (rowCarts > 0) {
          weight += rowCarts * 600;
          estimated = true;
        }
        carts += rowCarts;
      });
      if (!rows.length && Number(stage.quantity) > 0) {
        weight = Number(stage.quantity) * 600;
        carts = Number(stage.quantity);
        estimated = true;
      }
      const kgPerCart = carts > 0 ? weight / carts : 600;
      return {
        ...stage,
        quantity: rows.length || stage.turns > 0 ? weight : null,
        quantityKnown: true,
        quantityUnit: 'kg',
        unit: 'kg/h',
        capacity: stage.capacity == null ? null : stage.capacity * kgPerCart,
        estimated: estimated || stage.estimated
      };
    })
  }));
}

function buildLeadershipPeriodSummary(mode, key, source, capacity, stock) {
  const period = normalizePeriod(mode, key);
  const range = periodRange(period.mode, period.key);
  const rawCapacity = capacity || leadershipCapacitySnapshot(period.key, period.mode);
  const capacityRows = reportCapacityForPeriod(rawCapacity, source, range);
  const qualitySource = source.qcFinalRecords || [];
  const shipmentSource = source.qcExports || [];
  const bulligSource = source.xuong2BulligRecords || [];
  const quality = buildQuality(qualitySource, bulligSource, range, source.materialRates || []);
  const batches = source.batches || [];
  return {
    mode: period.mode,
    key: period.key,
    label: capPeriodLabel(period.key, period.mode),
    range,
    purchases: buildPurchases(source.materialRecords || [], range),
    byproductSales: buildByproductSales(source.x2PhuPhamRecords || [], range),
    capacity: capacityRows,
    inventory: {
      current: stock.remainingThanh,
      currentM3: stock.remainingM3,
      pool: stock.poolThanh,
      say1: stock.poolSay1Thanh,
      say1M3: batches.filter(batch => batch && batch.stage === 'say1')
        .reduce((total, batch) => total + calculateVolume(batch.length, batch.width, batch.thickness, Number(batch.quantity) || 0), 0),
      say2: stock.poolSay2Thanh,
      say2M3: batches.filter(batch => batch && batch.stage === 'say2')
        .reduce((total, batch) => total + calculateVolume(batch.length, batch.width, batch.thickness, Number(batch.quantity) || 0), 0),
      pendingCount: stock.pendingCount,
      pendingQty: stock.pendingQty,
      mismatch: stock.mismatchThanh
    },
    quality,
    qualityHasHistory: Object.values(quality).some(item => item.rows > 0),
    qualityKindHasHistory: Object.fromEntries(Object.entries(quality.x2.byKind).map(([kind, item]) => [kind, item.rows > 0])),
    labor: buildLabor(source.hrEmployees || [], range),
    shipments: summarizeShipments(
      shipmentSource,
      period.mode,
      period.key,
      source.materialRates || [],
      source.planningItems || []
    ),
    shipmentHasHistory: shipmentSource.length > 0
  };
}

export function buildLeadershipSummary(mode = periodMode, key = periodKey, source = state, capacity, inventory, previousCapacity) {
  const period = normalizePeriod(mode, key);
  const dataSource = source || state;
  const stock = inventory || khoStockSummary();
  const previousKey = period.mode === 'month'
    ? capMonthShift(period.key, -1)
    : capWeekShift(period.key, -1);
  const summary = buildLeadershipPeriodSummary(period.mode, period.key, dataSource, capacity, stock);
  summary.previous = buildLeadershipPeriodSummary(
    period.mode,
    previousKey,
    dataSource,
    previousCapacity,
    stock
  );
  return summary;
}

function fmt(value, digits = 1) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: digits });
}

function fmtPct(value) {
  return value == null ? '—' : `${fmt(value)}%`;
}

function fmtCurrency(value) {
  return `${fmt(value, 0)} đ`;
}

function renderComparison(current, previous, unit, digits = 1, percentagePoints = false, includePercent = true) {
  if (current == null || previous == null || !Number.isFinite(Number(current)) || !Number.isFinite(Number(previous))) {
    return '<span class="leadership-delta is-unavailable" title="Không đủ dữ liệu để so sánh">—</span>';
  }
  const delta = Number(current) - Number(previous);
  if (Math.abs(delta) < 1e-9) {
    return `<span class="leadership-delta is-flat" title="Không thay đổi so với kỳ trước">＝ Không đổi</span>`;
  }
  const direction = delta > 0 ? 'is-up' : 'is-down';
  const symbol = delta > 0 ? '▲' : '▼';
  const percent = includePercent && Number(previous) !== 0 && !percentagePoints
    ? ` · ${fmt(Math.abs(delta / Number(previous) * 100))}%`
    : '';
  const shownUnit = percentagePoints ? 'điểm %' : unit;
  const title = percentagePoints
    ? `Thay đổi ${fmt(delta, digits)} điểm phần trăm so với kỳ trước`
    : `Thay đổi ${fmt(delta, digits)} ${unit} so với kỳ trước${Number(previous) === 0 ? ' (kỳ trước bằng 0)' : ''}`;
  return `<span class="leadership-delta ${direction}" title="${escapeHTML(title)}">${symbol} ${fmt(delta, digits)} ${escapeHTML(shownUnit)}${percent}</span>`;
}

function detailLink(view, label) {
  return `<button type="button" class="leadership-detail-link" data-leadership-target="${view}">${escapeHTML(label)} <i data-lucide="arrow-up-right"></i></button>`;
}

function efficiencyBar(value, label) {
  const pct = value == null ? 0 : Math.max(0, Math.min(150, Number(value)));
  const tone = value == null ? 'is-empty' : value >= 100 ? 'is-good' : value >= 70 ? 'is-warn' : 'is-low';
  return `<div class="leadership-eff-row">
    <span>${escapeHTML(label)}</span>
    <div class="leadership-eff-track" role="progressbar" aria-label="${escapeHTML(label)}" aria-valuemin="0" aria-valuemax="150" aria-valuenow="${pct}">
      <i class="${tone}" style="width:${pct / 1.5}%"></i>
    </div>
    <strong>${fmtPct(value)}</strong>
  </div>`;
}

function visibleCapacityStages(workshop) {
  const hidden = new Set(['bullig_gc', 'catvan_cat', 'catvan_xe', 'baovan_bao', 'baovan_cha']);
  return workshop.stages.filter(stage => !hidden.has(stage.id));
}

function renderCapacity(summary, previousCapacity) {
  const mainStageIds = new Set(['epvan', 'bullig_ct']);
  const previousWorkshops = previousCapacity || [];
  return summary.capacity.map(workshop => {
    const stages = visibleCapacityStages(workshop);
    const previous = previousWorkshops.find(item => item.id === workshop.id);
    const previousStages = new Map((previous && previous.stages || []).map(stage => [stage.id, stage]));
    const renderStage = stage => {
      const before = previousStages.get(stage.id);
      const output = stage.quantityKnown && stage.quantity != null
        ? `${fmt(stage.quantity, 2)} ${stage.quantityUnit}`
        : 'Chưa đủ dữ liệu';
      const capacity = stage.capacity == null ? '—' : `${fmt(stage.capacity, 2)} ${stage.unit}`;
      const estimate = stage.estimated ? ' · ước tính' : '';
      return `<div class="leadership-stage-row" title="${escapeHTML(stage.turns ? `${fmt(stage.turns, 0)} lượt${estimate}` : 'Chưa ghi lượt')}">
        <div class="leadership-stage-title">
          <strong>${escapeHTML(stage.label)}${stage.estimated ? '<small class="leadership-estimate-badge">Ước tính 600 kg/xe</small>' : ''}</strong>
          <span>${escapeHTML(output)}${stage.estimated ? ' ≈' : ''} <i>·</i> ${escapeHTML(capacity)}</span>
        </div>
        <div class="leadership-stage-meta">
          <span>Giờ làm ${fmt(stage.hours, 1)} h ${renderComparison(stage.hours, before && before.hours, 'h', 1, false, false)}</span>
          <span>Sự cố ${fmt(stage.incidentHours, 1)} h ${renderComparison(stage.incidentHours, before && before.incidentHours, 'h', 1, false, false)}</span>
          <span>SL ${renderComparison(stage.quantity, before && before.quantity, stage.quantityUnit, 1, false, false)}</span>
        </div>
        <div class="leadership-stage-chart">
          ${efficiencyBar(stage.efficiency, `${workshop.label} · ${stage.label}`)}
          <span class="leadership-stage-efficiency">${renderComparison(stage.efficiency, before && before.efficiency, 'điểm %', 1, true)}</span>
        </div>
      </div>`;
    };
    const componentStages = stages.filter(stage => !mainStageIds.has(stage.id));
    const mainStages = stages.filter(stage => mainStageIds.has(stage.id));
    const bottleneck = workshop.bottleneck
      ? `Nút thắt: ${escapeHTML(workshop.bottleneck.label)} (${fmtPct(workshop.bottleneck.efficiency)})`
      : 'Chưa đủ dữ liệu định mức để xác định nút thắt';
    const count = stages.filter(stage => stage.turns > 0).length;
    return `<article class="leadership-workshop${count ? '' : ' is-empty'}">
      <header class="leadership-workshop-head">
        <div><h3>${escapeHTML(workshop.label)}</h3><span>${count}/${stages.length} công đoạn có dữ liệu</span></div>
        <strong>${fmtPct(workshop.efficiency)} ${renderComparison(workshop.efficiency, previous && previous.efficiency, 'điểm %', 1, true)}</strong>
      </header>
      ${count ? componentStages.filter(stage => stage.turns > 0 || stage.quantity > 0).map(renderStage).join('') : '<p class="leadership-empty">Chưa có sản lượng được ghi trong kỳ này.</p>'}
      ${count && mainStages.some(stage => stage.turns > 0 || stage.quantity > 0)
        ? `<div class="leadership-main-stages">${mainStages.filter(stage => stage.turns > 0 || stage.quantity > 0).map(renderStage).join('')}</div>`
        : ''}
      <p class="leadership-bottleneck">${escapeHTML(bottleneck)}</p>
    </article>`;
  }).join('');
}

function purchaseSlices(location) {
  const types = (location.byType || []).filter(item => item.weight > 0).sort((a, b) => b.weight - a.weight);
  const top = types.slice(0, 3);
  const rest = types.slice(3);
  const slices = top.map(item => ({ ...item }));
  if (rest.length) slices.push({
    label: 'Khác',
    weight: rest.reduce((total, item) => total + item.weight, 0),
    rows: rest.reduce((total, item) => total + item.rows, 0)
  });
  if (!slices.length && location.weight > 0) {
    slices.push({ label: 'Chưa phân loại', weight: location.weight, rows: location.rows });
  }
  return slices;
}

function svgPoint(cx, cy, radius, angle) {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function svgArcPath(cx, cy, radius, startAngle, endAngle) {
  const start = svgPoint(cx, cy, radius, startAngle);
  const end = svgPoint(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function renderPurchasePie(purchases) {
  const groups = purchases.byLocation.map((location, index) => ({
    ...location,
    locationIndex: index,
    slices: purchaseSlices(location)
  })).filter(group => group.weight > 0 && group.slices.length);
  const total = groups.reduce((sumWeight, group) => sumWeight + group.weight, 0);
  if (!total) return '<p class="leadership-empty">Chưa có khối lượng mua vào trong kỳ.</p>';

  const cx = 310, cy = 90, radius = 60;
  const palettes = [
    ['#bf8058', '#d29d78', '#e3bda1', '#a8a39b'],
    ['#5d85a7', '#83a2bb', '#abc0cf', '#a8a39b'],
    ['#4f815b', '#75a17c', '#9cbb9f', '#a8a39b'],
    ['#737b76', '#909994', '#aeb5b0', '#c4c9c5']
  ];
  const segments = [];
  const boundaries = [];
  const positionSegments = [];
  let angle = -Math.PI / 2;
  groups.forEach(group => {
    const start = angle;
    boundaries.push(angle);
    group.slices.forEach((slice, sliceIndex) => {
      const sliceStart = angle;
      const end = sliceStart + (slice.weight / total) * Math.PI * 2;
      segments.push({
        ...slice,
        location: group.label,
        locationIndex: Math.min(group.locationIndex, palettes.length - 1),
        color: palettes[Math.min(group.locationIndex, palettes.length - 1)][Math.min(sliceIndex, 3)],
        start: sliceStart, end, mid: (sliceStart + end) / 2
      });
      angle = end;
    });
    positionSegments.push({
      start,
      end: angle,
      color: palettes[Math.min(group.locationIndex, palettes.length - 1)][0]
    });
  });

  const pathFor = segment => {
    const start = svgPoint(cx, cy, radius, segment.start);
    const end = svgPoint(cx, cy, radius, segment.end);
    const largeArc = segment.end - segment.start > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
  };
  const shapes = segments.length === 1
    ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${segments[0].color}" stroke="#fff" stroke-width="1.5"/>`
    : segments.map(segment => `<path d="${pathFor(segment)}" fill="${segment.color}" stroke="#fff" stroke-width="1.4"/>`).join('');
  const leaderLabels = { left: [], right: [] };
  segments.forEach(segment => {
    const point = svgPoint(cx, cy, radius + 3, segment.mid);
    leaderLabels[Math.cos(segment.mid) >= 0 ? 'right' : 'left'].push({ segment, point });
  });
  const callouts = Object.entries(leaderLabels).map(([side, labels]) => {
    labels.sort((a, b) => a.point.y - b.point.y);
    const targetX = side === 'right' ? 438 : 182;
    const elbowX = side === 'right' ? 416 : 204;
    const textX = side === 'right' ? 444 : 4;
    return labels.map(({ segment, point }, index) => {
      const y = 12 + ((index + 1) / (labels.length + 1)) * 156;
      const pivot = svgPoint(cx, cy, radius + 12, segment.mid);
      return `<polyline points="${point.x.toFixed(1)},${point.y.toFixed(1)} ${pivot.x.toFixed(1)},${pivot.y.toFixed(1)} ${elbowX},${y.toFixed(1)} ${targetX},${y.toFixed(1)}" fill="none" stroke="${segment.color}" stroke-width="1.1"/>
        <text x="${textX}" y="${(y - 5).toFixed(1)}" class="leadership-pie-label">
          <tspan x="${textX}" dy="0">${escapeHTML(`${segment.location} · ${segment.label}`)}</tspan>
          <tspan x="${textX}" dy="10">${fmt(segment.weight / 1000, 2)} t</tspan>
        </text>`;
    }).join('');
  }).join('');
  const boundaryLines = boundaries.map(boundary => {
    const point = svgPoint(cx, cy, radius + 1, boundary);
    return `<line x1="${cx}" y1="${cy}" x2="${point.x.toFixed(2)}" y2="${point.y.toFixed(2)}" class="leadership-pie-location-boundary"/>`;
  }).join('');
  const ringRadius = radius + 10;
  const positionRing = positionSegments.map(group => {
    const fullCircle = Math.abs((group.end - group.start) - Math.PI * 2) < 1e-6;
    const shape = fullCircle
      ? `<circle cx="${cx}" cy="${cy}" r="${ringRadius}" class="leadership-pie-position-ring" stroke="${group.color}"/>`
      : `<path d="${svgArcPath(cx, cy, ringRadius, group.start, group.end)}" class="leadership-pie-position-ring" stroke="${group.color}"/>`;
    return shape;
  }).join('');
  const ringSeparators = boundaries.map(boundary => {
    const inner = svgPoint(cx, cy, radius + 5, boundary);
    const outer = svgPoint(cx, cy, radius + 15, boundary);
    return `<line x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}" class="leadership-pie-ring-separator"/>`;
  }).join('');
  const aria = segments.map(segment => `${segment.location}, ${segment.label}: ${fmt(segment.weight / 1000, 2)} t`).join('; ');
  return `<svg class="leadership-purchase-pie" viewBox="0 0 620 180" role="img" aria-label="${escapeHTML(`Cơ cấu mua vào theo vị trí và nguyên liệu: ${aria}`)}">
    <circle cx="${cx}" cy="${cy}" r="${ringRadius}" class="leadership-pie-position-ring-base"/>
    ${positionRing}
    ${ringSeparators}
    ${shapes}
    <circle cx="${cx}" cy="${cy}" r="${radius}" class="leadership-pie-outline"/>
    ${boundaryLines}
    ${callouts}
  </svg>`;
}

function renderMoneyChart(purchases, previousPurchases, sales, previousSales) {
  const max = Math.max(1, purchases.amount, sales.amount);
  const entries = [
    { key: 'purchase', label: 'Chi mua nguyên liệu', amount: purchases.amount, previous: previousPurchases.amount },
    { key: 'sales', label: 'Thu bán phụ phẩm', amount: sales.amount, previous: previousSales.amount }
  ];
  const rows = entries.map(item => `<div class="leadership-money-item">
    <div class="leadership-money-label"><span>${item.label}</span><strong>${fmtCurrency(item.amount)}</strong></div>
    <div class="leadership-money-track" role="img" aria-label="${escapeHTML(`${item.label}: ${fmtCurrency(item.amount)}`)}"><i class="is-${item.key}" style="height:${Math.max(0, Math.min(100, item.amount / max * 100))}%"></i></div>
    ${renderComparison(item.amount, item.previous, 'đ', 0)}
  </div>`).join('');
  const breakdown = sales.byKind.length
    ? `<div class="leadership-byproduct-revenue">${sales.byKind.slice(0, 3).map(item => `<span>${escapeHTML(item.label)} <strong>${fmtCurrency(item.amount)}</strong></span>`).join('')}</div>`
    : '';
  return `<div class="leadership-money-chart">${rows}</div>
    ${breakdown}
    <p class="leadership-data-note">Tiền bán chỉ gồm phiếu bán phụ phẩm, không gồm tiêu hủy; đây là so sánh chi mua và thu bán, không phải lợi nhuận.</p>`;
}

function renderPurchases(purchases, previousPurchases, sales, previousSales) {
  const previousByLocation = new Map(previousPurchases.byLocation.map(item => [item.key, item]));
  const locations = purchases.byLocation.map(item => {
    const previous = previousByLocation.get(item.key);
    return `<div class="leadership-purchase-location"><span>${escapeHTML(item.label)}</span><strong>${fmt(item.weight / 1000, 2)} t</strong>${renderComparison(item.weight / 1000, previous ? previous.weight / 1000 : null, 't', 2)}</div>`;
  }).join('');
  return `<div class="leadership-purchase-summary">
      <div><strong>${fmt(purchases.weight / 1000, 2)} <small>t</small></strong><span>${purchases.rows} phiếu nhập trong kỳ</span></div>
      ${renderComparison(purchases.weight / 1000, previousPurchases.weight / 1000, 't', 2)}
    </div>
    <div class="leadership-purchase-visual-row">
      ${renderPurchasePie(purchases)}
      <div class="leadership-purchase-location-totals">${locations}</div>
    </div>
    ${renderMoneyChart(purchases, previousPurchases, sales, previousSales)}`;
}

function renderQualityItem(item, previous, hasHistory) {
  const total = item.checked || 0;
  const standardPass = Math.max(0, item.passed - item.exception);
  const okWidth = total ? standardPass / total * 100 : 0;
  const rejectWidth = total ? item.rejected / total * 100 : 0;
  const exceptWidth = total ? item.exception / total * 100 : 0;
  return `<div class="leadership-quality-item">
    <div class="leadership-quality-head"><strong>${escapeHTML(item.label)}</strong><b>${fmtPct(item.passRate)} đạt</b></div>
    <div class="leadership-quality-chart" role="img" aria-label="${escapeHTML(`${item.label}: đạt chuẩn ${fmt(standardPass, 0)}, ngoại lệ ${fmt(item.exception, 0)}, lỗi ${fmt(item.rejected, 0)}`)}">
      <i class="is-pass" style="width:${okWidth}%"></i><i class="is-exception" style="width:${exceptWidth}%"></i><i class="is-reject" style="width:${rejectWidth}%"></i>
    </div>
    <div class="leadership-quality-legend">
      <span><i class="is-pass"></i>Đạt chuẩn ${fmt(standardPass, 0)}</span>
      <span><i class="is-exception"></i>Ngoại lệ ${fmt(item.exception, 0)}</span>
      <span><i class="is-reject"></i>Lỗi ${fmt(item.rejected, 0)} (${fmtPct(item.rejectRate)})</span>
    </div>
    <div class="leadership-quality-comparison">
      <span>${fmt(item.checked, 0)} SP kiểm</span>
      <span>Đạt ${renderComparison(item.passRate, previous && previous.passRate, 'điểm %', 1, true)}</span>
      <span>Lỗi ${renderComparison(item.rejectRate, previous && previous.rejectRate, 'điểm %', 1, true)}</span>
    </div>
    ${hasHistory && !item.rows ? '<small class="leadership-muted">Không có phiếu kiểm trong kỳ.</small>' : ''}
  </div>`;
}

function renderQuality(quality, previous, hasHistory) {
  const x1 = renderQualityItem(quality.x1, previous.x1, hasHistory);
  const kinds = ['van', 'thanh', 'bullig'];
  const x2Items = kinds.map(kind => {
    const item = quality.x2.byKind[kind];
    return `<div class="leadership-quality-kind">${renderQualityItem(item, previous.x2.byKind[kind], item.rows > 0)}</div>`;
  }).join('');
  return `<div class="leadership-quality-workshop">${x1}</div>
    <div class="leadership-quality-workshop leadership-quality-x2"><h3>${escapeHTML(quality.x2.label)}</h3><div class="leadership-quality-x2-grid">${x2Items}</div></div>`;
}

function renderLabor(labor, previous) {
  const max = Math.max(1, ...labor.departments.map(item => item.active));
  const previousDepartments = new Map(previous.departments.map(item => [item.department, item]));
  const departments = labor.departments.map(item => `<div class="leadership-dept-row">
    <span>${escapeHTML(item.department)}</span>
    <div class="leadership-dept-track" role="img" aria-label="${escapeHTML(`${item.department}: ${fmt(item.active, 0)} người`)}"><i style="width:${item.active / max * 100}%"></i></div>
    <strong>${fmt(item.active, 0)} ${renderComparison(item.active, (previousDepartments.get(item.department) || {}).active, 'người', 0)}</strong>
  </div>`).join('');
  return `<div class="leadership-labor-summary">
      <strong>${fmt(labor.active, 0)} <small>người</small></strong>
      <span>Biến động ròng ${renderComparison(labor.netChange, previous.netChange, 'người', 0)} · ${renderComparison(labor.active, previous.active, 'người', 0)} tổng lao động</span>
      <span><b>+${fmt(labor.joined, 0)}</b> vào · <b>−${fmt(labor.left, 0)}</b> nghỉ trong kỳ</span>
    </div>
    <div class="leadership-dept-list" aria-label="Biểu đồ lao động theo bộ phận">${departments}</div>
    <small class="leadership-muted">Biến động theo ngày vào/nghỉ ghi trên hồ sơ nhân viên.</small>`;
}

function renderShipments(shipments, previous, hasHistory) {
  const groups = shipments.byCategory.map(category => {
    const before = previous.byCategory.find(item => item.key === category.key);
    const ratio = category.attainment == null
      ? 0
      : Math.round(Math.max(0, Math.min(100, category.attainment)) * 10) / 10;
    const volume = category.key === 'van'
      ? `<small class="leadership-shipment-volume">· ${category.volumeKnown ? fmt(category.volumeM3, 3) : '—'} m³</small>`
      : '';
    const plan = category.planQuantity > 0
      ? `${fmt(category.planQuantity, 0)} ${category.unit}`
      : 'Chưa có kế hoạch';
    const attainment = category.attainment == null ? '—' : fmtPct(category.attainment);
    return `<article class="leadership-shipment-group is-${category.key}">
      <div class="leadership-shipment-group-head">
        <strong>${escapeHTML(category.label)} <small>· ${escapeHTML(category.unit)}</small></strong>
        <strong class="leadership-shipment-quantity">${fmt(category.quantity, 0)} ${escapeHTML(category.unit)} ${volume}</strong>
      </div>
      <div class="leadership-shipment-progress" role="img" aria-label="${escapeHTML(`${category.label}: ${attainment} kế hoạch`)}"><i style="width:${ratio}%"></i></div>
      <div class="leadership-shipment-group-meta">
        <span>KH <b>${escapeHTML(plan)}</b></span>
        <strong>Đạt ${escapeHTML(attainment)}</strong>
        <span>So kỳ trước ${renderComparison(category.quantity, before && before.quantity, category.unit, 0)}</span>
      </div>
    </article>`;
  }).join('');
  const status = !hasHistory
    ? 'Chưa có dữ liệu xuất hàng QC'
    : shipments.rows ? `${shipments.rows} dòng ghi nhận` : 'Không có dòng xuất trong kỳ';
  const gap = shipments.unattributedRows
    ? `<p class="leadership-data-note">${shipments.unattributedRows} dòng gộp nhiều tuần không thuộc cặp hai tuần liên tiếp nên chưa thể phân bổ vào kỳ.</p>`
    : '';
  const unclassified = shipments.unclassifiedRows
    ? `<p class="leadership-data-note">${shipments.unclassifiedRows} dòng “Chưa phân loại”; không tính vào tỷ lệ của ba nhóm.</p>`
    : '';
  return `<div class="leadership-shipment-summary">
      <div><strong>${escapeHTML(status)}</strong><span>Xưởng 2 · theo tuần xuất hàng QC</span></div>
    </div>
    <div class="leadership-shipment-chart leadership-shipment-groups" aria-label="Xuất hàng và tỷ lệ đạt kế hoạch theo nhóm">${groups}</div>
    <p class="leadership-data-note">Chỉ tiêu theo số lượng đã khai báo, không xác nhận giao thực tế. Xưởng 1 chưa có sổ giao hàng riêng.</p>
    ${unclassified}
    ${gap}`;
}

function compactPeriodLabel(mode, key) {
  if (mode === 'week') {
    const match = /^(\d{4})-W(\d{1,2})$/.exec(String(key || ''));
    return match ? `Tuần ${Number(match[2])}-${match[1]}` : String(key || '');
  }
  const match = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  return match ? `Tháng ${Number(match[2])}-${match[1]}` : String(key || '');
}

export function buildLeadershipReportMarkup(summary) {
  const currentPeriodLabel = compactPeriodLabel(summary.mode, summary.key);
  const previousPeriodLabel = compactPeriodLabel(summary.previous.mode, summary.previous.key);
  const inventoryText = summary.inventory.current == null
    ? 'Chưa có dữ liệu tồn kho'
    : `${fmt(summary.inventory.current, 0)} thanh`;
  const inventoryTotal = (Number(summary.inventory.say1) || 0)
    + (Number(summary.inventory.say2) || 0)
    + (Number(summary.inventory.current) || 0);
  const inventoryMax = Math.max(1, inventoryTotal);
  const inventoryChart = `<div class="leadership-stock-chart" role="img" aria-label="${escapeHTML(`Tồn theo khu vực: Sấy 1 ${fmt(summary.inventory.say1, 0)}, Sấy 2 ${fmt(summary.inventory.say2, 0)}, Kho ${fmt(summary.inventory.current, 0)} thanh`)}">
      <i class="is-say1" style="width:${(Number(summary.inventory.say1) || 0) / inventoryMax * 100}%"></i>
      <i class="is-say2" style="width:${(Number(summary.inventory.say2) || 0) / inventoryMax * 100}%"></i>
      <i class="is-warehouse" style="width:${(Number(summary.inventory.current) || 0) / inventoryMax * 100}%"></i>
    </div>
    <div class="leadership-stock-legend">
      <span><i class="is-say1"></i>Sấy 1 · ${fmt(summary.inventory.say1, 0)} thanh · ${fmt(summary.inventory.say1M3, 3)} m³</span>
      <span><i class="is-say2"></i>Sấy 2 · ${fmt(summary.inventory.say2, 0)} thanh · ${fmt(summary.inventory.say2M3, 3)} m³</span>
      <span><i class="is-warehouse"></i>Kho · ${fmt(summary.inventory.current, 0)} thanh · ${fmt(summary.inventory.currentM3, 3)} m³</span>
    </div>`;
  const warnings = [
    'Tồn kho là snapshot hiện tại của Sấy/Kho Xưởng 2, không phải tồn tại ngày cuối kỳ; chưa có số tồn Xưởng 1.'
  ];
  if (!summary.qualityHasHistory) warnings.push('Chưa có dữ liệu kiểm sau sản xuất để tính tỷ lệ đạt/lỗi.');
  if (!summary.shipmentHasHistory) warnings.push('Chưa có dữ liệu xuất hàng QC.');
  if (summary.shipments.unattributedRows) warnings.push('Dòng xuất hàng gộp nhiều tuần không thuộc cặp hai tuần liên tiếp nên chưa thể phân bổ vào kỳ.');
  if (summary.shipments.unclassifiedRows) warnings.push('Có dòng xuất hàng chưa khớp định mức; các dòng này được tách riêng và không tính vào tỷ lệ ba nhóm.');
  if (summary.labor.missingJoinDate) warnings.push(`${summary.labor.missingJoinDate} hồ sơ thiếu ngày vào; lịch sử biến động lao động có thể chưa đầy đủ.`);
  return `<div class="leadership-paper-stack">
    <article class="leadership-paper" data-report-page="1">
      <header class="leadership-paper-header">
        <div class="leadership-paper-brand"><span>NHÀ MÁY NGỌC SƠN</span><span>THANH HÓA</span></div>
        <div class="leadership-paper-title"><h1>BÁO CÁO ĐIỀU HÀNH</h1><p>${escapeHTML(currentPeriodLabel)} vs ${escapeHTML(previousPeriodLabel)}</p></div>
        <span class="leadership-paper-date">Ngày lập<br><strong>${todayISO()}</strong></span>
      </header>
      <section class="leadership-section">
        <header class="leadership-section-header"><span>01</span><h2>Nguyên liệu mua vào</h2>${detailLink('materials-view', 'Chi tiết')}</header>
        ${renderPurchases(summary.purchases, summary.previous.purchases, summary.byproductSales, summary.previous.byproductSales)}
      </section>
      <section class="leadership-section">
        <header class="leadership-section-header"><span>02</span><h2>Sản xuất &amp; công suất</h2>${detailLink('dashboard-view', 'Dashboard')}</header>
        <div class="leadership-workshops">${renderCapacity(summary, summary.previous.capacity)}</div>
      </section>
      <footer class="leadership-paper-footer"><span>BÁO CÁO NỘI BỘ · THEO DỮ LIỆU ĐÃ GHI NHẬN</span><span>01 / 02</span></footer>
    </article>
    <article class="leadership-paper" data-report-page="2">
      <header class="leadership-paper-subheader"><span>NHÀ MÁY NGỌC SƠN · BÁO CÁO ĐIỀU HÀNH</span><strong>${escapeHTML(currentPeriodLabel)} vs ${escapeHTML(previousPeriodLabel)}</strong></header>
      <section class="leadership-section">
        <header class="leadership-section-header"><span>03</span><h2>Tồn kho</h2>${detailLink('kanban-view', 'Kho Nan')}</header>
        <div class="leadership-stock-summary">
          <div><strong>${escapeHTML(inventoryText)}</strong><span>Kho Nan · hiện tại <i>·</i> ≈ ${fmt(summary.inventory.currentM3, 3)} m³</span></div>
          <div class="leadership-stock-detail"><span>Chờ duyệt <strong>${fmt(summary.inventory.pendingCount, 0)} phiếu</strong></span><span>Chênh lệch đối chiếu <strong>${fmt(summary.inventory.mismatch, 0)} thanh</strong></span></div>
        </div>
        ${inventoryChart}
        <p class="leadership-data-note">Tồn vật lý Kho Nan và tồn trung gian Xưởng 2; số hiện tại, không hồi tố theo kỳ.</p>
      </section>
      <section class="leadership-section">
        <header class="leadership-section-header"><span>04</span><h2>Chất lượng</h2>${detailLink('qc-view', 'QC')}</header>
        ${renderQuality(summary.quality, summary.previous.quality, summary.qualityHasHistory)}
      </section>
      <div class="leadership-second-page-grid">
        <section class="leadership-section">
          <header class="leadership-section-header"><span>05</span><h2>Lao động</h2>${detailLink('hr-view', 'Nhân sự')}</header>
          ${renderLabor(summary.labor, summary.previous.labor)}
        </section>
        <section class="leadership-section leadership-shipment-section">
          <header class="leadership-section-header"><span>06</span><h2>Xuất hàng</h2>${detailLink('qc-view', 'Xuất hàng QC')}</header>
          ${renderShipments(summary.shipments, summary.previous.shipments, summary.shipmentHasHistory)}
        </section>
      </div>
      <aside class="leadership-data-notes">
        <strong>Phạm vi &amp; lưu ý dữ liệu</strong>
        <ul>${warnings.map(warning => `<li>${escapeHTML(warning)}</li>`).join('')}</ul>
      </aside>
      <footer class="leadership-paper-footer"><span>Số liệu phản ánh dữ liệu đã ghi nhận trên hệ thống</span><span>02 / 02</span></footer>
    </article>
  </div>`;
}

export function renderLeadershipDashboard() {
  const root = document.getElementById('leadership-view');
  const content = document.getElementById('leadership-content');
  if (!root || !content || !canAccessLeadershipDashboard()) return;
  const modeInput = document.getElementById('leadership-period-mode');
  const keyInput = document.getElementById('leadership-period-key');
  if (modeInput) modeInput.value = periodMode;
  if (keyInput) {
    keyInput.type = periodMode === 'month' ? 'month' : 'week';
    keyInput.value = periodKey;
  }
  const summary = buildLeadershipSummary();
  content.innerHTML = buildLeadershipReportMarkup(summary);
  initLucide();
}

export function setLeadershipPeriodMode(mode) {
  if (mode !== 'week' && mode !== 'month') {
    showToast('Kỳ xem không hợp lệ.', 'error');
    return;
  }
  periodMode = mode;
  periodKey = normalizePeriod(mode, '').key;
  renderLeadershipDashboard();
}

export function setLeadershipPeriodKey(key) {
  const period = normalizePeriod(periodMode, key);
  if (period.key !== key) {
    showToast('Vui lòng chọn kỳ hợp lệ.', 'error');
    renderLeadershipDashboard();
    return;
  }
  periodKey = period.key;
  renderLeadershipDashboard();
}

export function shiftLeadershipPeriod(direction) {
  const delta = Number(direction);
  if (!Number.isFinite(delta) || delta === 0) return;
  periodKey = periodMode === 'month'
    ? capMonthShift(periodKey, delta > 0 ? 1 : -1)
    : capWeekShift(periodKey, delta > 0 ? 1 : -1);
  renderLeadershipDashboard();
}

export async function openLeadershipReportPreview() {
  if (!canAccessLeadershipDashboard()) {
    showToast('Chỉ Ban Quản Lý và Admin được xem báo cáo lãnh đạo.', 'error');
    return;
  }
  const { openExportPreview } = await import('./export-xlsx.js');
  openExportPreview(null, () => buildLeadershipReportData(buildLeadershipSummary()));
}

export function printLeadershipReport() {
  if (!canAccessLeadershipDashboard()) {
    showToast('Chỉ Ban Quản Lý và Admin được in báo cáo lãnh đạo.', 'error');
    return;
  }
  const content = document.getElementById('leadership-content');
  if (!content || !content.querySelector('.leadership-paper')) renderLeadershipDashboard();
  document.body.classList.add('leadership-printing');
  const cleanup = () => document.body.classList.remove('leadership-printing');
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
}

export function buildLeadershipReportData(summary) {
  const report = summary || buildLeadershipSummary();
  const rows = [];
  const add = (group, entity, metric, value, unit, note = '') => rows.push([group, entity, metric, value, unit, note]);
  const compareNote = (current, previous, unit, digits = 1) => {
    if (current == null || previous == null) return `Kỳ trước (${report.previous.label}): chưa đủ dữ liệu`;
    const delta = Number(current) - Number(previous);
    const prefix = delta > 0 ? '+' : '';
    return `Kỳ trước (${report.previous.label}): ${fmt(previous, digits)} ${unit} · chênh lệch ${prefix}${fmt(delta, digits)} ${unit}`;
  };
  add('Mua vào', 'Toàn nhà máy', 'Tổng khối lượng', report.purchases.weight, 'kg',
    `${report.purchases.rows} phiếu · ${compareNote(report.purchases.weight, report.previous.purchases.weight, 'kg', 2)}`);
  add('Mua vào', 'Toàn nhà máy', 'Chi phí mua', report.purchases.amount, 'đ',
    compareNote(report.purchases.amount, report.previous.purchases.amount, 'đ', 0));
  report.purchases.byLocation.forEach(item => {
    const before = report.previous.purchases.byLocation.find(row => row.key === item.key);
    add('Mua vào', item.label, 'Khối lượng', item.weight, 'kg',
      `${item.rows} phiếu · ${compareNote(item.weight, before && before.weight, 'kg', 2)}`);
    add('Mua vào', item.label, 'Chi phí mua', item.amount, 'đ',
      compareNote(item.amount, before && before.amount, 'đ', 0));
    item.byType.forEach(type => add('Mua vào', `${item.label} · ${type.label}`, 'Khối lượng', type.weight, 'kg',
      `${type.rows} phiếu · Chi phí: ${fmtCurrency(type.amount)}`));
  });
  add('Phụ phẩm', 'Xưởng 2', 'Thu bán phụ phẩm', report.byproductSales.amount, 'đ',
    `${report.byproductSales.rows} phiếu bán · ${compareNote(report.byproductSales.amount, report.previous.byproductSales.amount, 'đ', 0)}`);
  report.byproductSales.byKind.forEach(item => add('Phụ phẩm', `Xưởng 2 · ${item.label}`, 'Tiền bán', item.amount, 'đ',
    `${item.rows} phiếu · ${fmt(item.weight, 2)} kg`));
  report.capacity.forEach(workshop => {
    const previousWorkshop = report.previous.capacity.find(item => item.id === workshop.id);
    add('Sản xuất', workshop.label, 'Hiệu suất bình quân xưởng', workshop.efficiency, '%',
      compareNote(workshop.efficiency, previousWorkshop && previousWorkshop.efficiency, 'điểm %'));
    add('Sản xuất', workshop.label, 'Giờ làm', workshop.hours, 'giờ',
      compareNote(workshop.hours, previousWorkshop && previousWorkshop.hours, 'giờ'));
    add('Sản xuất', workshop.label, 'Giờ sự cố', workshop.incidentHours, 'giờ',
      compareNote(workshop.incidentHours, previousWorkshop && previousWorkshop.incidentHours, 'giờ'));
    const previousStages = new Map((previousWorkshop && previousWorkshop.stages || []).map(stage => [stage.id, stage]));
    const reportStages = visibleCapacityStages(workshop);
    reportStages.forEach(stage => add(
      'Sản xuất', `${workshop.label} · ${stage.label}`, 'Sản lượng', stage.quantity,
      stage.quantityUnit, `Công suất: ${stage.capacity == null ? '—' : `${fmt(stage.capacity, 2)} ${stage.unit}`} · Hiệu suất: ${fmtPct(stage.efficiency)}${stage.estimated ? ' · ước tính 600 kg/xe' : ''} · ${compareNote(stage.quantity, previousStages.get(stage.id) && previousStages.get(stage.id).quantity, stage.quantityUnit, 2)}`
    ));
    reportStages.forEach(stage => {
      const before = previousStages.get(stage.id);
      add('Sản xuất', `${workshop.label} · ${stage.label}`, 'Giờ làm', stage.hours, 'giờ',
        compareNote(stage.hours, before && before.hours, 'giờ'));
      add('Sản xuất', `${workshop.label} · ${stage.label}`, 'Giờ sự cố', stage.incidentHours, 'giờ',
        compareNote(stage.incidentHours, before && before.incidentHours, 'giờ'));
    });
  });
  add('Tồn kho', 'Xưởng 2 · Kho Nan', 'Tồn hiện tại', report.inventory.current, 'thanh', 'Ảnh chụp hiện tại, không hồi tố theo kỳ');
  add('Tồn kho', 'Xưởng 2 · Kho Nan', 'Tồn hiện tại', report.inventory.currentM3, 'm³');
  add('Tồn kho', 'Xưởng 2 · Sấy/Kho', 'Tồn toàn nhóm', report.inventory.pool, 'thanh');
  add('Tồn kho', 'Xưởng 2 · Sấy/Kho', 'Khối lượng quy đổi', report.inventory.say1M3 + report.inventory.say2M3 + report.inventory.currentM3, 'm³');
  add('Tồn kho', 'Xưởng 2 · Sấy 1', 'Tồn trung gian', report.inventory.say1, 'thanh');
  add('Tồn kho', 'Xưởng 2 · Sấy 1', 'Khối lượng quy đổi', report.inventory.say1M3, 'm³');
  add('Tồn kho', 'Xưởng 2 · Sấy 2', 'Tồn trung gian', report.inventory.say2, 'thanh');
  add('Tồn kho', 'Xưởng 2 · Sấy 2', 'Khối lượng quy đổi', report.inventory.say2M3, 'm³');
  [
    { item: report.quality.x1, previous: report.previous.quality.x1 },
    ...Object.entries(report.quality.x2.byKind).map(([kind, item]) => ({
      item,
      previous: report.previous.quality.x2.byKind[kind]
    }))
  ].forEach(({ item, previous }) => {
    add('Chất lượng', item.label, 'Số lượng đã kiểm', item.checked, 'sản phẩm');
    add('Chất lượng', item.label, 'Số lượng đạt', item.passed, 'sản phẩm', `Tỷ lệ đạt: ${fmtPct(item.passRate)}`);
    add('Chất lượng', item.label, 'Số lượng lỗi', item.rejected, 'sản phẩm', `Tỷ lệ lỗi: ${fmtPct(item.rejectRate)}`);
    add('Chất lượng', item.label, 'Tỷ lệ đạt', item.passRate, '%',
      compareNote(item.passRate, previous && previous.passRate, 'điểm %'));
    add('Chất lượng', item.label, 'Tỷ lệ lỗi', item.rejectRate, '%',
      compareNote(item.rejectRate, previous && previous.rejectRate, 'điểm %'));
  });
  add('Nhân sự', 'Toàn nhà máy', 'Đang làm việc', report.labor.active, 'người', 'Số hiện tại');
  report.labor.departments.forEach(item => {
    const before = report.previous.labor.departments.find(row => row.department === item.department);
    add('Nhân sự', item.department, 'Đang làm việc', item.active, 'người',
      compareNote(item.active, before && before.active, 'người', 0));
  });
  add('Nhân sự', 'Toàn nhà máy', 'Vào theo hồ sơ trong kỳ', report.labor.joined, 'người');
  add('Nhân sự', 'Toàn nhà máy', 'Nghỉ theo hồ sơ trong kỳ', report.labor.left, 'người');
  add('Nhân sự', 'Toàn nhà máy', 'Biến động ròng', report.labor.netChange, 'người',
    compareNote(report.labor.netChange, report.previous.labor.netChange, 'người', 0));
  report.shipments.byCategory.forEach(item => {
    const before = report.previous.shipments.byCategory.find(row => row.key === item.key);
    const planNote = item.planQuantity > 0
      ? `Kế hoạch ${fmt(item.planQuantity, 0)} ${item.unit} · Đạt ${fmtPct(item.attainment)}`
      : 'Chưa có kế hoạch trong kỳ';
    add('Giao hàng', `Xưởng 2 · ${item.label}`, 'Số lượng xuất khai báo', item.quantity, item.unit,
      `${item.rows} dòng · ${planNote} · ${compareNote(item.quantity, before && before.quantity, item.unit, 0)}`);
    add('Giao hàng', `Xưởng 2 · ${item.label}`, 'Tỷ lệ đạt kế hoạch', item.attainment, '%',
      `${planNote} · ${compareNote(item.attainment, before && before.attainment, 'điểm %')}`);
    if (item.key === 'van') {
      add('Giao hàng', 'Xưởng 2 · Ván', 'Thể tích quy đổi', item.volumeKnown ? item.volumeM3 : null, 'm³',
        item.volumeKnown ? `${item.rows} dòng có thể quy đổi theo kích thước định mức` : 'Thiếu kích thước định mức để quy đổi đầy đủ');
    }
  });
  if (report.shipments.unclassifiedRows) {
    add('Giao hàng', 'Xưởng 2 · Chưa phân loại', 'Số dòng xuất', report.shipments.unclassifiedRows, 'dòng',
      'Không khớp định mức; không tính vào tỷ lệ đạt kế hoạch của ba nhóm');
  }
  add('Giao hàng', 'Xưởng 1', 'Theo dõi riêng', null, '', 'Chưa có sổ giao hàng riêng trong dữ liệu hiện tại');
  const notes = [
    'Tồn kho là ảnh chụp hiện tại của Kho Nan Xưởng 2; không có tồn kho Xưởng 1 hoặc lịch sử tồn theo kỳ.',
    'Số lượng xuất hàng lấy từ bảng xuất hàng QC theo tuần, không có xác nhận giao thực tế; chưa có sổ riêng Xưởng 1.',
    'Biến động nhân sự dựa trên ngày vào/nghỉ được ghi trong hồ sơ nhân viên.'
  ];
  if (report.shipments.unattributedRows) notes.push('Các dòng xuất hàng gộp nhiều tuần không thuộc cặp hai tuần liên tiếp chưa thể phân bổ vào kỳ.');
  if (report.shipments.unclassifiedRows) notes.push('Dòng xuất hàng chưa khớp định mức được tách riêng và không tính vào tỷ lệ đạt kế hoạch của ba nhóm.');
  const aoa = [
    ['BÁO CÁO TỔNG HỢP BAN LÃNH ĐẠO'],
    [`Kỳ báo cáo: ${report.label}`],
    [`Ngày xuất: ${todayISO()}`],
    [],
    ['Nhóm', 'Xưởng / Bộ phận', 'Chỉ số', 'Giá trị', 'Đơn vị', 'Ghi chú'],
    ...rows,
    [],
    ['LƯU Ý DỮ LIỆU'],
    ...notes.map(note => [note])
  ];
  const lastDataRow = 4 + rows.length;
  return {
    title: 'Báo cáo tổng hợp Ban Lãnh Đạo',
    countLabel: `${rows.length} chỉ số`,
    aoa,
    headerRow: 4,
    autofilter: `A5:F${lastDataRow}`,
    cols: [{ wch: 18 }, { wch: 32 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 64 }],
    rowH: 20,
    sheetName: 'TongHopLanhDao',
    filename: `TongHopLanhDao_${report.key}.xlsx`
  };
}
