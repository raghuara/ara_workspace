const pad = (value) => String(value).padStart(2, "0");

const localIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const todayIso = () => localIsoDate(new Date());

const parseLocal = (iso) => {
  const [year, month, day] = String(iso).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

const normaliseSchedule = (schedule = {}) => ({
  frequency: schedule.frequency === "monthly" ? "monthly" : "weekly",
  weekdays: [...new Set((schedule.weekdays ?? []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b),
  monthDays: [...new Set((schedule.monthDays ?? []).map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 31))].sort((a, b) => a - b)
});

const isScheduleComplete = (schedule) => {
  const rule = normaliseSchedule(schedule);
  return rule.frequency === "weekly" ? rule.weekdays.length > 0 : rule.monthDays.length > 0;
};

const matchesDate = (schedule, date) => {
  const rule = normaliseSchedule(schedule);
  if (rule.frequency === "weekly") return rule.weekdays.includes(date.getDay());
  const day = date.getDate();
  const last = daysInMonth(date.getFullYear(), date.getMonth());
  return rule.monthDays.some((wanted) => wanted === day || (wanted > last && day === last));
};

const nextOccurrences = (schedule, { from = todayIso(), endDate = null, count = 3 } = {}) => {
  if (!isScheduleComplete(schedule)) return [];
  const found = [];
  const cursor = parseLocal(from);
  const stop = endDate ? parseLocal(endDate) : null;
  for (let step = 0; step < 400 && found.length < count; step += 1) {
    if (stop && cursor > stop) break;
    if (matchesDate(schedule, cursor)) found.push(localIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return found;
};

const addDays = (iso, days) => {
  const date = parseLocal(iso);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
};

module.exports = {
  todayIso,
  parseLocal,
  normaliseSchedule,
  isScheduleComplete,
  matchesDate,
  nextOccurrences,
  addDays
};
