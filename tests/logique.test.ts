import { describe, expect, it } from 'vitest';
import { alertesEleve } from '../src/lib/alertes';
import { carnetHtml, volsDuCarnet } from '../src/lib/carnet';
import { dateValide, donneesVides, normaliser } from '../src/lib/defaults';
import { donneesDemo } from '../src/lib/demo';
import { ETAPES, libellesExercices, TOUTES_COMPETENCES } from '../src/lib/fsvl';
import { calculerProgression, joursAvant } from '../src/lib/progress';
import type { Eleve, Site } from '../src/lib/types';
import { ecartAngulaire, evaluer, parserPrevision, pointCardinal, urlPrevision, type HeureMeteo } from '../src/lib/weather';
import { appliquer, retirer } from '../src/data/store';
import { estHtml, LIENS_METEO_DEFAUT, verifierLien } from '../src/lib/meteoLiens';
import { changerStatut, etatsDuJour, parOrdreDeDecollage } from '../src/lib/journee';
import { encaisser, formatCHF, montantPropose, totalAPayer, totaux } from '../src/lib/paiements';
import { REGLAGES_DEFAUT } from '../src/lib/defaults';

const eleve: Eleve = { id: 'e1', prenom: 'A', nom: 'B', dateDebut: '2026-01-01', examenTheorique: { branches: {} }, actif: true };
const site: Site = { id: 's', type: 'decollage', nom: 'S', lat: 46.7, lon: 7.8, altitude: 1300, orientations: ['S'] };
const P = { paiement: { paye: true, montant: 0, moyen: 'especes' as const } };
const calme: HeureMeteo = {
  time: '2026-09-28T10:00', temperature: 15, vent: 8, rafales: 12, direction: 180,
  ventAltitude: 10, directionAltitude: 200, precipitation: 0, nuages: 10, cape: 0,
};

describe('progression', () => {
  it('compte les vols validés uniquement (le vol non encaissé est ignoré)', () => {
    const vols = [
      { id: '1', eleveId: 'e1', date: '2026-02-01', decollageId: 'a', type: 'altitude' as const, nombre: 2, ...P },
      { id: '2', eleveId: 'e1', date: '2026-02-01', decollageId: 'b', type: 'altitude' as const, nombre: 1, ...P },
      { id: '3', eleveId: 'e1', date: '2026-02-02', type: 'pente' as const, nombre: 10, ...P },
      { id: '5', eleveId: 'e1', date: '2026-02-04', decollageId: 'z', type: 'altitude' as const, nombre: 7 },
      { id: '4', eleveId: 'autre', date: '2026-02-03', decollageId: 'c', type: 'altitude' as const, nombre: 5, ...P },
    ];
    const p = calculerProgression(eleve, vols, [], { grandsVolsMin: 3, sitesDifferentsMin: 2 }, ETAPES);
    expect(p.grandsVols).toBe(3);
    expect(p.volsPente).toBe(10);
    expect(p.criteres.map((c) => c.libelle)).toEqual(['Grands vols', 'Sites différents', 'Compétences acquises']);
    expect(p.criteres.slice(0, 2).every((c) => c.ok)).toBe(true);
    expect(p.pretExamenPratique).toBe(false);
  });

  it('est prêt quand tout est rempli', () => {
    const validations = TOUTES_COMPETENCES.map((c) => ({ eleveId: 'e1', competenceId: c.id, niveau: 'acquis' as const, date: '2026-01-01' }));
    const vols = [
      { id: '1', eleveId: 'e1', date: '2026-02-01', decollageId: 'a', type: 'altitude' as const, nombre: 1, ...P },
      { id: '2', eleveId: 'e1', date: '2026-01-20', type: 'pente' as const, nombre: 5, ...P },
    ];
    const p = calculerProgression(eleve, vols, validations, { grandsVolsMin: 1, sitesDifferentsMin: 1 }, ETAPES);
    expect(p.pretExamenPratique).toBe(true);
    expect(p.pourcentage).toBe(1);
  });

  it('calcule les jours avant échéance', () => {
    expect(joursAvant('2026-10-07', new Date('2026-09-27T12:00:00Z'))).toBe(10);
    expect(joursAvant(undefined)).toBeUndefined();
  });

  it('signale les échéances proches ou dépassées', () => {
    const ajd = new Date('2026-09-27T12:00:00Z');
    expect(alertesEleve({ ...eleve, permisEleveValidite: '2026-09-01' }, ajd).map((x) => x.niveau)).toEqual(['rouge']);
    expect(alertesEleve({ ...eleve, permisEleveValidite: '2026-10-10' }, ajd).map((x) => x.niveau)).toEqual(['orange']);
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
    const type = (id?: string) => d.reglages.sites.find((s) => s.id === id)?.type;
    expect(d.vols.every((v) => type(v.decollageId) === 'decollage' && type(v.atterrissageId) === 'atterrissage')).toBe(true);
    expect(d.reglages.sites.every((s) => (s.atterrissageIds ?? []).every((a) => type(a) === 'atterrissage'))).toBe(true);
    expect(sites.size).toBe(d.reglages.sites.length);
    expect(d.vols.every((v) => d.eleves.some((e) => e.id === v.eleveId))).toBe(true);
  });

  it('valide les dates', () => {
    expect(dateValide('2026-02-28')).toBe(true);
    expect(dateValide('2026-02-30')).toBe(false);
    expect(dateValide('28.02.2026')).toBe(false);
  });

  it('migre l’ancien site d’un vol vers son décollage', () => {
    const ancien = { ...donneesVides(), vols: [{ id: 'v', eleveId: 'e', date: '2026-01-01', type: 'altitude', nombre: 1, siteId: 'x' }] } as never;
    const d = normaliser(ancien);
    expect(d.vols[0].decollageId).toBe('x');
    expect('siteId' in d.vols[0]).toBe(false);
  });

  it('un atterrissage n’impose pas d’orientation', () => {
    const att: Site = { ...site, type: 'atterrissage', orientations: [] };
    expect(evaluer({ ...calme, direction: 0 }, att, REGLAGES_DEFAUT.seuils).verdict).toBe('favorable');
  });

  it('compte les compétences de la liste modifiée par l’école', () => {
    const etapes = [{ id: 'x', titre: 'Mon étape', competences: [{ id: 'k1', libelle: 'A' }, { id: 'k2', libelle: 'B' }] }];
    const validations = [
      { eleveId: 'e1', competenceId: 'k1', niveau: 'acquis' as const, date: '2026-01-01' },
      { eleveId: 'e1', competenceId: 'supprimee', niveau: 'acquis' as const, date: '2026-01-01' },
    ];
    const p = calculerProgression(eleve, [], validations, { grandsVolsMin: 0, sitesDifferentsMin: 0 }, etapes);
    expect(p.criteres[2]).toMatchObject({ actuel: 1, requis: 2 });
  });

  it('complète les réglages anciens (compétences, exigences) et retire l’assurance', () => {
    const ancien = {
      ...donneesVides(),
      eleves: [{ ...eleve, assuranceValidite: '2026-01-01' }],
      reglages: { ...donneesVides().reglages, etapes: undefined, exigences: { grandsVolsMin: 12, sitesDifferentsMin: 3, joursDeVolMin: 4 } },
    } as never;
    const d = normaliser(ancien);
    expect(d.reglages.etapes).toBe(ETAPES);
    expect(d.reglages.exigences.grandsVolsMin).toBe(12);
    expect(d.reglages.exigences).toEqual({ grandsVolsMin: 12, sitesDifferentsMin: 3 });
    expect('assuranceValidite' in d.eleves[0]).toBe(false);
  });
});

describe('paiements', () => {
  const vol = (id: string, paiement?: object) =>
    ({ id, eleveId: 'e1', date: '2026-09-27', type: 'altitude', nombre: 1, paiement }) as never;

  it('totalise les montants encaissés par moyen', () => {
    const t = totaux([
      vol('1', { paye: true, montant: 45, moyen: 'twint' }),
      vol('2', { paye: true, montant: 45, moyen: 'twint' }),
      vol('3', { paye: true, montant: 180, moyen: 'especes' }),
      vol('4'),
    ]);
    expect(t.total).toBe(270);
    expect(t.nonPayes).toBe(1);
    expect(t.parMoyen).toEqual([
      { moyen: 'especes', montant: 180, nombre: 1 },
      { moyen: 'twint', montant: 90, nombre: 2 },
    ]);
  });

  it('propose un montant selon les tarifs', () => {
    const tarifs = { grandVol: 45, penteEcole: 180, navette: 10 };
    expect(montantPropose({ type: 'altitude', nombre: 2 }, tarifs)).toBe(90);
    expect(montantPropose({ type: 'pente', nombre: 8 }, tarifs)).toBe(180);
    expect(montantPropose({ type: 'altitude', nombre: 1 }, { grandVol: 0, penteEcole: 0, navette: 0 })).toBeUndefined();
    expect(montantPropose({ type: 'altitude', nombre: 2, navettes: 2 }, tarifs)).toBe(110);
    expect(montantPropose({ type: 'pente', nombre: 8, navettes: 1 }, tarifs)).toBe(190);
  });

  it('formate les francs suisses', () => {
    expect(formatCHF(50)).toBe('CHF 50.–');
    expect(formatCHF(42.5)).toBe('CHF 42.50');
  });

  it('calcule le total à payer et valide les vols en une fois', () => {
    const tarifs = { grandVol: 45, penteEcole: 180, navette: 10 };
    const vols = [
      { id: 'a', eleveId: 'e1', date: '2026-09-27', type: 'altitude', nombre: 2 },
      { id: 'b', eleveId: 'e1', date: '2026-09-27', type: 'pente', nombre: 6 },
      { id: 'c', eleveId: 'e1', date: '2026-09-20', type: 'altitude', nombre: 1, paiement: { paye: true, montant: 45 } },
    ] as never[];
    expect(totalAPayer(vols, tarifs)).toBe(270);
    const valides = encaisser(vols.slice(0, 2), 'twint', 'm1', '2026-09-27', tarifs);
    expect(valides.map((v) => v.paiement)).toEqual([
      { paye: true, montant: 90, moyen: 'twint', moniteurId: 'm1', date: '2026-09-27' },
      { paye: true, montant: 180, moyen: 'twint', moniteurId: 'm1', date: '2026-09-27' },
    ]);
    expect(totalAPayer(valides, tarifs)).toBe(0);
  });
});

describe('carnet PDF', () => {
  it('ne contient que les vols validés, dans l’ordre, avec échappement du texte', () => {
    const d = donneesDemo();
    d.vols.push({ id: 'x', eleveId: 'e-lea', date: '2020-01-01', type: 'altitude', nombre: 1, remarques: '<script>alert(1)</script>' });
    const lea = d.eleves.find((e) => e.id === 'e-lea')!;
    const carnet = volsDuCarnet('e-lea', d.vols);
    expect(carnet.every((v) => v.paiement?.paye)).toBe(true);
    expect(carnet.map((v) => v.date)).toEqual([...carnet.map((v) => v.date)].sort());
    const html = carnetHtml({ ...lea, nom: 'D<b>' }, d, '2026-09-27');
    expect(html).toContain('Carnet de vol');
    expect(html).toContain('D&lt;b&gt;');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('Signature du moniteur');
    expect((html.match(/<tr>\s*<td class="num">/g) ?? []).length).toBe(carnet.length);
  });

  it('affiche les exercices et le commentaire de chaque vol', () => {
    const d = donneesDemo();
    for (const v of d.vols) v.paiement ??= { paye: true, montant: 0, moyen: 'twint' };
    const html = carnetHtml(d.eleves[0], d, '2026-09-27');
    expect(html).toContain('Grandes oreilles, Approche en U / en 8<br>Oreilles tenues 30 s');
    expect(libellesExercices(['oreilles', 'inconnue'], ETAPES)).toEqual(['Grandes oreilles']);
  });
});

describe('journée de vol', () => {
  it('suit le statut des élèves dans l’ordre des décollages', () => {
    let d = donneesVides();
    const date = '2026-10-04';
    for (const id of ['a', 'b', 'c']) d = appliquer(d, 'eleve', { ...eleve, id, prenom: id });
    d = appliquer(d, 'journee', { id: date, date, eleveIds: ['a', 'b', 'c'] });
    const etat = (id: string) => etatsDuJour(d, d.journees[0]).find((e) => e.eleve.id === id)!;

    expect(etatsDuJour(d, d.journees[0]).every((e) => e.statut === 'preparation')).toBe(true);
    d = appliquer(d, 'statut', changerStatut(date, etat('c'), 'vol', ['oreilles'], 100));
    d = appliquer(d, 'statut', changerStatut(date, etat('a'), 'vol', [], 200));
    const enVol = etatsDuJour(d, d.journees[0]).filter((e) => e.statut === 'vol').sort(parOrdreDeDecollage);
    expect(enVol.map((e) => e.eleve.id)).toEqual(['c', 'a']);

    d = appliquer(d, 'statut', changerStatut(date, etat('c'), 'atterri', etat('c').exercices, 300));
    expect(etat('c')).toMatchObject({ statut: 'atterri', ordre: 100, exercices: ['oreilles'] });
    d = appliquer(d, 'statut', changerStatut(date, etat('c'), 'preparation', [], 400));
    expect(etat('c').ordre).toBeUndefined();
    expect(d.statuts).toHaveLength(2);
  });
});

describe('liens météo', () => {
  it('vérifie adresses et codes d’intégration', () => {
    expect(verifierLien({ titre: 'Windy', contenu: 'https://embed.windy.com/embed.html', affichage: 'integre' })).toBeNull();
    expect(verifierLien({ titre: 'Code', contenu: '<iframe src="https://x"></iframe>', affichage: 'integre' })).toBeNull();
    expect(verifierLien({ titre: 'Code', contenu: '<iframe></iframe>', affichage: 'lien' })).toMatch(/dans l’app/);
    expect(verifierLien({ titre: 'X', contenu: 'meteo.ch', affichage: 'lien' })).toMatch(/https/);
    expect(verifierLien({ titre: '', contenu: 'https://a.ch', affichage: 'lien' })).toMatch(/titre/);
    expect(estHtml('  <iframe>')).toBe(true);
  });

  it('ajoute les liens par défaut aux anciens réglages', () => {
    const d = normaliser({ ...donneesVides(), reglages: { ...donneesVides().reglages, meteoLiens: undefined } } as never);
    expect(d.reglages.meteoLiens).toBe(LIENS_METEO_DEFAUT);
  });
});
