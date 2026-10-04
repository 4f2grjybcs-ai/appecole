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

/** Messages d'erreur de connexion compréhensibles. */
function traduire(e: { message: string }): Error {
  const m = e.message.toLowerCase();
  if (m.includes('invalid login credentials')) return new Error('E-mail ou mot de passe incorrect.');
  if (m.includes('email not confirmed')) return new Error('Compte non confirmé : dans Supabase, cochez « Auto Confirm User » à la création du compte.');
  if (m.includes('password should be at least')) return new Error('Le mot de passe doit contenir au moins 6 caractères.');
  if (m.includes('rate limit')) return new Error('Trop d’e-mails envoyés : réessayez plus tard ou connectez-vous avec votre mot de passe.');
  return new Error(e.message);
}

/** Connexion avec e-mail et mot de passe (comptes créés par l'école dans Supabase). */
export async function connecterMotDePasse(email: string, motDePasse: string) {
  const { error } = await client().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: motDePasse });
  if (error) throw traduire(error);
}

export async function changerMotDePasse(motDePasse: string) {
  const { error } = await client().auth.updateUser({ password: motDePasse });
  if (error) throw traduire(error);
}

export async function envoyerCode(email: string) {
  const { error } = await client().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw traduire(error);
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

export type Changement =
  | { type: 'enregistre'; kind: Kind; data: RecordOf[Kind] }
  | { type: 'supprime'; kind: Kind; id: string };

/**
 * Temps réel : reçoit en direct les ajouts, modifications et suppressions faits sur les
 * autres appareils (discussion, statuts du jour, vols…). Les règles d'accès (RLS)
 * s'appliquent : chacun ne reçoit que ce qu'il a le droit de lire.
 */
export function ecouterChangements(
  ecoleId: string,
  surChangement: (c: Changement) => void,
  surReconnexion: () => void,
): () => void {
  const c = client();
  let dejaConnecte = false;
  const canal = c
    .channel(`records-${ecoleId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'records', filter: `ecole_id=eq.${ecoleId}` },
      (p) => {
        if (p.eventType === 'DELETE') {
          // Les suppressions ne sont pas filtrées côté serveur : on vérifie l'école ici.
          const ancien = p.old as { ecole_id?: string; kind?: Kind; id?: string };
          if (ancien.ecole_id === ecoleId && ancien.kind && ancien.id) surChangement({ type: 'supprime', kind: ancien.kind, id: ancien.id });
        } else {
          const nouveau = p.new as unknown as Ligne;
          surChangement({ type: 'enregistre', kind: nouveau.kind, data: nouveau.data });
        }
      },
    )
    .subscribe((statut) => {
      // Après une coupure réseau, on recharge tout pour ne rien manquer.
      if (statut === 'SUBSCRIBED') {
        if (dejaConnecte) surReconnexion();
        dejaConnecte = true;
      }
    });
  return () => {
    c.removeChannel(canal);
  };
}
