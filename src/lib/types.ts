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

export type MoyenPaiement = 'especes' | 'twint' | 'carte' | 'virement' | 'abonnement';

/** Renseigné par le moniteur du jour */
export interface Paiement {
  paye: boolean;
  /** Montant en CHF */
  montant?: number;
  moyen?: MoyenPaiement;
  moniteurId?: Id;
  date?: string;
}

export interface Vol {
  id: Id;
  eleveId: Id;
  date: string;
  decollageId?: Id;
  atterrissageId?: Id;
  type: TypeVol;
  /** Nombre de vols (utile pour les séries en pente école) */
  nombre: number;
  /** Nombre de navettes (montées en véhicule) utilisées */
  navettes?: number;
  moniteurId?: Id;
  conditions?: string;
  remarques?: string;
  /** Qui a noté le vol */
  saisiPar?: 'eleve' | 'moniteur';
  paiement?: Paiement;
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
  decollageId?: Id;
  atterrissageId?: Id;
  moniteurId?: Id;
  eleveIds: Id[];
  statut: StatutSeance;
  note?: string;
}

export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type TypeSite = 'decollage' | 'atterrissage';

export interface Site {
  id: Id;
  type: TypeSite;
  nom: string;
  lat: number;
  lon: number;
  altitude: number;
  /** Orientations du décollage (vent favorable). Vide pour un atterrissage. */
  orientations: Orientation[];
  /** Atterrissages habituels d'un décollage (pré-remplis lors de la saisie d'un vol) */
  atterrissageIds?: Id[];
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
  /** Décollages différents en grands vols */
  sitesDifferentsMin: number;
}

export interface Competence {
  id: string;
  libelle: string;
}

/** Groupe de compétences (ex. « Pente école », « Grands vols »), modifiable par les moniteurs */
export interface Etape {
  id: string;
  titre: string;
  competences: Competence[];
}

export interface Reglages {
  ecoleNom: string;
  sites: Site[];
  seuils: SeuilsMeteo;
  exigences: Exigences;
  /** Liste des compétences de l'école */
  etapes: Etape[];
  /** Tarifs proposés par défaut lors de l'encaissement (CHF) */
  tarifs: Tarifs;
}

export interface Tarifs {
  /** Prix d'un grand vol */
  grandVol: number;
  /** Prix d'une journée de pente école */
  penteEcole: number;
  /** Prix d'une navette */
  navette: number;
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
