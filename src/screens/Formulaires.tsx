import { useState } from 'react';
import { aujourdhui, dateValide, nouvelId } from '../lib/defaults';
import type { Eleve, Id, Moniteur, Orientation, Seance, Site, StatutSeance, TypeVol, Vol } from '../lib/types';
import { useApp } from '../state/AppContext';
import { Alerte, Bouton, Carte, Champ, confirmer, Ecran, Ligne, Puce, T, Titre } from '../ui/kit';
import { useNav } from '../ui/nav';

function useErreur() {
  const [erreur, setErreur] = useState<string | null>(null);
  return { erreur, setErreur, affichage: erreur ? <Alerte niveau="rouge" texte={erreur} /> : null };
}

const dateOuVide = (s?: string) => !s || dateValide(s);

function ChoixMoniteur({ valeur, onChange }: { valeur?: Id; onChange: (id?: Id) => void }) {
  const { data } = useApp();
  return (
    <>
      <T doux taille={13}>Moniteur</T>
      <Ligne>
        {data.moniteurs.map((m) => (
          <Puce key={m.id} texte={m.prenom} actif={valeur === m.id} onPress={() => onChange(valeur === m.id ? undefined : m.id)} />
        ))}
      </Ligne>
    </>
  );
}

function ChoixSite({ valeur, onChange }: { valeur?: Id; onChange: (id?: Id) => void }) {
  const { data } = useApp();
  if (data.reglages.sites.length === 0) return <T doux>Ajoutez des sites dans Réglages.</T>;
  return (
    <>
      <T doux taille={13}>Site</T>
      <Ligne>
        {data.reglages.sites.map((s) => (
          <Puce key={s.id} texte={s.nom} actif={valeur === s.id} onPress={() => onChange(valeur === s.id ? undefined : s.id)} />
        ))}
      </Ligne>
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
    for (const [l, d] of [['Début', e.dateDebut], ['Naissance', e.dateNaissance], ['Assurance', e.assuranceValidite], ['Autorisation', e.permisEleveValidite]] as const)
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
        <Champ label="Assurance valable jusqu’au (AAAA-MM-JJ)" value={e.assuranceValidite ?? ''} onChangeText={(v) => maj({ assuranceValidite: v || undefined })} />
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

export function FormVol({ eleveId, id }: { eleveId: Id; id?: Id }) {
  const { data, enregistrer, supprimer, session } = useApp();
  const nav = useNav();
  const existant = data.vols.find((v) => v.id === id);
  const [v, setV] = useState<Vol>(
    existant ?? {
      id: 'v-' + nouvelId(),
      eleveId,
      date: aujourdhui(),
      type: 'altitude',
      nombre: 1,
      moniteurId: session?.role === 'moniteur' ? session.id : undefined,
    },
  );
  const [nombre, setNombre] = useState(String(v.nombre));
  const { setErreur, affichage } = useErreur();
  const maj = (p: Partial<Vol>) => setV({ ...v, ...p });

  const valider = async () => {
    if (!dateValide(v.date)) return setErreur('Date au format AAAA-MM-JJ.');
    const n = parseInt(nombre, 10);
    if (!(n >= 1 && n <= 200)) return setErreur('Nombre de vols entre 1 et 200.');
    await enregistrer('vol', { ...v, nombre: n });
    nav.retour();
  };

  return (
    <Ecran titre={existant ? 'Modifier le vol' : 'Ajouter des vols'}>
      <Carte>
        <Ligne>
          {(['altitude', 'pente'] as TypeVol[]).map((t) => (
            <Puce key={t} texte={t === 'altitude' ? 'Grand vol' : 'Pente école'} actif={v.type === t} onPress={() => maj({ type: t })} />
          ))}
        </Ligne>
        <Champ label="Date (AAAA-MM-JJ)" value={v.date} onChangeText={(d) => maj({ date: d })} />
        <Champ label="Nombre de vols" value={nombre} onChangeText={setNombre} keyboardType="number-pad" />
        <ChoixSite valeur={v.siteId} onChange={(s) => maj({ siteId: s })} />
        <ChoixMoniteur valeur={v.moniteurId} onChange={(m) => maj({ moniteurId: m })} />
        <Champ label="Conditions (vent, thermique…)" value={v.conditions ?? ''} onChangeText={(t) => maj({ conditions: t || undefined })} />
        <Champ label="Remarques / exercices" value={v.remarques ?? ''} onChangeText={(t) => maj({ remarques: t || undefined })} multiline />
      </Carte>
      {affichage}
      <Bouton titre="Enregistrer" onPress={valider} />
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
        <ChoixSite valeur={s.siteId} onChange={(x) => maj({ siteId: x })} />
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

export function FormSite({ id }: { id?: Id }) {
  const { data, enregistrer } = useApp();
  const nav = useNav();
  const existant = data.reglages.sites.find((s) => s.id === id);
  const [nom, setNom] = useState(existant?.nom ?? '');
  const [lat, setLat] = useState(existant ? String(existant.lat) : '');
  const [lon, setLon] = useState(existant ? String(existant.lon) : '');
  const [alt, setAlt] = useState(existant ? String(existant.altitude) : '');
  const [orient, setOrient] = useState<Orientation[]>(existant?.orientations ?? []);
  const { setErreur, affichage } = useErreur();

  const ecrireSites = (sites: Site[]) => enregistrer('reglages', { ...data.reglages, sites });

  const valider = async () => {
    const la = parseFloat(lat.replace(',', '.'));
    const lo = parseFloat(lon.replace(',', '.'));
    const al = parseInt(alt, 10);
    if (!nom.trim()) return setErreur('Nom obligatoire.');
    if (!(la >= 45 && la <= 48.5 && lo >= 5 && lo <= 11)) return setErreur('Coordonnées hors de Suisse (latitude 45–48.5, longitude 5–11).');
    if (!(al >= 0 && al <= 4800)) return setErreur('Altitude en mètres (0–4800).');
    const site: Site = { id: existant?.id ?? 'site-' + nouvelId(), nom: nom.trim(), lat: la, lon: lo, altitude: al, orientations: orient };
    await ecrireSites(existant ? data.reglages.sites.map((s) => (s.id === site.id ? site : s)) : [...data.reglages.sites, site]);
    nav.retour();
  };

  return (
    <Ecran titre={existant ? 'Modifier le site' : 'Nouveau site'}>
      <Carte>
        <Champ label="Nom (décollage)" value={nom} onChangeText={setNom} />
        <Champ label="Latitude (ex. 46.6978)" value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
        <Champ label="Longitude (ex. 7.8008)" value={lon} onChangeText={setLon} keyboardType="decimal-pad" />
        <Champ label="Altitude du décollage (m)" value={alt} onChangeText={setAlt} keyboardType="number-pad" />
        <T doux taille={13}>Orientations du décollage (vent favorable)</T>
        <Ligne>
          {ORIENTATIONS.map((o) => (
            <Puce key={o} texte={LIBELLE_ORIENTATION[o]} actif={orient.includes(o)} onPress={() => setOrient(orient.includes(o) ? orient.filter((x) => x !== o) : [...orient, o])} />
          ))}
        </Ligne>
        <T doux taille={13}>Astuce : coordonnées visibles sur map.geo.admin.ch (clic droit sur le décollage).</T>
      </Carte>
      {affichage}
      <Bouton titre="Enregistrer" onPress={valider} />
      {existant && (
        <Bouton
          variante="danger"
          titre="Supprimer le site"
          onPress={async () => {
            if (!(await confirmer(`Supprimer le site ${existant.nom} ?`))) return;
            await ecrireSites(data.reglages.sites.filter((s) => s.id !== existant.id));
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
