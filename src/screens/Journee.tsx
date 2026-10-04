import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { aujourdhui, formatDate } from '../lib/defaults';
import { libellesExercices } from '../lib/fsvl';
import { changerStatut, elevesDesSeances, etatsDuJour, parOrdreDeDecollage, type EtatEleve } from '../lib/journee';
import type { Journee as TJournee, StatutEleve } from '../lib/types';
import { useApp } from '../state/AppContext';
import { Bouton, C, Carte, Ecran, Ligne, Puce, T, Titre } from '../ui/kit';
import { ChoixExercices } from './Formulaires';

/**
 * Vue d'ensemble de la journée pour les moniteurs : élèves du jour et leur statut
 * (en préparation, en vol avec leur exercice, atterri). Indépendant du carnet de vol,
 * que chaque élève continue de remplir lui-même.
 */
export function Journee() {
  const { data, enregistrer, mode, rafraichir } = useApp();
  const date = aujourdhui();
  const journee: TJournee = data.journees.find((j) => j.id === date) ?? { id: date, date, eleveIds: [] };
  const [choixEleves, setChoixEleves] = useState(journee.eleveIds.length === 0);

  // Avec Supabase, les téléphones des moniteurs se mettent à jour régulièrement.
  useEffect(() => {
    if (mode !== 'supabase') return;
    const t = setInterval(rafraichir, 15_000);
    return () => clearInterval(t);
  }, [mode, rafraichir]);

  const etats = etatsDuJour(data, journee);
  const parStatut = (s: StatutEleve) => {
    const liste = etats.filter((e) => e.statut === s);
    return s === 'preparation' ? liste : liste.sort(parOrdreDeDecollage);
  };
  const changer = (e: EtatEleve, statut: StatutEleve, exercices = e.exercices) =>
    enregistrer('statut', changerStatut(date, e, statut, exercices));
  const majEleves = (eleveIds: string[]) => enregistrer('journee', { ...journee, eleveIds });

  const sections: { statut: StatutEleve; titre: string; vide: string }[] = [
    { statut: 'vol', titre: '🪂 En vol', vide: 'Personne en vol.' },
    { statut: 'preparation', titre: '🧍 En préparation', vide: 'Personne en préparation.' },
    { statut: 'atterri', titre: '✅ Atterris', vide: 'Personne n’a encore atterri.' },
  ];

  return (
    <Ecran titre={`Aujourd’hui · ${formatDate(date)}`}>
      <Ligne style={{ flexWrap: 'nowrap' }}>
        <Compteur libelle="En préparation" valeur={parStatut('preparation').length} couleur={C.doux} />
        <Compteur libelle="En vol" valeur={parStatut('vol').length} couleur={C.orange} />
        <Compteur libelle="Atterris" valeur={parStatut('atterri').length} couleur={C.vert} />
      </Ligne>

      <Ligne style={{ justifyContent: 'space-between' }}>
        <Titre>Élèves du jour ({journee.eleveIds.length})</Titre>
        <Bouton petit variante="contour" titre={choixEleves ? 'Terminé' : 'Modifier'} onPress={() => setChoixEleves(!choixEleves)} />
      </Ligne>
      {choixEleves && (
        <Carte>
          <Ligne>
            {data.eleves.filter((e) => e.actif).map((e) => {
              const choisi = journee.eleveIds.includes(e.id);
              return (
                <Puce
                  key={e.id}
                  texte={`${e.prenom} ${e.nom}`}
                  actif={choisi}
                  onPress={() => majEleves(choisi ? journee.eleveIds.filter((x) => x !== e.id) : [...journee.eleveIds, e.id])}
                />
              );
            })}
          </Ligne>
          {elevesDesSeances(data, date).length > 0 && (
            <Bouton
              petit
              variante="contour"
              titre="Ajouter les élèves des séances du jour"
              onPress={() => majEleves([...new Set([...journee.eleveIds, ...elevesDesSeances(data, date)])])}
            />
          )}
        </Carte>
      )}

      {journee.eleveIds.length === 0 ? (
        <T doux>Choisissez les élèves du jour pour suivre qui est en préparation, en vol ou atterri.</T>
      ) : (
        sections.map((sec) => (
          <View key={sec.statut} style={{ gap: 8 }}>
            <Titre>{sec.titre} ({parStatut(sec.statut).length})</Titre>
            {parStatut(sec.statut).length === 0 && <T doux>{sec.vide}</T>}
            {parStatut(sec.statut).map((e) => (
              <CarteEleve key={e.eleve.id} etat={e} onChanger={(s, ex) => changer(e, s, ex)} />
            ))}
          </View>
        ))
      )}

      {mode === 'local' && (
        <T doux taille={12}>
          Mode démo : la liste n’est partagée entre les téléphones des moniteurs qu’une fois Supabase configuré
          (mise à jour toutes les 15 secondes).
        </T>
      )}
    </Ecran>
  );
}

function Compteur({ libelle, valeur, couleur }: { libelle: string; valeur: number; couleur: string }) {
  return (
    <Carte style={{ flex: 1, alignItems: 'center', gap: 0, paddingVertical: 10, paddingHorizontal: 4 }}>
      <T gras taille={26} couleur={couleur}>{valeur}</T>
      <T doux taille={12}>{libelle}</T>
    </Carte>
  );
}

function CarteEleve({ etat, onChanger }: { etat: EtatEleve; onChanger: (s: StatutEleve, exercices?: string[]) => void }) {
  const { data } = useApp();
  const [choixExercice, setChoixExercice] = useState(false);
  const [exercices, setExercices] = useState<string[]>(etat.exercices);
  const libelles = libellesExercices(etat.exercices, data.reglages.etapes);
  const couleur = etat.statut === 'vol' ? C.orange : etat.statut === 'atterri' ? C.vert : C.bord;

  return (
    <Carte style={{ gap: 6, borderColor: couleur, borderWidth: etat.statut === 'vol' ? 2 : 1 }}>
      <Ligne style={{ justifyContent: 'space-between' }}>
        <T gras taille={17}>{etat.eleve.prenom} {etat.eleve.nom}</T>
        {etat.statut === 'preparation' && !choixExercice && (
          <Bouton petit titre="🪂 En vol" onPress={() => setChoixExercice(true)} />
        )}
        {etat.statut === 'vol' && <Bouton petit titre="✅ Atterri" onPress={() => onChanger('atterri')} />}
        {etat.statut === 'atterri' && (
          <Bouton petit variante="contour" titre="↺ En préparation" onPress={() => onChanger('preparation', [])} />
        )}
      </Ligne>
      {etat.statut !== 'preparation' && libelles.length > 0 && <T>🎯 {libelles.join(' · ')}</T>}
      {etat.statut === 'vol' && libelles.length === 0 && <T doux>Pas d’exercice indiqué</T>}

      {choixExercice && (
        <>
          <ChoixExercices valeur={exercices} onChange={setExercices} />
          <Ligne>
            <Bouton
              titre="Mettre en vol"
              onPress={() => {
                onChanger('vol', exercices);
                setChoixExercice(false);
              }}
            />
            <Bouton variante="contour" titre="Annuler" onPress={() => setChoixExercice(false)} />
          </Ligne>
        </>
      )}
      {etat.statut === 'vol' && (
        <Bouton petit variante="contour" titre="Remettre en préparation" onPress={() => onChanger('preparation', [])} />
      )}
    </Carte>
  );
}
