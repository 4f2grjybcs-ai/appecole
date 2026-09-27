import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Connexion } from './src/screens/Connexion';
import { Eleves } from './src/screens/Eleves';
import { FicheEleve } from './src/screens/FicheEleve';
import { FormEleve, FormMoniteur, FormSeance, FormSite, FormVol } from './src/screens/Formulaires';
import { Meteo } from './src/screens/Meteo';
import { Planning } from './src/screens/Planning';
import { Reglages } from './src/screens/Reglages';
import { AppProvider, useApp } from './src/state/AppContext';
import { C } from './src/ui/kit';
import { NavContext, type Nav, type Route } from './src/ui/nav';

type Onglet = { id: string; libelle: string; icone: string };

const ONGLETS_MONITEUR: Onglet[] = [
  { id: 'eleves', libelle: 'Élèves', icone: '🎓' },
  { id: 'planning', libelle: 'Planning', icone: '📅' },
  { id: 'meteo', libelle: 'Météo', icone: '🌤' },
  { id: 'reglages', libelle: 'Réglages', icone: '⚙️' },
];

const ONGLETS_ELEVE: Onglet[] = [
  { id: 'formation', libelle: 'Ma formation', icone: '🪂' },
  { id: 'planning', libelle: 'Séances', icone: '📅' },
  { id: 'meteo', libelle: 'Météo', icone: '🌤' },
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
          {onglets.map((o) => {
            const actif = o.id === onglet;
            return (
              <Pressable
                key={o.id}
                onPress={() => {
                  setOnglet(o.id);
                  setPile([]);
                }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 20, opacity: actif ? 1 : 0.5 }}>{o.icone}</Text>
                <Text style={{ fontSize: 11, color: actif ? C.primaire : C.doux, fontWeight: actif ? '700' : '400' }}>{o.libelle}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </NavContext.Provider>
  );
}

function EcranOnglet({ onglet }: { onglet: string }) {
  const { session } = useApp();
  switch (onglet) {
    case 'eleves': return <Eleves />;
    case 'formation': return <FicheEleve id={session!.id} lectureSeule />;
    case 'planning': return <Planning />;
    case 'meteo': return <Meteo />;
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
    case 'formSite': return <FormSite id={route.id} />;
    case 'formMoniteur': return <FormMoniteur id={route.id} />;
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
        <Pressable onPress={deconnexion} style={{ borderWidth: 1.5, borderColor: C.primaire, borderRadius: 10, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: C.primaire, fontWeight: '600' }}>Se déconnecter</Text>
        </Pressable>
      </View>
    </View>
  );
}
