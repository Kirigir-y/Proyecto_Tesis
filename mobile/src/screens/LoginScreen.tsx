import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import ServerSettings from '../components/ServerSettings';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login, error, serverFound, searchingServer, searchServer } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showServer, setShowServer] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) return;
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title} onLongPress={() => setShowServer((v) => !v)}>R.A.O.C. App</Text>
        <Text style={styles.subtitle}>Ingresa con tu cuenta de la plataforma</Text>

        <TextInput
          style={styles.input}
          placeholder="Usuario"
          placeholderTextColor="#8a94a6"
          selectionColor="#0a3a8a"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#8a94a6"
          selectionColor="#0a3a8a"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ingresar</Text>}
        </TouchableOpacity>

        {searchingServer ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color="#0a3a8a" />
            <Text style={[styles.statusText, { marginTop: 0 }]}>Buscando la plataforma en la red Wi-Fi...</Text>
          </View>
        ) : serverFound ? (
          <Text style={[styles.statusText, styles.statusOk]}>● Conectado a la plataforma</Text>
        ) : (
          <View style={styles.notFoundBox}>
            <Text style={styles.notFoundText}>
              No se encontró la plataforma. Revisa que el celular esté conectado al Wi-Fi del establecimiento y que el computador de la plataforma esté encendido.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => { searchServer(); }}>
              <Text style={styles.retryText}>Buscar de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}

        {showServer && (
          <View style={styles.serverBox}>
            <ServerSettings onSaved={() => { setShowServer(false); searchServer(); }} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a3a8a', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0a3a8a', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  input: {
    color: '#0a3a8a',
    borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12,
  },
  error: { color: '#c5221f', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#0a3a8a', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  statusText: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 16 },
  statusOk: { color: '#1e7e34', fontWeight: '600' },
  notFoundBox: { marginTop: 16, backgroundColor: '#fff4e5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#f5a623' },
  notFoundText: { fontSize: 13, color: '#8a5a00', textAlign: 'center' },
  retryButton: { marginTop: 10, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f5a623' },
  retryText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  serverBox: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
});
