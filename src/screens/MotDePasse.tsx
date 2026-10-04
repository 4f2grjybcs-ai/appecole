import { useState } from 'react';
import * as sb from '../data/supabaseStore';
import { useApp } from '../state/AppContext';
import { Alerte, Bouton, Carte, Champ, T, Titre } from '../ui/kit';

/** Changer son mot de passe (comptes Supabase). */
export function ChangerMotDePasse() {
  const { mode } = useApp();
  const [ouvert, setOuvert] = useState(false);
  const [mdp, setMdp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [msg, setMsg] = useState<{ texte: string; ok: boolean } | null>(null);
  if (mode !== 'supabase') return null;

  return (
    <>
      <Titre>Mot de passe</Titre>
      <Carte>
        {!ouvert ? (
          <Bouton variante="contour" titre="Changer mon mot de passe" onPress={() => { setOuvert(true); setMsg(null); }} />
        ) : (
          <>
            <Champ label="Nouveau mot de passe (6 caractères minimum)" value={mdp} onChangeText={setMdp} secureTextEntry autoCapitalize="none" />
            <Champ label="Confirmer le mot de passe" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" />
            <Bouton
              titre="Enregistrer"
              onPress={async () => {
                if (mdp.length < 6) return setMsg({ texte: 'Au moins 6 caractères.', ok: false });
                if (mdp !== confirmation) return setMsg({ texte: 'Les deux mots de passe sont différents.', ok: false });
                try {
                  await sb.changerMotDePasse(mdp);
                  setMsg({ texte: 'Mot de passe changé.', ok: true });
                  setOuvert(false);
                  setMdp('');
                  setConfirmation('');
                } catch (e) {
                  setMsg({ texte: e instanceof Error ? e.message : String(e), ok: false });
                }
              }}
            />
          </>
        )}
        {msg && (msg.ok ? <T>{msg.texte}</T> : <Alerte niveau="rouge" texte={msg.texte} />)}
      </Carte>
    </>
  );
}
