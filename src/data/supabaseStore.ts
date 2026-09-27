import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { donneesVides } from '../lib/defaults';
import type { AppData, Session } from '../lib/types';
import { appliquer, eleveIdOf, idOf, type Kind, type RecordOf, type Store } from './store';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CLE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase n'est actif que si les variables d'environnement sont renseignées. */
export const supabase: SupabaseClient | null =
  URL && CLE_ANON
    ? createClient(URL, CLE_ANON, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export interface Membre {
  ecoleId: string;
  session: Session;
}

export async function envoyerCode(email: string) {
  const { error } = await client().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifierCode(email: string, code: string) {
  const { error } = await client().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw error;
}

export async function deconnecter() {
  await client().auth.signOut();
}

export async function utilisateurConnecte(): Promise<string | null> {
  const { data } = await client().auth.getSession();
  return data.session?.user.email ?? null;
}

/** Retourne l'appartenance à une école, en acceptant une invitation en attente si besoin. */
export async function monAppartenance(): Promise<Membre | null> {
  const c = client();
  const { data: u } = await c.auth.getUser();
  if (!u.user) return null;
  const lire = () =>
    c.from('membres').select('ecole_id, role, personne_id').eq('user_id', u.user!.id).maybeSingle();
  let { data, error } = await lire();
  if (error) throw error;
  if (!data) {
    const { data: rejoint, error: e2 } = await c.rpc('rejoindre_ecole');
    if (e2) throw e2;
    if (!rejoint) return null;
    ({ data, error } = await lire());
    if (error) throw error;
    if (!data) return null;
  }
  return {
    ecoleId: data.ecole_id,
    session: { role: data.role, id: data.personne_id } as Session,
  };
}

export async function creerEcole(nomEcole: string, personneId: string): Promise<string> {
  const { data, error } = await client().rpc('creer_ecole', {
    p_nom: nomEcole,
    p_personne_id: personneId,
  });
  if (error) throw error;
  return data as string;
}

export async function inviter(
  ecoleId: string,
  email: string,
  role: 'moniteur' | 'eleve',
  personneId: string,
) {
  const { error } = await client()
    .from('invitations')
    .upsert({ email: email.trim().toLowerCase(), ecole_id: ecoleId, role, personne_id: personneId });
  if (error) throw error;
}

interface Ligne {
  kind: Kind;
  data: RecordOf[Kind];
}

export function supabaseStore(ecoleId: string): Store {
  const c = client();
  return {
    async charger() {
      const { data, error } = await c.from('records').select('kind, data').eq('ecole_id', ecoleId);
      if (error) throw error;
      return (data as Ligne[]).reduce<AppData>(
        (acc, l) => appliquer(acc, l.kind, l.data),
        donneesVides(),
      );
    },
    async enregistrer(kind, r) {
      const { error } = await c.from('records').upsert({
        ecole_id: ecoleId,
        kind,
        id: idOf(kind, r),
        eleve_id: eleveIdOf(kind, r),
        data: r,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    async supprimer(kind, id) {
      const { error } = await c
        .from('records')
        .delete()
        .match({ ecole_id: ecoleId, kind, id });
      if (error) throw error;
    },
  };
}
