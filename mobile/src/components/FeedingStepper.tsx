import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

const PRESETS = [0, 25, 50, 75, 100];

export default function FeedingStepper({ label, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}%</Text>
      </View>
      <View style={styles.presetRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.presetBtn, value === p && styles.presetBtnActive]}
            onPress={() => onChange(p)}
          >
            <Text style={[styles.presetText, value === p && styles.presetTextActive]}>{p}%</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 15, color: '#333', fontWeight: '600' },
  value: { fontSize: 15, color: '#0a3a8a', fontWeight: 'bold' },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    borderColor: '#ccc', alignItems: 'center', backgroundColor: '#fafafa',
  },
  presetBtnActive: { backgroundColor: '#0a3a8a', borderColor: '#0a3a8a' },
  presetText: { fontSize: 13, color: '#333', fontWeight: '600' },
  presetTextActive: { color: '#fff' },
});
