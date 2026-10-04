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
  /** Commentaire libre du vol */
  remarques?: string;
  /** Exercices travaillés pendant ce vol (identifiants de compétences) */
  exercices?: string[];
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
  /** Liens et contenus intégrés de l'écran Météo, gérés par les moniteurs */
  meteoLiens: LienMeteo[];
}

/** Lien (bouton) ou contenu intégré (page, webcam, code <iframe>) de l'écran Météo. */
export interface LienMeteo {
  id: Id;
  titre: string;
  /** Adresse https://… ou code HTML d'intégration (<iframe …>) */
  contenu: string;
  affichage: 'lien' | 'integre';
  /** Hauteur du contenu intégré, en points */
  hauteur: number;
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
  /** Élèves du jour */
  journees: Journee[];
  /** Statut de chaque élève du jour (préparation, en vol, atterri) */
  statuts: StatutJour[];
  /** Messages de la discussion */
  messages: Message[];
  reglages: Reglages;
}

export type Canal = 'ecole' | 'moniteurs';

/** Message de la discussion : canal École (tout le monde) ou Moniteurs (moniteurs seulement). */
export interface Message {
  id: Id;
  canal: Canal;
  auteurId: Id;
  auteurRole: 'moniteur' | 'eleve';
  auteurNom: string;
  texte: string;
  /** Date et heure ISO */
  date: string;
}

/** Élèves du jour, choisis par le moniteur. */
export interface Journee {
  /** Identifiant = date (AAAA-MM-JJ) */
  id: string;
  date: string;
  eleveIds: Id[];
}

export type StatutEleve = 'preparation' | 'vol' | 'atterri';

/** Où en est un élève pendant la journée (vue d'ensemble pour les moniteurs). */
export interface StatutJour {
  /** Identifiant = date:élève */
  id: string;
  date: string;
  eleveId: Id;
  statut: StatutEleve;
  /** Exercice(s) du vol en cours */
  exercices: string[];
  /** Moment de la mise en vol (ms), pour trier dans l'ordre des décollages */
  ordre?: number;
}

export type Session =
  | { role: 'moniteur'; id: Id }
  | { role: 'eleve'; id: Id };
