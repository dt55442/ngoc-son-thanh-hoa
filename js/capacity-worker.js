// ═══════════════════════════════════════════════════════════
// js/capacity-worker.js — WEB WORKER CHO TÍNH TOÁN NẶNG (Giai đoạn 3)
// ═══════════════════════════════════════════════════════════
// Chuyển các tính toán nặng của capacity.js sang worker để không block main thread.
// Input: dữ liệu thô (state.xuong2*Records, state.pressRecords, state.hrAssignments, etc.)
// Output: kết quả tính toán (capacity table data, sparkline data, stale warnings)
// ═══════════════════════════════════════════════════════════

// Helper functions (copy từ capacity.js - không import được trong worker)
function capISOOfLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function capWeekMonday(weekKey) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(String(weekKey || ''));
  if (!m) return null;
  const year = Number(m[1]), week = Number(m[2]);
  const jan4 = new Date(year, 0, 4);
  const dayNr = (jan4.getDay() + 6) % 7;
  const week1Mon = new Date(year, 0, 4 - dayNr);
  return new Date(week1Mon.getFullYear(), week1Mon.getMonth(), week1Mon.getDate() + (week - 1) * 7);
}

function capWeekKeyOf(dateStr) {
  // ISO week label - copy từ materialWeekLabel logic
  const d = new Date(dateStr + 'T00:00:00');
  const dayNr = (d.getDay() + 6) % 7;
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + (3 - dayNr));
  const week1 = new Date(thursday.getFullYear(), 0, 4);
  const weekNum = Math.ceil((((thursday - week1) / 86400000) + 1) / 7);
  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function materialWeekLabel(dateStr) {
  return capWeekKeyOf(dateStr);
}

// CAP_STAGES definition (copy từ capacity.js - sẽ được truyền từ main thread)
let CAP_STAGES = [];
let CAP_INC_KEY = {};
let CAP_SPARKS = [];
let stateData = {};

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'init':
      CAP_STAGES = payload.CAP_STAGES;
      CAP_INC_KEY = payload.CAP_INC_KEY;
      CAP_SPARKS = payload.CAP_SPARKS;
      stateData = payload.stateData;
      break;
      
    case 'compute':
      try {
        const result = computeCapacityData(payload);
        self.postMessage({ type: 'result', payload: result, requestId: payload.requestId });
      } catch (error) {
        self.postMessage({ type: 'error', payload: error.message, requestId: payload.requestId });
      }
      break;
      
    case 'computeSparklines':
      try {
        const result = computeSparklines(payload);
        self.postMessage({ type: 'sparklinesResult', payload: result, requestId: payload.requestId });
      } catch (error) {
        self.postMessage({ type: 'error', payload: error.message, requestId: payload.requestId });
      }
      break;
  }
};

function computeCapacityData(payload) {
  const { mode, weekKey, monthKey, ws } = payload;
  // Implementation sẽ được điền sau - đây là placeholder
  return {
    mode,
    weekKey,
    monthKey,
    ws,
    data: []
  };
}

function computeSparklines(payload) {
  // Implementation sẽ được điền sau
  return {};
}

// Export for testing (not used in worker context)
// self.computeCapacityData = computeCapacityData;
// self.computeSparklines = computeSparklines;