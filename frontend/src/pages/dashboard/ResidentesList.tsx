import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ESTADO_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    'Activo':          { bg: '#e6f4ea', color: '#137333', border: '#ceead6' },
    'Fallecido':       { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' },
};

const estadoBadge = (estado: string) => {
    const s = ESTADO_COLORS[estado] ?? ESTADO_COLORS['Activo'];
    return (
        <span style={{
            backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
            padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
        }}>
            {estado}
        </span>
    );
};

const ResidentesList = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [residents, setResidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterEstado, setFilterEstado] = useState('Todos');

    useEffect(() => { fetchResidents(); }, []);

    const fetchResidents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/residents');
            setResidents(res.data);
        } catch (e) {
            console.error('Error al obtener residentes:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar la ficha de ${name}? Esta acción no se puede deshacer.`)) return;
        try {
            await api.delete(`/residents/${id}`);
            await fetchResidents();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo eliminar el residente.');
        }
    };

    const calcEdad = (fechaNacimiento: string) => {
        if (!fechaNacimiento) return null;
        const hoy = new Date();
        const nac = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return edad;
    };

    const filtered = residents.filter(r => {
        const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
        const q = search.toLowerCase();
        const matchSearch = !search || fullName.includes(q) || String(r.room).includes(q) || (r.rut || '').includes(q);
        const matchEstado = filterEstado === 'Todos' || r.estado === filterEstado;
        return matchSearch && matchEstado;
    });

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
                    <h2 style={styles.moduleTitle}>Fichas de Residentes</h2>
                </div>
                <button onClick={() => navigate('/dashboard/residentes/nuevo')} style={styles.primaryButton}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Nuevo Residente
                </button>
            </div>

            <div style={styles.toolBar}>
                <div style={styles.searchWrapper}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" style={{ marginRight: '6px', flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" placeholder="Buscar por nombre, RUT o habitación..." value={search}
                        onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
                </div>
                <div style={styles.filterGroup}>
                    {['Todos', 'Activo', 'Fallecido'].map(e => (
                        <button key={e} onClick={() => setFilterEstado(e)}
                            style={filterEstado === e ? styles.filterBtnActive : styles.filterBtn}>
                            {e}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando residentes...</p>
            ) : filtered.length === 0 ? (
                <div style={styles.emptyState}>
                    <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#666' }}>
                        {residents.length === 0 ? 'No hay residentes registrados.' : 'Sin resultados para la búsqueda.'}
                    </p>
                    {residents.length === 0 && (
                        <button onClick={() => navigate('/dashboard/residentes/nuevo')} style={styles.primaryButton}>
                            Registrar el primero
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.cardsGrid}>
                    {filtered.map(r => {
                        const edad = calcEdad(r.fechaNacimiento);
                        return (
                            <div key={r.id} style={styles.residentCard}>
                                <div style={styles.cardHeader}>
                                    <div style={styles.avatarCircle}>
                                        {r.firstName[0]}{r.lastName[0]}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={styles.cardName}>{r.firstName} {r.lastName}</p>
                                        {r.rut && <p style={styles.cardRut}>RUT: {r.rut}</p>}
                                    </div>
                                    {estadoBadge(r.estado || 'Activo')}
                                </div>
                                <div style={styles.cardBody}>
                                    {r.room ? (
                                        <p style={styles.cardInfo}>
                                            <strong>Habitación {r.room}</strong> — Cama {r.bed}
                                        </p>
                                    ) : (
                                        <p style={{ ...styles.cardInfo, color: '#999', fontStyle: 'italic' }}>Sin habitación asignada</p>
                                    )}
                                    {edad !== null && <p style={styles.cardInfo}>{edad} años</p>}
                                    {r.diagnostico && (
                                        <p style={styles.cardDiag}>{r.diagnostico}</p>
                                    )}
                                </div>
                                <div style={styles.cardActions}>
                                    <button onClick={() => navigate(`/dashboard/residentes/${r.id}`)} style={styles.editBtn}>
                                        Ver / Editar
                                    </button>
                                    <button onClick={() => handleDelete(r.id, `${r.firstName} ${r.lastName}`)} style={styles.deleteBtn}>
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const styles = {
    moduleWrapper: { width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
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
    toolBar: { display: 'flex', gap: '16px', flexWrap: 'wrap' as const, alignItems: 'center' },
    searchWrapper: {
        display: 'flex', alignItems: 'center', backgroundColor: 'white',
        border: '1.5px solid #ddd', borderRadius: '8px', padding: '8px 12px', flex: 1, minWidth: '220px',
    },
    searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', fontFamily: 'inherit' },
    filterGroup: { display: 'flex', gap: '6px', flexWrap: 'wrap' as const },
    filterBtn: {
        padding: '6px 12px', borderRadius: '6px', border: '1.5px solid #ddd',
        backgroundColor: 'white', color: '#555', fontSize: '13px', cursor: 'pointer',
    },
    filterBtnActive: {
        padding: '6px 12px', borderRadius: '6px', border: '1.5px solid #0a3a8a',
        backgroundColor: '#0a3a8a', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' as const,
    },
    emptyState: {
        backgroundColor: 'white', borderRadius: '12px', padding: '50px',
        textAlign: 'center' as const, border: '1px solid #e1e4e8',
    },
    cardsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px',
    },
    residentCard: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' as const,
        overflow: 'hidden',
    },
    cardHeader: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#f8f9fa',
    },
    avatarCircle: {
        width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#0a3a8a',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px', fontWeight: 'bold' as const, flexShrink: 0,
    },
    cardName: { margin: 0, fontSize: '15px', fontWeight: 'bold' as const, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    cardRut: { margin: '2px 0 0 0', fontSize: '12px', color: '#888' },
    cardBody: { padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '6px' },
    cardInfo: { margin: 0, fontSize: '14px', color: '#333' },
    cardDiag: {
        margin: 0, fontSize: '12px', color: '#666', fontStyle: 'italic',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
    },
    cardActions: {
        display: 'flex', gap: '8px', justifyContent: 'flex-end',
        padding: '10px 16px', borderTop: '1px solid #f0f0f0',
    },
    editBtn: {
        backgroundColor: 'transparent', border: '1px solid #0a3a8a', color: '#0a3a8a',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
    },
    deleteBtn: {
        backgroundColor: 'transparent', border: '1px solid #c5221f', color: '#c5221f',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
    },
};

export default ResidentesList;
