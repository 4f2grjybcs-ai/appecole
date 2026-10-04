import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { nouvelId } from '../lib/defaults';
import { HAUTEURS, verifierLien } from '../lib/meteoLiens';
import type { LienMeteo } from '../lib/types';
import { useApp } from '../state/AppContext';
import { Alerte, Bouton, C, Carte, Champ, Ecran, Ligne, Puce, T } from '../ui/kit';
import { useNav } from '../ui/nav';

/** Les moniteurs gèrent les liens et contenus intégrés de l'écran Météo, sans toucher au code. */
export function FormLiensMeteo() {
  const { data, enregistrer } = useApp();
  const nav = useNav();
  const [liens, setLiens] = useState<LienMeteo[]>(data.reglages.meteoLiens);
  const [erreur, setErreur] = useState<string | null>(null);

  const maj = (i: number, p: Partial<LienMeteo>) => setLiens(liens.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const deplacer = (i: number, sens: -1 | 1) => {
    const j = i + sens;
    if (j < 0 || j >= liens.length) return;
    const copie = [...liens];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    setLiens(copie);
  };

  const valider = async () => {
    const propres = liens.map((l) => ({ ...l, titre: l.titre.trim(), contenu: l.contenu.trim() }));
    for (const l of propres) {
      const e = verifierLien(l);
      if (e) return setErreur(e);
    }
    await enregistrer('reglages', { ...data.reglages, meteoLiens: propres });
    nav.retour();
  };

  return (
    <Ecran titre="Liens et contenus météo">
      <T doux>
        « Lien » affiche un bouton qui ouvre la page. « Dans l’app » affiche la page directement dans l’écran Météo :
        collez une adresse (https://…) ou un code d’intégration (&lt;iframe …&gt;, par exemple depuis Windy).
      </T>
      {liens.map((l, i) => (
        <Carte key={l.id}>
          <Ligne style={{ justifyContent: 'space-between' }}>
            <T doux taille={13}>{i + 1}.</T>
            <Ligne>
              <Bouton petit variante="contour" titre="↑" onPress={() => deplacer(i, -1)} desactive={i === 0} />
              <Bouton petit variante="contour" titre="↓" onPress={() => deplacer(i, 1)} desactive={i === liens.length - 1} />
              <Pressable accessibilityLabel={`Supprimer ${l.titre}`} onPress={() => setLiens(liens.filter((_, j) => j !== i))} style={{ padding: 6 }}>
                <T couleur={C.rouge} gras>✕</T>
              </Pressable>
            </Ligne>
          </Ligne>
          <Champ label="Titre" value={l.titre} onChangeText={(t) => maj(i, { titre: t })} placeholder="Ex. Webcam du décollage" />
          <Champ
            label="Adresse ou code d’intégration"
            value={l.contenu}
            onChangeText={(t) => maj(i, { contenu: t })}
            placeholder="https://… ou <iframe …>"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <Ligne>
            <Puce texte="Lien" actif={l.affichage === 'lien'} onPress={() => maj(i, { affichage: 'lien' })} />
            <Puce texte="Dans l’app" actif={l.affichage === 'integre'} onPress={() => maj(i, { affichage: 'integre' })} />
          </Ligne>
          {l.affichage === 'integre' && (
            <View style={{ gap: 4 }}>
              <T doux taille={13}>Hauteur</T>
              <Ligne>
                {HAUTEURS.map((h) => (
                  <Puce key={h.valeur} texte={h.libelle} actif={l.hauteur === h.valeur} onPress={() => maj(i, { hauteur: h.valeur })} />
                ))}
              </Ligne>
            </View>
          )}
        </Carte>
      ))}
      <Bouton
        variante="contour"
        titre="+ Ajouter un lien ou un contenu"
        onPress={() => setLiens([...liens, { id: 'lm-' + nouvelId(), titre: '', contenu: '', affichage: 'lien', hauteur: 450 }])}
      />
      {erreur && <Alerte niveau="rouge" texte={erreur} />}
      <Bouton titre="Enregistrer" onPress={valider} />
    </Ecran>
  );
}
