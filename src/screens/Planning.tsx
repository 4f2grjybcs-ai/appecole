import { useState } from 'react';
import { aujourdhui, formatDate } from '../lib/defaults';
import type { Seance } from '../lib/types';
import { useApp } from '../state/AppContext';
import { Bouton, C, Carte, Ecran, Ligne, Puce, T, Titre } from '../ui/kit';
import { useNav } from '../ui/nav';

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const STATUT = {
  prevue: { libelle: 'Prévue', couleur: C.orange },
  confirmee: { libelle: 'Confirmée – on vole', couleur: C.vert },
  annulee: { libelle: 'Annulée', couleur: C.rouge },
};

function jourSemaine(d: string) {
  return JOURS[new Date(d + 'T12:00:00').getDay()];
}

export function Planning() {
  const { data, session } = useApp();
  const nav = useNav();
  const [passees, setPassees] = useState(false);
  const estMoniteur = session?.role === 'moniteur';
  const ajd = aujourdhui();

  const seances = data.seances
    .filter((s) => estMoniteur || s.eleveIds.includes(session!.id))
    .filter((s) => (passees ? s.date < ajd : s.date >= ajd))
    .sort((a, b) => (passees ? -1 : 1) * (a.date + a.heureDebut).localeCompare(b.date + b.heureDebut));

  const parJour = seances.reduce<Record<string, Seance[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  const nomSite = (id?: string) => data.reglages.sites.find((s) => s.id === id)?.nom;
  const moniteur = (id?: string) => data.moniteurs.find((m) => m.id === id);

  return (
    <Ecran
      titre={estMoniteur ? 'Planning' : 'Mes séances'}
      action={estMoniteur && <Bouton petit variante="contour" titre="+ Séance" onPress={() => nav.ouvrir({ ecran: 'formSeance' })} />}
    >
      <Ligne>
        <Puce texte="À venir" actif={!passees} onPress={() => setPassees(false)} />
        <Puce texte="Passées" actif={passees} onPress={() => setPassees(true)} />
      </Ligne>
      {seances.length === 0 && <T doux>Aucune séance.</T>}
      {Object.entries(parJour).map(([date, liste]) => (
        <Carte key={date} style={{ backgroundColor: 'transparent', borderWidth: 0, padding: 0 }}>
          <Titre>{jourSemaine(date)} {formatDate(date)}{date === ajd ? ' · aujourd’hui' : ''}</Titre>
          {liste.map((s) => {
            const st = STATUT[s.statut];
            const m = moniteur(s.moniteurId);
            return (
              <Carte key={s.id} onPress={estMoniteur ? () => nav.ouvrir({ ecran: 'formSeance', id: s.id }) : undefined}>
                <Ligne style={{ justifyContent: 'space-between' }}>
                  <T gras taille={17}>{s.titre}</T>
                  <T doux>{s.heureDebut}–{s.heureFin}</T>
                </Ligne>
                <T gras couleur={st.couleur}>{st.libelle}</T>
                {nomSite(s.siteId) && <T doux>📍 {nomSite(s.siteId)}</T>}
                {m && <T doux>Moniteur : {m.prenom} {m.nom}{m.tel ? ` · ${m.tel}` : ''}</T>}
                {estMoniteur && (
                  <T doux>
                    {s.eleveIds.length} élève(s) :{' '}
                    {s.eleveIds
                      .map((id) => data.eleves.find((e) => e.id === id))
                      .filter(Boolean)
                      .map((e) => e!.prenom)
                      .join(', ') || '—'}
                  </T>
                )}
                {!!s.note && <T>💬 {s.note}</T>}
              </Carte>
            );
          })}
        </Carte>
      ))}
    </Ecran>
  );
}
