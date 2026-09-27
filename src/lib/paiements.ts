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

/** Montant proposé : prix par grand vol × nombre, ou prix d'une journée de pente école. */
export function montantPropose(v: Pick<Vol, 'type' | 'nombre'>, t: Tarifs): number | undefined {
  const m = v.type === 'altitude' ? t.grandVol * v.nombre : t.penteEcole;
  return m > 0 ? m : undefined;
}
