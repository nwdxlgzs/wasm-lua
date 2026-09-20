const PREFIX = '__wlua.os.';
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function pad(value, length = 2, fill = '0') {
  return String(value).padStart(length, fill);
}

function finiteInteger(value, name, fallback) {
  if (value == null && fallback !== undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || !Number.isInteger(number))
    throw new TypeError(`${name} 必须是整数。`);
  return number;
}

function dayOfYear(date, utc) {
  const year = utc ? date.getUTCFullYear() : date.getFullYear();
  const month = utc ? date.getUTCMonth() : date.getMonth();
  const day = utc ? date.getUTCDate() : date.getDate();
  return Math.floor((Date.UTC(year, month, day) - Date.UTC(year, 0, 1)) /
    86400000) + 1;
}

function isDst(date) {
  const year = date.getFullYear();
  const january = new Date(year, 0, 1).getTimezoneOffset();
  const july = new Date(year, 6, 1).getTimezoneOffset();
  return date.getTimezoneOffset() < Math.max(january, july);
}

function dateFields(date, utc) {
  const get = name => date[`${utc ? 'getUTC' : 'get'}${name}`]();
  return {
    year: BigInt(get('FullYear')),
    month: BigInt(get('Month') + 1),
    day: BigInt(get('Date')),
    hour: BigInt(get('Hours')),
    min: BigInt(get('Minutes')),
    sec: BigInt(get('Seconds')),
    wday: BigInt(get('Day') + 1),
    yday: BigInt(dayOfYear(date, utc)),
    isdst: utc ? false : isDst(date)
  };
}

function weekNumber(date, monday, utc) {
  const year = utc ? date.getUTCFullYear() : date.getFullYear();
  const yday = dayOfYear(date, utc) - 1;
  const first = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const offset = monday ? (first + 6) % 7 : first;
  return Math.floor((yday + 7 - offset) / 7);
}

function isoWeek(date, utc) {
  const year = utc ? date.getUTCFullYear() : date.getFullYear();
  const month = utc ? date.getUTCMonth() : date.getMonth();
  const day = utc ? date.getUTCDate() : date.getDate();
  const target = new Date(Date.UTC(year, month, day));
  const weekday = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - weekday);
  const isoYear = target.getUTCFullYear();
  const first = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((target.getTime() - first.getTime()) / 86400000) + 1) / 7);
  return { year: isoYear, week };
}

function timezoneOffset(date, utc) {
  if (utc) return '+0000';
  const east = -date.getTimezoneOffset();
  return `${east >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(east) / 60))}` +
    pad(Math.abs(east) % 60);
}

function timezoneName(date, utc) {
  if (utc) return 'UTC';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(date).find(part => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

function formatDate(format, epochSeconds) {
  let utc = false;
  if (format.startsWith('!')) {
    utc = true;
    format = format.slice(1);
  }
  const milliseconds = Number(epochSeconds) * 1000;
  const date = new Date(milliseconds);
  if (!Number.isFinite(milliseconds) || Number.isNaN(date.getTime()))
    throw new RangeError('日期超出浏览器可表示范围。');
  if (format === '*t') return dateFields(date, utc);
  const get = name => date[`${utc ? 'getUTC' : 'get'}${name}`]();
  const year = get('FullYear');
  const month = get('Month');
  const day = get('Date');
  const hour = get('Hours');
  const minute = get('Minutes');
  const second = get('Seconds');
  const weekday = get('Day');
  const iso = isoWeek(date, utc);
  const replacements = {
    a: () => WEEKDAYS_SHORT[weekday], A: () => WEEKDAYS_LONG[weekday],
    b: () => MONTHS_SHORT[month], B: () => MONTHS_LONG[month],
    c: () => `${WEEKDAYS_SHORT[weekday]} ${MONTHS_SHORT[month]} ${pad(day, 2, ' ')} ` +
      `${pad(hour)}:${pad(minute)}:${pad(second)} ${year}`,
    C: () => pad(Math.floor(year / 100)), d: () => pad(day),
    D: () => `${pad(month + 1)}/${pad(day)}/${pad(year % 100)}`,
    e: () => pad(day, 2, ' '), F: () => `${year}-${pad(month + 1)}-${pad(day)}`,
    g: () => pad(iso.year % 100), G: () => String(iso.year),
    h: () => MONTHS_SHORT[month], H: () => pad(hour),
    I: () => pad(hour % 12 || 12), j: () => pad(dayOfYear(date, utc), 3),
    m: () => pad(month + 1), M: () => pad(minute),
    n: () => '\n', p: () => hour < 12 ? 'AM' : 'PM',
    r: () => `${pad(hour % 12 || 12)}:${pad(minute)}:${pad(second)} ` +
      (hour < 12 ? 'AM' : 'PM'),
    R: () => `${pad(hour)}:${pad(minute)}`, S: () => pad(second), t: () => '\t',
    T: () => `${pad(hour)}:${pad(minute)}:${pad(second)}`,
    U: () => pad(weekNumber(date, false, utc)),
    u: () => String(weekday || 7), V: () => pad(iso.week),
    w: () => String(weekday), W: () => pad(weekNumber(date, true, utc)),
    x: () => `${pad(month + 1)}/${pad(day)}/${pad(year % 100)}`,
    X: () => `${pad(hour)}:${pad(minute)}:${pad(second)}`,
    y: () => pad(year % 100), Y: () => String(year),
    z: () => timezoneOffset(date, utc), Z: () => timezoneName(date, utc),
    '%': () => '%'
  };
  let result = '';
  for (let index = 0; index < format.length; index++) {
    if (format[index] !== '%') {
      result += format[index];
      continue;
    }
    let specifier = format[++index];
    // C99's E/O modifiers select an alternative locale representation. The
    // sandbox deliberately uses the deterministic C locale, where they are
    // equivalent to the unmodified conversion.
    if (specifier === 'E' || specifier === 'O') specifier = format[++index];
    if (!specifier || !replacements[specifier])
      throw new TypeError(`无效的 os.date 转换符：%${specifier ?? ''}`);
    result += replacements[specifier]();
  }
  return result;
}

function makeLocalDate(year, month, day, hour, minute, second) {
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, second, 0);
  if (Number.isNaN(date.getTime())) throw new RangeError('日期无法表示。');
  return date;
}

function randomName() {
  const bytes = new Uint8Array(12);
  globalThis.crypto?.getRandomValues?.(bytes);
  const token = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `/tmp/lua-${token}`;
}

/**
 * Browser/Node implementation for the authority-free part of Lua's os table.
 * @param {{environment?: Record<string, string>, clock?: () => number}} [options]
 */
export function createOsBridge(options = {}) {
  const environment = new Map(Object.entries(options.environment ?? {})
    .map(([key, value]) => [String(key), String(value)]));
  const monotonicNow = () => globalThis.performance?.now?.() ?? Date.now();
  const started = monotonicNow();
  const clock = options.clock ?? (() => (monotonicNow() - started) / 1000);
  return {
    /** @param {string} name @param {any[]} args */
    invoke(name, args) {
      if (!name.startsWith(PREFIX)) return { handled: false };
      switch (name.slice(PREFIX.length)) {
        case 'clock':
          return { handled: true, value: Number(clock()) };
        case 'time': {
          if (args.every(value => value == null))
            return { handled: true, value: BigInt(Math.floor(Date.now() / 1000)) };
          const date = makeLocalDate(
            finiteInteger(args[0], 'year'), finiteInteger(args[1], 'month'),
            finiteInteger(args[2], 'day'), finiteInteger(args[3], 'hour', 12),
            finiteInteger(args[4], 'min', 0), finiteInteger(args[5], 'sec', 0));
          return { handled: true, value: {
            timestamp: BigInt(Math.floor(date.getTime() / 1000)),
            ...dateFields(date, false)
          }};
        }
        case 'date': {
          const format = args[0] == null ? '%c' : String(args[0]);
          const time = args[1] == null ? Math.floor(Date.now() / 1000) : Number(args[1]);
          return { handled: true, value: formatDate(format, time) };
        }
        case 'getenv':
          return { handled: true, value: environment.get(String(args[0])) ?? null };
        case 'tmpname':
          return { handled: true, value: randomName() };
        default:
          return { handled: false };
      }
    }
  };
}
