import type { Exigences } from './types';

/**
 * Référentiel de formation parapente selon les directives FSVL.
 *
 * ⚠️ Les valeurs ci-dessous sont des valeurs par défaut destinées à être
 * vérifiées par l'école avec le règlement de formation FSVL en vigueur.
 * Les exigences chiffrées sont modifiables dans Réglages.
 */

export interface Competence {
  id: string;
  libelle: string;
}

export interface Etape {
  id: string;
  titre: string;
  competences: Competence[];
}

export const ETAPES: Etape[] = [
  {
    id: 'sol',
    titre: '1. Pente école – maîtrise au sol',
    competences: [
      { id: 'prevol', libelle: 'Préparation du matériel et visite prévol' },
      { id: 'check', libelle: 'Check avant décollage (5 points)' },
      { id: 'gonflage-face', libelle: 'Gonflage face voile' },
      { id: 'gonflage-dos', libelle: 'Gonflage dos voile' },
      { id: 'controle-sol', libelle: 'Contrôle de la voile au sol' },
      { id: 'analyse-vent', libelle: 'Analyse du vent et du terrain' },
    ],
  },
  {
    id: 'pente',
    titre: '2. Pente école – premiers vols',
    competences: [
      { id: 'decollage', libelle: 'Décollage autonome' },
      { id: 'vol-droit', libelle: 'Vol droit, contrôle de la vitesse' },
      { id: 'virages-pente', libelle: 'Changements de direction' },
      { id: 'atterrissage', libelle: 'Atterrissage en ligne droite' },
    ],
  },
  {
    id: 'altitude',
    titre: '3. Grands vols',
    competences: [
      { id: 'plan-vol', libelle: 'Plan de vol et observation de l’atterrissage' },
      { id: 'virages', libelle: 'Virages coordonnés, enchaînements' },
      { id: 'tangage-roulis', libelle: 'Maîtrise du tangage et du roulis' },
      { id: 'oreilles', libelle: 'Grandes oreilles' },
      { id: 'accelerateur', libelle: 'Utilisation de l’accélérateur' },
      { id: 'approche', libelle: 'Approche en U / en 8' },
      { id: 'precision', libelle: 'Atterrissage de précision' },
      { id: 'fermeture', libelle: 'Réaction à une fermeture asymétrique' },
      { id: 'secours', libelle: 'Procédure du parachute de secours' },
      { id: 'regles-air', libelle: 'Règles de l’air, espaces aériens, priorités' },
    ],
  },
  {
    id: 'autonomie',
    titre: '4. Autonomie et préparation à l’examen',
    competences: [
      { id: 'vent-fort', libelle: 'Décollage par vent soutenu' },
      { id: 'vent-faible', libelle: 'Décollage par vent faible / nul' },
      { id: 'nouveau-site', libelle: 'Vol sur un site inconnu' },
      { id: 'decision', libelle: 'Décision autonome de vol / non-vol' },
      { id: 'thermique', libelle: 'Initiation au vol thermique' },
    ],
  },
];

export const TOUTES_COMPETENCES: Competence[] = ETAPES.flatMap((e) => e.competences);

/** Branches de l'examen théorique suisse */
export const BRANCHES_THEORIE = [
  { id: 'aerodynamique', libelle: 'Aérodynamique' },
  { id: 'meteorologie', libelle: 'Météorologie' },
  { id: 'legislation', libelle: 'Législation aérienne' },
  { id: 'materiel', libelle: 'Connaissance du matériel' },
  { id: 'pratique', libelle: 'Pratique du vol' },
];

export const EXIGENCES_DEFAUT: Exigences = {
  grandsVolsMin: 40,
  sitesDifferentsMin: 5,
  joursDeVolMin: 10,
};
