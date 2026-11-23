import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTurno } from '../../context/TurnoContext';
import type { TurnoStackParamList } from '../../navigation/TurnoStack';
import type { Bed } from '../../types';
import { SHIFT_LABEL } from '../../utils/shift';

type Props = NativeStackScreenProps<TurnoStackParamList, 'TurnoLista'>;

const ROOMS = Array.from({ length: 30 }, (_, i) => i + 1);
const BEDS: Bed[] = ['A', 'B'];
const SLOTS = ROOMS.flatMap((room) => BEDS.map((bed) => ({ room, bed })));

export default function TurnoScreen({ navigation }: Props) {
  const {
    date, shift, shiftPending, supervisor, caregivers, staff,
    getHygiene, getNightCare,
    residentAt, loading, saving, dirty, loadAll, saveReport,
  } = useTurno();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return SLOTS;
    const q = query.trim().toLowerCase();
    return SLOTS.filter(({ room, bed }) => {
      const resident = residentAt(room, bed);
      const name = resident ? `${resident.firstName} ${resident.lastName}`.toLowerCase() : '';
      return String(room).includes(q) || bed.toLowerCase().includes(q) || name.includes(q);
    });
  }, [query, residentAt]);

  const summaryFor = (room: number, bed: string) => {
    if (shift === 'dia') {
      const h = getHygiene(room, bed);
      const count = Object.entries(h).filter(([, v]) => typeof v === 'boolean' && v).length;
      return count > 0 ? `Aseo: ${count}/8 marcado` : 'Sin registrar';
    }
    const n = getNightCare(room, bed);
    const count = Object.entries(n).filter(([, v]) => typeof v === 'boolean' && v).length;
    return count > 0 ? `Turno noche: ${count}/7 marcado` : 'Sin registrar';
  };

  const handleSave = async () => {
    try {
      await saveReport();
      Alert.alert('Guardado', 'El informe de turno se guardó correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo guardar el informe.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.row}>
          <Text style={styles.dateText}>{date}</Text>
          <View style={styles.shiftBadge}>
            <Text style={styles.shiftBadgeText}>{SHIFT_LABEL[shift]}</Text>
          </View>
        </View>
        <Text style={styles.hint}>El turno se determina automáticamente según la hora.</Text>

        {shiftPending && (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingText}>
              Ya comenzó el turno siguiente. Guarda tus cambios para pasar al nuevo turno.
            </Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoLine}>Encargado de turno: <Text style={styles.infoValue}>{supervisor || '—'}</Text></Text>
          {!!caregivers && <Text style={styles.infoLine}>Cuidadores: <Text style={styles.infoValue}>{caregivers}</Text></Text>}
          {!!staff && <Text style={styles.infoLine}>Personal: <Text style={styles.infoValue}>{staff}</Text></Text>}
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar habitación, cama o nombre..."
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#0a3a8a" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.room}-${item.bed}`}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAll} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            const resident = residentAt(item.room, item.bed);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('BedDetail', { room: item.room, bed: item.bed })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Habitación {item.room} · Cama {item.bed}</Text>
                  <Text style={styles.cardSubtitle}>
                    {resident ? `${resident.firstName} ${resident.lastName}` : 'Sin residente asignado'}
                  </Text>
                  <Text style={styles.cardStatus}>{summaryFor(item.room, item.bed)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.saveButton, (saving || !dirty) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>{dirty ? 'Guardar informe' : 'Sin cambios por guardar'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e1e4e8', gap: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dateText: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#333' },
  shiftBadge: { backgroundColor: '#0a3a8a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  shiftBadgeText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: '#777', marginTop: -4 },
  pendingBox: { backgroundColor: '#fff4e5', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#f5a623' },
  pendingText: { fontSize: 13, color: '#8a5a00' },
  label: { fontSize: 13, color: '#555', fontWeight: '600' },
  infoBox: {
    backgroundColor: '#f5f7fb', borderRadius: 8, padding: 10, gap: 2,
  },
  infoLine: { fontSize: 13, color: '#555' },
  infoValue: { fontWeight: '600', color: '#333' },
  searchInput: {
    borderWidth: 1.5, borderColor: '#0a3a8a', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginTop: 4,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 12, marginTop: 10, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#e1e4e8',
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0a3a8a' },
  cardSubtitle: { fontSize: 13, color: '#444', marginTop: 2 },
  cardStatus: { fontSize: 12, color: '#777', marginTop: 4 },
  chevron: { fontSize: 24, color: '#999', marginLeft: 8 },
  saveButton: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    backgroundColor: '#0a3a8a', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
