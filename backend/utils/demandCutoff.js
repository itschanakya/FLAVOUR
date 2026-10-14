/**
 * Dynamic Demand Cut-off Validator for ANO / Institution Demands.
 * 
 * Rules:
 * 1. Demands are received on a weekly cycle (Monday to Saturday).
 * 2. Cut-off deadline for placing demands for ANY day in a delivery week (Mon-Sat)
 *    is configurable by the Unit HQ in App Manager (default: Friday @ 14:00 hrs IST).
 * 3. Instant / same-week demands are NOT accepted for ANOs.
 * 4. Only UNIT and ADMIN roles can place demands anytime without cut-off restriction.
 * 5. If cut-off is disabled by Unit (enabled === false / 0), demands can be placed anytime.
 */

const DAY_NAME_TO_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const DAY_INDEX_TO_NAME = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

function getISTDate(dateObj = new Date()) {
  const istStr = dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istStr);
}

function parseTimeComponents(timeStr = '14:00') {
  const parts = String(timeStr || '14:00').split(':');
  const hours = parseInt(parts[0], 10) || 14;
  const minutes = parseInt(parts[1], 10) || 0;
  return { hours, minutes };
}

function validateDemandCutoff(demandDateStr, currentDate = new Date(), options = {}) {
  const {
    cutoffDay = 'Friday',
    cutoffTime = '14:00',
    enabled = true,
    notice = ''
  } = options;

  // If disabled by Unit HQ (e.g. during emergency or special camp week)
  if (enabled === false || enabled === 0 || enabled === '0') {
    return { valid: true, bypassed: true };
  }

  if (!demandDateStr) {
    return { valid: false, error: 'Demand date is required.' };
  }

  // Parse target demand date YYYY-MM-DD
  const parts = demandDateStr.split('T')[0].split(' ')[0].split('-');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid demand date format (expected YYYY-MM-DD).' };
  }
  const [tYear, tMonth, tDay] = parts.map(Number);

  // Target date at noon UTC
  const target = new Date(Date.UTC(tYear, tMonth - 1, tDay, 12, 0, 0));
  const dayOfWeek = target.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat

  if (dayOfWeek === 0) {
    return {
      valid: false,
      error: 'Refreshment deliveries are scheduled Monday to Saturday. Sunday is not a regular delivery day.'
    };
  }

  // Monday of the target delivery week
  const daysFromMonday = dayOfWeek - 1;
  const mondayUTC = new Date(Date.UTC(tYear, tMonth - 1, tDay - daysFromMonday, 0, 0, 0));

  // Determine cutoff day index (0-6)
  const normCutoffDayName = String(cutoffDay || 'Friday').trim().toLowerCase();
  const cutoffDayIdx = DAY_NAME_TO_INDEX[normCutoffDayName] !== undefined
    ? DAY_NAME_TO_INDEX[normCutoffDayName]
    : 5; // default Friday
  const canonicalCutoffDay = DAY_INDEX_TO_NAME[cutoffDayIdx];

  // Days before Monday
  let daysBeforeMonday = (1 - cutoffDayIdx + 7) % 7;
  if (daysBeforeMonday === 0) daysBeforeMonday = 7;

  // Cutoff Date (preceding the Monday of the delivery week)
  const precedingCutoffUTC = new Date(mondayUTC.getTime() - (daysBeforeMonday * 24 * 60 * 60 * 1000));
  const cYear = precedingCutoffUTC.getUTCFullYear();
  const cMonth = precedingCutoffUTC.getUTCMonth();
  const cDate = precedingCutoffUTC.getUTCDate();

  // Cut-off time in IST
  const { hours: cHours, minutes: cMinutes } = parseTimeComponents(cutoffTime);
  const cutoffDateStr = `${cYear}-${String(cMonth + 1).padStart(2, '0')}-${String(cDate).padStart(2, '0')}`;
  const cutoffISO = `${cutoffDateStr}T${String(cHours).padStart(2, '0')}:${String(cMinutes).padStart(2, '0')}:00+05:30`;
  const cutoffTimeMs = new Date(cutoffISO).getTime();

  const nowMs = currentDate.getTime();

  const cDayStr = String(cDate).padStart(2, '0');
  const cMonthStr = String(cMonth + 1).padStart(2, '0');
  const cutoffFormatted = `${canonicalCutoffDay}, ${cDayStr}/${cMonthStr}/${cYear} at ${String(cHours).padStart(2, '0')}:${String(cMinutes).padStart(2, '0')} hrs`;

  if (nowMs > cutoffTimeMs) {
    let msg = `Cut-off deadline passed! Demands for ${demandDateStr} (Week starting ${mondayUTC.toISOString().split('T')[0]}) closed on ${cutoffFormatted}. Instant/same-week demands cannot be accepted because Unit HQ office is closed.`;
    if (notice && notice.trim()) {
      msg += ` Unit Notice: ${notice.trim()}`;
    }
    return {
      valid: false,
      cutoffPassed: true,
      cutoffDay: canonicalCutoffDay,
      cutoffTime,
      cutoffDateFormatted: cutoffFormatted,
      error: msg
    };
  }

  return { valid: true };
}

function getEarliestAllowedDateForANO(currentDate = new Date(), options = {}) {
  const {
    cutoffDay = 'Friday',
    cutoffTime = '14:00',
    enabled = true
  } = options;

  const ist = getISTDate(currentDate);

  if (enabled === false || enabled === 0 || enabled === '0') {
    // If cut-off is disabled by Unit, earliest is tomorrow
    const tomorrow = new Date(ist.getTime() + 24 * 60 * 60 * 1000);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const curDay = ist.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Days until next Monday
  let daysUntilNextMonday = ((1 - curDay + 7) % 7);
  if (daysUntilNextMonday === 0) daysUntilNextMonday = 7;

  // Next Monday date in IST
  const nextMondayDate = new Date(ist.getTime() + daysUntilNextMonday * 24 * 60 * 60 * 1000);

  // Determine cutoff day index
  const normCutoffDayName = String(cutoffDay || 'Friday').trim().toLowerCase();
  const cutoffDayIdx = DAY_NAME_TO_INDEX[normCutoffDayName] !== undefined
    ? DAY_NAME_TO_INDEX[normCutoffDayName]
    : 5;

  let daysBeforeMonday = (1 - cutoffDayIdx + 7) % 7;
  if (daysBeforeMonday === 0) daysBeforeMonday = 7;

  // Cut-off for next week's Monday
  const cutoffDateForNextWeek = new Date(nextMondayDate.getTime() - (daysBeforeMonday * 24 * 60 * 60 * 1000));
  const cYear = cutoffDateForNextWeek.getFullYear();
  const cMonth = cutoffDateForNextWeek.getMonth() + 1;
  const cDate = cutoffDateForNextWeek.getDate();

  const { hours: cHours, minutes: cMinutes } = parseTimeComponents(cutoffTime);
  const cutoffISO = `${cYear}-${String(cMonth).padStart(2, '0')}-${String(cDate).padStart(2, '0')}T${String(cHours).padStart(2, '0')}:${String(cMinutes).padStart(2, '0')}:00+05:30`;
  const cutoffTimeMs = new Date(cutoffISO).getTime();

  let targetMonday = nextMondayDate;
  if (currentDate.getTime() > cutoffTimeMs) {
    // Cut-off for next week has passed, push to the subsequent week
    targetMonday = new Date(nextMondayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const y = targetMonday.getFullYear();
  const m = String(targetMonday.getMonth() + 1).padStart(2, '0');
  const d = String(targetMonday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = {
  validateDemandCutoff,
  getEarliestAllowedDateForANO,
  getISTDate,
  parseTimeComponents,
  DAY_INDEX_TO_NAME,
  DAY_NAME_TO_INDEX
};
