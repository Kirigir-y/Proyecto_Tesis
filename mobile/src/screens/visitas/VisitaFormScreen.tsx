import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../../api/client';
import type { VisitasStackParamList } from '../../navigation/VisitasStack';
import type { Resident, VisitLogType } from '../../types';

type Props = NativeStackScreenProps<VisitasStackParamList, 'VisitaForm'>;

const pad = (n: number) => String(n).padStart(2, '0');
const nowDate = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const splitIso = (iso: string) => {
  const d = new Date(iso);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};

export default function VisitaFormScreen({ route, navigation }: Props) {
  const existing = route.params?.log;
  const isEditing = Boolean(existing);

  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentQuery, setResidentQuery] = useState('');
  const [residentId, setResidentId] = useState(existing?.residentId || '');
  const [residentLabel, setResidentLabel] = useState(
    existing?.resident ? `${existing.resident.firstName} ${existing.resident.lastName}` : '',
  );
  const [type, setType] = useState<VisitLogType>(existing?.type || 'visita');
  const [date, setDate] = useState(existing ? splitIso(existing.horaInicio).date : (route.params?.date || nowDate()));
  const [horaInicio, setHoraInicio] = useState(existing ? splitIso(existing.horaInicio).time : nowTime());
  const [horaFin, setHoraFin] = useState(existing?.horaFin ? splitIso(existing.horaFin).time : '');
  const [personaNombre, setPersonaNombre] = useState(existing?.personaNombre || '');
  const [personaRelacion, setPersonaRelacion] = useState(existing?.personaRelacion || '');
  const [motivo, setMotivo] = useState(existing?.motivo || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Resident[]>('/residents').then((res) => setResidents(res.data)).catch(() => { });
  }, []);

  const filteredResidents = residentQuery.trim()
    ? residents.filter((r) => `${r.firstName} ${r.lastName}`.toLowerCase().includes(residentQuery.trim().toLowerCase()))
    : [];

  const handleSave = async () => {
    if (!residentId) { Alert.alert('Falta el residente', 'Selecciona a qué residente corresponde este registro.'); return; }
    if (!personaNombre.trim()) { Alert.alert('Falta un dato', 'Indica el nombre de quién retira/visita.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD.'); return; }
    if (!/^\d{2}:\d{2}$/.test(horaInicio)) { Alert.alert('Hora inválida', 'Usa el formato HH:MM para la hora de inicio.'); return; }
    if (horaFin && !/^\d{2}:\d{2}$/.test(horaFin)) { Alert.alert('Hora inválida', 'Usa el formato HH:MM para la hora de término.'); return; }

    setSaving(true);
    try {
      const payload = {
        residentId,
        type,
        horaInicio: `${date}T${horaInicio}:00`,
        horaFin: horaFin ? `${date}T${horaFin}:00` : null,
        personaNombre: personaNombre.trim(),
        personaRelacion: personaRelacion.trim() || null,
        motivo: motivo.trim() || null,
      };
      if (isEditing) {
        await api.put(`/visit-logs/${existing!.id}`, payload);
      } else {
        await api.post('/visit-logs', payload);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo guardar el registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Eliminar registro', '¿Seguro que quieres eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/visit-logs/${existing.id}`);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'No se pudo eliminar el registro.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de registro</Text>
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'visita' && styles.typeBtnActive]}
            onPress={() => setType('visita')}
          >
            <Text style={[styles.typeText, type === 'visita' && styles.typeTextActive]}>Visita</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'salida' && styles.typeBtnActive]}
            onPress={() => setType('salida')}
          >
            <Text style={[styles.typeText, type === 'salida' && styles.typeTextActive]}>Salida</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Residente</Text>
        {residentId ? (
          <View style={styles.selectedResident}>
            <Text style={styles.selectedResidentText}>{residentLabel}</Text>
            <TouchableOpacity onPress={() => { setResidentId(''); setResidentLabel(''); }}>
              <Text style={styles.changeLink}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Buscar residente por nombre..."
              value={residentQuery}
              onChangeText={setResidentQuery}
            />
            {filteredResidents.slice(0, 6).map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.residentOption}
                onPress={() => {
                  setResidentId(r.id);
                  setResidentLabel(`${r.firstName} ${r.lastName}`);
                  setResidentQuery('');
                }}
              >
                <Text style={styles.residentOptionText}>
                  {r.firstName} {r.lastName}{r.room ? ` · Hab. ${r.room}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{type === 'salida' ? 'Horario de salida' : 'Horario de la visita'}</Text>
        <Text style={styles.label}>Fecha</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{type === 'salida' ? 'Hora de salida' : 'Hora de llegada'}</Text>
            <View style={styles.timeRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={horaInicio} onChangeText={setHoraInicio} placeholder="HH:MM" />
              <TouchableOpacity style={styles.nowBtn} onPress={() => setHoraInicio(nowTime())}>
                <Text style={styles.nowBtnText}>Ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{type === 'salida' ? 'Hora de regreso (opcional)' : 'Hora que se retira (opcional)'}</Text>
            <View style={styles.timeRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={horaFin} onChangeText={setHoraFin} placeholder="HH:MM" />
              <TouchableOpacity style={styles.nowBtn} onPress={() => setHoraFin(nowTime())}>
                <Text style={styles.nowBtnText}>Ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{type === 'salida' ? 'Quién lo retira' : 'Quién visita'}</Text>
        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={personaNombre} onChangeText={setPersonaNombre} placeholder="Nombre completo" />
        <Text style={styles.label}>Relación con el residente (opcional)</Text>
        <TextInput style={styles.input} value={personaRelacion} onChangeText={setPersonaRelacion} placeholder="Ej: Hija, Hijo, Vecino..." />
        <Text style={styles.label}>Motivo o destino (opcional)</Text>
        <TextInput style={styles.input} value={motivo} onChangeText={setMotivo} placeholder="Ej: Control médico, paseo familiar..." multiline />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar registro</Text>}
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Eliminar registro</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  section: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e1e4e8',
    padding: 14, marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0a3a8a', marginBottom: 10 },
  typeToggle: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: '#0a3a8a' },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  typeBtnActive: { backgroundColor: '#0a3a8a' },
  typeText: { fontSize: 14, fontWeight: '600', color: '#0a3a8a' },
  typeTextActive: { color: '#fff' },
  label: { fontSize: 12, color: '#555', fontWeight: '600', marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#ccc', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
  },
  row: { flexDirection: 'row', gap: 10 },
  timeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  nowBtn: { backgroundColor: '#eef1f7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  nowBtnText: { fontSize: 12, fontWeight: '600', color: '#0a3a8a' },
  selectedResident: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#eef1f7', borderRadius: 8, padding: 12,
  },
  selectedResidentText: { fontSize: 14, fontWeight: '600', color: '#222' },
  changeLink: { fontSize: 13, color: '#0a3a8a', fontWeight: '600' },
  residentOption: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  residentOptionText: { fontSize: 14, color: '#333' },
  saveButton: { backgroundColor: '#0a3a8a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  deleteButton: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  deleteButtonText: { color: '#c5221f', fontWeight: '600', fontSize: 14 },
});
