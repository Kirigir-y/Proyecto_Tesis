import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import api from '../../api/client';
import type { SupplyItem, SupplyStatus } from '../../types';

const STATUS_OPTIONS: { value: SupplyStatus; label: string; color: string }[] = [
  { value: 'disponible', label: 'Disponible', color: '#137333' },
  { value: 'poco', label: 'Queda poco', color: '#b06000' },
  { value: 'falta', label: 'Falta', color: '#c5221f' },
];

function statusStyle(status: SupplyStatus) {
  return STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
}

export default function InventarioScreen() {
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<SupplyItem[]>('/supply-items');
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const alerts = items.filter((i) => i.status !== 'disponible');

  const openItem = (item: SupplyItem) => {
    setActiveId(item.id);
    setNote(item.note || '');
  };

  const handleUpdateStatus = async (id: string, status: SupplyStatus) => {
    setSubmitting(true);
    try {
      await api.put(`/supply-items/${id}`, { status, note: note.trim() || null });
      setActiveId(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo actualizar el insumo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item: SupplyItem) => {
    Alert.alert('Eliminar insumo', `¿Quitar "${item.name}" del inventario?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/supply-items/${item.id}`);
            setActiveId(null);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'No se pudo eliminar el insumo.');
          }
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!newName.trim()) { Alert.alert('Falta el nombre', 'Escribe qué insumo quieres agregar.'); return; }
    setSubmitting(true);
    try {
      await api.post('/supply-items', { name: newName.trim(), status: 'disponible' });
      setNewName('');
      setShowAddForm(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo agregar el insumo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {alerts.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            ⚠ {alerts.length} insumo{alerts.length > 1 ? 's' : ''} necesita{alerts.length > 1 ? 'n' : ''} reposición
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#0a3a8a" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        >
          {items.length === 0 ? (
            <Text style={styles.empty}>No hay insumos registrados.</Text>
          ) : (
            items.map((item) => {
              const s = statusStyle(item.status);
              const isActive = activeId === item.id;
              return (
                <View key={item.id} style={styles.card}>
                  <TouchableOpacity style={styles.cardHeader} onPress={() => (isActive ? setActiveId(null) : openItem(item))}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <View style={[styles.badge, { borderColor: s.color }]}>
                      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  </TouchableOpacity>
                  {!!item.note && !isActive && <Text style={styles.cardNote}>{item.note}</Text>}

                  {isActive && (
                    <View style={styles.editPanel}>
                      <Text style={styles.editLabel}>Nota (opcional)</Text>
                      <TextInput
                        style={styles.noteInput}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Ej: quedan 2 paquetes, pedir la próxima semana..."
                        multiline
                      />
                      <View style={styles.statusRow}>
                        {STATUS_OPTIONS.map((opt) => (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.statusBtn, { borderColor: opt.color }]}
                            onPress={() => handleUpdateStatus(item.id, opt.value)}
                            disabled={submitting}
                          >
                            <Text style={[styles.statusBtnText, { color: opt.color }]}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(item)}>
                        <Text style={styles.deleteLink}>Eliminar este insumo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {showAddForm ? (
            <View style={styles.card}>
              <Text style={styles.editLabel}>Nombre del insumo</Text>
              <TextInput
                style={styles.noteInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Ej: Crema para pañalitis"
                autoFocus
              />
              <View style={styles.statusRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddForm(false); setNewName(''); }}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addConfirmBtn} onPress={handleAdd} disabled={submitting}>
                  <Text style={styles.addConfirmBtnText}>Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(true)}>
              <Text style={styles.addBtnText}>+ Agregar insumo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  alertBanner: { backgroundColor: '#fce8e6', borderBottomWidth: 1, borderBottomColor: '#fad2cf', padding: 12 },
  alertText: { color: '#c5221f', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  empty: { textAlign: 'center', color: '#777', marginTop: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e1e4e8',
    padding: 14, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '600', color: '#222', flex: 1 },
  badge: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cardNote: { fontSize: 12, color: '#777', marginTop: 6, fontStyle: 'italic' },
  editPanel: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  editLabel: { fontSize: 12, color: '#555', fontWeight: '600', marginBottom: 6 },
  noteInput: {
    borderWidth: 1.5, borderColor: '#ccc', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 10,
  },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statusBtn: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  statusBtnText: { fontWeight: 'bold', fontSize: 12 },
  deleteLink: { color: '#c5221f', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  addBtn: {
    borderWidth: 2, borderColor: '#0a3a8a', borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  addBtnText: { color: '#0a3a8a', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#ccc', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  cancelBtnText: { color: '#555', fontWeight: '600', fontSize: 13 },
  addConfirmBtn: { flex: 1, backgroundColor: '#0a3a8a', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  addConfirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
