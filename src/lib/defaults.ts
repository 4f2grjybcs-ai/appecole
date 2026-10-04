import { ETAPES, EXIGENCES_DEFAUT } from './fsvl';
import { LIENS_METEO_DEFAUT } from './meteoLiens';
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
  etapes: ETAPES,
  tarifs: { grandVol: 0, penteEcole: 0, navette: 0 },
  meteoLiens: LIENS_METEO_DEFAUT,
};

export function donneesVides(): AppData {
  return {
    version: 1,
    moniteurs: [],
    eleves: [],
    vols: [],
    validations: [],
    seances: [],
    journees: [],
    statuts: [],
    messages: [],
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

type Ancien = { siteId?: string };

/**
 * Met à niveau des données enregistrées avant la distinction décollage / atterrissage :
 * l'ancien « site » d'un vol ou d'une séance devient son décollage.
 */
export function normaliser(d: AppData): AppData {
  const migrer = <T extends { decollageId?: string }>(x: T & Ancien): T => {
    if (x.siteId === undefined) return x;
    const { siteId, ...reste } = x;
    return { ...(reste as T), decollageId: x.decollageId ?? siteId };
  };
  return {
    ...d,
    vols: d.vols.map(migrer),
    seances: d.seances.map(migrer),
    journees: d.journees ?? [],
    statuts: d.statuts ?? [],
    messages: d.messages ?? [],
    eleves: d.eleves.map((e) => {
      const { assuranceValidite: _, ...reste } = e as typeof e & { assuranceValidite?: string };
      return reste;
    }),
    reglages: {
      ...d.reglages,
      etapes: d.reglages.etapes ?? ETAPES,
      meteoLiens: d.reglages.meteoLiens ?? LIENS_METEO_DEFAUT,
      tarifs: { ...REGLAGES_DEFAUT.tarifs, ...d.reglages.tarifs },
      exigences: {
        grandsVolsMin: d.reglages.exigences?.grandsVolsMin ?? EXIGENCES_DEFAUT.grandsVolsMin,
        sitesDifferentsMin: d.reglages.exigences?.sitesDifferentsMin ?? EXIGENCES_DEFAUT.sitesDifferentsMin,
      },
      sites: d.reglages.sites.map((s) => ({ ...s, type: s.type ?? 'decollage', orientations: s.orientations ?? [] })),
    },
  };
}
