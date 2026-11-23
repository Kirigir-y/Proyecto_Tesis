import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import api from '../../api/client';
import type { CalendarEvent } from '../../types';

interface DayMarking {
  dots?: { key: string; color: string }[];
  marked?: boolean;
  selected?: boolean;
  selectedColor?: string;
}

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

const PRIORITY_HIGH = 25;
const PRIORITY_MEDIUM = 15;

function priorityStyle(priority: number) {
  if (priority >= PRIORITY_HIGH) return { bg: '#fce8e6', color: '#c5221f', border: '#fad2cf', label: 'Urgente', dot: '#c5221f' };
  if (priority >= PRIORITY_MEDIUM) return { bg: '#fef3d6', color: '#b06000', border: '#feebb6', label: 'Media', dot: '#e8a53d' };
  return { bg: '#e8f0fe', color: '#1a73e8', border: '#d2e3fc', label: 'Normal', dot: '#1a73e8' };
}

const toLocalDateString = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const todayIso = () => toLocalDateString(new Date().toISOString());

export default function CalendarioScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayIso());

  const load = useCallback(async () => {
    try {
      const res = await api.get<CalendarEvent[]>('/calendar-events');
      setEvents(res.data);
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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = toLocalDateString(ev.startDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const markedDates = useMemo(() => {
    const marks: Record<string, DayMarking> = {};
    eventsByDate.forEach((dayEvents, date) => {
      const dots = dayEvents
        .slice(0, 4)
        .map((ev, i) => ({ key: `${ev.id}-${i}`, color: priorityStyle(ev.priority).dot }));
      marks[date] = { dots, marked: true };
    });
    marks[selectedDate] = { ...(marks[selectedDate] || {}), selected: true, selectedColor: '#0a3a8a' };
    return marks;
  }, [eventsByDate, selectedDate]);

  const dayEvents = eventsByDate.get(selectedDate) || [];

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const formatSelectedDate = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.container}>
      <FlatList
          data={loading ? [] : dayEvents}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={{ flexGrow: 1 }}
          ListHeaderComponent={
            <>
              <Calendar
                current={selectedDate}
                onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
                markingType="multi-dot"
                markedDates={markedDates}
                theme={{
                  todayTextColor: '#0a3a8a',
                  arrowColor: '#0a3a8a',
                  selectedDayBackgroundColor: '#0a3a8a',
                  dotColor: '#0a3a8a',
                }}
              />
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>{formatSelectedDate(selectedDate)}</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            loading
              ? <ActivityIndicator style={{ marginTop: 20 }} color="#0a3a8a" />
              : <Text style={styles.empty}>Sin eventos este día.</Text>
          }
          renderItem={({ item }) => {
            const p = priorityStyle(item.priority);
            return (
              <View style={[styles.card, styles.cardSpacing]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: p.bg, borderColor: p.border }]}>
                    <Text style={[styles.badgeText, { color: p.color }]}>{p.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardType}>{item.type}</Text>
                <Text style={styles.cardDate}>{formatTime(item.startDate)}</Text>
                {!!item.location && <Text style={styles.cardMeta}>📍 {item.location}</Text>}
                {!!item.description && <Text style={styles.cardDescription}>{item.description}</Text>}
              </View>
            );
          }}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  listHeader: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
  listHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#0a3a8a', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#777', marginTop: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e1e4e8',
    padding: 14, marginBottom: 12,
  },
  cardSpacing: { marginHorizontal: 12, marginTop: 12, marginBottom: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#0a3a8a' },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cardType: { fontSize: 12, color: '#777', marginTop: 4 },
  cardDate: { fontSize: 13, color: '#333', marginTop: 6, fontWeight: '600' },
  cardMeta: { fontSize: 12, color: '#555', marginTop: 4 },
  cardDescription: { fontSize: 13, color: '#444', marginTop: 6 },
});
