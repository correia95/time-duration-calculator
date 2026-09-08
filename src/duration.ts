// Parsing and formatting for durations and clock times. Everything is handled in
// whole seconds.

export interface Parsed {
  seconds: number;
  ok: boolean;
}

const UNIT_SECONDS: Record<string, number> = {
  w: 604800,
  week: 604800,
  weeks: 604800,
  d: 86400,
  day: 86400,
  days: 86400,
  h: 3600,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600,
  m: 60,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
};

// Accepts: "1:30" (h:m), "1:30:45" (h:m:s), "90m", "1h 30m", "1.5h",
// "2d 4h 30m", "45 min", "3600s", or a bare number (treated as minutes).
export function parseDuration(raw: string): Parsed {
  const str = raw.trim().toLowerCase();
  if (str === '') return { seconds: 0, ok: false };

  // colon form
  if (/^\d+(:\d{1,2}){1,2}$/.test(str)) {
    const parts = str.split(':').map(Number);
    const mins = parts[1];
    const secs = parts.length === 3 ? parts[2] : 0;
    if (mins > 59 || secs > 59) return { seconds: 0, ok: false };
    const t = parts[0] * 3600 + mins * 60 + secs;
    return { seconds: Math.round(t), ok: true };
  }

  // bare number -> minutes
  if (/^\d*\.?\d+$/.test(str)) {
    return { seconds: Math.round(parseFloat(str) * 60), ok: true };
  }

  // unit form: one or more "<number><unit>" chunks, spaces optional
  const re = /(\d*\.?\d+)\s*([a-z]+)/g;
  let total = 0;
  let matched = false;
  let rest = str;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    const factor = UNIT_SECONDS[m[2]];
    if (factor == null) return { seconds: 0, ok: false };
    total += parseFloat(m[1]) * factor;
    matched = true;
    rest = rest.replace(m[0], '');
  }
  // anything left over (other than separators) means the input was malformed
  if (!matched || /[^\s,]/.test(rest)) return { seconds: 0, ok: false };

  return { seconds: Math.round(total), ok: true };
}

export interface TapeItem {
  id: string;
  sign: 1 | -1;
  text: string;
}

export interface TapeResult {
  seconds: number;
  anyError: boolean;
  rows: { id: string; ok: boolean; seconds: number }[];
}

export function sumTape(items: TapeItem[]): TapeResult {
  let seconds = 0;
  let anyError = false;
  const rows = items.map((it) => {
    if (it.text.trim() === '') return { id: it.id, ok: true, seconds: 0 };
    const p = parseDuration(it.text);
    if (!p.ok) {
      anyError = true;
      return { id: it.id, ok: false, seconds: 0 };
    }
    seconds += it.sign * p.seconds;
    return { id: it.id, ok: true, seconds: it.sign * p.seconds };
  });
  return { seconds, anyError, rows };
}

// "1h 30m", negative prefixed with "-". Zero -> "0m".
export function humanDuration(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  let s = Math.abs(Math.round(totalSeconds));
  const parts: string[] = [];
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  if (parts.length === 0) parts.push('0m');
  return (neg ? '-' : '') + parts.join(' ');
}

// H:MM:SS (or -H:MM:SS). Hours are not wrapped at 24.
export function clockDuration(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  let s = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${neg ? '-' : ''}${h}:${pad(m)}:${pad(s)}`;
}

export function breakdown(totalSeconds: number) {
  const s = Math.abs(Math.round(totalSeconds));
  return {
    negative: totalSeconds < 0,
    weeks: s / 604800,
    days: s / 86400,
    hours: s / 3600,
    minutes: s / 60,
    seconds: s,
  };
}

// "9:15", "09:15", "9:15 am", "5:45pm", "17:45", "9" (=> 9:00)
export function parseClock(raw: string): { seconds: number; ok: boolean } {
  const str = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (str === '') return { seconds: 0, ok: false };
  const m = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?(am|pm)?$/.exec(str);
  if (!m) return { seconds: 0, ok: false };
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const sec = m[3] ? Number(m[3]) : 0;
  const ap = m[4];
  if (min > 59 || sec > 59) return { seconds: 0, ok: false };
  if (ap) {
    if (h < 1 || h > 12) return { seconds: 0, ok: false };
    if (ap === 'am') h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
  } else if (h > 23) {
    return { seconds: 0, ok: false };
  }
  return { seconds: h * 3600 + min * 60 + sec, ok: true };
}

// Elapsed time from start to end; if end is earlier, assume it is the next day.
export function timeBetween(
  startSec: number,
  endSec: number,
  overnight: boolean,
): number {
  let diff = endSec - startSec;
  if (diff < 0 || (overnight && diff === 0)) diff += 86400;
  return diff;
}
