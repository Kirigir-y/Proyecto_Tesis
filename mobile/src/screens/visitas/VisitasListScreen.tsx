import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../../api/client';
import type { VisitasStackParamList } from '../../navigation/VisitasStack';
import type { VisitLog } from '../../types';

type Props = NativeStackScreenProps<VisitasStackParamList, 'VisitasLista'>;

const toLocalDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayIso = () => toLocalDateString(new Date());

const DOT_COLOR: Record<string, string> = { visita: '#1a73e8', salida: '#e8a53d' };

const TYPE_LABEL: Record<string, string> = { visita: 'Visita', salida: 'Salida' };

export default function VisitasListScreen({ navigation }: Props) {
  const [date, setDate] = useState(todayIso());
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<VisitLog[]>('/visit-logs');
      setLogs(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, VisitLog[]>();
    for (const log of logs) {
      const key = toLocalDateString(new Date(log.horaInicio));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  }, [logs]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    logsByDate.forEach((dayLogs, day) => {
      const types = Array.from(new Set(dayLogs.map((l) => l.type)));
      marks[day] = { marked: true, dots: types.map((t) => ({ key: t, color: DOT_COLOR[t] ?? '#999' })) };
    });
    marks[date] = { ...(marks[date] || {}), selected: true, selectedColor: '#0a3a8a' };
    return marks;
  }, [logsByDate, date]);

  const dayLogs = logsByDate.get(date) || [];

  const formatSelectedDate = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <FlatList
          data={loading ? [] : dayLogs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <>
              <Calendar
                current={date}
                onDayPress={(day: DateData) => setDate(day.dateString)}
                markingType="multi-dot"
                markedDates={markedDates}
                theme={{
                  todayTextColor: '#0a3a8a',
                  arrowColor: '#0a3a8a',
                  selectedDayBackgroundColor: '#0a3a8a',
                }}
              />
              <View style={styles.legend}>
                <View style={[styles.legendDot, { backgroundColor: DOT_COLOR.visita }]} />
                <Text style={styles.legendText}>Visita</Text>
                <View style={[styles.legendDot, { backgroundColor: DOT_COLOR.salida }]} />
                <Text style={styles.legendText}>Salida</Text>
                {date !== todayIso() && (
                  <TouchableOpacity style={styles.todayBtn} onPress={() => setDate(todayIso())}>
                    <Text style={styles.todayBtnText}>Hoy</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>{formatSelectedDate(date)}</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            loading
              ? <ActivityIndicator style={{ marginTop: 20 }} color="#0a3a8a" />
              : <Text style={styles.empty}>Sin registros este día.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, styles.cardSpacing]}
              onPress={() => navigation.navigate('VisitaForm', { log: item })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardResident}>{item.resident?.firstName} {item.resident?.lastName}</Text>
                <View style={[styles.badge, item.type === 'salida' ? styles.badgeSalida : styles.badgeVisita]}>
                  <Text style={styles.badgeText}>{TYPE_LABEL[item.type]}</Text>
                </View>
              </View>
              <Text style={styles.cardTime}>
                {formatTime(item.horaInicio)} {item.horaFin ? `— ${formatTime(item.horaFin)}` : '— en curso'}
              </Text>
              <Text style={styles.cardPersona}>
                {item.type === 'salida' ? 'Retira: ' : 'Visita: '}{item.personaNombre}
                {item.personaRelacion ? ` (${item.personaRelacion})` : ''}
              </Text>
              {!!item.motivo && <Text style={styles.cardMotivo}>{item.motivo}</Text>}
            </TouchableOpacity>
          )}
        />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('VisitaForm', { date })}
      >
        <Text style={styles.fabText}>+ Nuevo registro</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  legend: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#555', marginRight: 10 },
  todayBtn: { marginLeft: 'auto', backgroundColor: '#0a3a8a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  todayBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  listHeader: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
  listHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#0a3a8a', textTransform: 'capitalize' },
  cardSpacing: { marginHorizontal: 12, marginTop: 10, marginBottom: 0 },
  empty: { textAlign: 'center', color: '#777', marginTop: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e1e4e8',
    padding: 14, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardResident: { fontSize: 15, fontWeight: 'bold', color: '#0a3a8a', flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeVisita: { backgroundColor: '#e8f0fe' },
  badgeSalida: { backgroundColor: '#fef3d6' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  cardTime: { fontSize: 13, color: '#333', marginTop: 6, fontWeight: '600' },
  cardPersona: { fontSize: 13, color: '#555', marginTop: 4 },
  cardMotivo: { fontSize: 12, color: '#777', marginTop: 4, fontStyle: 'italic' },
  fab: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    backgroundColor: '#0a3a8a', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
