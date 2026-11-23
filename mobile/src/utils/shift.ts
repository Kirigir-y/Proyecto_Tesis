import type { Shift } from '../types';

const toLocalDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getCurrentShiftInfo = (now: Date = new Date()): { date: string; shift: Shift } => {
  const hour = now.getHours();
  if (hour >= 8 && hour < 20) return { date: toLocalDateString(now), shift: 'dia' };
  if (hour >= 20) return { date: toLocalDateString(now), shift: 'noche' };
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return { date: toLocalDateString(yesterday), shift: 'noche' };
};

export const SHIFT_LABEL: Record<Shift, string> = {
  dia: '☀ Día (08:00–19:59)',
  noche: '🌙 Noche (20:00–07:59)',
};
