import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fmtDate(d: string | Date) {
  return format(new Date(d), 'MMM d, yyyy');
}

export function fmtDateTime(d: string | Date) {
  return format(new Date(d), 'MMM d, yyyy HH:mm');
}

export function fmtRelative(d: string | Date) {
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}

export function fmtAFN(n: number) {
  return `${n.toLocaleString()} AFN`;
}
