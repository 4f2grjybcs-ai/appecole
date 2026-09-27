import type { HeureMeteo } from './weather';

/** Version d'aperçu web (page de démonstration) : pas d'accès réseau ni de boîtes de dialogue. */
export const APERCU = process.env.EXPO_PUBLIC_APERCU === '1';

/** Prévisions fictives sur 3 jours : une belle journée, une journée limite, une journée ventée. */
export function previsionExemple(depart = new Date()): HeureMeteo[] {
  const r: HeureMeteo[] = [];
  for (let j = 0; j < 3; j++) {
    const d = new Date(depart);
    d.setDate(d.getDate() + j);
    const jour = d.toISOString().slice(0, 10);
    for (let h = 0; h < 24; h++) {
      const apresMidi = h >= 13 && h <= 17;
      r.push({
        time: `${jour}T${String(h).padStart(2, '0')}:00`,
        temperature: 9 + Math.max(0, 8 - Math.abs(h - 15)) + j,
        vent: j === 2 ? 22 + (h % 4) : 5 + h / 3,
        rafales: j === 2 ? 36 : 9 + h / 2,
        direction: j === 1 ? 20 : 190,
        ventAltitude: j === 2 ? 38 : 12 + j * 4,
        directionAltitude: 230,
        precipitation: j === 1 && h >= 17 ? 0.6 : 0,
        nuages: j === 1 ? 60 : 15,
        cape: j === 0 && apresMidi ? 1200 : 150,
      });
    }
  }
  return r;
}
