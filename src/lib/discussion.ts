import { formatDate } from './defaults';
import type { Canal, Message, Session } from './types';

export const LONGUEUR_MAX = 2000;

/** Canaux visibles : les élèves ne voient que le canal École. */
export function canauxVisibles(session: Session): { id: Canal; libelle: string }[] {
  const ecole = { id: 'ecole' as const, libelle: '💬 École' };
  return session.role === 'moniteur' ? [ecole, { id: 'moniteurs', libelle: '🔒 Moniteurs' }] : [ecole];
}

export function messagesDuCanal(messages: Message[], canal: Canal, max = 200): Message[] {
  return messages
    .filter((m) => m.canal === canal)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-max);
}

/** Un moniteur peut supprimer tous les messages ; un élève seulement les siens. */
export const peutSupprimer = (m: Message, session: Session) => session.role === 'moniteur' || m.auteurId === session.id;

/** « 10:12 » aujourd'hui, sinon « 03.10.2026 10:12 ». */
export function horodatage(iso: string, aujourdhui: string): string {
  const jour = iso.slice(0, 10);
  const heure = iso.slice(11, 16);
  return jour === aujourdhui ? heure : `${formatDate(jour)} ${heure}`;
}

/** Date et heure locales au format ISO sans fuseau (AAAA-MM-JJTHH:MM:SS). */
export function maintenantIso(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
