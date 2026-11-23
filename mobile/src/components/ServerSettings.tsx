import axios from 'axios';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getApiUrl, normalizeServerAddress, saveApiUrl } from '../config';

interface Props {
  onSaved?: () => void;
}

export default function ServerSettings({ onSaved }: Props) {
  const [address, setAddress] = useState(getApiUrl());
  const [testing, setTesting] = useState(false);

  const save = async (url: string) => {
    await saveApiUrl(url);
    setAddress(url);
    onSaved?.();
  };

  const handleSave = async () => {
    const url = normalizeServerAddress(address);
    if (!url) return;

    setTesting(true);
    try {
      await axios.get(`${url}/residents`, { timeout: 5000, validateStatus: () => true });
      await save(url);
      Alert.alert('Conectado', `Servidor guardado:\n${url}`);
    } catch {
      Alert.alert(
        'No se pudo conectar',
        `No hubo respuesta de ${url}.\n\nRevisa que el PC y el celular estén en la misma red, que el backend esté encendido y que la IP sea la correcta.`,
        [
          { text: 'Corregir', style: 'cancel' },
          { text: 'Guardar igual', onPress: () => save(url) },
        ],
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <View>
      <Text style={styles.label}>Dirección del servidor</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Ej: 192.168.43.5"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={styles.hint}>Escribe la IP del PC que tiene la plataforma (se ve con "ipconfig").</Text>
      <TouchableOpacity style={[styles.button, testing && styles.buttonDisabled]} onPress={handleSave} disabled={testing}>
        {testing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Probar y guardar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
  },
  hint: { fontSize: 12, color: '#777', marginTop: 6, marginBottom: 10 },
  button: { backgroundColor: '#0a3a8a', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
