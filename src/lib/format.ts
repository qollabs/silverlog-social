import { formatInTimeZone } from 'date-fns-tz';

const TZ = 'Asia/Seoul';

export function fmtDate(d: Date | string): string {
  return formatInTimeZone(new Date(d), TZ, 'M월 d일 (EEEEE)');
}

export function fmtDateTime(d: Date | string): string {
  return formatInTimeZone(new Date(d), TZ, 'M월 d일 (EEEEE) a h:mm');
}

export function fmtTimeRange(start: Date | string, end: Date | string): string {
  const s = formatInTimeZone(new Date(start), TZ, 'M월 d일 (EEEEE) a h:mm');
  const e = formatInTimeZone(new Date(end), TZ, 'h:mm');
  return `${s} ~ ${e}`;
}

export function fmtRelative(d: Date | string): string {
  const target = new Date(d);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '내일';
  if (diffDays === -1) return '어제';
  if (diffDays > 0 && diffDays < 7) return `${diffDays}일 후`;
  if (diffDays < 0 && diffDays > -7) return `${-diffDays}일 전`;
  return fmtDate(d);
}
