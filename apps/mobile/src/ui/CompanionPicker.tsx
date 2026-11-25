import { Pressable, View } from 'react-native';
import { MASCOTS, MASCOT_IDS, type MascotId } from '@adultingos/brand';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './primitives';
import { Mascot } from './Mascot';

export function CompanionPicker({ value, onChange }: { value: MascotId; onChange: (m: MascotId) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }} accessibilityRole="radiogroup" accessibilityLabel="Choose your companion">
      {MASCOT_IDS.map((id) => {
        const m = MASCOTS[id];
        const selected = value === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${m.name}, ${m.role}. ${m.personality}`}
            onPress={() => onChange(id)}
            style={{ width: '47%', flexGrow: 1, backgroundColor: m.surface, borderRadius: 20, padding: 12, alignItems: 'center', gap: 4, borderWidth: 3, borderColor: selected ? t.c.primary : 'transparent' }}
          >
            <Mascot id={id} expression={selected ? 'happy' : 'neutral'} pose={selected ? 'wave' : 'idle'} size={96} force animation={selected ? 'celebrate' : 'none'} />
            <AppText variant="bodyStrong" color="onCategory">{m.name}</AppText>
            <AppText variant="caption" color="onCategory" align="center">{m.role}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
