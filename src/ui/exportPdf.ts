import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { APERCU } from '../lib/apercu';
import { carnetHtml } from '../lib/carnet';
import { aujourdhui } from '../lib/defaults';
import type { AppData, Eleve } from '../lib/types';

export type ResultatExport = 'partage' | 'impression' | 'apercu';

/** Génère le carnet de vol en PDF puis ouvre le partage (mail, fichiers, AirDrop, impression…). */
export async function exporterCarnet(eleve: Eleve, data: AppData): Promise<ResultatExport> {
  if (APERCU) return 'apercu';
  const html = carnetHtml(eleve, data, aujourdhui());
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return 'impression';
  }
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Carnet de vol – ${eleve.prenom} ${eleve.nom}`,
    });
    return 'partage';
  }
  await Print.printAsync({ uri });
  return 'impression';
}
