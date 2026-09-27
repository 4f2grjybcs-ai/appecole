import type { ReactNode } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export const C = {
  fond: '#F2F6FA',
  carte: '#FFFFFF',
  texte: '#14202B',
  doux: '#5B6B7A',
  bord: '#DCE4EC',
  primaire: '#0B6FB8',
  primaireFonce: '#084F84',
  vert: '#1E8E4E',
  orange: '#C77700',
  rouge: '#C23B32',
};

export function Ecran({ titre, action, children }: { titre: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.fond }}>
      <View style={s.entete}>
        <Text style={s.titre} numberOfLines={1}>{titre}</Text>
        {action}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 12 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function Carte({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.carte, style, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  return <View style={[s.carte, style]}>{children}</View>;
}

export function Titre({ children }: { children: ReactNode }) {
  return <Text style={s.titreSection}>{children}</Text>;
}

export function T({ children, doux, gras, couleur, taille }: {
  children: ReactNode; doux?: boolean; gras?: boolean; couleur?: string; taille?: number;
}) {
  return (
    <Text style={{ color: couleur ?? (doux ? C.doux : C.texte), fontWeight: gras ? '600' : '400', fontSize: taille ?? 15 }}>
      {children}
    </Text>
  );
}

export function Bouton({ titre, onPress, variante = 'plein', petit, desactive }: {
  titre: string; onPress: () => void; variante?: 'plein' | 'contour' | 'danger'; petit?: boolean; desactive?: boolean;
}) {
  const plein = variante === 'plein';
  const couleur = variante === 'danger' ? C.rouge : C.primaire;
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      style={({ pressed }) => [
        s.bouton,
        petit && { paddingVertical: 6, paddingHorizontal: 12 },
        { backgroundColor: plein ? couleur : 'transparent', borderColor: couleur },
        (pressed || desactive) && { opacity: 0.6 },
      ]}
    >
      <Text style={{ color: plein ? '#fff' : couleur, fontWeight: '600', fontSize: petit ? 13 : 15 }}>{titre}</Text>
    </Pressable>
  );
}

export function Champ({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: C.doux, fontSize: 13 }}>{label}</Text>
      <TextInput placeholderTextColor="#98A6B3" style={s.input} {...props} />
    </View>
  );
}

export function Puce({ texte, actif, onPress, couleur }: { texte: string; actif?: boolean; onPress?: () => void; couleur?: string }) {
  const c = couleur ?? C.primaire;
  return (
    <Pressable onPress={onPress} style={[s.puce, { borderColor: c, backgroundColor: actif ? c : 'transparent' }]}>
      <Text style={{ color: actif ? '#fff' : c, fontSize: 13, fontWeight: '600' }}>{texte}</Text>
    </Pressable>
  );
}

export function Barre({ valeur, couleur }: { valeur: number; couleur?: string }) {
  return (
    <View style={s.barreFond}>
      <View style={[s.barre, { width: `${Math.round(Math.min(Math.max(valeur, 0), 1) * 100)}%`, backgroundColor: couleur ?? C.primaire }]} />
    </View>
  );
}

export function Ligne({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Alerte({ texte, niveau }: { texte: string; niveau: 'orange' | 'rouge' }) {
  const c = niveau === 'rouge' ? C.rouge : C.orange;
  return (
    <View style={{ borderLeftWidth: 4, borderLeftColor: c, backgroundColor: c + '14', padding: 8, borderRadius: 6 }}>
      <Text style={{ color: c, fontWeight: '600' }}>{texte}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  entete: {
    backgroundColor: C.primaire,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titre: { color: '#fff', fontSize: 20, fontWeight: '700', flexShrink: 1 },
  carte: { backgroundColor: C.carte, borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: C.bord },
  titreSection: { fontSize: 13, fontWeight: '700', color: C.doux, textTransform: 'uppercase', marginTop: 8 },
  bouton: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: C.bord, borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff', color: C.texte },
  puce: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  barreFond: { height: 8, backgroundColor: C.bord, borderRadius: 4, overflow: 'hidden' },
  barre: { height: 8, borderRadius: 4 },
});

/** Confirmation compatible mobile et web. */
export function confirmer(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(message) ?? true);
  return new Promise((ok) =>
    Alert.alert('Confirmation', message, [
      { text: 'Annuler', style: 'cancel', onPress: () => ok(false) },
      { text: 'Confirmer', style: 'destructive', onPress: () => ok(true) },
    ]),
  );
}

export function informer(message: string) {
  if (Platform.OS === 'web') globalThis.alert?.(message);
  else Alert.alert('', message);
}
