export const $ = selector => document.querySelector(selector);

export function startOfDay(date) { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
export function addDays(date, days) { const value = new Date(date); value.setDate(value.getDate() + days); return value; }
export function startOfWeek(date) { const value = startOfDay(date); const day = value.getDay() || 7; return addDays(value, 1 - day); }
export function isoDate(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"); }
export function parseDate(value) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
export function sameDay(a, b) { return isoDate(a) === isoDate(b); }

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}
