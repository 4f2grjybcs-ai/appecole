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
  const trajets = [
    ['amisbuehl', 'hoehematte'],
    ['niesen', 'wimmis'],
    ['grimmialp', 'grimmialp-att'],
  ];
  for (let i = 0; i < 18; i++) {
    vols.push({
      id: `v-lea-${i}`,
      eleveId: 'e-lea',
      date: jour(-60 + i * 3),
      decollageId: trajets[i % 3][0],
      atterrissageId: trajets[i % 3][1],
      type: 'altitude',
      nombre: 1,
      moniteurId: 'm-marc',
      saisiPar: i % 2 ? 'eleve' : 'moniteur',
      // Les deux derniers vols ne sont pas encore payés
      paiement: i < 16 ? { paye: true, montant: 45, moyen: i % 3 ? 'twint' : 'especes', moniteurId: 'm-marc', date: jour(-60 + i * 3) } : undefined,
    });
  }
  vols.push(
    { id: 'v-lea-p', eleveId: 'e-lea', date: jour(-70), decollageId: 'pente', atterrissageId: 'pente-bas', type: 'pente', nombre: 25, moniteurId: 'm-marc', saisiPar: 'moniteur', paiement: { paye: true, montant: 180, moyen: 'carte', moniteurId: 'm-marc', date: jour(-70) } },
    { id: 'v-tom-p', eleveId: 'e-tom', date: jour(-5), decollageId: 'pente', atterrissageId: 'pente-bas', type: 'pente', nombre: 12, moniteurId: 'm-anna', saisiPar: 'eleve' },
    { id: 'v-lea-ajd', eleveId: 'e-lea', date: jour(0), decollageId: 'amisbuehl', atterrissageId: 'hoehematte', type: 'altitude', nombre: 1, navettes: 1, moniteurId: 'm-marc', saisiPar: 'eleve', exercices: ['oreilles', 'approche'], remarques: 'Oreilles tenues 30 s, approche en U un peu longue.' },
    { id: 'v-lea-ajd1', eleveId: 'e-lea', date: jour(0), decollageId: 'amisbuehl', atterrissageId: 'hoehematte', type: 'altitude', nombre: 1, navettes: 1, moniteurId: 'm-marc', saisiPar: 'eleve', exercices: ['accelerateur', 'precision'], remarques: 'Posé à 5 m de la cible.' },
    { id: 'v-lea-ajd2', eleveId: 'e-lea', date: jour(0), decollageId: 'niesen', atterrissageId: 'wimmis', type: 'altitude', nombre: 1, navettes: 1, moniteurId: 'm-marc', saisiPar: 'eleve', exercices: ['virages'], remarques: 'Vol calme, virages en 8 au-dessus de l’atterrissage.' },
    { id: 'v-tom-ajd', eleveId: 'e-tom', date: jour(0), decollageId: 'pente', atterrissageId: 'pente-bas', type: 'pente', nombre: 8, moniteurId: 'm-marc', saisiPar: 'moniteur', paiement: { paye: true, montant: 180, moyen: 'twint', moniteurId: 'm-marc', date: jour(0) } },
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
        numeroFSVL: '00000', permisEleveValidite: jour(20),
        examenTheorique: { branches: { aerodynamique: true, meteorologie: true, legislation: true } },
        actif: true,
      },
      {
        id: 'e-tom', prenom: 'Tom', nom: 'Démo', dateDebut: jour(-5), moniteurRefId: 'm-anna',
        examenTheorique: { branches: {} }, actif: true,
      },
      {
        id: 'e-nina', prenom: 'Nina', nom: 'Démo', dateDebut: jour(-40), moniteurRefId: 'm-anna',
        examenTheorique: { branches: {} }, actif: true,
      },
    ],
    vols,
    validations,
    journees: [{ id: jour(0), date: jour(0), eleveIds: ['e-lea', 'e-tom', 'e-nina'] }],
    statuts: [
      { id: `${jour(0)}:e-lea`, date: jour(0), eleveId: 'e-lea', statut: 'vol', exercices: ['oreilles'], ordre: 1 },
      { id: `${jour(0)}:e-nina`, date: jour(0), eleveId: 'e-nina', statut: 'vol', exercices: ['virages', 'approche'], ordre: 2 },
    ],
    seances: [
      {
        id: 's1', date: jour(1), heureDebut: '08:30', heureFin: '12:00', titre: 'Grands vols',
        decollageId: 'amisbuehl', atterrissageId: 'hoehematte', moniteurId: 'm-marc', eleveIds: ['e-lea'], statut: 'confirmee',
      },
      {
        id: 's2', date: jour(2), heureDebut: '09:00', heureFin: '16:00', titre: 'Pente école',
        decollageId: 'pente', atterrissageId: 'pente-bas', moniteurId: 'm-anna', eleveIds: ['e-tom'], statut: 'prevue',
      },
    ],
    reglages: {
      ...REGLAGES_DEFAUT,
      ecoleNom: 'École de démonstration',
      tarifs: { grandVol: 45, penteEcole: 180, navette: 10 },
      sites: [
        { id: 'amisbuehl', type: 'decollage', nom: 'Amisbühl (Beatenberg)', lat: 46.6978, lon: 7.8008, altitude: 1350, orientations: ['S', 'SE', 'SW'], atterrissageIds: ['hoehematte'] },
        { id: 'niesen', type: 'decollage', nom: 'Niesen', lat: 46.6451, lon: 7.6512, altitude: 2330, orientations: ['E', 'SE'], atterrissageIds: ['wimmis'] },
        { id: 'grimmialp', type: 'decollage', nom: 'Grimmialp', lat: 46.6116, lon: 7.5575, altitude: 1650, orientations: ['N', 'NE'], atterrissageIds: ['grimmialp-att'] },
        { id: 'pente', type: 'decollage', nom: 'Pente école (exemple)', lat: 46.686, lon: 7.855, altitude: 600, orientations: ['W', 'NW'], atterrissageIds: ['pente-bas'] },
        { id: 'hoehematte', type: 'atterrissage', nom: 'Höhematte (Interlaken)', lat: 46.6862, lon: 7.8585, altitude: 568, orientations: [] },
        { id: 'wimmis', type: 'atterrissage', nom: 'Wimmis (exemple)', lat: 46.676, lon: 7.636, altitude: 630, orientations: [] },
        { id: 'grimmialp-att', type: 'atterrissage', nom: 'Grimmialp – atterrissage (exemple)', lat: 46.618, lon: 7.548, altitude: 1220, orientations: [] },
        { id: 'pente-bas', type: 'atterrissage', nom: 'Bas de la pente école (exemple)', lat: 46.6855, lon: 7.8535, altitude: 580, orientations: [] },
      ],
    },
  };
}
