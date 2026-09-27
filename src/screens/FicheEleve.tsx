import { useState } from 'react';
import { View } from 'react-native';
import * as sb from '../data/supabaseStore';
import { aujourdhui, formatDate } from '../lib/defaults';
import { BRANCHES_THEORIE } from '../lib/fsvl';
import { alertesEleve } from '../lib/alertes';
import { calculerProgression, niveauCompetence } from '../lib/progress';
import type { Id, NiveauCompetence, Vol } from '../lib/types';
import { volsDuCarnet } from '../lib/carnet';
import { enAttente, estPaye, formatCHF, prixVol, totalAPayer } from '../lib/paiements';
import { exporterCarnet } from '../ui/exportPdf';
import { useApp } from '../state/AppContext';
import { Alerte, Barre, Bouton, C, Carte, Champ, Ecran, informer, Ligne, Puce, T, Titre } from '../ui/kit';
import { useNav } from '../ui/nav';
import { StatutPaiement } from './Formulaires';

const SUIVANT: Record<string, NiveauCompetence | undefined> = { none: 'vu', vu: 'acquis', acquis: undefined };

/** Fiche d'un élève. En lecture seule pour l'élève lui-même. */
export function FicheEleve({ id, lectureSeule }: { id: Id; lectureSeule?: boolean }) {
  const { data, session, enregistrer, supprimer, mode, ecoleId } = useApp();
  const nav = useNav();
  const [onglet, setOnglet] = useState<'progression' | 'vols' | 'competences' | 'infos'>('progression');
  const [emailInvit, setEmailInvit] = useState('');
  const [msgExport, setMsgExport] = useState<string | null>(null);
  const eleve = data.eleves.find((e) => e.id === id);

  if (!eleve) {
    return (
      <Ecran titre="Élève">
        <T doux>Fiche introuvable.</T>
      </Ecran>
    );
  }

  const p = calculerProgression(eleve, data.vols, data.validations, data.reglages.exigences, data.reglages.etapes);
  const attente = enAttente(data.vols.filter((v) => v.eleveId === id)).sort((a, b) => b.date.localeCompare(a.date));
  const aPayer = totalAPayer(attente, data.reglages.tarifs);
  const carnet = volsDuCarnet(id, data.vols).reverse();

  const exporter = async () => {
    setMsgExport(null);
    try {
      const r = await exporterCarnet(eleve, data);
      if (r === 'apercu') setMsgExport('Dans l’aperçu web, l’export PDF n’est pas disponible : il fonctionne dans l’app installée.');
    } catch (e) {
      setMsgExport(`Export impossible : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const CarteVol = ({ v }: { v: Vol }) => (
    <Carte onPress={() => nav.ouvrir({ ecran: 'formVol', eleveId: id, id: v.id })}>
      <Ligne style={{ justifyContent: 'space-between' }}>
        <T gras>{formatDate(v.date)}</T>
        <T couleur={v.type === 'altitude' ? C.primaire : C.doux}>
          {v.nombre} × {v.type === 'altitude' ? 'grand vol' : 'pente école'}
        </T>
      </Ligne>
      <T doux>{nomSite(v.decollageId)} → {nomSite(v.atterrissageId)}</T>
      <T doux>Moniteur : {nomMoniteur(v.moniteurId)}</T>
      {!!v.conditions && <T doux>Conditions : {v.conditions}</T>}
      {!!v.remarques && <T>{v.remarques}</T>}
      <Ligne style={{ justifyContent: 'space-between' }}>
        {estPaye(v) ? <StatutPaiement vol={v} /> : <T gras couleur={C.orange}>{formatCHF(prixVol(v, data.reglages.tarifs))} à payer</T>}
        {v.saisiPar === 'eleve' && <T doux taille={12}>noté par l’élève</T>}
      </Ligne>
    </Carte>
  );
  const nomSite = (sid?: string) => data.reglages.sites.find((s) => s.id === sid)?.nom ?? '—';
  const nomMoniteur = (mid?: string) => {
    const m = data.moniteurs.find((x) => x.id === mid);
    return m ? `${m.prenom} ${m.nom}` : '—';
  };
  const moniteurId = session?.role === 'moniteur' ? session.id : undefined;

  const basculerCompetence = (competenceId: string) => {
    if (lectureSeule) return;
    const actuel = niveauCompetence(data.validations, id, competenceId) ?? 'none';
    const suivant = SUIVANT[actuel];
    if (!suivant) supprimer('validation', `${id}:${competenceId}`);
    else enregistrer('validation', { eleveId: id, competenceId, niveau: suivant, moniteurId, date: aujourdhui() });
  };

  const basculerBranche = (brancheId: string) => {
    if (lectureSeule) return;
    const branches = { ...eleve.examenTheorique.branches, [brancheId]: !eleve.examenTheorique.branches[brancheId] };
    enregistrer('eleve', { ...eleve, examenTheorique: { ...eleve.examenTheorique, branches } });
  };

  return (
    <Ecran
      titre={lectureSeule ? 'Ma formation' : `${eleve.prenom} ${eleve.nom}`}
      action={!lectureSeule && <Bouton petit variante="contour" titre="Modifier" onPress={() => nav.ouvrir({ ecran: 'formEleve', id })} />}
    >
      <Ligne>
        <Puce texte="Progression" actif={onglet === 'progression'} onPress={() => setOnglet('progression')} />
        <Puce texte={`Vols${attente.length ? ` · ${attente.length} à valider` : ''}`} actif={onglet === 'vols'} onPress={() => setOnglet('vols')} />
        <Puce texte="Compétences" actif={onglet === 'competences'} onPress={() => setOnglet('competences')} />
        <Puce texte="Infos" actif={onglet === 'infos'} onPress={() => setOnglet('infos')} />
      </Ligne>

      {alertesEleve(eleve).map((a) => <Alerte key={a.texte} {...a} />)}

      {onglet === 'progression' && (
        <>
          <Carte>
            <T gras taille={17}>
              {p.pretExamenPratique ? '✅ Prêt pour l’examen pratique' : `Progression globale ${Math.round(p.pourcentage * 100)} %`}
            </T>
            <Barre valeur={p.pourcentage} couleur={p.pretExamenPratique ? C.vert : C.primaire} />
          </Carte>
          {p.criteres.map((c) => (
            <Carte key={c.libelle}>
              <Ligne style={{ justifyContent: 'space-between' }}>
                <T>{c.libelle}</T>
                <T gras couleur={c.ok ? C.vert : C.texte}>{c.actuel} / {c.requis}</T>
              </Ligne>
              <Barre valeur={c.requis ? c.actuel / c.requis : 1} couleur={c.ok ? C.vert : C.primaire} />
            </Carte>
          ))}
          <Titre>Examen théorique</Titre>
          <Carte>
            <Ligne>
              {BRANCHES_THEORIE.map((b) => (
                <Puce
                  key={b.id}
                  texte={`${eleve.examenTheorique.branches[b.id] ? '✓ ' : ''}${b.libelle}`}
                  actif={!!eleve.examenTheorique.branches[b.id]}
                  couleur={C.vert}
                  onPress={() => basculerBranche(b.id)}
                />
              ))}
            </Ligne>
            {!lectureSeule && <T doux taille={13}>Touchez une branche pour la marquer réussie.</T>}
          </Carte>
          <Titre>Examen pratique</Titre>
          <Carte>
            <T>
              {eleve.examenPratique?.reussi
                ? `Réussi le ${formatDate(eleve.examenPratique.date)}`
                : 'Pas encore passé'}
            </T>
            {!lectureSeule && !eleve.examenPratique?.reussi && p.pretExamenPratique && (
              <Bouton
                titre="Marquer l’examen pratique réussi"
                onPress={() => enregistrer('eleve', { ...eleve, examenPratique: { reussi: true, date: aujourdhui() } })}
              />
            )}
          </Carte>
        </>
      )}

      {onglet === 'vols' && (
        <>
          <Bouton titre={lectureSeule ? '+ Noter mes vols' : '+ Ajouter des vols'} onPress={() => nav.ouvrir({ ecran: 'formVol', eleveId: id })} />

          <Titre>À valider ({attente.length})</Titre>
          {attente.length === 0 ? (
            <T doux>Aucun vol en attente.</T>
          ) : (
            <Carte style={{ borderColor: C.orange }}>
              <Ligne style={{ justifyContent: 'space-between' }}>
                <T gras>Total à payer</T>
                <T gras taille={20} couleur={C.orange}>{formatCHF(aPayer)}</T>
              </Ligne>
              <T doux taille={13}>
                {lectureSeule
                  ? 'À régler auprès du moniteur du jour. Vos vols entrent dans votre carnet dès qu’il les valide.'
                  : 'Encaissez puis validez : les vols entrent dans le carnet de l’élève.'}
              </T>
              {!lectureSeule && <Bouton titre="Encaisser et valider" onPress={() => nav.ouvrir({ ecran: 'encaisser', eleveId: id })} />}
            </Carte>
          )}
          {attente.map((v) => <CarteVol key={v.id} v={v} />)}

          <Titre>Carnet de vol ({carnet.length})</Titre>
          <Bouton variante="contour" titre="📄 Exporter le carnet en PDF" onPress={exporter} />
          {msgExport && <T doux taille={13}>{msgExport}</T>}
          {carnet.length === 0 && <T doux>Aucun vol validé pour l’instant.</T>}
          {carnet.map((v) => <CarteVol key={v.id} v={v} />)}
        </>
      )}

      {onglet === 'competences' && (
        <>
          <Ligne>
            <Puce texte="Non vu" />
            <Puce texte="Vu" actif couleur={C.orange} />
            <Puce texte="Acquis" actif couleur={C.vert} />
          </Ligne>
          {!lectureSeule && <T doux taille={13}>Touchez une compétence pour passer à l’état suivant.</T>}
          {data.reglages.etapes.map((etape) => (
            <View key={etape.id} style={{ gap: 8 }}>
              <Titre>{etape.titre}</Titre>
              <Carte>
                <Ligne>
                  {etape.competences.map((c) => {
                    const n = niveauCompetence(data.validations, id, c.id);
                    return (
                      <Puce
                        key={c.id}
                        texte={c.libelle}
                        actif={!!n}
                        couleur={n === 'acquis' ? C.vert : n === 'vu' ? C.orange : C.doux}
                        onPress={() => basculerCompetence(c.id)}
                      />
                    );
                  })}
                </Ligne>
              </Carte>
            </View>
          ))}
        </>
      )}

      {onglet === 'infos' && (
        <>
          <Carte>
            <Info l="N° FSVL" v={eleve.numeroFSVL} />
            <Info l="Date de naissance" v={formatDate(eleve.dateNaissance)} />
            <Info l="Téléphone" v={eleve.tel} />
            <Info l="E-mail" v={eleve.email} />
            <Info l="Début de formation" v={formatDate(eleve.dateDebut)} />
            <Info l="Moniteur référent" v={nomMoniteur(eleve.moniteurRefId)} />
            <Info l="Autorisation d’élève valable jusqu’au" v={formatDate(eleve.permisEleveValidite)} />
            {!!eleve.notes && !lectureSeule && <Info l="Notes" v={eleve.notes} />}
          </Carte>
          {!lectureSeule && mode === 'supabase' && ecoleId && (
            <>
              <Titre>Accès à l’application</Titre>
              <Carte>
                <T doux>L’élève pourra se connecter avec cette adresse et verra sa progression et son planning.</T>
                <Champ
                  label="E-mail de l’élève"
                  value={emailInvit || eleve.email || ''}
                  onChangeText={setEmailInvit}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Bouton
                  titre="Inviter l’élève"
                  onPress={async () => {
                    const email = (emailInvit || eleve.email || '').trim();
                    if (!email.includes('@')) return informer('Adresse e-mail invalide');
                    try {
                      await sb.inviter(ecoleId, email, 'eleve', eleve.id);
                      informer(`Invitation enregistrée pour ${email}.`);
                    } catch (e) {
                      informer(e instanceof Error ? e.message : String(e));
                    }
                  }}
                />
              </Carte>
            </>
          )}
        </>
      )}
    </Ecran>
  );
}

function Info({ l, v }: { l: string; v?: string }) {
  return (
    <Ligne style={{ justifyContent: 'space-between' }}>
      <T doux>{l}</T>
      <T>{v || '—'}</T>
    </Ligne>
  );
}
