import { toutesCompetences } from './fsvl';
import type { Eleve, Etape, Exigences, Id, ValidationCompetence, Vol } from './types';

export interface Critere {
  libelle: string;
  actuel: number;
  requis: number;
  ok: boolean;
}

export interface Progression {
  grandsVols: number;
  volsPente: number;
  criteres: Critere[];
  /** 0..1 */
  pourcentage: number;
  pretExamenPratique: boolean;
}

export function niveauCompetence(
  validations: ValidationCompetence[],
  eleveId: Id,
  competenceId: string,
) {
  return validations.find((v) => v.eleveId === eleveId && v.competenceId === competenceId)?.niveau;
}

export function calculerProgression(
  eleve: Eleve,
  vols: Vol[],
  validations: ValidationCompetence[],
  exigences: Exigences,
  etapes: Etape[],
): Progression {
  const siens = vols.filter((v) => v.eleveId === eleve.id);
  const altitude = siens.filter((v) => v.type === 'altitude');
  const grandsVols = altitude.reduce((s, v) => s + v.nombre, 0);
  const volsPente = siens.filter((v) => v.type === 'pente').reduce((s, v) => s + v.nombre, 0);
  const decollages = new Set(altitude.map((v) => v.decollageId).filter(Boolean)).size;
  const competences = toutesCompetences(etapes);
  const acquises = competences.filter(
    (c) => niveauCompetence(validations, eleve.id, c.id) === 'acquis',
  ).length;

  const critere = (libelle: string, actuel: number, requis: number): Critere => ({
    libelle,
    actuel,
    requis,
    ok: actuel >= requis,
  });

  const criteres = [
    critere('Pente école', volsPente, exigences.volsPenteMin),
    critere('Grands vols', grandsVols, exigences.grandsVolsMin),
    critere('Sites différents', decollages, exigences.sitesDifferentsMin),
    critere('Compétences acquises', acquises, competences.length),
  ];

  const pourcentage =
    criteres.reduce((s, c) => s + (c.requis > 0 ? Math.min(c.actuel / c.requis, 1) : 1), 0) /
    criteres.length;

  return {
    grandsVols,
    volsPente,
    criteres,
    pourcentage,
    pretExamenPratique: criteres.every((c) => c.ok),
  };
}

/** Jours restants avant une échéance (négatif si dépassée), undefined si pas de date */
export function joursAvant(date: string | undefined, aujourdhui = new Date()): number | undefined {
  if (!date) return undefined;
  const d = new Date(date + 'T00:00:00');
  const t = new Date(aujourdhui.toISOString().slice(0, 10) + 'T00:00:00');
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}
