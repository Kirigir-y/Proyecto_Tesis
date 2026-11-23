import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  label: string;
  value: boolean;
  onToggle: () => void;
}

export default function TogglePill({ label, value, onToggle }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onToggle} activeOpacity={0.7}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pill, value ? styles.pillOn : styles.pillOff]}>
        <Text style={[styles.pillText, value ? styles.pillTextOn : styles.pillTextOff]}>
          {value ? 'Sí' : 'No'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  label: { fontSize: 15, color: '#333', flex: 1, marginRight: 12 },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  pillOn: { backgroundColor: '#e6f4ea', borderColor: '#ceead6' },
  pillOff: { backgroundColor: '#fce8e6', borderColor: '#fad2cf' },
  pillText: { fontWeight: 'bold', fontSize: 13 },
  pillTextOn: { color: '#137333' },
  pillTextOff: { color: '#c5221f' },
});
