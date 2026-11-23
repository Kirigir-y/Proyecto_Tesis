import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { KeyboardEvents, KeyboardStickyView } from 'react-native-keyboard-controller';
import { io, Socket } from 'socket.io-client';
import api from '../../api/client';
import { getAuthToken } from '../../api/authToken';
import { useAuth } from '../../context/AuthContext';
import { getSocketUrl } from '../../config';
import type { ChatMessage } from '../../types';
import PinIcon from '../../components/PinIcon';

const PIN_COLORS = ['#e53935', '#fb8c00', '#43a047'];
const PIN_ROLES = ['admin', 'Enfermero', 'TENS'];

export default function MensajesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinned, setPinned] = useState<ChatMessage[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const canPin = !!user && PIN_ROLES.includes(user.role);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [res, pinnedRes] = await Promise.all([
          api.get<ChatMessage[]>('/messages', { params: { limit: 200 } }),
          api.get<ChatMessage[]>('/messages/pinned').catch(() => ({ data: [] as ChatMessage[] })),
        ]);
        if (mounted) {
          setMessages(res.data);
          setPinned(pinnedRes.data);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const socket = io(`${getSocketUrl()}/messages`, { auth: { token: getAuthToken() } });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('message:new', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });
    socket.on('message:pinned', (list: ChatMessage[]) => setPinned(list));

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, []);

  const goToPinned = (pin: ChatMessage) => {
    const index = messages.findIndex((m) => m.id === pin.id);
    if (index < 0) {
      Alert.alert(`Mensaje fijado de ${pin.senderUsername}`, pin.content);
      return;
    }
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    setHighlightId(pin.id);
    setTimeout(() => setHighlightId((curr) => (curr === pin.id ? null : curr)), 2000);
  };

  useLayoutEffect(() => {
    const top = pinned.slice(0, 3);
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Mensajes</Text>
          {top.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => goToPinned(p)}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityLabel={`Mensaje fijado ${i + 1} de ${p.senderUsername}`}
            >
              <View style={styles.pinButton}>
                <PinIcon color={PIN_COLORS[i]} outline={PIN_COLORS[i]} size={18} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, pinned, messages]);

  const handleLongPress = (item: ChatMessage) => {
    if (!canPin) return;
    const isPinned = pinned.some((p) => p.id === item.id);
    Alert.alert(isPinned ? 'Desfijar mensaje' : 'Fijar mensaje', item.content, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: isPinned ? 'Desfijar' : 'Fijar',
        onPress: async () => {
          try {
            const res = await api.patch<ChatMessage[]>(`/messages/${item.id}/${isPinned ? 'unpin' : 'pin'}`);
            setPinned(res.data);
          } catch {
            Alert.alert('No se pudo actualizar', 'Revisa la conexión e inténtalo de nuevo.');
          }
        },
      },
    ]);
  };

  const scrollToLatest = (animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 50);
  };

  useEffect(() => {
    if (messages.length > 0) scrollToLatest();
  }, [messages.length]);

  useEffect(() => {
    const show = KeyboardEvents.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.height);
      scrollToLatest();
    });
    const hide = KeyboardEvents.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    try {
      await api.post('/messages', { content });
    } catch {
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={connected ? styles.statusOnline : styles.statusOffline}>
          {connected ? '● En vivo' : '○ Conectando...'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#0a3a8a" />
      ) : (
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 12 + keyboardHeight, flexGrow: 1, justifyContent: 'flex-end' }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
            }, 250);
          }}
          extraData={{ pinned, highlightId }}
          ListEmptyComponent={<Text style={styles.empty}>Aún no hay mensajes.</Text>}
          renderItem={({ item }) => {
            const pinIndex = pinned.findIndex((p) => p.id === item.id);
            return (
              <TouchableOpacity
                activeOpacity={canPin ? 0.7 : 1}
                onLongPress={canPin ? () => handleLongPress(item) : undefined}
                delayLongPress={400}
                style={[
                  styles.bubble,
                  item.senderId === user?.id ? styles.bubbleOwn : styles.bubbleOther,
                  highlightId === item.id && styles.bubbleHighlight,
                ]}
              >
                <View style={styles.meta}>
                  <Text style={styles.sender}>{item.senderUsername}</Text>
                  <Text style={styles.role}>{item.senderRole}</Text>
                </View>
                <Text style={styles.content}>{item.content}</Text>
                <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
                {pinIndex >= 0 && (
                  <View style={styles.pinBadge}>
                    <PinIcon color={PIN_COLORS[pinIndex] ?? '#8a94a6'} size={16} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <KeyboardStickyView style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Escribir un mensaje..."
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendBtnText}>Enviar</Text>
        </TouchableOpacity>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  statusBar: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  statusOnline: { fontSize: 12, fontWeight: '600', color: '#137333' },
  statusOffline: { fontSize: 12, fontWeight: '600', color: '#c5221f' },
  empty: { textAlign: 'center', color: '#777', marginTop: 30 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 10, marginBottom: 8 },
  bubbleOwn: { alignSelf: 'flex-end', backgroundColor: '#e8f0fe' },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e4e8' },
  bubbleHighlight: { backgroundColor: '#fff3c4' },
  pinBadge: { position: 'absolute', top: -7, right: -7 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pinButton: {
    width: 32, height: 32, borderRadius: 9,
    borderWidth: 2, borderColor: '#fff', backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginRight: 6 },
  meta: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  sender: { fontSize: 12, fontWeight: 'bold', color: '#0a3a8a' },
  role: { fontSize: 10, color: '#777' },
  content: { fontSize: 14, color: '#222' },
  time: { fontSize: 10, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', gap: 8,
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, maxHeight: 100,
  },
  sendBtn: { backgroundColor: '#0a3a8a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
