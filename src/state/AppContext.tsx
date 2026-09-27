import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { localStore } from '../data/localStore';
import { appliquer, retirer, type Kind, type RecordOf, type Store } from '../data/store';
import * as sb from '../data/supabaseStore';
import { donneesVides, normaliser } from '../lib/defaults';
import { donneesDemo } from '../lib/demo';
import type { AppData, Session } from '../lib/types';

const CLE_SESSION_LOCALE = 'appecole:session';

export type Mode = 'local' | 'supabase';

interface Ctx {
  mode: Mode;
  pret: boolean;
  data: AppData;
  session: Session | null;
  ecoleId: string | null;
  /** Email connecté (Supabase) sans école associée : il faut créer ou être invité */
  emailSansEcole: string | null;
  erreur: string | null;
  enregistrer<K extends Kind>(kind: K, r: RecordOf[K]): Promise<void>;
  supprimer(kind: Exclude<Kind, 'reglages'>, id: string): Promise<void>;
  rafraichir(): Promise<void>;
  // Mode local
  choisirProfil(s: Session): Promise<void>;
  chargerDemo(): Promise<void>;
  // Mode Supabase
  apresConnexion(): Promise<void>;
  creerEcole(nomEcole: string, prenom: string, nom: string): Promise<void>;
  deconnexion(): Promise<void>;
}

const AppContext = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp hors de AppProvider');
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const mode: Mode = sb.supabase ? 'supabase' : 'local';
  const [pret, setPret] = useState(false);
  const [data, setData] = useState<AppData>(donneesVides());
  const [session, setSession] = useState<Session | null>(null);
  const [ecoleId, setEcoleId] = useState<string | null>(null);
  const [emailSansEcole, setEmailSansEcole] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const storeRef = useRef<Store>(localStore);
  const dataRef = useRef(data);
  dataRef.current = data;

  const signaler = (e: unknown) => setErreur(e instanceof Error ? e.message : String(e));

  const apresConnexion = useCallback(async () => {
    try {
      setErreur(null);
      const m = await sb.monAppartenance();
      if (!m) {
        setSession(null);
        setEmailSansEcole(await sb.utilisateurConnecte());
        return;
      }
      setEmailSansEcole(null);
      storeRef.current = sb.supabaseStore(m.ecoleId);
      setData(normaliser(await storeRef.current.charger()));
      setEcoleId(m.ecoleId);
      setSession(m.session);
    } catch (e) {
      signaler(e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (mode === 'local') {
          setData(normaliser(await localStore.charger()));
          const s = await AsyncStorage.getItem(CLE_SESSION_LOCALE);
          if (s) setSession(JSON.parse(s));
        } else if (await sb.utilisateurConnecte()) {
          await apresConnexion();
        }
      } catch (e) {
        signaler(e);
      } finally {
        setPret(true);
      }
    })();
  }, [mode, apresConnexion]);

  const enregistrer = useCallback(async <K extends Kind>(kind: K, r: RecordOf[K]) => {
    const apres = appliquer(dataRef.current, kind, r);
    setData(apres);
    try {
      await storeRef.current.enregistrer(kind, r, apres);
    } catch (e) {
      signaler(e);
    }
  }, []);

  const supprimer = useCallback(async (kind: Exclude<Kind, 'reglages'>, id: string) => {
    const apres = retirer(dataRef.current, kind, id);
    setData(apres);
    try {
      await storeRef.current.supprimer(kind, id, apres);
    } catch (e) {
      signaler(e);
    }
  }, []);

  const rafraichir = useCallback(async () => {
    try {
      setData(normaliser(await storeRef.current.charger()));
    } catch (e) {
      signaler(e);
    }
  }, []);

  const choisirProfil = useCallback(async (s: Session) => {
    setSession(s);
    await AsyncStorage.setItem(CLE_SESSION_LOCALE, JSON.stringify(s));
  }, []);

  const chargerDemo = useCallback(async () => {
    const d = donneesDemo();
    setData(d);
    await localStore.remplacer(d);
  }, []);

  const creerEcole = useCallback(
    async (nomEcole: string, prenom: string, nom: string) => {
      try {
        const personneId = 'm-' + Date.now().toString(36);
        const id = await sb.creerEcole(nomEcole, personneId);
        const store = sb.supabaseStore(id);
        await store.enregistrer('moniteur', { id: personneId, prenom, nom }, donneesVides());
        await store.enregistrer(
          'reglages',
          { ...donneesVides().reglages, ecoleNom: nomEcole },
          donneesVides(),
        );
        await apresConnexion();
      } catch (e) {
        signaler(e);
      }
    },
    [apresConnexion],
  );

  const deconnexion = useCallback(async () => {
    setSession(null);
    if (mode === 'local') {
      await AsyncStorage.removeItem(CLE_SESSION_LOCALE);
    } else {
      await sb.deconnecter();
      storeRef.current = localStore;
      setEcoleId(null);
      setEmailSansEcole(null);
      setData(donneesVides());
    }
  }, [mode]);

  const valeur = useMemo<Ctx>(
    () => ({
      mode, pret, data, session, ecoleId, emailSansEcole, erreur,
      enregistrer, supprimer, rafraichir, choisirProfil, chargerDemo,
      apresConnexion, creerEcole, deconnexion,
    }),
    [mode, pret, data, session, ecoleId, emailSansEcole, erreur, enregistrer, supprimer,
      rafraichir, choisirProfil, chargerDemo, apresConnexion, creerEcole, deconnexion],
  );

  return <AppContext.Provider value={valeur}>{children}</AppContext.Provider>;
}
