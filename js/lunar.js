// ═══════════════════════════════════════════════════════════
// js/lunar.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
  // ─── ÂM LỊCH VIỆT (thuật toán Hồ Ngọc Đức, 1900–2100, múi giờ +7) ───
  function jdFromDate(dd, mm, yy) {
    const a = Math.floor((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    if (jd < 2299161) {
      jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    }
    return jd;
  }

  function NewMoon(k) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = Math.PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M   = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F   = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    let deltat;
    if (T < -11) {
      deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    } else {
      deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    }
    return Jd1 + C1 - deltat;
  }

  function SunLongitude(jdn) {
    const T  = (jdn - 2451545.0) / 36525;
    const T2 = T * T;
    const dr = Math.PI / 180;
    const M  = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    let L = L0 + DL;
    L = L * dr;
    L = L - Math.PI * 2 * (Math.floor(L / (Math.PI * 2)));
    return L;
  }

  function getSunLongitude(dayNumber, timeZone) {
    return Math.floor(SunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI * 6);
  }

  function getNewMoonDay(k, timeZone) {
    return Math.floor(NewMoon(k) + 0.5 + timeZone / 24);
  }

  function getLunarMonth11(yy, timeZone) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = Math.floor(off / 29.530588853);
    let nm = getNewMoonDay(k, timeZone);
    if (getSunLongitude(nm, timeZone) >= 9) nm = getNewMoonDay(k - 1, timeZone);
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone) {
    const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0;
    let i = 1;
    let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    while (arc !== last && i < 14) {
      i++;
      last = arc;
      arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    }
    return i - 1;
  }

  function convertSolar2Lunar(dd, mm, yy, timeZone = 7) {
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);
    let a11 = getLunarMonth11(yy, timeZone);
    let b11 = a11;
    let lunarYear;
    if (a11 >= monthStart) {
      lunarYear = yy;
      a11 = getLunarMonth11(yy - 1, timeZone);
    } else {
      lunarYear = yy + 1;
      b11 = getLunarMonth11(yy + 1, timeZone);
    }
    const lunarDay = dayNumber - monthStart + 1;
    const diff = Math.floor((monthStart - a11) / 29);
    let lunarLeap = 0;
    let lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      const leapOffset = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapOffset) {
        lunarMonth = diff + 10;
        if (diff === leapOffset) lunarLeap = 1;
      }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: !!lunarLeap };
  }

  // Số tuần ISO của một ngày bất kỳ
  function isoWeekOf(dateObj) {
    const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
    const dayNum = d.getUTCDay() || 7; // CN = 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Vẽ widget lịch (thay vùng Tổng cộng trên thanh thống kê)
  function renderCalendarGadget() {
    const grid      = document.getElementById('cal-grid');
    const todayLine = document.getElementById('cal-today-line');
    if (!grid || !todayLine) return;

    const now   = new Date();
    const y     = now.getFullYear();
    const mIdx  = now.getMonth();   // 0-based
    const today = now.getDate();

    let html = '<div class="cal-cell cal-head-cell cal-weekcell">T</div>';
    ['T2','T3','T4','T5','T6','T7','CN'].forEach(d => {
      html += `<div class="cal-cell cal-head-cell${d === 'CN' ? ' cal-sun' : ''}">${d}</div>`;
    });

    const first       = new Date(y, mIdx, 1);
    const offset      = (first.getDay() + 6) % 7;               // Thứ 2 = 0
    const daysInMonth = new Date(y, mIdx + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    for (let r = 0; r < cells.length / 7; r++) {
      const rowCells = cells.slice(r * 7, r * 7 + 7);
      const refDay   = rowCells.find(v => v !== null);
      html += `<div class="cal-cell cal-weekcell">${refDay ? isoWeekOf(new Date(y, mIdx, refDay)) : ''}</div>`;
      rowCells.forEach(d => {
        if (d === null) { html += '<div class="cal-cell cal-empty"></div>'; return; }
        const lun = convertSolar2Lunar(d, mIdx + 1, y);
        const dow = new Date(y, mIdx, d).getDay();
        const cls = ['cal-day'];
        if (dow === 0) cls.push('cal-sun');
        if (lun.day === 1) cls.push('cal-lun1');
        if (d === today) cls.push('cal-today');
        html += `<div class="${cls.join(' ')}" title="DL ${d}/${mIdx+1}/${y} • ÂL ${lun.day}/${lun.month}${lun.leap ? ' nhuận' : ''}">
                   <span class="cal-d">${d}</span>
                   <span class="cal-l">${lun.day}</span>
                 </div>`;
      });
    }
    grid.innerHTML = html;

    const lunToday = convertSolar2Lunar(today, mIdx + 1, y);
    const dowNames = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
    todayLine.innerHTML =
      `${dowNames[now.getDay()]}, ${String(today).padStart(2,'0')}/${String(mIdx+1).padStart(2,'0')}/${y}` +
      ` • Âm lịch <strong>${lunToday.day}/${lunToday.month}${lunToday.leap ? ' nhuận' : ''}</strong>`;
  }

export {
  NewMoon,
  SunLongitude,
  convertSolar2Lunar,
  getLeapMonthOffset,
  getLunarMonth11,
  getNewMoonDay,
  getSunLongitude,
  isoWeekOf,
  jdFromDate,
  renderCalendarGadget
};
