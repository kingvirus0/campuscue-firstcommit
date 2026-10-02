export function buildIcs(input: {
  title: string;
  description?: string;
  location?: string | null;
  date: string | null;
  time: string | null;
}): string {
  const dt = resolveDateTime(input.date, input.time);
  const uid = `${Date.now()}@campuscue`;
  const stamp = formatUtc(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampusCue//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dt.start}`,
    `DTEND:${dt.end}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    input.location ? `LOCATION:${escapeIcs(input.location)}` : "",
    `DESCRIPTION:${escapeIcs(input.description ?? input.title)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

function resolveDateTime(
  date: string | null,
  time: string | null
): { start: string; end: string } {
  const d = date ? new Date(`${date}T${time ?? "09:00"}:00`) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      start: formatLocal(now),
      end: formatLocal(new Date(now.getTime() + 60 * 60 * 1000)),
    };
  }
  const end = new Date(d.getTime() + 60 * 60 * 1000);
  return { start: formatLocal(d), end: formatLocal(end) };
}

function formatLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  );
}

function formatUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
