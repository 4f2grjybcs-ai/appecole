import type { AppData, Eleve, Journee, Moniteur, Reglages, Seance, StatutJour, ValidationCompetence, Vol } from '../lib/types';

/** Types d'enregistrements stockés, avec la clé de collection dans AppData. */
export type Kind = 'moniteur' | 'eleve' | 'vol' | 'validation' | 'seance' | 'journee' | 'statut' | 'reglages';

export interface RecordOf {
  moniteur: Moniteur;
  eleve: Eleve;
  vol: Vol;
  validation: ValidationCompetence;
  seance: Seance;
  journee: Journee;
  statut: StatutJour;
  reglages: Reglages;
}

export const COLLECTION = {
  moniteur: 'moniteurs',
  eleve: 'eleves',
  vol: 'vols',
  validation: 'validations',
  seance: 'seances',
  journee: 'journees',
  statut: 'statuts',
} as const;

export function idOf<K extends Kind>(kind: K, r: RecordOf[K]): string {
  if (kind === 'reglages') return 'reglages';
  if (kind === 'validation') {
    const v = r as ValidationCompetence;
    return `${v.eleveId}:${v.competenceId}`;
  }
  return (r as { id: string }).id;
}

/** Élève concerné par un enregistrement (pour les droits de lecture des élèves). */
export function eleveIdOf<K extends Kind>(kind: K, r: RecordOf[K]): string | null {
  if (kind === 'eleve') return (r as Eleve).id;
  if (kind === 'vol' || kind === 'validation' || kind === 'statut') return (r as Vol).eleveId;
  return null;
}

/** Applique une écriture à AppData, sans effet de bord. */
export function appliquer<K extends Kind>(data: AppData, kind: K, r: RecordOf[K]): AppData {
  if (kind === 'reglages') return { ...data, reglages: r as Reglages };
  const col = COLLECTION[kind as Exclude<Kind, 'reglages'>];
  const id = idOf(kind, r);
  const liste = data[col] as RecordOf[K][];
  const i = liste.findIndex((x) => idOf(kind, x) === id);
  const suivante = i >= 0 ? liste.map((x, j) => (j === i ? r : x)) : [...liste, r];
  return { ...data, [col]: suivante };
}

export function retirer(data: AppData, kind: Exclude<Kind, 'reglages'>, id: string): AppData {
  const col = COLLECTION[kind];
  const liste = data[col] as RecordOf[typeof kind][];
  return { ...data, [col]: liste.filter((x) => idOf(kind, x) !== id) };
}

export interface Store {
  charger(): Promise<AppData>;
  enregistrer<K extends Kind>(kind: K, r: RecordOf[K], donneesApres: AppData): Promise<void>;
  supprimer(kind: Exclude<Kind, 'reglages'>, id: string, donneesApres: AppData): Promise<void>;
}
