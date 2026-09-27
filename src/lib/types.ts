export type Id = string;

export interface Moniteur {
  id: Id;
  prenom: string;
  nom: string;
  email?: string;
  tel?: string;
}

export interface ExamenTheorique {
  /** Branches réussies, par identifiant de branche (voir fsvl.ts) */
  branches: Record<string, boolean>;
  date?: string;
}

export interface Eleve {
  id: Id;
  prenom: string;
  nom: string;
  dateNaissance?: string;
  email?: string;
  tel?: string;
  numeroFSVL?: string;
  /** Date de fin de validité de l'assurance RC / accident */
  assuranceValidite?: string;
  /** Date d'échéance du permis d'élève / carnet de formation */
  permisEleveValidite?: string;
  dateDebut: string;
  moniteurRefId?: Id;
  notes?: string;
  examenTheorique: ExamenTheorique;
  examenPratique?: { date?: string; reussi: boolean };
  actif: boolean;
}

export type TypeVol = 'pente' | 'altitude';

export interface Vol {
  id: Id;
  eleveId: Id;
  date: string;
  siteId?: Id;
  type: TypeVol;
  /** Nombre de vols (utile pour les séries en pente école) */
  nombre: number;
  moniteurId?: Id;
  conditions?: string;
  remarques?: string;
}

export type NiveauCompetence = 'vu' | 'acquis';

export interface ValidationCompetence {
  eleveId: Id;
  competenceId: string;
  niveau: NiveauCompetence;
  moniteurId?: Id;
  date: string;
}

export type StatutSeance = 'prevue' | 'confirmee' | 'annulee';

export interface Seance {
  id: Id;
  date: string;
  heureDebut: string;
  heureFin: string;
  titre: string;
  siteId?: Id;
  moniteurId?: Id;
  eleveIds: Id[];
  statut: StatutSeance;
  note?: string;
}

export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface Site {
  id: Id;
  nom: string;
  lat: number;
  lon: number;
  altitude: number;
  /** Orientations de décollage (vent favorable) */
  orientations: Orientation[];
}

export interface SeuilsMeteo {
  ventMaxKmh: number;
  rafalesMaxKmh: number;
  ecartRafalesMaxKmh: number;
  ventAltitudeMaxKmh: number;
  /** Tolérance angulaire autour de l'orientation du décollage */
  toleranceDirectionDeg: number;
}

export interface Exigences {
  grandsVolsMin: number;
  sitesDifferentsMin: number;
  joursDeVolMin: number;
}

export interface Reglages {
  ecoleNom: string;
  sites: Site[];
  seuils: SeuilsMeteo;
  exigences: Exigences;
}

export interface AppData {
  version: 1;
  moniteurs: Moniteur[];
  eleves: Eleve[];
  vols: Vol[];
  validations: ValidationCompetence[];
  seances: Seance[];
  reglages: Reglages;
}

export type Session =
  | { role: 'moniteur'; id: Id }
  | { role: 'eleve'; id: Id };
