import { useState } from 'react';
import { aujourdhui, formatDate } from '../lib/defaults';
import { encaisser, enAttente, formatCHF, MOYENS, prixVol } from '../lib/paiements';
import type { Id, MoyenPaiement } from '../lib/types';
import { useApp } from '../state/AppContext';
import { Alerte, Bouton, C, Carte, Ecran, Ligne, Puce, T, Titre } from '../ui/kit';
import { useNav } from '../ui/nav';

/** Encaissement groupé : le moniteur du jour encaisse et valide les vols notés par un élève. */
export function Encaisser({ eleveId }: { eleveId: Id }) {
  const { data, enregistrer, session } = useApp();
  const nav = useNav();
  const eleve = data.eleves.find((e) => e.id === eleveId);
  const attente = enAttente(data.vols.filter((v) => v.eleveId === eleveId)).sort((a, b) => a.date.localeCompare(b.date));
  const [choisis, setChoisis] = useState<Id[]>(attente.map((v) => v.id));
  const [moyen, setMoyen] = useState<MoyenPaiement | undefined>();
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const selection = attente.filter((v) => choisis.includes(v.id));
  const total = selection.reduce((s, v) => s + prixVol(v, data.reglages.tarifs), 0);
  const nomSite = (id?: string) => data.reglages.sites.find((s) => s.id === id)?.nom ?? '—';

  const valider = async () => {
    if (selection.length === 0) return setErreur('Sélectionnez au moins un vol.');
    if (!moyen) return setErreur('Choisissez le moyen de paiement.');
    setOccupe(true);
    for (const v of encaisser(selection, moyen, session!.id, aujourdhui(), data.reglages.tarifs)) {
      await enregistrer('vol', v);
    }
    nav.retour();
  };

  return (
    <Ecran titre={`Encaisser · ${eleve ? `${eleve.prenom} ${eleve.nom}` : ''}`}>
      {attente.length === 0 ? (
        <T doux>Aucun vol en attente pour cet élève.</T>
      ) : (
        <>
          <Titre>Vols à valider</Titre>
          {attente.map((v) => {
            const actif = choisis.includes(v.id);
            return (
              <Carte
                key={v.id}
                style={{ borderColor: actif ? C.primaire : C.bord, opacity: actif ? 1 : 0.6 }}
                onPress={() => setChoisis(actif ? choisis.filter((x) => x !== v.id) : [...choisis, v.id])}
              >
                <Ligne style={{ justifyContent: 'space-between' }}>
                  <T gras>{actif ? '☑' : '☐'} {formatDate(v.date)}</T>
                  <T gras>{formatCHF(prixVol(v, data.reglages.tarifs))}</T>
                </Ligne>
                <T>
                  {v.nombre} × {v.type === 'altitude' ? 'grand vol' : 'pente école'}
                  {v.navettes ? ` · 🚐 ${v.navettes} navette${v.navettes > 1 ? 's' : ''}` : ''}
                </T>
                <T doux>{nomSite(v.decollageId)} → {nomSite(v.atterrissageId)}</T>
              </Carte>
            );
          })}
          <T doux taille={13}>Prix selon les tarifs de l’école (Réglages). Pour un autre prix, ouvrez le vol depuis la fiche de l’élève.</T>

          <Carte>
            <Ligne style={{ justifyContent: 'space-between' }}>
              <T gras>Total ({selection.length} entrée{selection.length > 1 ? 's' : ''})</T>
              <T gras taille={22}>{formatCHF(total)}</T>
            </Ligne>
            <T doux taille={13}>Moyen de paiement</T>
            <Ligne>
              {MOYENS.map((m) => (
                <Puce key={m.id} texte={m.libelle} actif={moyen === m.id} onPress={() => setMoyen(m.id)} />
              ))}
            </Ligne>
          </Carte>
          {erreur && <Alerte niveau="rouge" texte={erreur} />}
          <Bouton
            titre={`Payé · valider ${selection.length} vol${selection.length > 1 ? 's' : ''}`}
            onPress={valider}
            desactive={occupe}
          />
        </>
      )}
    </Ecran>
  );
}
