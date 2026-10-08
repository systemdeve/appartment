// Pure helpers (no Firebase), so they are easy to test.
const DAY = 86400000;

// Today's date in the Philippines (UTC+8) as YYYY-MM-DD.
const manilaToday = (now = new Date()) =>
  new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);

const daysUntil = (due, today) =>
  Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / DAY);

// Days relative to the due date on which a text is sent:
// 3 days before, on the due date, then 1, 3 and 7 days overdue.
const STAGES = [3, 0, -1, -3, -7];

const peso = n => 'PHP ' + Number(n || 0).toLocaleString('en-US');

// Same late-fee rule as the app.
const owed = (u, d) => {
  const late = Number(u.lateFee) > 0 && -d > (Number(u.grace) || 0) ? Number(u.lateFee) : 0;
  return (Number(u.rent) || 0) + late;
};

// '+639171234567' -> '09171234567' (accepts 09.., 639.., +639..); '' if not valid.
const toLocal = v => {
  let d = String(v || '').replace(/[^\d]/g, '');
  if (/^639\d{9}$/.test(d)) d = '0' + d.slice(2);
  return /^09\d{9}$/.test(d) ? d : '';
};

const niceDate = iso =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// Plain GSM characters only (no peso sign), so one text stays one segment.
const buildMessage = (u, d) => {
  const first = String(u.tenantName || 'tenant').trim().split(/\s+/)[0];
  const amt = peso(owed(u, d));
  const head = `Hi ${first}, `;
  const tail = ' Thank you!';
  if (d > 0) return `${head}reminder: rent for unit ${u.unit} (${amt}) is due in ${d} day${d > 1 ? 's' : ''}, on ${niceDate(u.due)}.${tail}`;
  if (d === 0) return `${head}rent for unit ${u.unit} (${amt}) is due today.${tail}`;
  return `${head}rent for unit ${u.unit} (${amt}) was due on ${niceDate(u.due)} and is ${-d} day${-d > 1 ? 's' : ''} overdue. Please pay as soon as possible.${tail}`;
};

module.exports = { manilaToday, daysUntil, STAGES, owed, toLocal, buildMessage };
