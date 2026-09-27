import type { Orientation, SeuilsMeteo, Site } from './types';

export interface HeureMeteo {
  time: string;
  temperature: number;
  vent: number;
  rafales: number;
  direction: number;
  ventAltitude: number;
  directionAltitude: number;
  precipitation: number;
  nuages: number;
  cape: number;
}

export type Verdict = 'favorable' | 'limite' | 'defavorable';

export interface Evaluation {
  verdict: Verdict;
  /** Détail chiffré de chaque problème */
  raisons: string[];
  /** Libellés courts, sans chiffres (pour un résumé sur la journée) */
  motifs: string[];
}

const ORIENTATION_DEG: Record<Orientation, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

export function pointCardinal(deg: number): string {
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export function ecartAngulaire(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * Le vent météo est donné par sa provenance. Un décollage orienté S
 * demande un vent venant du S (face au pilote qui regarde la pente).
 */
export function ventDansOrientation(direction: number, site: Site, tolerance: number): boolean {
  if (site.orientations.length === 0) return true;
  return site.orientations.some((o) => ecartAngulaire(direction, ORIENTATION_DEG[o]) <= tolerance);
}

export function evaluer(h: HeureMeteo, site: Site, s: SeuilsMeteo): Evaluation {
  const rouge: [string, string][] = [];
  const orange: [string, string][] = [];

  if (h.precipitation > 0.2) rouge.push(['Pluie', `Précipitations ${h.precipitation.toFixed(1)} mm`]);
  if (h.vent > s.ventMaxKmh) rouge.push(['Vent trop fort', `Vent ${Math.round(h.vent)} km/h > ${s.ventMaxKmh}`]);
  else if (h.vent > s.ventMaxKmh * 0.8) orange.push(['Vent soutenu', `Vent ${Math.round(h.vent)} km/h proche du max`]);
  if (h.rafales > s.rafalesMaxKmh) rouge.push(['Rafales fortes', `Rafales ${Math.round(h.rafales)} km/h > ${s.rafalesMaxKmh}`]);
  if (h.rafales - h.vent > s.ecartRafalesMaxKmh)
    orange.push(['Vent irrégulier', `Écart rafales ${Math.round(h.rafales - h.vent)} km/h`]);
  if (h.ventAltitude > s.ventAltitudeMaxKmh)
    rouge.push(['Vent fort en altitude', `Vent en altitude ${Math.round(h.ventAltitude)} km/h > ${s.ventAltitudeMaxKmh}`]);
  if (h.vent >= 5 && !ventDansOrientation(h.direction, site, s.toleranceDirectionDeg))
    orange.push(['Vent hors orientation', `Vent de ${pointCardinal(h.direction)} hors orientation du décollage`]);
  if (h.cape > 1000) orange.push(['Instabilité / orages', `CAPE ${Math.round(h.cape)} J/kg – risque orageux`]);

  const verdict: Verdict = rouge.length ? 'defavorable' : orange.length ? 'limite' : 'favorable';
  const tous = [...rouge, ...orange];
  return { verdict, motifs: tous.map((x) => x[0]), raisons: tous.map((x) => x[1]) };
}

const HOURLY = [
  'temperature_2m',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'wind_speed_850hPa',
  'wind_direction_850hPa',
  'precipitation',
  'cloud_cover',
  'cape',
];

export function urlPrevision(site: Site, jours = 3): string {
  const p = new URLSearchParams({
    latitude: String(site.lat),
    longitude: String(site.lon),
    elevation: String(site.altitude),
    hourly: HOURLY.join(','),
    wind_speed_unit: 'kmh',
    timezone: 'Europe/Zurich',
    forecast_days: String(jours),
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

interface ReponseOpenMeteo {
  hourly: Record<string, (number | null)[]> & { time: string[] };
}

export function parserPrevision(r: ReponseOpenMeteo): HeureMeteo[] {
  const h = r.hourly;
  const n = (k: string, i: number) => h[k]?.[i] ?? 0;
  return h.time.map((time, i) => ({
    time,
    temperature: n('temperature_2m', i),
    vent: n('wind_speed_10m', i),
    rafales: n('wind_gusts_10m', i),
    direction: n('wind_direction_10m', i),
    ventAltitude: n('wind_speed_850hPa', i),
    directionAltitude: n('wind_direction_850hPa', i),
    precipitation: n('precipitation', i),
    nuages: n('cloud_cover', i),
    cape: n('cape', i),
  }));
}

export async function chargerPrevision(site: Site, signal?: AbortSignal): Promise<HeureMeteo[]> {
  const res = await fetch(urlPrevision(site), { signal });
  if (!res.ok) throw new Error(`Service météo indisponible (${res.status})`);
  return parserPrevision(await res.json());
}
