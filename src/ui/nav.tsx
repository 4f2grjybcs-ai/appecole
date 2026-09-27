import { createContext, useContext } from 'react';
import type { Id } from '../lib/types';

/** Écrans empilés au-dessus des onglets. */
export type Route =
  | { ecran: 'eleve'; id: Id }
  | { ecran: 'formEleve'; id?: Id }
  | { ecran: 'formVol'; eleveId: Id; id?: Id }
  | { ecran: 'formSeance'; id?: Id }
  | { ecran: 'formSite'; id?: Id }
  | { ecran: 'formMoniteur'; id?: Id };

export interface Nav {
  ouvrir(r: Route): void;
  retour(): void;
}

export const NavContext = createContext<Nav>({ ouvrir: () => {}, retour: () => {} });

export const useNav = () => useContext(NavContext);
