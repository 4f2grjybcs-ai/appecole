import { formatDate } from './defaults';
import { joursAvant } from './progress';
import type { Eleve } from './types';

export interface AlerteEcheance {
  texte: string;
  niveau: 'orange' | 'rouge';
}

/** Échéances administratives à surveiller (dépassées ou dans les 30 jours). */
export function alertesEleve(e: Eleve, aujourdhui = new Date()): AlerteEcheance[] {
  const r: AlerteEcheance[] = [];
  const verifier = (libelle: string, date?: string) => {
    const j = joursAvant(date, aujourdhui);
    if (j === undefined) return;
    if (j < 0) r.push({ texte: `${libelle} expirée le ${formatDate(date)}`, niveau: 'rouge' });
    else if (j <= 30) r.push({ texte: `${libelle} expire dans ${j} j (${formatDate(date)})`, niveau: 'orange' });
  };
  verifier('Assurance', e.assuranceValidite);
  verifier('Autorisation d’élève', e.permisEleveValidite);
  return r;
}
