import { REGLAGES_DEFAUT } from './defaults';
import { TOUTES_COMPETENCES } from './fsvl';
import type { AppData, ValidationCompetence, Vol } from './types';

function jour(decalage: number): string {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  return d.toISOString().slice(0, 10);
}

/** Jeu de données fictif pour essayer l'application. */
export function donneesDemo(): AppData {
  const vols: Vol[] = [];
  const sites = ['amisbuehl', 'niesen', 'grimmialp'];
  for (let i = 0; i < 18; i++) {
    vols.push({
      id: `v-lea-${i}`,
      eleveId: 'e-lea',
      date: jour(-60 + i * 3),
      siteId: sites[i % 3],
      type: 'altitude',
      nombre: 1,
      moniteurId: 'm-marc',
    });
  }
  vols.push(
    { id: 'v-lea-p', eleveId: 'e-lea', date: jour(-70), siteId: 'pente', type: 'pente', nombre: 25, moniteurId: 'm-marc' },
    { id: 'v-tom-p', eleveId: 'e-tom', date: jour(-5), siteId: 'pente', type: 'pente', nombre: 12, moniteurId: 'm-anna' },
  );

  const validations: ValidationCompetence[] = TOUTES_COMPETENCES.slice(0, 14).map((c, i) => ({
    eleveId: 'e-lea',
    competenceId: c.id,
    niveau: i < 11 ? 'acquis' : 'vu',
    moniteurId: 'm-marc',
    date: jour(-30),
  }));
  validations.push(
    { eleveId: 'e-tom', competenceId: 'prevol', niveau: 'acquis', moniteurId: 'm-anna', date: jour(-5) },
    { eleveId: 'e-tom', competenceId: 'gonflage-face', niveau: 'vu', moniteurId: 'm-anna', date: jour(-5) },
  );

  return {
    version: 1,
    moniteurs: [
      { id: 'm-marc', prenom: 'Marc', nom: 'Exemple', tel: '079 000 00 00' },
      { id: 'm-anna', prenom: 'Anna', nom: 'Exemple' },
    ],
    eleves: [
      {
        id: 'e-lea', prenom: 'Léa', nom: 'Démo', dateDebut: jour(-75), moniteurRefId: 'm-marc',
        numeroFSVL: '00000', assuranceValidite: jour(20), permisEleveValidite: jour(300),
        examenTheorique: { branches: { aerodynamique: true, meteorologie: true, legislation: true } },
        actif: true,
      },
      {
        id: 'e-tom', prenom: 'Tom', nom: 'Démo', dateDebut: jour(-5), moniteurRefId: 'm-anna',
        assuranceValidite: jour(200), examenTheorique: { branches: {} }, actif: true,
      },
    ],
    vols,
    validations,
    seances: [
      {
        id: 's1', date: jour(1), heureDebut: '08:30', heureFin: '12:00', titre: 'Grands vols',
        siteId: 'amisbuehl', moniteurId: 'm-marc', eleveIds: ['e-lea'], statut: 'confirmee',
      },
      {
        id: 's2', date: jour(2), heureDebut: '09:00', heureFin: '16:00', titre: 'Pente école',
        siteId: 'pente', moniteurId: 'm-anna', eleveIds: ['e-tom'], statut: 'prevue',
      },
    ],
    reglages: {
      ...REGLAGES_DEFAUT,
      ecoleNom: 'École de démonstration',
      sites: [
        { id: 'amisbuehl', nom: 'Amisbühl (Beatenberg)', lat: 46.6978, lon: 7.8008, altitude: 1350, orientations: ['S', 'SE', 'SW'] },
        { id: 'niesen', nom: 'Niesen', lat: 46.6451, lon: 7.6512, altitude: 2330, orientations: ['E', 'SE'] },
        { id: 'grimmialp', nom: 'Grimmialp', lat: 46.6116, lon: 7.5575, altitude: 1650, orientations: ['N', 'NE'] },
        { id: 'pente', nom: 'Pente école (exemple)', lat: 46.686, lon: 7.855, altitude: 600, orientations: ['W', 'NW'] },
      ],
    },
  };
}
