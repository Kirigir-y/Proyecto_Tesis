import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import TogglePill from '../../components/TogglePill';
import FeedingStepper from '../../components/FeedingStepper';
import { useTurno } from '../../context/TurnoContext';
import type { TurnoStackParamList } from '../../navigation/TurnoStack';
import type { FeedingEntry, HygieneEntry, NightCareEntry } from '../../types';

type Props = NativeStackScreenProps<TurnoStackParamList, 'BedDetail'>;

const HYGIENE_FIELDS: { key: keyof HygieneEntry; label: string }[] = [
  { key: 'aseoCavidades', label: 'Aseo de cavidades' },
  { key: 'corteCapilar', label: 'Corte capilar' },
  { key: 'corteUnas', label: 'Corte de uñas (onicotomía)' },
  { key: 'aseoBucal', label: 'Aseo bucal' },
  { key: 'cambioPanal', label: 'Cambio de pañal' },
  { key: 'banoDucha', label: 'Baño / ducha' },
  { key: 'afeitado', label: 'Afeitado / rasurado' },
  { key: 'lubricacion', label: 'Lubricación de piel' },
];

const NIGHT_CARE_FIELDS: { key: keyof NightCareEntry; label: string }[] = [
  { key: 'ordenCloset', label: 'Orden de closet' },
  { key: 'ordenCajasAseo', label: 'Orden de cajas de aseo' },
  { key: 'cambioSabanas', label: 'Cambio de sábanas' },
  { key: 'retiroBotellasHidratacion', label: 'Retiro de botellas de hidratación' },
  { key: 'lubricacionPiel', label: 'Lubricación de piel' },
  { key: 'retiroOrinal', label: 'Retiro de orinal / inodoro portátil' },
  { key: 'aseoOrinal', label: 'Aseo de orinal / inodoro portátil' },
];

const FEEDING_FIELDS: { key: keyof FeedingEntry; label: string }[] = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'merienda', label: 'Merienda' },
  { key: 'almuerzo', label: 'Almuerzo' },
  { key: 'once', label: 'Once' },
  { key: 'cena', label: 'Cena' },
];

export default function BedDetailScreen({ route }: Props) {
  const { room, bed } = route.params;
  const {
    shift, getHygiene, getNightCare, getFeeding,
    toggleHygiene, toggleNightCare, setFeedingValue, residentAt,
  } = useTurno();

  const resident = residentAt(room, bed);
  const hygiene = getHygiene(room, bed);
  const nightCare = getNightCare(room, bed);
  const feeding = getFeeding(room, bed);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Habitación {room} · Cama {bed}</Text>
      <Text style={styles.subtitle}>
        {resident ? `${resident.firstName} ${resident.lastName}` : 'Sin residente asignado a esta cama'}
      </Text>

      {shift === 'dia' ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aseo clínico</Text>
            {HYGIENE_FIELDS.map(({ key, label }) => (
              <TogglePill
                key={key}
                label={label}
                value={hygiene[key] as boolean}
                onToggle={() => toggleHygiene(room, bed, key)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alimentación</Text>
            {FEEDING_FIELDS.map(({ key, label }) => (
              <FeedingStepper
                key={key}
                label={label}
                value={feeding[key] as number}
                onChange={(v) => setFeedingValue(room, bed, key, v)}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actividades de turno noche</Text>
            {NIGHT_CARE_FIELDS.map(({ key, label }) => (
              <TogglePill
                key={key}
                label={label}
                value={nightCare[key] as boolean}
                onToggle={() => toggleNightCare(room, bed, key)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Colación nocturna</Text>
            {resident?.requiereColacionNocturna ? (
              <FeedingStepper
                label="Colación nocturna"
                value={feeding.colacionNocturna ?? 0}
                onChange={(v) => setFeedingValue(room, bed, 'colacionNocturna', v)}
              />
            ) : (
              <Text style={styles.note}>Este residente no requiere colación nocturna.</Text>
            )}
          </View>
        </>
      )}

      <Text style={styles.hint}>
        Los cambios se guardan al presionar "Guardar informe" en la lista de habitaciones.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0a3a8a' },
  subtitle: { fontSize: 14, color: '#555', marginTop: 4, marginBottom: 16 },
  section: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e1e4e8',
    padding: 14, marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0a3a8a', marginBottom: 8 },
  note: { fontSize: 14, color: '#777', fontStyle: 'italic', paddingVertical: 8 },
  hint: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 24 },
});
