import * as repo from './repo.js';
import {
  STORAGE_KEY_AUTOBACKUP,
  STORAGE_KEY_CUSTOM_CHARTS,
  STORAGE_KEY_DATA,
  STORAGE_KEY_DELETED_IDS,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_HR_ASSIGN,
  STORAGE_KEY_HR_ATTENDANCE,
  STORAGE_KEY_HR_CALENDAR,
  STORAGE_KEY_HR_CHECKINS,
  STORAGE_KEY_HR_CI_ACKS,
  STORAGE_KEY_HR_EMPLOYEES,
  STORAGE_KEY_HR_LEAVES,
  STORAGE_KEY_HR_OVERTIMES,
  STORAGE_KEY_HR_PAY_LOCKS,
  STORAGE_KEY_HR_PAY_ROWS,
  STORAGE_KEY_HR_POSITIONS,
  STORAGE_KEY_HR_POSNEEDS,
  STORAGE_KEY_HR_RECRUITMENT,
  STORAGE_KEY_HR_SHIFTS,
  STORAGE_KEY_HR_WORKER_EVALUATIONS,
  STORAGE_KEY_KHO_NOTES,
  STORAGE_KEY_MATERIAL_PLAN,
  STORAGE_KEY_MATERIAL_RATES,
  STORAGE_KEY_MATERIALS,
  STORAGE_KEY_MECH_WORK_PLANS,
  STORAGE_KEY_PHOTO_QUEUE,
  STORAGE_KEY_PHOTO_UPLOADED,
  STORAGE_KEY_PLANNING_FORECAST,
  STORAGE_KEY_PLANNING_ITEMS,
  STORAGE_KEY_PLANNING_STOCK,
  STORAGE_KEY_PRESS_INVENTORY_ADJUSTMENTS,
  STORAGE_KEY_PRESS_NOTES,
  STORAGE_KEY_PRESS_RECORDS,
  STORAGE_KEY_QC_EXPORTS,
  STORAGE_KEY_QC_FINAL,
  STORAGE_KEY_QC_FINAL_RATE,
  STORAGE_KEY_QC_KILN_HUMIDITY,
  STORAGE_KEY_QC_KILN_THRESHOLD,
  STORAGE_KEY_QC_PRESS,
  STORAGE_KEY_RATE_APPROVALS,
  STORAGE_KEY_SUPPLIERS,
  STORAGE_KEY_SYS_SETTINGS,
  STORAGE_KEY_X1_BO_LENGTHS,
  STORAGE_KEY_X1_BO_WIDTHS,
  STORAGE_KEY_X1_KHO_EXPORTS,
  STORAGE_KEY_X1_RATES,
  STORAGE_KEY_X2_BAO_THANH_OUT_SIZES,
  STORAGE_KEY_X2_BAO_THO_RATE,
  STORAGE_KEY_X2_BAO_TINH_RATE,
  STORAGE_KEY_X2_BAO_VAN_RATE,
  STORAGE_KEY_X2_BULLIG_RATE,
  STORAGE_KEY_X2_BO_ONG_RATE,
  STORAGE_KEY_X2_BOLUONG_RATE,
  STORAGE_KEY_X2_CAP_RATE,
  STORAGE_KEY_X2_CAT_VAN_RATE,
  STORAGE_KEY_X2_CHON_NAN_RATE,
  STORAGE_KEY_X2_EP_VAN_RATE,
  STORAGE_KEY_X2_INCIDENT_REPORTS,
  STORAGE_KEY_X2_LOT_LOCATIONS,
  STORAGE_KEY_X2_PHU_PHAM,
  STORAGE_KEY_X2_SAY_INCIDENT,
  STORAGE_KEY_X2_SAY_RATE,
  STORAGE_KEY_X2_SAY_TIMES,
  STORAGE_KEY_X2_STAGE_INCIDENT,
  STORAGE_KEY_X2_STOCKTAKE,
  STORAGE_KEY_X2_YIELD_RATE,
  STORAGE_KEY_XUONG1_BO,
  STORAGE_KEY_XUONG1_BOC,
  STORAGE_KEY_XUONG1_CAT_MAT,
  STORAGE_KEY_XUONG1_CAT_ONG,
  STORAGE_KEY_XUONG1_LOC_ONG,
  STORAGE_KEY_XUONG1_LOC_THANH,
  STORAGE_KEY_XUONG1_PHOI_SAY,
  STORAGE_KEY_XUONG1_SAY_SINH,
  STORAGE_KEY_XUONG2_BAO_THO,
  STORAGE_KEY_XUONG2_BAO_TINH,
  STORAGE_KEY_XUONG2_BAO_VAN,
  STORAGE_KEY_XUONG2_BOLUONG,
  STORAGE_KEY_XUONG2_BO_ONG,
  STORAGE_KEY_XUONG2_BULLIG,
  STORAGE_KEY_XUONG2_CAT_VAN,
  STORAGE_KEY_XUONG2_CHON_NAN,
  STORAGE_KEY_XUONG2_CUTS,
  STORAGE_KEY_XUONG2_HO_TRO,
  state
} from './state.js';

const CORE_DOMAINS = [
  [STORAGE_KEY_DATA, 'batches'],
  [STORAGE_KEY_CUSTOM_CHARTS, 'customCharts'],
  [STORAGE_KEY_MATERIAL_PLAN, 'materialPlan'],
  [STORAGE_KEY_MATERIAL_RATES, 'materialRates'],
  [STORAGE_KEY_MATERIALS, 'materialRecords'],
  [STORAGE_KEY_PLANNING_ITEMS, 'planningItems'],
  [STORAGE_KEY_PLANNING_FORECAST, 'planningForecast'],
  [STORAGE_KEY_PLANNING_STOCK, 'planningStock'],
  [STORAGE_KEY_PRESS_RECORDS, 'pressRecords'],
  [STORAGE_KEY_PRESS_NOTES, 'pressNotes'],
  [STORAGE_KEY_PRESS_INVENTORY_ADJUSTMENTS, 'pressInventoryAdjustments'],
  [STORAGE_KEY_QC_EXPORTS, 'qcExports'],
  [STORAGE_KEY_QC_FINAL, 'qcFinalRecords'],
  [STORAGE_KEY_QC_FINAL_RATE, 'qcFinalRates'],
  [STORAGE_KEY_QC_PRESS, 'qcPressLogs'],
  [STORAGE_KEY_QC_KILN_HUMIDITY, 'qcKilnReadings'],
  [STORAGE_KEY_QC_KILN_THRESHOLD, 'qcKilnThresholds'],
  [STORAGE_KEY_MECH_WORK_PLANS, 'mechWorkPlans'],
  [STORAGE_KEY_SUPPLIERS, 'suppliers'],
  [STORAGE_KEY_SYS_SETTINGS, 'sysSettings'],
  [STORAGE_KEY_KHO_NOTES, 'khoNotes'],
  [STORAGE_KEY_X2_PHU_PHAM, 'x2PhuPhamRecords'],
  [STORAGE_KEY_X2_STOCKTAKE, 'x2Stocktakes'],
  [STORAGE_KEY_X2_YIELD_RATE, 'x2YieldRates'],
  [STORAGE_KEY_X2_INCIDENT_REPORTS, 'x2IncidentReports'],
  [STORAGE_KEY_RATE_APPROVALS, 'rateApprovals'],
  [STORAGE_KEY_X2_LOT_LOCATIONS, 'x2LotLocations'],
  [STORAGE_KEY_X2_BAO_THANH_OUT_SIZES, 'x2BaoThanhOutSizes'],
  [STORAGE_KEY_X2_SAY_RATE, 'x2SayRates'],
  [STORAGE_KEY_X2_SAY_TIMES, 'x2SayTimes'],
  [STORAGE_KEY_X2_SAY_INCIDENT, 'x2SayIncidents'],
  [STORAGE_KEY_X2_STAGE_INCIDENT, 'x2StageIncidents'],
  [STORAGE_KEY_X2_EP_VAN_RATE, 'x2EpVanRates'],
  [STORAGE_KEY_X2_CAP_RATE, 'x2CapRates'],
  [STORAGE_KEY_X2_CAT_VAN_RATE, 'x2CatVanRates'],
  [STORAGE_KEY_X2_BOLUONG_RATE, 'x2BoluongRates'],
  [STORAGE_KEY_X2_BO_ONG_RATE, 'x2BoOngRates'],
  [STORAGE_KEY_X2_BAO_THO_RATE, 'x2BaoThoRates'],
  [STORAGE_KEY_X2_CHON_NAN_RATE, 'x2ChonNanRates'],
  [STORAGE_KEY_X2_BAO_TINH_RATE, 'x2BaoTinhRates'],
  [STORAGE_KEY_X2_BULLIG_RATE, 'x2BulligRates'],
  [STORAGE_KEY_X2_BAO_VAN_RATE, 'x2BaoVanRates'],
  [STORAGE_KEY_HR_EMPLOYEES, 'hrEmployees'],
  [STORAGE_KEY_HR_LEAVES, 'hrLeaves'],
  [STORAGE_KEY_HR_RECRUITMENT, 'hrRecruitment'],
  [STORAGE_KEY_HR_POSNEEDS, 'hrPositionNeeds'],
  [STORAGE_KEY_HR_SHIFTS, 'hrShifts'],
  [STORAGE_KEY_HR_ASSIGN, 'hrAssignments'],
  [STORAGE_KEY_HR_POSITIONS, 'hrPositions'],
  [STORAGE_KEY_HR_ATTENDANCE, 'hrAttendance'],
  [STORAGE_KEY_HR_CHECKINS, 'hrCheckins'],
  [STORAGE_KEY_HR_CI_ACKS, 'hrCiAcks'],
  [STORAGE_KEY_HR_PAY_ROWS, 'hrPayRows'],
  [STORAGE_KEY_HR_PAY_LOCKS, 'hrPayLocks'],
  [STORAGE_KEY_HR_OVERTIMES, 'hrOvertimes'],
  [STORAGE_KEY_HR_CALENDAR, 'hrWorkCalendar'],
  [STORAGE_KEY_HR_WORKER_EVALUATIONS, 'hrWorkerEvaluations'],
  [STORAGE_KEY_XUONG2_CUTS, 'xuong2CutRecords'],
  [STORAGE_KEY_XUONG2_BOLUONG, 'xuong2BoluongRecords'],
  [STORAGE_KEY_XUONG2_BO_ONG, 'xuong2BoOngRecords'],
  [STORAGE_KEY_XUONG2_BAO_THO, 'xuong2BaoThoRecords'],
  [STORAGE_KEY_XUONG2_CHON_NAN, 'xuong2ChonNanThoRecords'],
  [STORAGE_KEY_XUONG2_BAO_TINH, 'xuong2BaoTinhRecords'],
  [STORAGE_KEY_XUONG2_BULLIG, 'xuong2BulligRecords'],
  [STORAGE_KEY_XUONG2_CAT_VAN, 'xuong2CatVanRecords'],
  [STORAGE_KEY_XUONG2_BAO_VAN, 'xuong2BaoVanRecords'],
  [STORAGE_KEY_XUONG2_HO_TRO, 'xuong2HoTroRecords'],
  [STORAGE_KEY_XUONG1_CAT_ONG, 'xuong1CatOngRecords'],
  [STORAGE_KEY_XUONG1_SAY_SINH, 'xuong1SaySinhRecords'],
  [STORAGE_KEY_XUONG1_BOC, 'xuong1BocRecords'],
  [STORAGE_KEY_XUONG1_LOC_ONG, 'xuong1LocOngRecords'],
  [STORAGE_KEY_XUONG1_CAT_MAT, 'xuong1CatMatRecords'],
  [STORAGE_KEY_XUONG1_BO, 'xuong1BoRecords'],
  [STORAGE_KEY_XUONG1_PHOI_SAY, 'xuong1PhoiSayRecords'],
  [STORAGE_KEY_XUONG1_LOC_THANH, 'xuong1LocThanhRecords'],
  [STORAGE_KEY_X1_KHO_EXPORTS, 'x1KhoExports'],
  [STORAGE_KEY_X1_BO_LENGTHS, 'x1BoLengthOptions'],
  [STORAGE_KEY_X1_BO_WIDTHS, 'x1BoWidthOptions'],
  [STORAGE_KEY_X1_RATES, 'x1Rates'],
  [STORAGE_KEY_HISTORY, 'history'],
  [STORAGE_KEY_DELETED_IDS, 'deletedIds'],
  [STORAGE_KEY_AUTOBACKUP, 'autoBackups'],
  [STORAGE_KEY_PHOTO_QUEUE, 'photoQueue'],
  [STORAGE_KEY_PHOTO_UPLOADED, 'photoUploaded']
];

const CORE_BY_KEY = new Map(CORE_DOMAINS.map(([key, stateKey]) => [key, { key, stateKey }]));
let interceptInstalled = false;
let nativeSetItem = null;
const migrated = new Set();
const migrationErrors = [];

function parseJson(raw) {
  try { return JSON.parse(raw); } catch (error) { return null; }
}

function installCoreSetInterceptor() {
  if (interceptInstalled) return;
  interceptInstalled = true;
  if (typeof window === 'undefined' || !window.Storage || !window.Storage.prototype) return;
  const proto = window.Storage.prototype;
  if (typeof proto.setItem !== 'function') return;
  nativeSetItem = proto.setItem;
  proto.setItem = function interceptedSetItem(key, value) {
    const domain = CORE_BY_KEY.get(String(key));
    if (!domain) return nativeSetItem.call(this, key, value);
    const json = typeof value === 'string' ? value : String(value);
    void repo.putKv(String(key), json).then(result => {
      if (!result.persisted) {
        migrationErrors.push(result.error || new Error(`Không ghi được domain ${key} vào IndexedDB.`));
        try {
          nativeSetItem.call(this, key, json);
        } catch (error) {
          migrationErrors.push(error);
        }
      }
    });
    return undefined;
  };
}

async function initializeCoreStorage() {
  installCoreSetInterceptor();
  if (!repo.available()) {
    return { migrated: 0, remainingLocal: localCoreUsage(), errors: [new Error('IndexedDB không khả dụng')] };
  }
  for (const [key] of CORE_DOMAINS) {
    let raw = null;
    try { raw = localStorage.getItem(key); } catch (error) {
      migrationErrors.push(error);
      continue;
    }
    if (!raw) continue;
    const result = await repo.putKv(key, raw);
    if (result.persisted) migrated.add(key);
    else migrationErrors.push(result.error || new Error(`Không sao chép được ${key} vào IndexedDB.`));
  }
  return {
    migrated: migrated.size,
    remainingLocal: localCoreUsage(),
    errors: migrationErrors.slice()
  };
}

async function restoreCoreStorage() {
  const restored = [];
  for (const [key, stateKey] of CORE_DOMAINS) {
    let value = null;
    let found = false;

    if (repo.available()) {
      const kv = await repo.loadKv(key);
      if (kv.found) {
        value = parseJson(kv.json);
        found = value !== null;
      }
    }

    if (!found) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          value = parseJson(raw);
          found = value !== null;
          if (found) {
            const saved = await repo.putKv(key, raw);
            if (saved.persisted) migrated.add(key);
          }
        }
      } catch (error) {
        migrationErrors.push(error);
      }
    }

    if (found) {
      state[stateKey] = value;
      restored.push(stateKey);
    }

    if (migrated.has(key)) {
      try { localStorage.removeItem(key); } catch (error) { migrationErrors.push(error); }
    }
  }
  return {
    restored,
    remainingLocal: localCoreUsage(),
    errors: migrationErrors.slice()
  };
}

function localCoreUsage() {
  let chars = 0;
  let keys = 0;
  for (const [key] of CORE_DOMAINS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        chars += raw.length;
        keys++;
      }
    } catch (error) {}
  }
  return { keys, chars, bytes: chars * 2 };
}

async function estimateBrowserStorage() {
  const result = {
    supported: false,
    usage: 0,
    quota: 0,
    usagePercent: 0,
    persistent: false
  };
  try {
    if (navigator.storage && typeof navigator.storage.estimate === 'function') {
      const estimate = await navigator.storage.estimate();
      result.supported = true;
      result.usage = Number(estimate.usage) || 0;
      result.quota = Number(estimate.quota) || 0;
      result.usagePercent = result.quota ? Math.min(100, Math.round(result.usage / result.quota * 100)) : 0;
    }
  } catch (error) {}
  try {
    if (navigator.storage && typeof navigator.storage.persisted === 'function') {
      result.persistent = await navigator.storage.persisted();
    }
  } catch (error) {}
  return result;
}

async function requestPersistentStorage() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      return await navigator.storage.persist();
    }
  } catch (error) {}
  return false;
}

function isCoreStorageKey(key) {
  return CORE_BY_KEY.has(String(key));
}

export {
  CORE_DOMAINS,
  estimateBrowserStorage,
  initializeCoreStorage,
  isCoreStorageKey,
  localCoreUsage,
  requestPersistentStorage,
  restoreCoreStorage
};
