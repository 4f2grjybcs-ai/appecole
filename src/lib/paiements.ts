import type { MoyenPaiement, Tarifs, Vol } from './types';

export const MOYENS: { id: MoyenPaiement; libelle: string }[] = [
  { id: 'especes', libelle: 'Espèces' },
  { id: 'twint', libelle: 'TWINT' },
  { id: 'carte', libelle: 'Carte' },
  { id: 'virement', libelle: 'Virement' },
  { id: 'abonnement', libelle: 'Abonnement / forfait' },
];

export const libelleMoyen = (m?: MoyenPaiement) => MOYENS.find((x) => x.id === m)?.libelle ?? '—';

export const estPaye = (v: Vol) => v.paiement?.paye === true;

export function formatCHF(n: number): string {
  return `CHF ${n.toFixed(2).replace(/\.00$/, '.–')}`;
}

export interface Totaux {
  total: number;
  parMoyen: { moyen: MoyenPaiement; montant: number; nombre: number }[];
  nonPayes: number;
}

/** Montants encaissés (vols payés) par moyen de paiement, et nombre d'entrées à encaisser. */
export function totaux(vols: Vol[]): Totaux {
  const par = new Map<MoyenPaiement, { montant: number; nombre: number }>();
  let total = 0;
  for (const v of vols) {
    if (!estPaye(v)) continue;
    const montant = v.paiement!.montant ?? 0;
    total += montant;
    const moyen = v.paiement!.moyen ?? 'especes';
    const t = par.get(moyen) ?? { montant: 0, nombre: 0 };
    par.set(moyen, { montant: t.montant + montant, nombre: t.nombre + 1 });
  }
  return {
    total,
    parMoyen: MOYENS.filter((m) => par.has(m.id)).map((m) => ({ moyen: m.id, ...par.get(m.id)! })),
    nonPayes: vols.filter((v) => !estPaye(v)).length,
  };
}

/**
 * Montant proposé : prix par grand vol × nombre (ou prix d'une journée de pente école),
 * plus les navettes.
 */
export function montantPropose(v: Pick<Vol, 'type' | 'nombre' | 'navettes'>, t: Tarifs): number | undefined {
  const base = v.type === 'altitude' ? t.grandVol * v.nombre : t.penteEcole;
  const m = base + (v.navettes ?? 0) * (t.navette ?? 0);
  return m > 0 ? m : undefined;
}

/** Vols notés mais pas encore encaissés / validés par un moniteur. */
export const enAttente = (vols: Vol[]) => vols.filter((v) => !estPaye(v));

/** Prix d'un vol : montant encaissé s'il est payé, sinon montant proposé par les tarifs. */
export const prixVol = (v: Vol, t: Tarifs): number => v.paiement?.montant ?? montantPropose(v, t) ?? 0;

/** Total à payer pour des vols en attente. */
export const totalAPayer = (vols: Vol[], t: Tarifs): number =>
  enAttente(vols).reduce((s, v) => s + prixVol(v, t), 0);

/** Marque des vols comme payés et validés par le moniteur (encaissement groupé). */
export function encaisser(
  vols: Vol[],
  moyen: MoyenPaiement,
  moniteurId: string,
  date: string,
  t: Tarifs,
): Vol[] {
  return vols.map((v) => ({ ...v, paiement: { paye: true, montant: prixVol(v, t), moyen, moniteurId, date } }));
}

/** « Grand vol » ou « Pente école · 12 vols » (anciennes entrées groupées : « 3 × grand vol »). */
export function libelleVol(v: Pick<Vol, 'type' | 'nombre'>): string {
  if (v.type === 'altitude') return v.nombre > 1 ? `${v.nombre} × grand vol` : 'Grand vol';
  return `Pente école · ${v.nombre} vol${v.nombre > 1 ? 's' : ''}`;
}
