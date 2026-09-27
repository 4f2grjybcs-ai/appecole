import { createContext, useContext } from 'react';
import type { Id, TypeSite } from '../lib/types';

/** Écrans empilés au-dessus des onglets. */
export type Route =
  | { ecran: 'eleve'; id: Id }
  | { ecran: 'formEleve'; id?: Id }
  | { ecran: 'formVol'; eleveId: Id; id?: Id }
  | { ecran: 'formSeance'; id?: Id }
  | { ecran: 'formSite'; type: TypeSite; id?: Id }
  | { ecran: 'formMoniteur'; id?: Id }
  | { ecran: 'formCompetences' }
  | { ecran: 'encaisser'; eleveId: Id };

export interface Nav {
  ouvrir(r: Route): void;
  retour(): void;
}

export const NavContext = createContext<Nav>({ ouvrir: () => {}, retour: () => {} });

export const useNav = () => useContext(NavContext);
