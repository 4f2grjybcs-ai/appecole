import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Connexion } from './src/screens/Connexion';
import { Discussion } from './src/screens/Discussion';
import { Eleves } from './src/screens/Eleves';
import { Journee } from './src/screens/Journee';
import { Encaisser } from './src/screens/Encaisser';
import { FormCompetences } from './src/screens/FormCompetences';
import { FormLiensMeteo } from './src/screens/FormLiensMeteo';
import { FicheEleve } from './src/screens/FicheEleve';
import { FormEleve, FormMoniteur, FormSeance, FormSite, FormVol } from './src/screens/Formulaires';
import { Meteo } from './src/screens/Meteo';
import { ChangerMotDePasse } from './src/screens/MotDePasse';
import { Planning } from './src/screens/Planning';
import { Reglages } from './src/screens/Reglages';
import { Vols } from './src/screens/Vols';
import { AppProvider, useApp } from './src/state/AppContext';
import { C } from './src/ui/kit';
import { NavContext, type Nav, type Route } from './src/ui/nav';

/** principal = bouton dans la barre du bas ; les autres sont dans le menu ☰. */
type Onglet = { id: string; libelle: string; icone: string; principal?: boolean };

const ONGLETS_MONITEUR: Onglet[] = [
  { id: 'journee', libelle: 'Aujourd’hui', icone: '📋', principal: true },
  { id: 'eleves', libelle: 'Élèves', icone: '🎓', principal: true },
  { id: 'meteo', libelle: 'Météo', icone: '🌤', principal: true },
  { id: 'vols', libelle: 'Vols et paiements', icone: '🪂' },
  { id: 'planning', libelle: 'Agenda', icone: '📅' },
  { id: 'discussion', libelle: 'Discussion', icone: '💬' },
  { id: 'reglages', libelle: 'Réglages', icone: '⚙️' },
];

const ONGLETS_ELEVE: Onglet[] = [
  { id: 'formation', libelle: 'Ma formation', icone: '🪂', principal: true },
  { id: 'meteo', libelle: 'Météo', icone: '🌤', principal: true },
  { id: 'discussion', libelle: 'Discussion', icone: '💬', principal: true },
  { id: 'planning', libelle: 'Séances', icone: '📅' },
  { id: 'compte', libelle: 'Compte', icone: '👤' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.primaire }} edges={['top']}>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: C.fond }}>
            <Racine />
          </View>
        </SafeAreaView>
      </AppProvider>
    </SafeAreaProvider>
  );
}

function Racine() {
  const { pret, session } = useApp();
  if (!pret)
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={C.primaire} size="large" />
      </View>
    );
  if (!session) return <Connexion />;
  return <Principal key={`${session.role}:${session.id}`} />;
}

function Principal() {
  const { session } = useApp();
  const onglets = session!.role === 'moniteur' ? ONGLETS_MONITEUR : ONGLETS_ELEVE;
  const [onglet, setOnglet] = useState(onglets[0].id);
  const [pile, setPile] = useState<Route[]>([]);

  const retour = useCallback(() => setPile((p) => p.slice(0, -1)), []);
  const nav = useMemo<Nav>(() => ({ ouvrir: (r) => setPile((p) => [...p, r]), retour }), [retour]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pile.length === 0) return false;
      retour();
      return true;
    });
    return () => sub.remove();
  }, [pile.length, retour]);

  const route = pile[pile.length - 1];
  const [menuOuvert, setMenuOuvert] = useState(false);
  const courantSecondaire = onglets.find((o) => o.id === onglet && !o.principal);
  const aller = (id: string) => {
    setOnglet(id);
    setPile([]);
    setMenuOuvert(false);
  };

  return (
    <NavContext.Provider value={nav}>
      <View style={{ flex: 1 }}>
        {route ? (
          <View style={{ flex: 1 }}>
            <Pressable onPress={retour} style={{ backgroundColor: C.primaireFonce, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: '#fff', fontSize: 15 }}>‹ Retour</Text>
            </Pressable>
            <EcranPile route={route} />
          </View>
        ) : (
          <EcranOnglet onglet={onglet} />
        )}
      </View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.bord }}>
        <View style={{ flexDirection: 'row' }}>
          {onglets.filter((o) => o.principal).map((o) => (
            <BoutonBarre key={o.id} icone={o.icone} libelle={o.libelle} actif={o.id === onglet} onPress={() => aller(o.id)} />
          ))}
          <BoutonBarre
            icone="☰"
            libelle={courantSecondaire ? courantSecondaire.libelle : 'Menu'}
            actif={!!courantSecondaire || menuOuvert}
            onPress={() => setMenuOuvert(true)}
          />
        </View>
      </SafeAreaView>

      <Modal visible={menuOuvert} transparent animationType="slide" onRequestClose={() => setMenuOuvert(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,32,43,0.4)' }} onPress={() => setMenuOuvert(false)} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
          <View style={{ padding: 8 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.bord, marginVertical: 6 }} />
            {onglets.filter((o) => !o.principal).map((o) => (
              <Pressable
                key={o.id}
                onPress={() => aller(o.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10,
                  backgroundColor: o.id === onglet ? C.fond : pressed ? C.fond : 'transparent',
                })}
              >
                <Text style={{ fontSize: 22 }}>{o.icone}</Text>
                <Text style={{ fontSize: 17, color: o.id === onglet ? C.primaire : C.texte, fontWeight: o.id === onglet ? '700' : '500' }}>{o.libelle}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
    </NavContext.Provider>
  );
}

function BoutonBarre({ icone, libelle, actif, onPress }: { icone: string; libelle: string; actif: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={libelle} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
      <Text style={{ fontSize: 22, opacity: actif ? 1 : 0.55, color: C.texte }}>{icone}</Text>
      <Text numberOfLines={1} style={{ fontSize: 12, color: actif ? C.primaire : C.doux, fontWeight: actif ? '700' : '400' }}>{libelle}</Text>
    </Pressable>
  );
}

function EcranOnglet({ onglet }: { onglet: string }) {
  const { session } = useApp();
  switch (onglet) {
    case 'journee': return <Journee />;
    case 'eleves': return <Eleves />;
    case 'formation': return <FicheEleve id={session!.id} lectureSeule />;
    case 'vols': return <Vols />;
    case 'planning': return <Planning />;
    case 'meteo': return <Meteo />;
    case 'discussion': return <Discussion />;
    case 'reglages': return <Reglages />;
    default: return <Compte />;
  }
}

function EcranPile({ route }: { route: Route }) {
  switch (route.ecran) {
    case 'eleve': return <FicheEleve id={route.id} />;
    case 'formEleve': return <FormEleve id={route.id} />;
    case 'formVol': return <FormVol eleveId={route.eleveId} id={route.id} />;
    case 'formSeance': return <FormSeance id={route.id} />;
    case 'formSite': return <FormSite type={route.type} id={route.id} />;
    case 'formMoniteur': return <FormMoniteur id={route.id} />;
    case 'formCompetences': return <FormCompetences />;
    case 'encaisser': return <Encaisser eleveId={route.eleveId} />;
    case 'formLiensMeteo': return <FormLiensMeteo />;
  }
}

function Compte() {
  const { data, session, deconnexion } = useApp();
  const e = data.eleves.find((x) => x.id === session?.id);
  const m = data.moniteurs.find((x) => x.id === e?.moniteurRefId);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: C.primaire, padding: 16 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{data.reglages.ecoleNom}</Text>
      </View>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: C.texte }}>{e ? `${e.prenom} ${e.nom}` : ''}</Text>
        {m && (
          <Text style={{ color: C.doux }}>
            Moniteur référent : {m.prenom} {m.nom}{m.tel ? ` · ${m.tel}` : ''}
          </Text>
        )}
        <ChangerMotDePasse />
        <Pressable onPress={deconnexion} style={{ borderWidth: 1.5, borderColor: C.primaire, borderRadius: 10, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: C.primaire, fontWeight: '600' }}>Se déconnecter</Text>
        </Pressable>
      </View>
    </View>
  );
}
