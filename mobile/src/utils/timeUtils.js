/**
 * Pakistan Standard Time (PKT) - UTC+5:00
 * Utilities for formatting timestamps and dates consistently in Pakistan time across all screens.
 */

export const formatTimePKT = (dateInput) => {
  if (!dateInput) return '-';
  try {
    let d;
    if (typeof dateInput === 'string') {
      d = new Date(dateInput);
    } else {
      d = new Date(dateInput);
    }
    if (isNaN(d.getTime())) return '-';

    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '-';
  }
};

export const formatDatePKT = (dateInput) => {
  if (!dateInput) return '';
  try {
    const d = new Date(typeof dateInput === 'string' && !dateInput.includes('T') ? dateInput + 'T00:00:00' : dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
};

/**
 * Returns today's date in Pakistan Standard Time (PKT, UTC+5) formatted as YYYY-MM-DD.
 * Ensures consistent date querying across midnight and UTC differences.
 */
export const getTodayPKT = (dateObj = new Date()) => {
  const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  const pkt = new Date(utc + (5 * 60 * 60000));
  const y = pkt.getFullYear();
  const m = String(pkt.getMonth() + 1).padStart(2, '0');
  const d = String(pkt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Returns a date N days ago in PKT in YYYY-MM-DD format.
 */
export const getDaysAgoPKT = (daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getTodayPKT(d);
};
