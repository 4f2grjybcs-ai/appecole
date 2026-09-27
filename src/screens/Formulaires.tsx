import { useState } from 'react';
import { View } from 'react-native';
import { aujourdhui, dateValide, formatDate, nouvelId } from '../lib/defaults';
import { libellesExercices } from '../lib/fsvl';
import { formatCHF, libelleMoyen, MOYENS, prixVol } from '../lib/paiements';
import type { Eleve, Id, Moniteur, MoyenPaiement, Orientation, Seance, Site, StatutSeance, TypeSite, TypeVol, Vol } from '../lib/types';
import { useApp } from '../state/AppContext';
import { Alerte, Bouton, C, Carte, Champ, confirmer, Ecran, Ligne, Puce, T, Titre } from '../ui/kit';
import { useNav } from '../ui/nav';

function useErreur() {
  const [erreur, setErreur] = useState<string | null>(null);
  return { erreur, setErreur, affichage: erreur ? <Alerte niveau="rouge" texte={erreur} /> : null };
}

const dateOuVide = (s?: string) => !s || dateValide(s);

function ChoixMoniteur({ valeur, onChange, libelle = 'Moniteur' }: { valeur?: Id; onChange: (id?: Id) => void; libelle?: string }) {
  const { data } = useApp();
  return (
    <>
      <T doux taille={13}>{libelle}</T>
      <Ligne>
        {data.moniteurs.map((m) => (
          <Puce key={m.id} texte={m.prenom} actif={valeur === m.id} onPress={() => onChange(valeur === m.id ? undefined : m.id)} />
        ))}
      </Ligne>
    </>
  );
}

function ChoixSite({ type, valeur, onChange }: { type: TypeSite; valeur?: Id; onChange: (id?: Id) => void }) {
  const { data } = useApp();
  const sites = data.reglages.sites.filter((s) => s.type === type);
  const libelle = type === 'decollage' ? 'Décollage' : 'Atterrissage';
  return (
    <>
      <T doux taille={13}>{libelle}</T>
      {sites.length === 0 ? (
        <T doux>Ajoutez des {type === 'decollage' ? 'décollages' : 'atterrissages'} dans Réglages.</T>
      ) : (
        <Ligne>
          {sites.map((s) => (
            <Puce key={s.id} texte={s.nom} actif={valeur === s.id} onPress={() => onChange(valeur === s.id ? undefined : s.id)} />
          ))}
        </Ligne>
      )}
    </>
  );
}

/** Choix décollage + atterrissage ; l'atterrissage habituel du décollage est proposé automatiquement. */
function ChoixTrajet({ decollageId, atterrissageId, onChange }: {
  decollageId?: Id;
  atterrissageId?: Id;
  onChange: (p: { decollageId?: Id; atterrissageId?: Id }) => void;
}) {
  const { data } = useApp();
  return (
    <>
      <ChoixSite
        type="decollage"
        valeur={decollageId}
        onChange={(d) => {
          const habituels = data.reglages.sites.find((s) => s.id === d)?.atterrissageIds ?? [];
          const garder = atterrissageId && (habituels.length === 0 || habituels.includes(atterrissageId));
          onChange({ decollageId: d, atterrissageId: garder ? atterrissageId : habituels[0] });
        }}
      />
      <ChoixSite type="atterrissage" valeur={atterrissageId} onChange={(a) => onChange({ decollageId, atterrissageId: a })} />
    </>
  );
}

export function FormEleve({ id }: { id?: Id }) {
  const { data, enregistrer, supprimer, session } = useApp();
  const nav = useNav();
  const existant = data.eleves.find((e) => e.id === id);
  const [e, setE] = useState<Eleve>(
    existant ?? {
      id: 'e-' + nouvelId(),
      prenom: '',
      nom: '',
      dateDebut: aujourdhui(),
      moniteurRefId: session?.role === 'moniteur' ? session.id : undefined,
      examenTheorique: { branches: {} },
      actif: true,
    },
  );
  const { setErreur, affichage } = useErreur();
  const maj = (p: Partial<Eleve>) => setE({ ...e, ...p });

  const valider = async () => {
    if (!e.prenom.trim() || !e.nom.trim()) return setErreur('Prénom et nom sont obligatoires.');
    for (const [l, d] of [['Début', e.dateDebut], ['Naissance', e.dateNaissance], ['Autorisation', e.permisEleveValidite]] as const)
      if (!dateOuVide(d)) return setErreur(`${l} : date au format AAAA-MM-JJ.`);
    await enregistrer('eleve', { ...e, prenom: e.prenom.trim(), nom: e.nom.trim() });
    nav.retour();
  };

  return (
    <Ecran titre={existant ? 'Modifier l’élève' : 'Nouvel élève'}>
      <Carte>
        <Champ label="Prénom *" value={e.prenom} onChangeText={(v) => maj({ prenom: v })} />
        <Champ label="Nom *" value={e.nom} onChangeText={(v) => maj({ nom: v })} />
        <Champ label="Date de naissance (AAAA-MM-JJ)" value={e.dateNaissance ?? ''} onChangeText={(v) => maj({ dateNaissance: v || undefined })} />
        <Champ label="E-mail" value={e.email ?? ''} onChangeText={(v) => maj({ email: v || undefined })} autoCapitalize="none" keyboardType="email-address" />
        <Champ label="Téléphone" value={e.tel ?? ''} onChangeText={(v) => maj({ tel: v || undefined })} keyboardType="phone-pad" />
      </Carte>
      <Titre>Formation</Titre>
      <Carte>
        <Champ label="N° de membre FSVL" value={e.numeroFSVL ?? ''} onChangeText={(v) => maj({ numeroFSVL: v || undefined })} />
        <Champ label="Début de formation (AAAA-MM-JJ)" value={e.dateDebut} onChangeText={(v) => maj({ dateDebut: v })} />
        <Champ label="Autorisation d’élève valable jusqu’au (AAAA-MM-JJ)" value={e.permisEleveValidite ?? ''} onChangeText={(v) => maj({ permisEleveValidite: v || undefined })} />
        <ChoixMoniteur valeur={e.moniteurRefId} onChange={(m) => maj({ moniteurRefId: m })} />
        <Champ label="Notes internes (non visibles par l’élève)" value={e.notes ?? ''} onChangeText={(v) => maj({ notes: v || undefined })} multiline />
      </Carte>
      {affichage}
      <Bouton titre="Enregistrer" onPress={valider} />
      {existant && (
        <>
          <Bouton
            variante="contour"
            titre={e.actif ? 'Archiver (formation terminée)' : 'Réactiver'}
            onPress={async () => {
              await enregistrer('eleve', { ...existant, actif: !existant.actif });
              nav.retour();
            }}
          />
          <Bouton
            variante="danger"
            titre="Supprimer l’élève et ses vols"
            onPress={async () => {
              if (!(await confirmer(`Supprimer définitivement ${existant.prenom} ${existant.nom} ?`))) return;
              for (const v of data.vols.filter((x) => x.eleveId === existant.id)) await supprimer('vol', v.id);
              for (const v of data.validations.filter((x) => x.eleveId === existant.id))
                await supprimer('validation', `${v.eleveId}:${v.competenceId}`);
              await supprimer('eleve', existant.id);
              nav.retour();
              nav.retour();
            }}
          />
        </>
      )}
    </Ecran>
  );
}

/** Un vol tel qu'il est saisi dans le formulaire (chaque vol est noté séparément). */
interface VolSaisi {
  cle: string;
  decollageId?: Id;
  atterrissageId?: Id;
  /** Pente école : nombre de vols de la séance */
  nombre: string;
  navettes: string;
  remarques: string;
  exercices: string[];
}

const entier = (t: string) => (t.trim() === '' ? 0 : parseInt(t, 10));

function ChoixExercices({ valeur, onChange }: { valeur: string[]; onChange: (ids: string[]) => void }) {
  const { data } = useApp();
  const [ouvert, setOuvert] = useState(false);
  const choisis = libellesExercices(valeur, data.reglages.etapes);
  return (
    <View style={{ gap: 6 }}>
      <Ligne style={{ justifyContent: 'space-between' }}>
        <T doux taille={13}>Exercices {choisis.length ? `(${choisis.length})` : ''}</T>
        <Bouton petit variante="contour" titre={ouvert ? 'Fermer' : 'Choisir'} onPress={() => setOuvert(!ouvert)} />
      </Ligne>
      {!ouvert && choisis.length > 0 && <T>{choisis.join(' · ')}</T>}
      {ouvert &&
        data.reglages.etapes.map((e) => (
          <View key={e.id} style={{ gap: 4 }}>
            <T doux taille={12}>{e.titre}</T>
            <Ligne>
              {e.competences.map((c) => {
                const actif = valeur.includes(c.id);
                return (
                  <Puce
                    key={c.id}
                    texte={c.libelle}
                    actif={actif}
                    onPress={() => onChange(actif ? valeur.filter((x) => x !== c.id) : [...valeur, c.id])}
                  />
                );
              })}
            </Ligne>
          </View>
        ))}
    </View>
  );
}

export function FormVol({ eleveId, id }: { eleveId: Id; id?: Id }) {
  const { data, enregistrer, supprimer, session } = useApp();
  const nav = useNav();
  const estMoniteur = session?.role === 'moniteur';
  const existant = data.vols.find((v) => v.id === id);
  const [v, setV] = useState<Vol>(
    existant ?? {
      id: 'v-' + nouvelId(),
      eleveId,
      date: aujourdhui(),
      type: 'altitude',
      nombre: 1,
      moniteurId: estMoniteur ? session.id : undefined,
      saisiPar: estMoniteur ? 'moniteur' : 'eleve',
    },
  );
  const [vols, setVols] = useState<VolSaisi[]>([
    {
      cle: v.id,
      decollageId: v.decollageId,
      atterrissageId: v.atterrissageId,
      nombre: String(v.nombre),
      navettes: v.navettes ? String(v.navettes) : '',
      remarques: v.remarques ?? '',
      exercices: v.exercices ?? [],
    },
  ]);
  const [paye, setPaye] = useState(v.paiement?.paye ?? false);
  const [montant, setMontant] = useState(v.paiement?.montant !== undefined ? String(v.paiement.montant) : '');
  const [moyen, setMoyen] = useState<MoyenPaiement | undefined>(v.paiement?.moyen);
  const { setErreur, affichage } = useErreur();
  const maj = (p: Partial<Vol>) => setV({ ...v, ...p });
  const majVol = (i: number, p: Partial<VolSaisi>) => setVols(vols.map((t, j) => (j === i ? { ...t, ...p } : t)));
  /** Un élève ne modifie plus un vol validé (encaissé) par le moniteur. */
  const verrouille = !estMoniteur && !!existant?.paiement;
  const plusieurs = vols.length > 1;
  const pente = v.type === 'pente';
  const libelleVol = pente ? 'Séance' : 'Vol';

  const volsAEnregistrer = (): Vol[] | string => {
    const r: Vol[] = [];
    for (const [i, t] of vols.entries()) {
      // Un grand vol est toujours noté seul ; en pente école, une séance peut compter plusieurs vols.
      const n = pente ? entier(t.nombre) : existant?.type === 'altitude' ? existant.nombre : 1;
      const nb = entier(t.navettes);
      const quel = plusieurs ? ` (${libelleVol.toLowerCase()} ${i + 1})` : '';
      if (!(n >= 1 && n <= 200)) return `Nombre de vols entre 1 et 200${quel}.`;
      if (!(nb >= 0 && nb <= 50)) return `Nombre de navettes entre 0 et 50${quel}.`;
      r.push({
        ...v,
        id: i === 0 ? v.id : 'v-' + nouvelId() + i,
        decollageId: t.decollageId,
        atterrissageId: t.atterrissageId,
        nombre: n,
        navettes: nb || undefined,
        remarques: t.remarques.trim() || undefined,
        exercices: t.exercices.length ? t.exercices : undefined,
      });
    }
    return r;
  };

  const aEnregistrer = volsAEnregistrer();
  const estimation =
    typeof aEnregistrer === 'string' ? undefined : aEnregistrer.reduce((s, x) => s + prixVol(x, data.reglages.tarifs), 0);

  const valider = async () => {
    if (!dateValide(v.date)) return setErreur('Date au format AAAA-MM-JJ.');
    if (typeof aEnregistrer === 'string') return setErreur(aEnregistrer);
    let paiement = v.paiement;
    if (estMoniteur) {
      if (paye) {
        const m = parseFloat(montant.replace(',', '.'));
        if (!(m >= 0 && m <= 10000)) return setErreur('Montant payé en CHF (ex. 50 ou 42.50).');
        if (!moyen) return setErreur('Choisissez le moyen de paiement.');
        paiement = { paye: true, montant: m, moyen, moniteurId: session.id, date: v.paiement?.paye ? v.paiement.date : aujourdhui() };
      } else {
        paiement = undefined;
      }
    }
    for (const x of aEnregistrer) await enregistrer('vol', { ...x, paiement: plusieurs ? undefined : paiement });
    nav.retour();
  };

  if (verrouille && existant) {
    const exercices = libellesExercices(existant.exercices, data.reglages.etapes);
    return (
      <Ecran titre="Vol">
        <Carte>
          <T gras>{formatDate(existant.date)} · {existant.type === 'altitude' ? 'Grand vol' : `Pente école · ${existant.nombre} vols`}</T>
          {!!existant.navettes && <T doux>🚐 {existant.navettes} navette{existant.navettes > 1 ? 's' : ''}</T>}
          {exercices.length > 0 && <T>Exercices : {exercices.join(' · ')}</T>}
          {!!existant.remarques && <T>{existant.remarques}</T>}
          <StatutPaiement vol={existant} />
          <T doux>Ce vol a été validé par le moniteur et figure dans votre carnet ; il ne peut plus être modifié.</T>
        </Carte>
      </Ecran>
    );
  }

  return (
    <Ecran titre={existant ? 'Modifier le vol' : estMoniteur ? 'Ajouter des vols' : 'Noter mes vols'}>
      <Carte>
        <Ligne>
          {(['altitude', 'pente'] as TypeVol[]).map((t) => (
            <Puce key={t} texte={t === 'altitude' ? 'Grands vols' : 'Pente école'} actif={v.type === t} onPress={() => maj({ type: t })} />
          ))}
        </Ligne>
        <Champ label="Date (AAAA-MM-JJ)" value={v.date} onChangeText={(d) => maj({ date: d })} />
        <ChoixMoniteur libelle="Moniteur du jour" valeur={v.moniteurId} onChange={(m) => maj({ moniteurId: m })} />
        <Champ label="Conditions du jour (vent, thermique…)" value={v.conditions ?? ''} onChangeText={(x) => maj({ conditions: x || undefined })} />
      </Carte>

      {vols.map((t, i) => (
        <Carte key={t.cle}>
          <Ligne style={{ justifyContent: 'space-between' }}>
            <T gras taille={17}>{existant ? libelleVol : `${libelleVol} ${i + 1}`}</T>
            {plusieurs && <Bouton petit variante="danger" titre="Retirer" onPress={() => setVols(vols.filter((_, j) => j !== i))} />}
          </Ligne>
          <ChoixTrajet decollageId={t.decollageId} atterrissageId={t.atterrissageId} onChange={(p) => majVol(i, p)} />
          <Ligne style={{ flexWrap: 'nowrap' }}>
            {pente && (
              <View style={{ flex: 1 }}>
                <Champ label="Nombre de vols" value={t.nombre} onChangeText={(x) => majVol(i, { nombre: x })} keyboardType="number-pad" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Champ label="🚐 Navettes" value={t.navettes} onChangeText={(x) => majVol(i, { navettes: x })} keyboardType="number-pad" placeholder="0" />
            </View>
          </Ligne>
          <ChoixExercices valeur={t.exercices} onChange={(ids) => majVol(i, { exercices: ids })} />
          <Champ
            label="Commentaire"
            value={t.remarques}
            onChangeText={(x) => majVol(i, { remarques: x })}
            placeholder="Déroulement du vol, points à travailler…"
            multiline
          />
        </Carte>
      ))}
      {!existant && (
        <Bouton
          variante="contour"
          titre={pente ? '+ Autre séance ce jour-là' : '+ Ajouter un vol'}
          onPress={() => {
            const dernier = vols[vols.length - 1];
            setVols([
              ...vols,
              { cle: nouvelId(), decollageId: dernier?.decollageId, atterrissageId: dernier?.atterrissageId, nombre: '1', navettes: '', remarques: '', exercices: [] },
            ]);
          }}
        />
      )}

      <Titre>Paiement</Titre>
      {estMoniteur && !plusieurs ? (
        <Carte>
          <Ligne>
            <Puce texte="À valider" actif={!paye} couleur={C.orange} onPress={() => setPaye(false)} />
            <Puce
              texte="Payé et validé"
              actif={paye}
              couleur={C.vert}
              onPress={() => {
                setPaye(true);
                if (!montant && estimation) setMontant(String(estimation));
              }}
            />
          </Ligne>
          {paye && (
            <>
              <Champ label="Montant (CHF)" value={montant} onChangeText={setMontant} keyboardType="decimal-pad" />
              <T doux taille={13}>Moyen de paiement</T>
              <Ligne>
                {MOYENS.map((m) => (
                  <Puce key={m.id} texte={m.libelle} actif={moyen === m.id} onPress={() => setMoyen(m.id)} />
                ))}
              </Ligne>
            </>
          )}
        </Carte>
      ) : (
        <Carte>
          {estimation !== undefined && (
            <Ligne style={{ justifyContent: 'space-between' }}>
              <T>Total estimé ({vols.length} {pente ? 'séance' : 'vol'}{plusieurs ? 's' : ''})</T>
              <T gras couleur={C.orange}>{formatCHF(estimation)}</T>
            </Ligne>
          )}
          <T doux taille={13}>
            {estMoniteur
              ? 'Plusieurs vols : encaissez ensuite depuis « Encaisser et valider ».'
              : 'Le moniteur du jour encaisse puis valide : les vols entrent alors dans votre carnet.'}
          </T>
        </Carte>
      )}

      {affichage}
      <Bouton titre={plusieurs ? `Enregistrer les ${vols.length} ${pente ? 'séances' : 'vols'}` : 'Enregistrer'} onPress={valider} />
      {existant && (
        <Bouton
          variante="danger"
          titre="Supprimer"
          onPress={async () => {
            if (!(await confirmer('Supprimer ce vol ?'))) return;
            await supprimer('vol', existant.id);
            nav.retour();
          }}
        />
      )}
    </Ecran>
  );
}

export function StatutPaiement({ vol }: { vol: Vol }) {
  if (!vol.paiement?.paye) return <T gras couleur={C.orange}>À valider · à payer</T>;
  return (
    <T gras couleur={C.vert}>
      ✔ Validé · payé {vol.paiement.montant !== undefined ? formatCHF(vol.paiement.montant) : ''} · {libelleMoyen(vol.paiement.moyen)}
    </T>
  );
}

const STATUTS: { id: StatutSeance; libelle: string }[] = [
  { id: 'prevue', libelle: 'Prévue' },
  { id: 'confirmee', libelle: 'Confirmée' },
  { id: 'annulee', libelle: 'Annulée' },
];

export function FormSeance({ id }: { id?: Id }) {
  const { data, enregistrer, supprimer, session } = useApp();
  const nav = useNav();
  const existant = data.seances.find((s) => s.id === id);
  const [s, setS] = useState<Seance>(
    existant ?? {
      id: 's-' + nouvelId(),
      date: aujourdhui(),
      heureDebut: '09:00',
      heureFin: '12:00',
      titre: 'Grands vols',
      moniteurId: session?.role === 'moniteur' ? session.id : undefined,
      eleveIds: [],
      statut: 'prevue',
    },
  );
  const { setErreur, affichage } = useErreur();
  const maj = (p: Partial<Seance>) => setS({ ...s, ...p });
  const heure = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

  const valider = async () => {
    if (!s.titre.trim()) return setErreur('Titre obligatoire.');
    if (!dateValide(s.date)) return setErreur('Date au format AAAA-MM-JJ.');
    if (!heure(s.heureDebut) || !heure(s.heureFin)) return setErreur('Heures au format HH:MM.');
    await enregistrer('seance', s);
    nav.retour();
  };

  return (
    <Ecran titre={existant ? 'Modifier la séance' : 'Nouvelle séance'}>
      <Carte>
        <Ligne>
          {['Pente école', 'Grands vols', 'Théorie', 'Examen'].map((t) => (
            <Puce key={t} texte={t} actif={s.titre === t} onPress={() => maj({ titre: t })} />
          ))}
        </Ligne>
        <Champ label="Titre" value={s.titre} onChangeText={(t) => maj({ titre: t })} />
        <Champ label="Date (AAAA-MM-JJ)" value={s.date} onChangeText={(t) => maj({ date: t })} />
        <Ligne>
          <Carte style={{ flex: 1, padding: 0, borderWidth: 0 }}>
            <Champ label="Début (HH:MM)" value={s.heureDebut} onChangeText={(t) => maj({ heureDebut: t })} />
          </Carte>
          <Carte style={{ flex: 1, padding: 0, borderWidth: 0 }}>
            <Champ label="Fin (HH:MM)" value={s.heureFin} onChangeText={(t) => maj({ heureFin: t })} />
          </Carte>
        </Ligne>
        <ChoixTrajet decollageId={s.decollageId} atterrissageId={s.atterrissageId} onChange={maj} />
        <ChoixMoniteur valeur={s.moniteurId} onChange={(m) => maj({ moniteurId: m })} />
        <T doux taille={13}>Statut</T>
        <Ligne>
          {STATUTS.map((st) => (
            <Puce key={st.id} texte={st.libelle} actif={s.statut === st.id} onPress={() => maj({ statut: st.id })} />
          ))}
        </Ligne>
        <Champ label="Message aux élèves" value={s.note ?? ''} onChangeText={(t) => maj({ note: t || undefined })} multiline />
      </Carte>
      <Titre>Élèves inscrits ({s.eleveIds.length})</Titre>
      <Carte>
        <Ligne>
          {data.eleves.filter((e) => e.actif).map((e) => {
            const inscrit = s.eleveIds.includes(e.id);
            return (
              <Puce
                key={e.id}
                texte={`${e.prenom} ${e.nom}`}
                actif={inscrit}
                onPress={() => maj({ eleveIds: inscrit ? s.eleveIds.filter((x) => x !== e.id) : [...s.eleveIds, e.id] })}
              />
            );
          })}
        </Ligne>
      </Carte>
      {affichage}
      <Bouton titre="Enregistrer" onPress={valider} />
      {existant && (
        <Bouton
          variante="danger"
          titre="Supprimer la séance"
          onPress={async () => {
            if (!(await confirmer('Supprimer cette séance ?'))) return;
            await supprimer('seance', existant.id);
            nav.retour();
          }}
        />
      )}
    </Ecran>
  );
}

const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const LIBELLE_ORIENTATION: Record<Orientation, string> = {
  N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SW: 'SO', W: 'O', NW: 'NO',
};

export function FormSite({ type, id }: { type: TypeSite; id?: Id }) {
  const { data, enregistrer } = useApp();
  const nav = useNav();
  const existant = data.reglages.sites.find((s) => s.id === id);
  const estDecollage = (existant?.type ?? type) === 'decollage';
  const [nom, setNom] = useState(existant?.nom ?? '');
  const [lat, setLat] = useState(existant ? String(existant.lat) : '');
  const [lon, setLon] = useState(existant ? String(existant.lon) : '');
  const [alt, setAlt] = useState(existant ? String(existant.altitude) : '');
  const [orient, setOrient] = useState<Orientation[]>(existant?.orientations ?? []);
  const [atterrissages, setAtterrissages] = useState<Id[]>(existant?.atterrissageIds ?? []);
  const { setErreur, affichage } = useErreur();
  const disponibles = data.reglages.sites.filter((s) => s.type === 'atterrissage');
  const libelle = estDecollage ? 'décollage' : 'atterrissage';

  const ecrireSites = (sites: Site[]) => enregistrer('reglages', { ...data.reglages, sites });

  const valider = async () => {
    const la = parseFloat(lat.replace(',', '.'));
    const lo = parseFloat(lon.replace(',', '.'));
    const al = parseInt(alt, 10);
    if (!nom.trim()) return setErreur('Nom obligatoire.');
    if (!(la >= 45 && la <= 48.5 && lo >= 5 && lo <= 11)) return setErreur('Coordonnées hors de Suisse (latitude 45–48.5, longitude 5–11).');
    if (!(al >= 0 && al <= 4800)) return setErreur('Altitude en mètres (0–4800).');
    const site: Site = {
      id: existant?.id ?? (estDecollage ? 'dec-' : 'att-') + nouvelId(),
      type: estDecollage ? 'decollage' : 'atterrissage',
      nom: nom.trim(),
      lat: la,
      lon: lo,
      altitude: al,
      orientations: estDecollage ? orient : [],
      ...(estDecollage && { atterrissageIds: atterrissages }),
    };
    await ecrireSites(existant ? data.reglages.sites.map((s) => (s.id === site.id ? site : s)) : [...data.reglages.sites, site]);
    nav.retour();
  };

  return (
    <Ecran titre={existant ? `Modifier le ${libelle}` : `Nouveau ${libelle}`}>
      <Carte>
        <Champ label={`Nom du ${libelle}`} value={nom} onChangeText={setNom} />
        <Champ label="Latitude (ex. 46.6978)" value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
        <Champ label="Longitude (ex. 7.8008)" value={lon} onChangeText={setLon} keyboardType="decimal-pad" />
        <Champ label="Altitude (m)" value={alt} onChangeText={setAlt} keyboardType="number-pad" />
        {estDecollage && (
          <>
            <T doux taille={13}>Orientations du décollage (vent favorable)</T>
            <Ligne>
              {ORIENTATIONS.map((o) => (
                <Puce key={o} texte={LIBELLE_ORIENTATION[o]} actif={orient.includes(o)} onPress={() => setOrient(orient.includes(o) ? orient.filter((x) => x !== o) : [...orient, o])} />
              ))}
            </Ligne>
            <T doux taille={13}>Atterrissages habituels</T>
            {disponibles.length === 0 ? (
              <T doux>Ajoutez d’abord des atterrissages dans Réglages.</T>
            ) : (
              <Ligne>
                {disponibles.map((a) => (
                  <Puce
                    key={a.id}
                    texte={a.nom}
                    actif={atterrissages.includes(a.id)}
                    onPress={() => setAtterrissages(atterrissages.includes(a.id) ? atterrissages.filter((x) => x !== a.id) : [...atterrissages, a.id])}
                  />
                ))}
              </Ligne>
            )}
          </>
        )}
        <T doux taille={13}>Astuce : coordonnées visibles sur map.geo.admin.ch (clic droit sur le lieu).</T>
      </Carte>
      {affichage}
      <Bouton titre="Enregistrer" onPress={valider} />
      {existant && (
        <Bouton
          variante="danger"
          titre={`Supprimer ce ${libelle}`}
          onPress={async () => {
            if (!(await confirmer(`Supprimer ${existant.nom} ?`))) return;
            await ecrireSites(
              data.reglages.sites
                .filter((s) => s.id !== existant.id)
                .map((s) => (s.atterrissageIds?.includes(existant.id) ? { ...s, atterrissageIds: s.atterrissageIds.filter((x) => x !== existant.id) } : s)),
            );
            nav.retour();
          }}
        />
      )}
    </Ecran>
  );
}

export function FormMoniteur({ id }: { id?: Id }) {
  const { data, enregistrer, supprimer, session } = useApp();
  const nav = useNav();
  const existant = data.moniteurs.find((m) => m.id === id);
  const [m, setM] = useState<Moniteur>(existant ?? { id: 'm-' + nouvelId(), prenom: '', nom: '' });
  const { setErreur, affichage } = useErreur();

  return (
    <Ecran titre={existant ? 'Modifier le moniteur' : 'Nouveau moniteur'}>
      <Carte>
        <Champ label="Prénom *" value={m.prenom} onChangeText={(v) => setM({ ...m, prenom: v })} />
        <Champ label="Nom" value={m.nom} onChangeText={(v) => setM({ ...m, nom: v })} />
        <Champ label="E-mail" value={m.email ?? ''} onChangeText={(v) => setM({ ...m, email: v || undefined })} autoCapitalize="none" keyboardType="email-address" />
        <Champ label="Téléphone" value={m.tel ?? ''} onChangeText={(v) => setM({ ...m, tel: v || undefined })} keyboardType="phone-pad" />
      </Carte>
      {affichage}
      <Bouton
        titre="Enregistrer"
        onPress={async () => {
          if (!m.prenom.trim()) return setErreur('Prénom obligatoire.');
          await enregistrer('moniteur', m);
          nav.retour();
        }}
      />
      {existant && existant.id !== session?.id && (
        <Bouton
          variante="danger"
          titre="Supprimer"
          onPress={async () => {
            if (!(await confirmer(`Supprimer ${existant.prenom} ?`))) return;
            await supprimer('moniteur', existant.id);
            nav.retour();
          }}
        />
      )}
    </Ecran>
  );
}
