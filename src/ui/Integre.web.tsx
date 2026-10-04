import { createElement } from 'react';
import { APERCU } from '../lib/apercu';
import { estHtml, pageHtml } from '../lib/meteoLiens';
import { T } from './kit';

/** Contenu web intégré — version navigateur (iframe). */
export function Integre({ contenu, hauteur }: { contenu: string; hauteur: number }) {
  // La page d'aperçu sur claude.ai n'autorise pas l'intégration d'autres sites.
  if (APERCU) return <T doux taille={13}>Aperçu web : ce contenu s’affiche dans l’app installée sur le téléphone.</T>;
  return createElement('iframe', {
    ...(estHtml(contenu) ? { srcDoc: pageHtml(contenu) } : { src: contenu.trim() }),
    style: { width: '100%', height: hauteur, border: 0, borderRadius: 8 },
    allow: 'fullscreen',
  });
}
