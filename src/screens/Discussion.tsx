import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { aujourdhui, nouvelId } from '../lib/defaults';
import { canauxVisibles, horodatage, LONGUEUR_MAX, maintenantIso, messagesDuCanal, peutSupprimer } from '../lib/discussion';
import type { Canal, Message } from '../lib/types';
import { useApp } from '../state/AppContext';
import { C, confirmer, Ligne, Puce, T } from '../ui/kit';

/** Discussion de l'école : canal École (tout le monde) et canal Moniteurs. */
export function Discussion() {
  const { data, session, enregistrer, supprimer, mode, rafraichir } = useApp();
  const canaux = canauxVisibles(session!);
  const [canal, setCanal] = useState<Canal>('ecole');
  const [texte, setTexte] = useState('');
  const defilement = useRef<ScrollView>(null);
  const messages = messagesDuCanal(data.messages, canal);
  const ajd = aujourdhui();

  // Les messages arrivent en temps réel ; rechargement complet de sécurité chaque minute.
  useEffect(() => {
    if (mode !== 'supabase') return;
    const t = setInterval(rafraichir, 60_000);
    return () => clearInterval(t);
  }, [mode, rafraichir]);

  const auteurNom = () => {
    if (session!.role === 'moniteur') {
      const m = data.moniteurs.find((x) => x.id === session!.id);
      return m ? `${m.prenom} ${m.nom}`.trim() : 'Moniteur';
    }
    const e = data.eleves.find((x) => x.id === session!.id);
    return e ? `${e.prenom} ${e.nom}`.trim() : 'Élève';
  };

  const envoyer = async () => {
    const t = texte.trim();
    if (!t) return;
    const m: Message = {
      id: 'msg-' + nouvelId(),
      canal,
      auteurId: session!.id,
      auteurRole: session!.role,
      auteurNom: auteurNom(),
      texte: t.slice(0, LONGUEUR_MAX),
      date: maintenantIso(),
    };
    setTexte('');
    await enregistrer('message', m);
  };

  const effacer = async (m: Message) => {
    if (!peutSupprimer(m, session!)) return;
    if (await confirmer('Supprimer ce message ?')) await supprimer('message', m.id);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.fond }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ backgroundColor: C.primaire, paddingHorizontal: 16, paddingVertical: 14 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Discussion</Text>
      </View>
      {canaux.length > 1 && (
        <Ligne style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          {canaux.map((c) => (
            <Puce key={c.id} texte={c.libelle} actif={canal === c.id} onPress={() => setCanal(c.id)} />
          ))}
        </Ligne>
      )}
      {canal === 'moniteurs' && (
        <Text style={{ color: C.doux, fontSize: 12, paddingHorizontal: 16, paddingTop: 6 }}>Visible uniquement par les moniteurs.</Text>
      )}

      <ScrollView
        ref={defilement}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => defilement.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && <T doux>Aucun message pour l’instant. Écrivez le premier !</T>}
        {messages.map((m, i) => {
          const moi = m.auteurId === session!.id;
          const memeAuteur = i > 0 && messages[i - 1].auteurId === m.auteurId;
          return (
            <Pressable
              key={m.id}
              onLongPress={() => effacer(m)}
              style={{ alignSelf: moi ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
            >
              {!moi && !memeAuteur && (
                <Text style={{ color: C.doux, fontSize: 12, marginBottom: 2, marginLeft: 4 }}>
                  {m.auteurNom}{m.auteurRole === 'moniteur' ? ' · moniteur' : ''}
                </Text>
              )}
              <View
                style={{
                  backgroundColor: moi ? C.primaire : '#fff',
                  borderColor: C.bord,
                  borderWidth: moi ? 0 : 1,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: moi ? '#fff' : C.texte, fontSize: 15 }}>{m.texte}</Text>
                <Text style={{ color: moi ? '#D6E9F8' : C.doux, fontSize: 11, alignSelf: 'flex-end', marginTop: 2 }}>
                  {horodatage(m.date, ajd)}
                </Text>
              </View>
            </Pressable>
          );
        })}
        {messages.length > 0 && (
          <Text style={{ color: C.doux, fontSize: 11, textAlign: 'center' }}>Appui long sur un message pour le supprimer.</Text>
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.bord, alignItems: 'flex-end' }}>
        <TextInput
          value={texte}
          onChangeText={setTexte}
          placeholder={canal === 'moniteurs' ? 'Message aux moniteurs…' : 'Message à l’école…'}
          placeholderTextColor="#98A6B3"
          multiline
          maxLength={LONGUEUR_MAX}
          style={{ flex: 1, maxHeight: 120, borderWidth: 1, borderColor: C.bord, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, color: C.texte }}
        />
        <Pressable
          onPress={envoyer}
          disabled={!texte.trim()}
          accessibilityLabel="Envoyer"
          style={{ backgroundColor: texte.trim() ? C.primaire : C.bord, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Envoyer</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
