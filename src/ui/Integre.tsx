import { WebView } from 'react-native-webview';
import { estHtml, pageHtml } from '../lib/meteoLiens';

/** Contenu web intégré (page, webcam, code <iframe>) — version iPhone / Android. */
export function Integre({ contenu, hauteur }: { contenu: string; hauteur: number }) {
  const source = estHtml(contenu) ? { html: pageHtml(contenu) } : { uri: contenu.trim() };
  return (
    <WebView
      source={source}
      style={{ height: hauteur, borderRadius: 8 }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      nestedScrollEnabled
    />
  );
}
