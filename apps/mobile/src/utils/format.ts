export const CURRENCY = 'AFN';

export function formatAFN(amount: number): string {
  return `${amount.toLocaleString('fa-AF')} ؋`;
}

export function formatAFNEn(amount: number): string {
  return `${amount.toLocaleString()} ${CURRENCY}`;
}

export function formatRelativeTime(date: string | Date, lang = 'fa'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (lang === 'fa') {
    if (diffMin < 1)  return 'همین الان';
    if (diffMin < 60) return `${diffMin} دقیقه پیش`;
    if (diffHr < 24)  return `${diffHr} ساعت پیش`;
    return `${diffDay} روز پیش`;
  }

  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24)  return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export function formatDuration(hours: number, lang = 'fa'): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return lang === 'fa' ? `${mins} دقیقه` : `${mins} min`;
  }
  return lang === 'fa' ? `${hours} ساعت` : `${hours} hrs`;
}

export function formatArrival(minutes: number, lang = 'fa'): string {
  if (minutes < 60) return lang === 'fa' ? `${minutes} دقیقه` : `${minutes} min`;
  const hrs = (minutes / 60).toFixed(1);
  return lang === 'fa' ? `${hrs} ساعت` : `${hrs} hrs`;
}
