import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, View } from 'react-native';
import { APERCU, previsionExemple } from '../lib/apercu';
import { formatDate } from '../lib/defaults';
import type { Site } from '../lib/types';
import { chargerPrevision, evaluer, pointCardinal, type HeureMeteo, type Verdict } from '../lib/weather';
import { estHtml } from '../lib/meteoLiens';
import { useApp } from '../state/AppContext';
import { Integre } from '../ui/Integre';
import { useNav } from '../ui/nav';
import { Alerte, Bouton, C, Carte, Ecran, Ligne, Puce, T, Titre } from '../ui/kit';

const COULEUR: Record<Verdict, string> = { favorable: C.vert, limite: C.orange, defavorable: C.rouge };
const LIBELLE: Record<Verdict, string> = { favorable: 'Favorable', limite: 'Limite', defavorable: 'Défavorable' };
const HEURES_VOL = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/** Liens et contenus intégrés choisis par les moniteurs (modifiables depuis l'app). */
function ContenusEcole() {
  const { data, session } = useApp();
  const nav = useNav();
  const liens = data.reglages.meteoLiens;
  const estMoniteur = session?.role === 'moniteur';
  if (liens.length === 0 && !estMoniteur) return null;
  return (
    <>
      <Ligne style={{ justifyContent: 'space-between' }}>
        <Titre>Liens et contenus de l’école</Titre>
        {estMoniteur && <Bouton petit variante="contour" titre="Modifier" onPress={() => nav.ouvrir({ ecran: 'formLiensMeteo' })} />}
      </Ligne>
      {liens.length === 0 && <T doux>Ajoutez des liens ou des contenus intégrés (webcam, carte Windy…) avec « Modifier ».</T>}
      {liens.filter((l) => l.affichage === 'integre').map((l) => (
        <Carte key={l.id} style={{ gap: 6 }}>
          <Ligne style={{ justifyContent: 'space-between' }}>
            <T gras>{l.titre}</T>
            {!estHtml(l.contenu) && <Bouton petit variante="contour" titre="Ouvrir ↗" onPress={() => Linking.openURL(l.contenu.trim())} />}
          </Ligne>
          <Integre contenu={l.contenu} hauteur={l.hauteur} />
        </Carte>
      ))}
      {liens.filter((l) => l.affichage === 'lien').map((l) => (
        <Bouton key={l.id} variante="contour" titre={`${l.titre} ↗`} onPress={() => Linking.openURL(l.contenu.trim())} />
      ))}
    </>
  );
}

export function Meteo() {
  const { data } = useApp();
  const sites = data.reglages.sites;
  const [siteId, setSiteId] = useState(sites[0]?.id);
  const site = sites.find((s) => s.id === siteId) ?? sites[0];

  return (
    <Ecran titre="Météo">
      <ContenusEcole />
      <Titre>Prévisions par site</Titre>
      {sites.length === 0 ? (
        <T doux>Ajoutez vos décollages et atterrissages dans Réglages pour afficher les prévisions.</T>
      ) : (
        <>
          {(['decollage', 'atterrissage'] as const).map((type) => {
            const liste = sites.filter((s) => s.type === type);
            if (liste.length === 0) return null;
            return (
              <View key={type} style={{ gap: 6 }}>
                <T doux taille={13}>{type === 'decollage' ? '🛫 Décollages' : '🛬 Atterrissages'}</T>
                <Ligne>
                  {liste.map((s) => (
                    <Puce key={s.id} texte={s.nom} actif={site?.id === s.id} onPress={() => setSiteId(s.id)} />
                  ))}
                </Ligne>
              </View>
            );
          })}
          {site && <Previsions site={site} />}
        </>
      )}
      <T doux taille={12}>
        Indication automatique basée sur le modèle Open-Meteo (données MeteoSwiss). Elle ne remplace jamais
        l’analyse du moniteur sur le terrain.
      </T>
    </Ecran>
  );
}

function Previsions({ site }: { site: Site }) {
  const { data } = useApp();
  const [heures, setHeures] = useState<HeureMeteo[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setHeures(null);
    setErreur(null);
    (APERCU ? Promise.resolve(previsionExemple()) : chargerPrevision(site, ctrl.signal))
      .then(setHeures)
      .catch((e) => !ctrl.signal.aborted && setErreur(e instanceof Error ? e.message : String(e)));
    return () => ctrl.abort();
  }, [site, essai]);

  if (erreur)
    return (
      <Carte>
        <Alerte niveau="rouge" texte={`Prévisions indisponibles : ${erreur}`} />
        <Bouton titre="Réessayer" onPress={() => setEssai(essai + 1)} />
      </Carte>
    );
  if (!heures) return <ActivityIndicator color={C.primaire} style={{ margin: 24 }} />;

  const jours = [...new Set(heures.map((h) => h.time.slice(0, 10)))];
  return (
    <>
      {APERCU && <Alerte niveau="orange" texte="Aperçu : prévisions fictives. L’app installée affiche les vraies prévisions." />}
      <T doux>
        {site.type === 'decollage'
          ? `Décollage ${site.altitude} m · orientations ${site.orientations.join(', ') || '—'}`
          : `Atterrissage ${site.altitude} m`}
      </T>
      {jours.map((j) => {
        const du = heures.filter((h) => h.time.startsWith(j) && HEURES_VOL.includes(parseInt(h.time.slice(11, 13), 10)));
        const evals = du.map((h) => evaluer(h, site, data.reglages.seuils));
        const nbFav = evals.filter((e) => e.verdict === 'favorable').length;
        const resume: Verdict = nbFav >= 4 ? 'favorable' : evals.some((e) => e.verdict !== 'defavorable') ? 'limite' : 'defavorable';
        return (
          <Carte key={j}>
            <Ligne style={{ justifyContent: 'space-between' }}>
              <T gras taille={17}>{formatDate(j)}</T>
              <T gras couleur={COULEUR[resume]}>{LIBELLE[resume]}</T>
            </Ligne>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {du.map((h, i) => (
                  <View
                    key={h.time}
                    style={{
                      width: 64, padding: 6, borderRadius: 8, alignItems: 'center', gap: 2,
                      backgroundColor: COULEUR[evals[i].verdict] + '1A',
                      borderWidth: 1, borderColor: COULEUR[evals[i].verdict],
                    }}
                  >
                    <T gras taille={13}>{h.time.slice(11, 16)}</T>
                    <T taille={12}>{pointCardinal(h.direction)} {Math.round(h.vent)}</T>
                    <T doux taille={11}>raf. {Math.round(h.rafales)}</T>
                    <T doux taille={11}>1500m {Math.round(h.ventAltitude)}</T>
                    <T doux taille={11}>{Math.round(h.temperature)}° {h.precipitation > 0.1 ? '🌧' : h.nuages > 70 ? '☁️' : h.nuages > 30 ? '⛅' : '☀️'}</T>
                  </View>
                ))}
              </View>
            </ScrollView>
            {[...new Set(evals.flatMap((e) => e.motifs))].map((r) => (
              <T key={r} doux taille={13}>• {r}</T>
            ))}
          </Carte>
        );
      })}
      <T doux taille={12}>Vent en km/h (sol 10 m, rafales, et vers 1500 m).</T>
    </>
  );
}
