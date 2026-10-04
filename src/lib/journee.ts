import type { AppData, Eleve, Id, Journee, StatutEleve, StatutJour } from './types';

export const idStatut = (date: string, eleveId: Id) => `${date}:${eleveId}`;

export const STATUTS: { id: StatutEleve; libelle: string }[] = [
  { id: 'preparation', libelle: 'En préparation' },
  { id: 'vol', libelle: 'En vol' },
  { id: 'atterri', libelle: 'Atterri' },
];

export interface EtatEleve {
  eleve: Eleve;
  statut: StatutEleve;
  exercices: string[];
  ordre?: number;
}

/** Statut de chaque élève du jour (« en préparation » par défaut). */
export function etatsDuJour(data: AppData, journee: Journee): EtatEleve[] {
  return journee.eleveIds
    .map((id) => data.eleves.find((e) => e.id === id))
    .filter((e): e is Eleve => !!e)
    .map((eleve) => {
      const s = data.statuts.find((x) => x.id === idStatut(journee.date, eleve.id));
      return { eleve, statut: s?.statut ?? 'preparation', exercices: s?.exercices ?? [], ordre: s?.ordre };
    });
}

/** Ordre des décollages : le premier parti en haut, le dernier décollé en bas. */
export const parOrdreDeDecollage = (a: EtatEleve, b: EtatEleve) => (a.ordre ?? 0) - (b.ordre ?? 0);

/** Nouveau statut d'un élève ; la mise en vol fixe sa place dans l'ordre des décollages. */
export function changerStatut(date: string, e: EtatEleve, statut: StatutEleve, exercices: string[], maintenant = Date.now()): StatutJour {
  const ordre = statut === 'vol' ? maintenant : statut === 'atterri' ? e.ordre : undefined;
  return { ...nouveauStatut(date, e.eleve.id, statut, exercices), ...(ordre !== undefined && { ordre }) };
}

export function nouveauStatut(date: string, eleveId: Id, statut: StatutEleve, exercices: string[] = []): StatutJour {
  return { id: idStatut(date, eleveId), date, eleveId, statut, exercices };
}

/** Élèves inscrits aux séances (non annulées) du jour, pour pré-remplir la liste. */
export function elevesDesSeances(data: AppData, date: string): Id[] {
  return [...new Set(data.seances.filter((s) => s.date === date && s.statut !== 'annulee').flatMap((s) => s.eleveIds))];
}
