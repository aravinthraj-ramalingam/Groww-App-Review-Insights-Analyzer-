export function getWeekRange(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7; // 0 if Monday, 6 if Sunday

  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const format = (x: Date) =>
    `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(
      x.getUTCDate()
    ).padStart(2, '0')}`;

  return {
    weekStart: format(monday),
    weekEnd: format(sunday)
  };
}

