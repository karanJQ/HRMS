/**
 * HRMS Conflict Validation Engine
 * Implements the full conflict matrix for Leave, WFH, and Regularization requests.
 *
 * Slot types: 'FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'
 * Request types: 'leave', 'wfh', 'regularize'
 */

// Normalize a half_day_type value into a canonical slot
const toSlot = (halfDayType, dayType) => {
  if (dayType === 'half_day' || halfDayType) {
    if (halfDayType === 'FIRST_HALF') return 'FIRST_HALF';
    if (halfDayType === 'SECOND_HALF') return 'SECOND_HALF';
  }
  return 'FULL_DAY';
};

// Check if two slots overlap
const slotsOverlap = (existingSlot, newSlot) => {
  if (existingSlot === 'FULL_DAY' || newSlot === 'FULL_DAY') return true;
  return existingSlot === newSlot;
};

// Get the opposite slot
const oppositeSlot = (slot) => {
  if (slot === 'FIRST_HALF') return 'SECOND_HALF';
  if (slot === 'SECOND_HALF') return 'FIRST_HALF';
  return null; // full day has no opposite
};

/**
 * FULL CONFLICT MATRIX (from the rules document)
 *
 * Existing \ New   | Lv FD | Lv H1 | Lv H2 | WFH FD | WFH H1 | WFH H2 | Reg FD | Reg H1 | Reg H2
 * Leave Full Day   | Block | Block | Block | Block  | Block  | Block  | Block  | Block  | Block
 * Leave H1         | Block | Block | Allow | Block  | Block  | Allow  | Block  | Block  | Allow
 * Leave H2         | Block | Allow | Block | Block  | Allow  | Block  | Block  | Allow  | Block
 * WFH Full Day     | Block | Block | Block | Block  | Block  | Block  | Allow  | Allow  | Allow
 * WFH H1           | Block | Block | Allow | Block  | Block  | Allow  | Allow  | Allow  | Allow
 * WFH H2           | Block | Allow | Block | Block  | Allow  | Block  | Allow  | Allow  | Allow
 * Reg Full Day     | Block | Block | Block | Allow  | Allow  | Allow  | Block  | Block  | Block
 * Reg H1           | Block | Block | Block | Allow  | Allow  | Allow  | Block  | Block  | Block
 * Reg H2           | Block | Block | Block | Allow  | Allow  | Allow  | Block  | Block  | Block
 */

// Returns true if the new request is BLOCKED by the existing one
const isBlocked = (existingType, existingSlot, newType, newSlot) => {
  // ─── LEAVE exists ───
  if (existingType === 'leave') {
    if (existingSlot === 'FULL_DAY') return true; // blocks everything
    // Half-day leave
    if (newType === 'leave') {
      if (newSlot === 'FULL_DAY') return true;
      return existingSlot === newSlot; // same half blocked, opposite allowed
    }
    if (newType === 'wfh') {
      if (newSlot === 'FULL_DAY') return true;
      return existingSlot === newSlot;
    }
    if (newType === 'regularize') {
      if (newSlot === 'FULL_DAY') return true;
      return existingSlot === newSlot;
    }
  }

  // ─── WFH exists ───
  if (existingType === 'wfh') {
    if (newType === 'regularize') return false; // Reg + WFH always coexist
    if (existingSlot === 'FULL_DAY') return true; // Full WFH blocks all leave/wfh
    // Half-day WFH
    if (newType === 'leave') {
      if (newSlot === 'FULL_DAY') return true;
      return existingSlot === newSlot;
    }
    if (newType === 'wfh') {
      if (newSlot === 'FULL_DAY') return true;
      return existingSlot === newSlot;
    }
  }

  // ─── REGULARIZATION exists ───
  if (existingType === 'regularize') {
    if (newType === 'wfh') return false; // WFH + Reg always coexist
    if (newType === 'leave') return true; // Reg blocks ALL leave (any slot)
    if (newType === 'regularize') {
      if (existingSlot === 'FULL_DAY' || newSlot === 'FULL_DAY') return true;
      return existingSlot === newSlot;
    }
  }

  return false;
};

/**
 * Get all active (Pending/Approved) requests for a specific date
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} empId - employee ID
 * @param {Array} leaves - all leave applications
 * @param {Array} wfhRequests - all WFH requests
 * @param {Array} regularizations - all regularization requests
 * @returns {Array} - [{type, slot, status, id, label}]
 */
export const getActiveRequestsForDate = (dateStr, empId, leaves, wfhRequests, regularizations) => {
  const requests = [];

  // Leaves covering this date
  leaves.forEach(l => {
    if (l.emp_id !== empId) return;
    if (!['Pending', 'Approved'].includes(l.status)) return;
    const from = l.from_date.split('T')[0];
    const to = l.to_date.split('T')[0];
    if (dateStr >= from && dateStr <= to) {
      requests.push({
        type: 'leave',
        slot: toSlot(l.half_day_type),
        status: l.status,
        id: l.id,
        label: `${l.leave_type} Leave (${l.half_day_type === 'FIRST_HALF' ? 'H1' : l.half_day_type === 'SECOND_HALF' ? 'H2' : 'Full Day'}) — ${l.status}`,
        raw: l
      });
    }
  });

  // WFH requests on this date
  wfhRequests.forEach(w => {
    if (w.emp_id !== empId) return;
    if (!['Pending', 'Approved'].includes(w.status)) return;
    if (w.date.split('T')[0] !== dateStr) return;
    requests.push({
      type: 'wfh',
      slot: toSlot(w.half_day_type, w.wfh_type),
      status: w.status,
      id: w.id,
      label: `WFH (${w.half_day_type === 'FIRST_HALF' ? 'H1' : w.half_day_type === 'SECOND_HALF' ? 'H2' : 'Full Day'}) — ${w.status}`,
      raw: w
    });
  });

  // Regularization requests on this date
  regularizations.forEach(r => {
    if (r.emp_id !== empId) return;
    if (!['Pending', 'Approved'].includes(r.status)) return;
    if (r.date.split('T')[0] !== dateStr) return;
    requests.push({
      type: 'regularize',
      slot: toSlot(r.half_day_type, r.regularization_type),
      status: r.status,
      id: r.id,
      label: `Regularization (${r.half_day_type === 'FIRST_HALF' ? 'H1' : r.half_day_type === 'SECOND_HALF' ? 'H2' : 'Full Day'}) — ${r.status}`,
      raw: r
    });
  });

  return requests;
};

/**
 * Get which new request types/slots are blocked on a given date
 * @param {Array} existingRequests - from getActiveRequestsForDate
 * @returns {Object} - { leave: {FULL_DAY, FIRST_HALF, SECOND_HALF}, wfh: {...}, regularize: {...} }
 *   each value is null (allowed) or a string (block reason)
 */
export const getBlockedSlots = (existingRequests) => {
  const blocked = {
    leave:      { FULL_DAY: null, FIRST_HALF: null, SECOND_HALF: null },
    wfh:        { FULL_DAY: null, FIRST_HALF: null, SECOND_HALF: null },
    regularize: { FULL_DAY: null, FIRST_HALF: null, SECOND_HALF: null },
  };

  const slotLabels = { FULL_DAY: 'Full Day', FIRST_HALF: 'First Half', SECOND_HALF: 'Second Half' };
  const typeLabels = { leave: 'Leave', wfh: 'WFH', regularize: 'Regularization' };

  for (const existing of existingRequests) {
    for (const newType of ['leave', 'wfh', 'regularize']) {
      for (const newSlot of ['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF']) {
        if (blocked[newType][newSlot]) continue; // already blocked
        if (isBlocked(existing.type, existing.slot, newType, newSlot)) {
          const exSlotLabel = slotLabels[existing.slot];
          const exTypeLabel = typeLabels[existing.type];
          if (existing.slot === 'FULL_DAY') {
            blocked[newType][newSlot] = `You already have a ${exSlotLabel} ${exTypeLabel} on this date. Please cancel it first.`;
          } else {
            blocked[newType][newSlot] = `${exSlotLabel} is occupied by ${exTypeLabel}. ${newSlot === 'FULL_DAY' ? 'Please cancel it first.' : 'You can apply for the other half only.'}`;
          }
        }
      }
    }
  }

  return blocked;
};

/**
 * Check date-level rules (holiday, weekend, past/future)
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} requestType - 'leave' | 'wfh' | 'regularize'
 * @param {Array} holidays - holiday list [{date, name, type}]
 * @param {boolean} isAdmin - is admin/HR
 * @returns {string|null} - block reason or null if allowed
 */
export const checkDateRules = (dateStr, requestType, holidays, isAdmin = false) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const date = new Date(dateStr + 'T00:00:00');

  // 1. Holiday check
  const holiday = holidays.find(h => h.date?.split('T')[0] === dateStr);
  if (holiday) return `This date is a public holiday (${holiday.name}).`;

  // 2. Weekend check
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    if (requestType === 'regularize') return null; // allowed on weekends
    return 'Leave and WFH are not allowed on weekends.';
  }

  // 3. Date direction check
  if (requestType === 'regularize') {
    if (dateStr >= todayStr) return 'Regularization can only be applied for past dates.';
  }

  return null;
};

/**
 * Check if a specific action (type + slot) is allowed, combining date rules + conflict matrix
 * Returns { allowed: boolean, reason: string|null }
 */
export const canApply = (dateStr, requestType, slot, existingRequests, holidays, isAdmin = false) => {
  const dateError = checkDateRules(dateStr, requestType, holidays, isAdmin);
  if (dateError) return { allowed: false, reason: dateError };

  const blocked = getBlockedSlots(existingRequests);
  const blockReason = blocked[requestType]?.[slot];
  if (blockReason) return { allowed: false, reason: blockReason };

  return { allowed: true, reason: null };
};

/**
 * Check if ANY slot for a request type is available (used to decide if the button should be shown at all)
 */
export const isAnySlotAvailable = (dateStr, requestType, existingRequests, holidays, isAdmin = false) => {
  for (const slot of ['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF']) {
    const { allowed } = canApply(dateStr, requestType, slot, existingRequests, holidays, isAdmin);
    if (allowed) return true;
  }
  return false;
};
