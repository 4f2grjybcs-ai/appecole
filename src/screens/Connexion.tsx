import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as sb from '../data/supabaseStore';
import { useApp } from '../state/AppContext';
import { Alerte, Bouton, C, Carte, Champ, Ecran, T, Titre } from '../ui/kit';

export function Connexion() {
  const { mode } = useApp();
  return mode === 'local' ? <ConnexionLocale /> : <ConnexionSupabase />;
}

function ConnexionLocale() {
  const { data, choisirProfil, chargerDemo, enregistrer } = useApp();
  const vide = data.moniteurs.length === 0 && data.eleves.length === 0;
  return (
    <Ecran titre={data.reglages.ecoleNom}>
      <Alerte
        niveau="orange"
        texte="Mode démo : les données restent sur cet appareil. Configurez Supabase pour partager moniteurs et élèves (voir README)."
      />
      {vide && (
        <Carte>
          <T>Aucune donnée pour l’instant.</T>
          <Bouton titre="Charger des données de démonstration" onPress={chargerDemo} />
          <Bouton
            variante="contour"
            titre="Commencer vide (je suis moniteur)"
            onPress={async () => {
              await enregistrer('moniteur', { id: 'm-local', prenom: 'Moniteur', nom: '' });
              await choisirProfil({ role: 'moniteur', id: 'm-local' });
            }}
          />
        </Carte>
      )}
      {data.moniteurs.length > 0 && <Titre>Je suis moniteur</Titre>}
      {data.moniteurs.map((m) => (
        <Carte key={m.id} onPress={() => choisirProfil({ role: 'moniteur', id: m.id })}>
          <T gras>{m.prenom} {m.nom}</T>
        </Carte>
      ))}
      {data.eleves.length > 0 && <Titre>Je suis élève</Titre>}
      {data.eleves.filter((e) => e.actif).map((e) => (
        <Carte key={e.id} onPress={() => choisirProfil({ role: 'eleve', id: e.id })}>
          <T gras>{e.prenom} {e.nom}</T>
        </Carte>
      ))}
    </Ecran>
  );
}

function ConnexionSupabase() {
  const { emailSansEcole, apresConnexion, creerEcole, deconnexion, erreur } = useApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [etape, setEtape] = useState<'motdepasse' | 'email' | 'code'>('motdepasse');
  const [motDePasse, setMotDePasse] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ecole, setEcole] = useState({ nom: '', prenom: '', nomFamille: '' });

  const executer = async (f: () => Promise<void>) => {
    setOccupe(true);
    setMsg(null);
    try {
      await f();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  };

  if (emailSansEcole) {
    return (
      <Ecran titre="Bienvenue">
        <Carte>
          <T>Connecté en tant que <T gras>{emailSansEcole}</T>.</T>
          <T doux>
            Ce compte n’est rattaché à aucune école. Si vous êtes élève ou moniteur, demandez à votre école
            de vous inviter avec cette adresse, puis touchez « Réessayer ».
          </T>
          <Bouton titre="Réessayer" onPress={() => executer(apresConnexion)} />
        </Carte>
        <Titre>Créer mon école (responsable)</Titre>
        <Carte>
          <Champ label="Nom de l’école" value={ecole.nom} onChangeText={(v) => setEcole({ ...ecole, nom: v })} />
          <Champ label="Votre prénom" value={ecole.prenom} onChangeText={(v) => setEcole({ ...ecole, prenom: v })} />
          <Champ label="Votre nom" value={ecole.nomFamille} onChangeText={(v) => setEcole({ ...ecole, nomFamille: v })} />
          <Bouton
            titre="Créer l’école"
            desactive={occupe || !ecole.nom.trim() || !ecole.prenom.trim()}
            onPress={() => executer(() => creerEcole(ecole.nom.trim(), ecole.prenom.trim(), ecole.nomFamille.trim()))}
          />
        </Carte>
        {(msg || erreur) && <Alerte niveau="rouge" texte={msg ?? erreur!} />}
        <Bouton variante="contour" titre="Se déconnecter" onPress={deconnexion} />
      </Ecran>
    );
  }

  return (
    <Ecran titre="Connexion">
      <Carte>
        <Champ
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {etape === 'motdepasse' && (
          <>
            <Champ
              label="Mot de passe"
              value={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />
            <Bouton
              titre="Se connecter"
              desactive={occupe || !email.includes('@') || !motDePasse}
              onPress={() => executer(async () => {
                await sb.connecterMotDePasse(email, motDePasse);
                await apresConnexion();
              })}
            />
            <Bouton variante="contour" titre="Recevoir plutôt un code par e-mail" onPress={() => setEtape('email')} />
          </>
        )}
        {etape === 'email' && (
          <>
            <Bouton
              titre="Recevoir un code"
              desactive={occupe || !email.includes('@')}
              onPress={() => executer(async () => {
                await sb.envoyerCode(email);
                setEtape('code');
              })}
            />
            <Bouton variante="contour" titre="J’ai un mot de passe" onPress={() => setEtape('motdepasse')} />
          </>
        )}
        {etape === 'code' && (
          <>
            <T>Un code a été envoyé à <T gras>{email}</T>.</T>
            <Champ label="Code reçu par e-mail" value={code} onChangeText={setCode} keyboardType="number-pad" />
            <Bouton
              titre="Se connecter"
              desactive={occupe || code.trim().length < 6}
              onPress={() => executer(async () => {
                await sb.verifierCode(email, code);
                await apresConnexion();
              })}
            />
            <Bouton variante="contour" titre="Retour" onPress={() => setEtape('motdepasse')} />
          </>
        )}
        {occupe && <View style={{ alignItems: 'center' }}><ActivityIndicator color={C.primaire} /></View>}
      </Carte>
      {(msg || erreur) && <Alerte niveau="rouge" texte={msg ?? erreur!} />}
      <T doux taille={13}>Pas encore de compte ? Demandez à votre école de vous en créer un.</T>
    </Ecran>
  );
}
