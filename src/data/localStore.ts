import AsyncStorage from '@react-native-async-storage/async-storage';
import { donneesVides } from '../lib/defaults';
import type { AppData } from '../lib/types';
import type { Store } from './store';

const CLE = 'appecole:donnees';

/** Stockage sur l'appareil uniquement (mode démo / hors connexion). */
export const localStore: Store & { remplacer(d: AppData): Promise<void> } = {
  async charger() {
    const brut = await AsyncStorage.getItem(CLE);
    if (!brut) return donneesVides();
    return { ...donneesVides(), ...(JSON.parse(brut) as AppData) };
  },
  async enregistrer(_kind, _r, apres) {
    await AsyncStorage.setItem(CLE, JSON.stringify(apres));
  },
  async supprimer(_kind, _id, apres) {
    await AsyncStorage.setItem(CLE, JSON.stringify(apres));
  },
  async remplacer(d) {
    await AsyncStorage.setItem(CLE, JSON.stringify(d));
  },
};
