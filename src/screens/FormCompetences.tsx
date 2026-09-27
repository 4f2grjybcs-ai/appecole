import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { nouvelId } from '../lib/defaults';
import { ETAPES } from '../lib/fsvl';
import type { Etape } from '../lib/types';
import { useApp } from '../state/AppContext';
import { Alerte, Bouton, C, Carte, confirmer, Ecran, Ligne, T } from '../ui/kit';
import { useNav } from '../ui/nav';

/**
 * Édition de la liste des compétences par les moniteurs.
 * Renommer une compétence conserve les validations déjà faites (même identifiant).
 */
export function FormCompetences() {
  const { data, enregistrer } = useApp();
  const nav = useNav();
  const [etapes, setEtapes] = useState<Etape[]>(data.reglages.etapes);
  const [erreur, setErreur] = useState<string | null>(null);

  const majEtape = (i: number, e: Etape) => setEtapes(etapes.map((x, j) => (j === i ? e : x)));
  const deplacer = (i: number, sens: -1 | 1) => {
    const j = i + sens;
    if (j < 0 || j >= etapes.length) return;
    const copie = [...etapes];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    setEtapes(copie);
  };

  const enregistrerListe = async () => {
    const propre = etapes
      .map((e) => ({
        ...e,
        titre: e.titre.trim(),
        competences: e.competences.map((c) => ({ ...c, libelle: c.libelle.trim() })).filter((c) => c.libelle),
      }))
      .filter((e) => e.titre || e.competences.length);
    if (propre.some((e) => !e.titre)) return setErreur('Chaque étape doit avoir un titre.');
    await enregistrer('reglages', { ...data.reglages, etapes: propre });
    nav.retour();
  };

  return (
    <Ecran titre="Compétences">
      <T doux>
        Modifiez, ajoutez ou supprimez des compétences. Les validations déjà faites sont conservées
        quand vous renommez une compétence.
      </T>
      {etapes.map((etape, i) => (
        <Carte key={etape.id}>
          <Ligne style={{ justifyContent: 'space-between' }}>
            <T doux taille={13}>Étape {i + 1}</T>
            <Ligne>
              <Bouton petit variante="contour" titre="↑" onPress={() => deplacer(i, -1)} desactive={i === 0} />
              <Bouton petit variante="contour" titre="↓" onPress={() => deplacer(i, 1)} desactive={i === etapes.length - 1} />
            </Ligne>
          </Ligne>
          <TextInput
            value={etape.titre}
            onChangeText={(t) => majEtape(i, { ...etape, titre: t })}
            placeholder="Titre de l’étape"
            style={{ fontSize: 17, fontWeight: '700', color: C.texte, borderBottomWidth: 1, borderColor: C.bord, paddingVertical: 6 }}
          />
          {etape.competences.map((c, k) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={c.libelle}
                onChangeText={(t) =>
                  majEtape(i, { ...etape, competences: etape.competences.map((x, m) => (m === k ? { ...x, libelle: t } : x)) })
                }
                placeholder="Nom de la compétence"
                style={{ flex: 1, fontSize: 15, color: C.texte, borderWidth: 1, borderColor: C.bord, borderRadius: 8, padding: 8, backgroundColor: '#fff' }}
              />
              <Pressable
                accessibilityLabel={`Supprimer ${c.libelle}`}
                onPress={() => majEtape(i, { ...etape, competences: etape.competences.filter((_, m) => m !== k) })}
                style={{ padding: 8 }}
              >
                <T couleur={C.rouge} gras>✕</T>
              </Pressable>
            </View>
          ))}
          <Ligne>
            <Bouton
              petit
              variante="contour"
              titre="+ Compétence"
              onPress={() => majEtape(i, { ...etape, competences: [...etape.competences, { id: 'c-' + nouvelId(), libelle: '' }] })}
            />
            <Bouton
              petit
              variante="danger"
              titre="Supprimer l’étape"
              onPress={async () => {
                if (etape.competences.length && !(await confirmer(`Supprimer l’étape « ${etape.titre} » et ses compétences ?`))) return;
                setEtapes(etapes.filter((_, j) => j !== i));
              }}
            />
          </Ligne>
        </Carte>
      ))}
      <Bouton
        variante="contour"
        titre="+ Ajouter une étape"
        onPress={() => setEtapes([...etapes, { id: 'etape-' + nouvelId(), titre: '', competences: [] }])}
      />
      {erreur && <Alerte niveau="rouge" texte={erreur} />}
      <Bouton titre="Enregistrer la liste" onPress={enregistrerListe} />
      <Bouton
        variante="contour"
        titre="Revenir à la liste proposée au départ"
        onPress={async () => {
          if (await confirmer('Remplacer la liste actuelle par la liste de départ ?')) setEtapes(ETAPES);
        }}
      />
    </Ecran>
  );
}
