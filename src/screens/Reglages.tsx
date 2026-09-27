import { useState } from 'react';
import * as sb from '../data/supabaseStore';
import type { Exigences, SeuilsMeteo } from '../lib/types';
import { useApp } from '../state/AppContext';
import { Alerte, Bouton, Carte, Champ, confirmer, Ecran, informer, Ligne, T, Titre } from '../ui/kit';
import { useNav } from '../ui/nav';

const CHAMPS_SEUILS: { cle: keyof SeuilsMeteo; libelle: string }[] = [
  { cle: 'ventMaxKmh', libelle: 'Vent moyen max (km/h)' },
  { cle: 'rafalesMaxKmh', libelle: 'Rafales max (km/h)' },
  { cle: 'ecartRafalesMaxKmh', libelle: 'Écart rafales / vent max (km/h)' },
  { cle: 'ventAltitudeMaxKmh', libelle: 'Vent vers 1500 m max (km/h)' },
  { cle: 'toleranceDirectionDeg', libelle: 'Tolérance direction du vent (°)' },
];

const CHAMPS_EXIGENCES: { cle: keyof Exigences; libelle: string }[] = [
  { cle: 'grandsVolsMin', libelle: 'Grands vols minimum' },
  { cle: 'sitesDifferentsMin', libelle: 'Sites différents minimum' },
  { cle: 'joursDeVolMin', libelle: 'Jours de grands vols minimum' },
];

function Nombres<T extends object>({ valeurs, champs, onSave }: {
  valeurs: T;
  champs: { cle: keyof T; libelle: string }[];
  onSave: (v: T) => void;
}) {
  const [brut, setBrut] = useState<Record<string, string>>(
    Object.fromEntries(champs.map((c) => [c.cle, String(valeurs[c.cle])])),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <Carte>
      {champs.map((c) => (
        <Champ
          key={String(c.cle)}
          label={c.libelle}
          value={brut[c.cle as string]}
          keyboardType="number-pad"
          onChangeText={(v) => setBrut({ ...brut, [c.cle]: v })}
        />
      ))}
      {erreur && <Alerte niveau="rouge" texte={erreur} />}
      <Bouton
        titre="Enregistrer"
        onPress={() => {
          const r = { ...valeurs };
          for (const c of champs) {
            const n = parseInt(brut[c.cle as string], 10);
            if (!(n >= 0 && n <= 1000)) return setErreur(`${c.libelle} : nombre invalide.`);
            (r as Record<string, number>)[c.cle as string] = n;
          }
          setErreur(null);
          onSave(r);
          informer('Enregistré.');
        }}
      />
    </Carte>
  );
}

export function Reglages() {
  const { data, enregistrer, deconnexion, session, mode, ecoleId, chargerDemo } = useApp();
  const nav = useNav();
  const [nomEcole, setNomEcole] = useState(data.reglages.ecoleNom);
  const moi = data.moniteurs.find((m) => m.id === session?.id);

  return (
    <Ecran titre="Réglages">
      <Carte>
        <T>Connecté : <T gras>{moi ? `${moi.prenom} ${moi.nom}` : 'moniteur'}</T></T>
        <T doux taille={13}>{mode === 'local' ? 'Mode démo (données sur cet appareil)' : 'Données synchronisées (Supabase)'}</T>
        <Bouton variante="contour" titre="Se déconnecter" onPress={deconnexion} />
      </Carte>

      <Titre>École</Titre>
      <Carte>
        <Champ label="Nom de l’école" value={nomEcole} onChangeText={setNomEcole} />
        <Bouton titre="Enregistrer" onPress={() => enregistrer('reglages', { ...data.reglages, ecoleNom: nomEcole.trim() || data.reglages.ecoleNom })} />
      </Carte>

      <Titre>Moniteurs</Titre>
      {data.moniteurs.map((m) => (
        <Carte key={m.id} onPress={() => nav.ouvrir({ ecran: 'formMoniteur', id: m.id })}>
          <Ligne style={{ justifyContent: 'space-between' }}>
            <T gras>{m.prenom} {m.nom}</T>
            {mode === 'supabase' && ecoleId && m.id !== session?.id && (
              <Bouton
                petit
                variante="contour"
                titre="Inviter"
                onPress={async () => {
                  if (!m.email) return informer('Ajoutez d’abord l’e-mail du moniteur.');
                  try {
                    await sb.inviter(ecoleId, m.email, 'moniteur', m.id);
                    informer(`Invitation enregistrée pour ${m.email}.`);
                  } catch (e) {
                    informer(e instanceof Error ? e.message : String(e));
                  }
                }}
              />
            )}
          </Ligne>
        </Carte>
      ))}
      <Bouton variante="contour" titre="+ Ajouter un moniteur" onPress={() => nav.ouvrir({ ecran: 'formMoniteur' })} />

      <Titre>Sites de vol</Titre>
      {data.reglages.sites.map((s) => (
        <Carte key={s.id} onPress={() => nav.ouvrir({ ecran: 'formSite', id: s.id })}>
          <T gras>{s.nom}</T>
          <T doux>{s.altitude} m · {s.orientations.join(', ') || 'toutes orientations'}</T>
        </Carte>
      ))}
      <Bouton variante="contour" titre="+ Ajouter un site" onPress={() => nav.ouvrir({ ecran: 'formSite' })} />

      <Titre>Seuils météo (niveau élève)</Titre>
      <Nombres valeurs={data.reglages.seuils} champs={CHAMPS_SEUILS} onSave={(seuils) => enregistrer('reglages', { ...data.reglages, seuils })} />

      <Titre>Exigences avant l’examen pratique</Titre>
      <Alerte niveau="orange" texte="Valeurs par défaut à vérifier avec le règlement de formation FSVL en vigueur." />
      <Nombres valeurs={data.reglages.exigences} champs={CHAMPS_EXIGENCES} onSave={(exigences) => enregistrer('reglages', { ...data.reglages, exigences })} />

      {mode === 'local' && (
        <>
          <Titre>Démo</Titre>
          <Bouton
            variante="danger"
            titre="Remplacer par les données de démonstration"
            onPress={async () => {
              if (await confirmer('Toutes les données de cet appareil seront remplacées. Continuer ?')) {
                await chargerDemo();
                await deconnexion();
              }
            }}
          />
        </>
      )}
    </Ecran>
  );
}
