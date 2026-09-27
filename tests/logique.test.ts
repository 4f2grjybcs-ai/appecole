import { describe, expect, it } from 'vitest';
import { alertesEleve } from '../src/lib/alertes';
import { dateValide, donneesVides } from '../src/lib/defaults';
import { donneesDemo } from '../src/lib/demo';
import { TOUTES_COMPETENCES } from '../src/lib/fsvl';
import { calculerProgression, joursAvant } from '../src/lib/progress';
import type { Eleve, Site } from '../src/lib/types';
import { ecartAngulaire, evaluer, parserPrevision, pointCardinal, urlPrevision, type HeureMeteo } from '../src/lib/weather';
import { appliquer, retirer } from '../src/data/store';
import { REGLAGES_DEFAUT } from '../src/lib/defaults';

const eleve: Eleve = { id: 'e1', prenom: 'A', nom: 'B', dateDebut: '2026-01-01', examenTheorique: { branches: {} }, actif: true };
const site: Site = { id: 's', nom: 'S', lat: 46.7, lon: 7.8, altitude: 1300, orientations: ['S'] };
const calme: HeureMeteo = {
  time: '2026-09-28T10:00', temperature: 15, vent: 8, rafales: 12, direction: 180,
  ventAltitude: 10, directionAltitude: 200, precipitation: 0, nuages: 10, cape: 0,
};

describe('progression', () => {
  it('compte grands vols, sites et jours', () => {
    const vols = [
      { id: '1', eleveId: 'e1', date: '2026-02-01', siteId: 'a', type: 'altitude' as const, nombre: 2 },
      { id: '2', eleveId: 'e1', date: '2026-02-01', siteId: 'b', type: 'altitude' as const, nombre: 1 },
      { id: '3', eleveId: 'e1', date: '2026-02-02', type: 'pente' as const, nombre: 10 },
      { id: '4', eleveId: 'autre', date: '2026-02-03', siteId: 'c', type: 'altitude' as const, nombre: 5 },
    ];
    const p = calculerProgression(eleve, vols, [], { grandsVolsMin: 3, sitesDifferentsMin: 2, joursDeVolMin: 1 });
    expect(p.grandsVols).toBe(3);
    expect(p.volsPente).toBe(10);
    expect(p.criteres.slice(0, 3).every((c) => c.ok)).toBe(true);
    expect(p.pretExamenPratique).toBe(false);
  });

  it('est prêt quand tout est rempli', () => {
    const e = { ...eleve, examenTheorique: { branches: { aerodynamique: true, meteorologie: true, legislation: true, materiel: true, pratique: true } } };
    const validations = TOUTES_COMPETENCES.map((c) => ({ eleveId: 'e1', competenceId: c.id, niveau: 'acquis' as const, date: '2026-01-01' }));
    const vols = [{ id: '1', eleveId: 'e1', date: '2026-02-01', siteId: 'a', type: 'altitude' as const, nombre: 1 }];
    const p = calculerProgression(e, vols, validations, { grandsVolsMin: 1, sitesDifferentsMin: 1, joursDeVolMin: 1 });
    expect(p.pretExamenPratique).toBe(true);
    expect(p.pourcentage).toBe(1);
  });

  it('calcule les jours avant échéance', () => {
    expect(joursAvant('2026-10-07', new Date('2026-09-27T12:00:00Z'))).toBe(10);
    expect(joursAvant(undefined)).toBeUndefined();
  });

  it('signale les échéances proches ou dépassées', () => {
    const a = alertesEleve({ ...eleve, assuranceValidite: '2026-09-01', permisEleveValidite: '2026-10-10' }, new Date('2026-09-27T12:00:00Z'));
    expect(a.map((x) => x.niveau)).toEqual(['rouge', 'orange']);
  });
});

describe('météo', () => {
  it('angles et points cardinaux', () => {
    expect(ecartAngulaire(350, 10)).toBe(20);
    expect(pointCardinal(225)).toBe('SO');
    expect(pointCardinal(359)).toBe('N');
  });

  it('conditions calmes dans l’axe : favorable', () => {
    expect(evaluer(calme, site, REGLAGES_DEFAUT.seuils).verdict).toBe('favorable');
  });

  it('vent de dos : limite', () => {
    const r = evaluer({ ...calme, direction: 0 }, site, REGLAGES_DEFAUT.seuils);
    expect(r.verdict).toBe('limite');
    expect(r.motifs).toContain('Vent hors orientation');
  });

  it('rafales ou pluie : défavorable', () => {
    expect(evaluer({ ...calme, rafales: 40 }, site, REGLAGES_DEFAUT.seuils).verdict).toBe('defavorable');
    expect(evaluer({ ...calme, precipitation: 2 }, site, REGLAGES_DEFAUT.seuils).verdict).toBe('defavorable');
  });

  it('construit l’URL et lit la réponse Open-Meteo', () => {
    const url = new URL(urlPrevision(site));
    expect(url.searchParams.get('elevation')).toBe('1300');
    expect(url.searchParams.get('hourly')).toContain('wind_speed_850hPa');
    const h = parserPrevision({ hourly: { time: ['2026-09-28T10:00'], wind_speed_10m: [12], wind_gusts_10m: [null] } as never });
    expect(h[0].vent).toBe(12);
    expect(h[0].rafales).toBe(0);
  });
});

describe('données', () => {
  it('ajoute, remplace et retire des enregistrements', () => {
    let d = donneesVides();
    d = appliquer(d, 'validation', { eleveId: 'e1', competenceId: 'x', niveau: 'vu', date: '2026-01-01' });
    d = appliquer(d, 'validation', { eleveId: 'e1', competenceId: 'x', niveau: 'acquis', date: '2026-01-02' });
    expect(d.validations).toHaveLength(1);
    expect(d.validations[0].niveau).toBe('acquis');
    d = retirer(d, 'validation', 'e1:x');
    expect(d.validations).toHaveLength(0);
  });

  it('les données de démo sont cohérentes', () => {
    const d = donneesDemo();
    const sites = new Set(d.reglages.sites.map((s) => s.id));
    expect(d.vols.every((v) => !v.siteId || sites.has(v.siteId))).toBe(true);
    expect(d.vols.every((v) => d.eleves.some((e) => e.id === v.eleveId))).toBe(true);
  });

  it('valide les dates', () => {
    expect(dateValide('2026-02-28')).toBe(true);
    expect(dateValide('2026-02-30')).toBe(false);
    expect(dateValide('28.02.2026')).toBe(false);
  });
});
