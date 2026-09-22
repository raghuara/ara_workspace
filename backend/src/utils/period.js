const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isDate = (value) => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));

const today = () => new Date().toISOString().slice(0, 10);

const periodFrom = (query = {}) => {
  const from = typeof query.from === "string" ? query.from.trim() : "";
  const to = typeof query.to === "string" ? query.to.trim() : "";
  return isDate(from) && isDate(to) && from <= to ? { from, to } : { from: "", to: "" };
};

const completionDay = (task) => task.completedAt ?? task.dueDate ?? task.createdAt ?? null;

const openDay = (task) => task.dueDate ?? task.createdAt ?? null;

const inPeriod = (period, day) => !period.from || (Boolean(day) && day >= period.from && day <= period.to);

const isOngoing = (period) => !period.from || period.to >= today();

const belongsToPeriod = (period, task, completed) => {
  if (!period.from) return true;
  if (completed) return inPeriod(period, completionDay(task));
  return isOngoing(period) || inPeriod(period, openDay(task));
};

module.exports = {
  periodFrom,
  completionDay,
  openDay,
  inPeriod,
  isOngoing,
  belongsToPeriod
};
