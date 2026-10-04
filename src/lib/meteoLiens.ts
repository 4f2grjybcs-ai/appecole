import type { LienMeteo } from './types';

export const HAUTEURS = [
  { valeur: 260, libelle: 'Petit' },
  { valeur: 450, libelle: 'Moyen' },
  { valeur: 700, libelle: 'Grand' },
];

export const LIENS_METEO_DEFAUT: LienMeteo[] = [
  { id: 'lm-meteosuisse', titre: 'MeteoSwiss – prévisions', contenu: 'https://www.meteoswiss.admin.ch', affichage: 'lien', hauteur: 450 },
  { id: 'lm-winds', titre: 'Stations de vent (winds.mobi)', contenu: 'https://winds.mobi', affichage: 'lien', hauteur: 450 },
  { id: 'lm-fsvl', titre: 'Fédération suisse de vol libre', contenu: 'https://www.shv-fsvl.ch', affichage: 'lien', hauteur: 450 },
];

/** Code HTML collé (ex. code d'intégration <iframe> de Windy) plutôt qu'une adresse. */
export const estHtml = (contenu: string) => contenu.trim().startsWith('<');

export function urlValide(contenu: string): boolean {
  try {
    const u = new URL(contenu.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Message d'erreur, ou null si le lien est correct. */
export function verifierLien(l: Pick<LienMeteo, 'titre' | 'contenu' | 'affichage'>): string | null {
  if (!l.titre.trim()) return 'Donnez un titre.';
  const c = l.contenu.trim();
  if (!c) return `« ${l.titre} » : ajoutez une adresse ou un code d’intégration.`;
  if (estHtml(c)) return l.affichage === 'integre' ? null : `« ${l.titre} » : un code d’intégration doit être affiché dans l’app.`;
  return urlValide(c) ? null : `« ${l.titre} » : l’adresse doit commencer par https://`;
}

/** Page HTML complète autour d'un code d'intégration (pour l'afficher à la bonne largeur). */
export function pageHtml(code: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;padding:0;background:#fff}iframe,img,video{max-width:100%;border:0}iframe{width:100%}</style>
</head><body>${code}</body></html>`;
}
