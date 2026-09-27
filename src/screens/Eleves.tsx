import { useMemo, useState } from 'react';
import { alertesEleve } from '../lib/alertes';
import { calculerProgression } from '../lib/progress';
import { useApp } from '../state/AppContext';
import { Alerte, Barre, Bouton, C, Carte, Champ, Ecran, Ligne, Puce, T } from '../ui/kit';
import { useNav } from '../ui/nav';

export function Eleves() {
  const { data } = useApp();
  const nav = useNav();
  const [recherche, setRecherche] = useState('');
  const [archives, setArchives] = useState(false);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return data.eleves
      .filter((e) => e.actif !== archives)
      .filter((e) => !q || `${e.prenom} ${e.nom}`.toLowerCase().includes(q))
      .sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom));
  }, [data.eleves, recherche, archives]);

  return (
    <Ecran titre="Élèves" action={<Bouton petit variante="contour" titre="+ Élève" onPress={() => nav.ouvrir({ ecran: 'formEleve' })} />}>
      <Champ label="Rechercher" value={recherche} onChangeText={setRecherche} placeholder="Nom ou prénom" />
      <Ligne>
        <Puce texte="En formation" actif={!archives} onPress={() => setArchives(false)} />
        <Puce texte="Archivés" actif={archives} onPress={() => setArchives(true)} />
      </Ligne>
      {liste.length === 0 && <T doux>Aucun élève.</T>}
      {liste.map((e) => {
        const p = calculerProgression(e, data.vols, data.validations, data.reglages.exigences);
        const alertes = alertesEleve(e);
        return (
          <Carte key={e.id} onPress={() => nav.ouvrir({ ecran: 'eleve', id: e.id })}>
            <Ligne style={{ justifyContent: 'space-between' }}>
              <T gras taille={17}>{e.prenom} {e.nom}</T>
              <T doux>{p.grandsVols} grands vols</T>
            </Ligne>
            <Barre valeur={p.pourcentage} couleur={p.pretExamenPratique ? C.vert : C.primaire} />
            <T doux taille={13}>
              {p.pretExamenPratique ? 'Prêt pour l’examen pratique' : `Progression ${Math.round(p.pourcentage * 100)} %`}
            </T>
            {alertes.map((a) => <Alerte key={a.texte} {...a} />)}
          </Carte>
        );
      })}
    </Ecran>
  );
}
