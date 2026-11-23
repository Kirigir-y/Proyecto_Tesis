import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useOutletContext } from 'react-router-dom';
import api from '../../api/axios';
import type { DashboardContext } from './DashboardLayout';
import { useToast } from '../../context/ToastContext';

type ChatMessage = {
    id: string;
    senderId: string;
    senderUsername: string;
    senderRole: string;
    content: string;
    createdAt: string;
    pinned?: boolean;
    pinOrder?: number | null;
    pinnedBy?: string | null;
};


const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '') || window.location.origin;


const PIN_COLORS = ['#e53935', '#fb8c00', '#43a047'];
const PIN_ROLES = ['admin', 'Enfermero', 'TENS'];

const MensajesList = () => {
    const { user } = useOutletContext<DashboardContext>();
    const { showToast } = useToast();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [pinned, setPinned] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState('');
    const [connected, setConnected] = useState(false);
    const [highlightId, setHighlightId] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const canPin = PIN_ROLES.includes(user.role);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const [res, pinnedRes] = await Promise.all([
                api.get('/messages?limit=200'),
                api.get('/messages/pinned'),
            ]);
            setMessages(res.data);
            setPinned(pinnedRes.data);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo cargar el registro de mensajes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();

        const token = localStorage.getItem('token');
        const socket = io(`${SOCKET_URL}/messages`, { auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));
        socket.on('message:new', (message: ChatMessage) => {
            setMessages(prev => [...prev, message]);
        });
        socket.on('message:pinned', (list: ChatMessage[]) => setPinned(list));

        return () => { socket.disconnect(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages.length]);

    const handleSend = async () => {
        const content = draft.trim();
        if (!content) return;
        setDraft('');
        try {
            await api.post('/messages', { content });
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo enviar el mensaje.');
        }
    };

    const togglePin = async (m: ChatMessage, isPinned: boolean) => {
        try {
            const res = await api.patch(`/messages/${m.id}/${isPinned ? 'unpin' : 'pin'}`);
            setPinned(res.data);
            showToast(isPinned ? 'Mensaje desfijado.' : 'Mensaje fijado.');
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo actualizar el mensaje fijado.');
        }
    };

    const movePinned = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= pinned.length) return;
        const reordered = [...pinned];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        setPinned(reordered);
        try {
            const res = await api.put('/messages/pinned/order', { ids: reordered.map(p => p.id) });
            setPinned(res.data);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo cambiar el orden.');
            fetchHistory();
        }
    };

    const goToMessage = (id: string) => {
        const el = scrollRef.current?.querySelector<HTMLElement>(`[data-msg-id="${id}"]`);
        if (!el || !scrollRef.current) {
            showToast('Ese mensaje es antiguo y no está entre los últimos cargados; su texto se muestra en la lista de fijados.');
            return;
        }
        scrollRef.current.scrollTo({ top: Math.max(el.offsetTop - 16, 0), behavior: 'smooth' });
        setHighlightId(id);
        setTimeout(() => setHighlightId(curr => (curr === id ? null : curr)), 2000);
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const pinIndex = (id: string) => pinned.findIndex(p => p.id === id);

    return (
        <div style={styles.wrapper}>
            <div style={styles.header}>
                <h2 style={styles.title}>Mensajes</h2>
                <span style={connected ? styles.statusOnline : styles.statusOffline}>
                    {connected ? '● En vivo' : '○ Desconectado'}
                </span>
            </div>

            {pinned.length > 0 && (
                <div style={styles.pinnedBox}>
                    <div style={styles.pinnedTitle}>
                        Mensajes fijados
                    </div>
                    {pinned.map((p, i) => (
                        <div key={p.id} style={styles.pinnedRow}>
                            <span style={{ ...styles.pinDot, backgroundColor: PIN_COLORS[i] ?? 'transparent', borderColor: PIN_COLORS[i] ?? '#bbb' }} />
                            <span style={styles.pinOrder}>{i + 1}.</span>
                            <button style={styles.pinnedText} onClick={() => goToMessage(p.id)} title="Ir al mensaje">
                                <strong>{p.senderUsername}:</strong> {p.content}
                            </button>
                            {canPin && (
                                <div style={styles.pinnedActions}>
                                    <button style={styles.iconBtn} onClick={() => movePinned(i, -1)} disabled={i === 0} title="Subir prioridad">▲</button>
                                    <button style={styles.iconBtn} onClick={() => movePinned(i, 1)} disabled={i === pinned.length - 1} title="Bajar prioridad">▼</button>
                                    <button style={styles.unpinBtn} onClick={() => togglePin(p, true)}>Desfijar</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div style={styles.chatBox} ref={scrollRef}>
                {loading ? (
                    <p style={styles.emptyText}>Cargando mensajes...</p>
                ) : messages.length === 0 ? (
                    <p style={styles.emptyText}>Aún no hay mensajes registrados.</p>
                ) : (
                    messages.map((m) => {
                        const idx = pinIndex(m.id);
                        const isPinned = idx >= 0;
                        const pinColor = isPinned ? (PIN_COLORS[idx] ?? '#8a94a6') : undefined;
                        return (
                            <div
                                key={m.id}
                                data-msg-id={m.id}
                                style={{
                                    ...(m.senderId === user.id ? styles.bubbleOwn : styles.bubbleOther),
                                    ...(isPinned ? { borderLeft: `4px solid ${pinColor}` } : {}),
                                    ...(highlightId === m.id ? styles.bubbleHighlight : {}),
                                }}
                            >
                                <div style={styles.bubbleMeta}>
                                    <strong>{m.senderUsername}</strong>
                                    <span style={styles.roleTag}>{m.senderRole}</span>
                                    <span style={styles.timeTag}>{formatTime(m.createdAt)}</span>
                                    {isPinned && <span style={{ ...styles.pinnedTag, color: pinColor }}>📌 Fijado</span>}
                                    {canPin && (
                                        <button style={styles.pinLink} onClick={() => togglePin(m, isPinned)}>
                                            {isPinned ? 'Desfijar' : 'Fijar'}
                                        </button>
                                    )}
                                </div>
                                <div>{m.content}</div>
                            </div>
                        );
                    })
                )}
            </div>

            <div style={styles.inputRow}>
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                    placeholder="Escribir un mensaje..."
                    style={styles.input}
                />
                <button onClick={handleSend} style={styles.sendButton}>Enviar</button>
            </div>
        </div>
    );
};

const styles = {
    wrapper: {
        display: 'flex', flexDirection: 'column' as const, gap: '16px',
        width: '100%', maxWidth: '900px',
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { margin: 0, fontSize: '22px', color: '#0a3a8a', fontWeight: 'bold' },
    statusOnline: { fontSize: '13px', fontWeight: 600, color: '#137333' },
    statusOffline: { fontSize: '13px', fontWeight: 600, color: '#c5221f' },
    pinnedBox: {
        backgroundColor: 'white', border: '1px solid #e1e4e8', borderRadius: '12px',
        padding: '12px 16px', display: 'flex', flexDirection: 'column' as const, gap: '8px',
        maxHeight: '220px', overflowY: 'auto' as const,
    },
    pinnedTitle: { fontSize: '14px', fontWeight: 'bold', color: '#0a3a8a', display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' as const },
    pinnedHint: { fontSize: '11px', fontWeight: 'normal', color: '#777' },
    pinnedRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    pinDot: { width: '12px', height: '12px', borderRadius: '50%', border: '2px solid', flexShrink: 0 },
    pinOrder: { fontSize: '13px', color: '#555', width: '20px' },
    pinnedText: {
        flex: 1, textAlign: 'left' as const, background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '13px', color: '#222', padding: 0, overflow: 'hidden',
        whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis',
    },
    pinnedActions: { display: 'flex', gap: '4px', flexShrink: 0 },
    iconBtn: {
        border: '1px solid #ccc', background: 'white', borderRadius: '6px',
        padding: '2px 8px', cursor: 'pointer', fontSize: '11px', color: '#0a3a8a',
    },
    unpinBtn: {
        border: '1px solid #f1c0bf', background: '#fdecea', borderRadius: '6px',
        padding: '2px 8px', cursor: 'pointer', fontSize: '11px', color: '#c5221f',
    },
    chatBox: {
        backgroundColor: 'white', border: '1px solid #e1e4e8', borderRadius: '12px',
        padding: '16px', height: '520px', overflowY: 'auto' as const,
        display: 'flex', flexDirection: 'column' as const, gap: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.02)', position: 'relative' as const,
    },
    emptyText: { textAlign: 'center' as const, color: '#777', margin: 'auto' },
    bubbleOwn: {
        alignSelf: 'flex-end' as const, backgroundColor: '#e8f0fe', color: '#0a3a8a',
        borderRadius: '10px', padding: '8px 12px', maxWidth: '70%', fontSize: '14px',
        transition: 'box-shadow 0.3s',
    },
    bubbleOther: {
        alignSelf: 'flex-start' as const, backgroundColor: '#f5f7fb', color: '#222',
        borderRadius: '10px', padding: '8px 12px', maxWidth: '70%', fontSize: '14px',
        transition: 'box-shadow 0.3s',
    },
    bubbleHighlight: { boxShadow: '0 0 0 3px #ffd54f' },
    bubbleMeta: {
        display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' as const,
        fontSize: '11px', color: '#666', marginBottom: '4px',
    },
    roleTag: {
        backgroundColor: '#dde3ea', color: '#333', borderRadius: '8px',
        padding: '1px 6px', fontSize: '10px', fontWeight: 600,
    },
    timeTag: { color: '#999' },
    pinnedTag: { fontSize: '10px', fontWeight: 700 },
    pinLink: {
        background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer',
        fontSize: '11px', padding: 0, textDecoration: 'underline',
    },
    inputRow: { display: 'flex', gap: '10px' },
    input: {
        flex: 1, padding: '10px 14px', borderRadius: '8px',
        border: '1.5px solid #ccc', fontSize: '14px', outline: 'none',
    },
    sendButton: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white',
        padding: '10px 20px', borderRadius: '8px', fontSize: '14px',
        fontWeight: 'bold', cursor: 'pointer',
    },
};

export default MensajesList;
