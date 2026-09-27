import { useMemo, useState } from 'react';
import { aujourdhui, formatDate } from '../lib/defaults';
import { estPaye, formatCHF, libelleMoyen, totalAPayer, totaux } from '../lib/paiements';
import { useApp } from '../state/AppContext';
import { C, Carte, Ecran, Ligne, Puce, T, Titre } from '../ui/kit';
import { useNav } from '../ui/nav';
import { StatutPaiement } from './Formulaires';

type Filtre = 'aEncaisser' | 'jour' | 'tous';

/** Vols de tous les élèves, pour le moniteur du jour : encaissements et contrôle. */
export function Vols() {
  const { data, session } = useApp();
  const nav = useNav();
  const [filtre, setFiltre] = useState<Filtre>('aEncaisser');
  const [miens, setMiens] = useState(false);
  const ajd = aujourdhui();

  const vols = useMemo(
    () =>
      data.vols
        .filter((v) => (filtre === 'aEncaisser' ? !estPaye(v) : filtre === 'jour' ? v.date === ajd : true))
        .filter((v) => !miens || v.moniteurId === session?.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 200),
    [data.vols, filtre, miens, ajd, session],
  );

  const parEleve = [...new Set(vols.map((v) => v.eleveId))].map((eleveId) => {
    const liste = vols.filter((v) => v.eleveId === eleveId);
    return { eleveId, liste, total: totalAPayer(liste, data.reglages.tarifs) };
  });

  const duJour = totaux(data.vols.filter((v) => v.date === ajd && (!miens || v.moniteurId === session?.id)));
  const nomEleve = (id: string) => {
    const e = data.eleves.find((x) => x.id === id);
    return e ? `${e.prenom} ${e.nom}` : 'Élève supprimé';
  };
  const nomSite = (id?: string) => data.reglages.sites.find((s) => s.id === id)?.nom ?? '—';

  return (
    <Ecran titre="Vols et paiements">
      <Carte>
        <T doux taille={13}>Encaissé aujourd’hui{miens ? ' (mes vols)' : ''}</T>
        <T gras taille={22}>{formatCHF(duJour.total)}</T>
        {duJour.parMoyen.map((m) => (
          <Ligne key={m.moyen} style={{ justifyContent: 'space-between' }}>
            <T doux>{libelleMoyen(m.moyen)} ({m.nombre})</T>
            <T>{formatCHF(m.montant)}</T>
          </Ligne>
        ))}
        {duJour.nonPayes > 0 && <T couleur={C.orange} gras>{duJour.nonPayes} vol(s) du jour à encaisser</T>}
      </Carte>

      <Ligne>
        <Puce texte="À encaisser" actif={filtre === 'aEncaisser'} onPress={() => setFiltre('aEncaisser')} />
        <Puce texte="Aujourd’hui" actif={filtre === 'jour'} onPress={() => setFiltre('jour')} />
        <Puce texte="Tous" actif={filtre === 'tous'} onPress={() => setFiltre('tous')} />
        <Puce texte="Mes vols uniquement" actif={miens} couleur={C.doux} onPress={() => setMiens(!miens)} />
      </Ligne>

      {vols.length === 0 && <T doux>{filtre === 'aEncaisser' ? 'Rien à encaisser.' : 'Aucun vol.'}</T>}
      {filtre === 'aEncaisser' &&
        parEleve.map(({ eleveId, liste, total }) => (
          <Carte key={eleveId} onPress={() => nav.ouvrir({ ecran: 'encaisser', eleveId })}>
            <Ligne style={{ justifyContent: 'space-between' }}>
              <T gras taille={17}>{nomEleve(eleveId)}</T>
              <T gras taille={17} couleur={C.orange}>{formatCHF(total)}</T>
            </Ligne>
            <T doux>
              {liste.length} entrée{liste.length > 1 ? 's' : ''} à valider · depuis le {formatDate(liste[liste.length - 1].date)}
            </T>
            <T gras couleur={C.primaire}>Encaisser et valider ›</T>
          </Carte>
        ))}
      {filtre !== 'aEncaisser' && vols.map((v, i) => (
        <Carte key={v.id} style={{ gap: 4 }} onPress={() => nav.ouvrir({ ecran: 'formVol', eleveId: v.eleveId, id: v.id })}>
          {(i === 0 || vols[i - 1].date !== v.date) && <Titre>{formatDate(v.date)}</Titre>}
          <Ligne style={{ justifyContent: 'space-between' }}>
            <T gras>{nomEleve(v.eleveId)}</T>
            <T couleur={v.type === 'altitude' ? C.primaire : C.doux}>
              {v.nombre} × {v.type === 'altitude' ? 'grand vol' : 'pente école'}
            </T>
          </Ligne>
          <T doux>{nomSite(v.decollageId)} → {nomSite(v.atterrissageId)}</T>
          {!!v.navettes && <T doux>🚐 {v.navettes} navette{v.navettes > 1 ? 's' : ''}</T>}
          <Ligne style={{ justifyContent: 'space-between' }}>
            <StatutPaiement vol={v} />
            {v.saisiPar === 'eleve' && <T doux taille={12}>noté par l’élève</T>}
          </Ligne>
        </Carte>
      ))}
    </Ecran>
  );
}
