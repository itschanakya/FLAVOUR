/**
 * Demand Cut-off Validator for ANO / Institution Demands.
 * 
 * Rules:
 * 1. Demands are received on a weekly cycle (Monday to Saturday).
 * 2. Cut-off deadline for placing demands for ANY day in a delivery week (Mon-Sat)
 *    is the preceding FRIDAY AT 14:00 HRS (2:00 PM) IST.
 * 3. Instant / same-week demands are NOT accepted for ANOs.
 * 4. Only UNIT / ADMIN can place demands anytime without cut-off restriction.
 */

function getISTDate(dateObj = new Date()) {
  const istStr = dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istStr);
}

function validateDemandCutoff(demandDateStr, currentDate = new Date()) {
  if (!demandDateStr) {
    return { valid: false, error: 'Demand date is required.' };
  }

  // Parse YYYY-MM-DD
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

  // Find Monday of the delivery week
  // Mon (1) -> 0 days back, Tue (2) -> 1 day back, ..., Sat (6) -> 5 days back
  const daysFromMonday = dayOfWeek - 1;
  const mondayUTC = new Date(Date.UTC(tYear, tMonth - 1, tDay - daysFromMonday, 0, 0, 0));

  // Preceding Friday is Monday - 3 days
  const precedingFridayUTC = new Date(mondayUTC.getTime() - (3 * 24 * 60 * 60 * 1000));
  const friYear = precedingFridayUTC.getUTCFullYear();
  const friMonth = precedingFridayUTC.getUTCMonth();
  const friDate = precedingFridayUTC.getUTCDate();

  // Cut-off is preceding Friday at 14:00:00 IST (which is 08:30:00 UTC)
  const cutoffTimeMs = Date.UTC(friYear, friMonth, friDate, 8, 30, 0, 0);

  const nowMs = currentDate.getTime();

  // Formatted date strings for error message
  const friDayStr = String(friDate).padStart(2, '0');
  const friMonthStr = String(friMonth + 1).padStart(2, '0');
  const friFormatted = `${friDayStr}/${friMonthStr}/${friYear}`;

  const currentIST = getISTDate(currentDate);
  const curDay = String(currentIST.getDate()).padStart(2, '0');
  const curMonth = String(currentIST.getMonth() + 1).padStart(2, '0');
  const curYear = currentIST.getFullYear();
  let curHours = currentIST.getHours();
  const curMins = String(currentIST.getMinutes()).padStart(2, '0');
  const curAmPm = curHours >= 12 ? 'PM' : 'AM';
  curHours = curHours % 12 || 12;
  const curFormatted = `${curDay}/${curMonth}/${curYear} at ${String(curHours).padStart(2, '0')}:${curMins} ${curAmPm} IST`;

  if (nowMs > cutoffTimeMs) {
    return {
      valid: false,
      cutoffPassed: true,
      cutoffFriday: friFormatted,
      currentTimeFormatted: curFormatted,
      error: `Cut-off deadline passed! Demands for ${demandDateStr} (Week starting ${mondayUTC.toISOString().split('T')[0]}) closed on Friday, ${friFormatted} at 14:00 hrs (2:00 PM). Instant/same-week demands cannot be accepted. Please choose an eligible future date or contact Unit HQ for emergency requirements.`
    };
  }

  return { valid: true };
}

function getEarliestAllowedDateForANO(currentDate = new Date()) {
  const ist = getISTDate(currentDate);
  const day = ist.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const hours = ist.getHours();
  const minutes = ist.getMinutes();

  let daysUntilNextMonday = ((1 - day + 7) % 7);
  if (daysUntilNextMonday === 0) daysUntilNextMonday = 7; // If today is Monday, next Monday is +7 days

  let cutoffPassedForNextWeek = false;
  if (day === 5 && (hours > 14 || (hours === 14 && minutes > 0))) {
    cutoffPassedForNextWeek = true;
  } else if (day === 6 || day === 0) {
    cutoffPassedForNextWeek = true;
  }

  if (cutoffPassedForNextWeek) {
    daysUntilNextMonday += 7;
  }

  const earliestMonday = new Date(ist.getTime() + daysUntilNextMonday * 24 * 60 * 60 * 1000);
  const y = earliestMonday.getFullYear();
  const m = String(earliestMonday.getMonth() + 1).padStart(2, '0');
  const d = String(earliestMonday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = {
  validateDemandCutoff,
  getEarliestAllowedDateForANO,
  getISTDate
};
