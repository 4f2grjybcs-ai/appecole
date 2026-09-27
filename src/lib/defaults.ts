import { EXIGENCES_DEFAUT } from './fsvl';
import type { AppData, Reglages } from './types';

export const REGLAGES_DEFAUT: Reglages = {
  ecoleNom: 'Mon école de parapente',
  sites: [],
  seuils: {
    ventMaxKmh: 20,
    rafalesMaxKmh: 25,
    ecartRafalesMaxKmh: 10,
    ventAltitudeMaxKmh: 30,
    toleranceDirectionDeg: 45,
  },
  exigences: EXIGENCES_DEFAUT,
};

export function donneesVides(): AppData {
  return {
    version: 1,
    moniteurs: [],
    eleves: [],
    vols: [],
    validations: [],
    seances: [],
    reglages: REGLAGES_DEFAUT,
  };
}

export function nouvelId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function aujourdhui(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dateValide(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function formatDate(s?: string): string {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}
