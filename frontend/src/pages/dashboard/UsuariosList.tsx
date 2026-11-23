import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import type { DashboardContext } from './DashboardLayout';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    TENS: 'TENS',
    Enfermero: 'Enfermero',
    cuidador: 'Cuidador',
};

const roleBadge = (role: string) => (
    <span style={styles.roleBadge}>{ROLE_LABELS[role] || role}</span>
);

type UserRow = { id: string; username: string; email: string | null; role: string; active: boolean };

const UsuariosList = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useOutletContext<DashboardContext>();
    const { showToast } = useToast();
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo cargar la lista de usuarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (u: UserRow) => {
        try {
            await api.put(`/users/${u.id}`, { active: !u.active });
            await fetchUsers();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo actualizar el estado de la cuenta.');
        }
    };

    const handleDelete = async (u: UserRow) => {
        if (!confirm(`¿Eliminar la cuenta de "${u.username}"? Esta acción no se puede deshacer.`)) return;
        try {
            await api.delete(`/users/${u.id}`);
            await fetchUsers();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo eliminar la cuenta.');
        }
    };

    return (
        <div style={styles.moduleWrapper}>
            <div style={styles.moduleHeader}>
                <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Volver
                </button>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '200px' }}>
                    <h2 style={styles.moduleTitle}>Gestión de Usuarios</h2>
                </div>
                <button onClick={() => navigate('/dashboard/usuarios/nuevo')} style={styles.primaryButton}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Nueva Cuenta
                </button>
            </div>


            {loading ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando usuarios...</p>
            ) : users.length === 0 ? (
                <div style={styles.emptyState}>
                    <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>No hay usuarios registrados.</p>
                </div>
            ) : (
                <div style={styles.cardsGrid}>
                    {users.map(u => (
                        <div key={u.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div style={styles.avatarCircle}>{u.username[0]?.toUpperCase()}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={styles.cardName}>{u.username}</p>
                                    {u.email && <p style={styles.cardEmail}>{u.email}</p>}
                                </div>
                                {roleBadge(u.role)}
                            </div>
                            <div style={styles.cardBody}>
                                <span style={u.active ? styles.statusActive : styles.statusInactive}>
                                    {u.active ? 'Activa' : 'Deshabilitada'}
                                </span>
                            </div>
                            <div style={styles.cardActions}>
                                <button onClick={() => navigate(`/dashboard/usuarios/${u.id}`)} style={styles.editBtn}>
                                    Editar
                                </button>
                                <button onClick={() => handleToggleActive(u)} style={styles.toggleBtn}>
                                    {u.active ? 'Deshabilitar' : 'Habilitar'}
                                </button>
                                {u.id !== currentUser.id && (
                                    <button onClick={() => handleDelete(u)} style={styles.deleteBtn}>
                                        Eliminar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    moduleWrapper: { width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
    moduleHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '2px solid #e1e4e8', paddingBottom: '15px',
        flexWrap: 'wrap' as const, gap: '12px',
    },
    moduleTitle: { margin: 0, fontSize: '22px', color: '#0a3a8a', fontWeight: 'bold' },
    backButton: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333', padding: '8px 14px',
        borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
        display: 'flex', alignItems: 'center', transition: 'background-color 0.2s',
    },
    primaryButton: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white', padding: '8px 16px',
        borderRadius: '6px', fontSize: '14px', fontWeight: '500' as const, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
    },
    hint: { margin: 0, fontSize: '13px', color: '#666', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '12px 16px' },
    emptyState: {
        backgroundColor: 'white', borderRadius: '12px', padding: '50px',
        textAlign: 'center' as const, border: '1px solid #e1e4e8',
    },
    cardsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px',
    },
    card: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' as const,
        overflow: 'hidden',
    },
    cardHeader: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#f8f9fa',
    },
    avatarCircle: {
        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#0a3a8a',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '15px', fontWeight: 'bold' as const, flexShrink: 0,
    },
    cardName: { margin: 0, fontSize: '15px', fontWeight: 'bold' as const, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    cardEmail: { margin: '2px 0 0 0', fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    roleBadge: {
        backgroundColor: '#e8f0fe', color: '#1a73e8', border: '1px solid #d2e3fc',
        padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' as const, whiteSpace: 'nowrap' as const,
    },
    cardBody: { padding: '12px 16px' },
    statusActive: {
        backgroundColor: '#e6f4ea', color: '#137333', border: '1px solid #ceead6',
        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' as const,
    },
    statusInactive: {
        backgroundColor: '#fce8e6', color: '#c5221f', border: '1px solid #fad2cf',
        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' as const,
    },
    cardActions: {
        display: 'flex', gap: '6px', flexWrap: 'wrap' as const, justifyContent: 'flex-end',
        padding: '10px 16px', borderTop: '1px solid #f0f0f0',
    },
    editBtn: {
        backgroundColor: 'transparent', border: '1px solid #0a3a8a', color: '#0a3a8a',
        padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' as const, cursor: 'pointer',
    },
    toggleBtn: {
        backgroundColor: 'transparent', border: '1px solid #b06000', color: '#b06000',
        padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' as const, cursor: 'pointer',
    },
    deleteBtn: {
        backgroundColor: 'transparent', border: '1px solid #c5221f', color: '#c5221f',
        padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' as const, cursor: 'pointer',
    },
};

export default UsuariosList;
