import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function PerfilScreen() {
  const { user, logout, serverFound } = useAuth();

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.role}>Rol: {user?.role}</Text>
        <Text style={[styles.status, serverFound ? styles.statusOk : styles.statusOff]}>
          {serverFound ? '● Conectado a la plataforma' : '● Sin conexión con la plataforma'}
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e1e4e8',
    padding: 20, marginBottom: 20,
  },
  username: { fontSize: 20, fontWeight: 'bold', color: '#0a3a8a' },
  role: { fontSize: 14, color: '#555', marginTop: 6 },
  status: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  statusOk: { color: '#1e7e34' },
  statusOff: { color: '#c5221f' },
  logoutBtn: {
    backgroundColor: '#c5221f', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
