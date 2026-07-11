import { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api from '../../api/axios';
import type { DashboardContext } from './DashboardLayout';
import { isUnread, markViewed } from '../../utils/reportReadTracker';

const NovedadesList = () => {
    const { user } = useOutletContext<DashboardContext>();
    const navigate = useNavigate();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewedTs, setViewedTs] = useState(0);

    const [showHabitaciones, setShowHabitaciones] = useState(false);
    const [residents, setResidents] = useState<any[]>([]);
    const [draggedResident, setDraggedResident] = useState<any | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);

    useEffect(() => { fetchReports(); }, []);

    const fetchResidents = async () => {
        try {
            const res = await api.get('/residents');
            setResidents(res.data);
        } catch (e) { console.error('Error al obtener residentes:', e); }
    };

    const openHabitaciones = () => { fetchResidents(); setShowHabitaciones(true); };

    const handleDragResidentStart = (e: DragEvent<HTMLDivElement>, resident: any) => {
        setDraggedResident(resident);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnBed = async (room: number, bed: 'A' | 'B') => {
        if (!draggedResident) return;
        try {
            await api.put(`/residents/${draggedResident.id}`, { room, bed });
            await fetchResidents();
        } catch (e) { alert('No se pudo asignar la habitación.'); }
        setDraggedResident(null);
        setDropTarget(null);
    };

    const handleRemoveFromBed = async (residentId: string) => {
        try {
            await api.put(`/residents/${residentId}`, { room: null, bed: null });
            await fetchResidents();
        } catch (e) { alert('No se pudo quitar al residente de la habitación.'); }
    };

    const getResidentAtBed = (room: number, bed: 'A' | 'B') =>
        residents.find(r => r.room === room && r.bed === bed) || null;

    const unassignedResidents = residents.filter(r => !r.room && r.estado === 'Activo');

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.get('/shift-reports');
            setReports(res.data);
        } catch (e) {
            console.error('Error al obtener los informes:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReport = (rep: any) => {
        markViewed(user.id, rep.id);
        setViewedTs(Date.now()); // force re-render so badge disappears immediately
        navigate(`/dashboard/novedades/${rep.id}`);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    };

    const getReportStats = (incidents: any[]) => {
        if (!incidents) return { residents: 0, hospital: 0, salida: 0, novedad: 0 };
        const unique = new Set(incidents.map(inc => `${inc.room}-${inc.bed}`));
        return {
            residents: unique.size,
            hospital: incidents.filter(i => i.title === 'Hospital').length,
            salida: incidents.filter(i => i.title === 'Salida').length,
            novedad: incidents.filter(i => i.title === 'Novedad').length,
        };
    };

    const getHygieneStats = (hygienes: any[]) => {
        if (!hygienes || hygienes.length === 0) return 'Sin registros de aseo clínico';
        const count = hygienes.filter(h =>
            h.aseoCavidades || h.corteCapilar || h.corteUnas || h.aseoBucal ||
            h.aseoPerineal || h.banoDucha || h.afeitado || h.lubricacion
        ).length;
        return `${count} residente(s) con aseo clínico`;
    };

    // Enfermero sees visual alert on unread cards; other roles see a subtler indicator
    const isNurse = user.role === 'Enfermero';

    // suppress unused warning for viewedTs
    void viewedTs;

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
                    <h2 style={styles.moduleTitle}>Historial de Informes de Turno</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {user.role !== 'cuidador' && (
                        <button onClick={openHabitaciones} style={styles.habitacionesButton}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                            Gestionar Habitaciones
                        </button>
                    )}
                    <button onClick={() => navigate('/dashboard/novedades/nuevo')} style={styles.primaryButton}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Nuevo Informe
                    </button>
                </div>
            </div>

            <div style={styles.reportsGrid}>
                {loading ? (
                    <p style={{ textAlign: 'center', gridColumn: '1 / -1', color: '#666', padding: '40px' }}>
                        Cargando informes de turno...
                    </p>
                ) : reports.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#666' }}>
                            No hay informes de turno registrados.
                        </p>
                        <button onClick={() => navigate('/dashboard/novedades/nuevo')} style={styles.primaryButton}>
                            Crear el Primero
                        </button>
                    </div>
                ) : (
                    reports.map((rep) => {
                        const stats = getReportStats(rep.incidents);
                        const unread = isUnread(rep, user.id);
                        const cardStyle = unread && isNurse
                            ? { ...styles.reportCard, ...styles.reportCardUnread }
                            : styles.reportCard;

                        return (
                            <div key={rep.id} style={{ position: 'relative' }}>
                                {/* Badge de no leído — siempre visible si hay cambios; más prominente para Enfermero */}
                                {unread && (
                                    <div style={isNurse ? styles.unreadBadgeNurse : styles.unreadBadgeOther}
                                        title="Informe nuevo o actualizado desde tu última visita">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="white" style={{ marginRight: '3px' }}>
                                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                                        </svg>
                                        {isNurse ? 'Sin revisar' : 'Actualizado'}
                                    </div>
                                )}

                                <div style={cardStyle}>
                                    <div style={styles.reportCardHeader}>
                                        <div style={styles.dateBlock}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', color: '#0a3a8a' }}>
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                            </svg>
                                            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{formatDate(rep.date)}</span>
                                        </div>
                                        <span style={rep.shift === 'dia' ? styles.shiftBadgeDay : styles.shiftBadgeNight}>
                                            {rep.shift === 'dia' ? '☀ Día' : '🌙 Noche'}
                                        </span>
                                    </div>
                                    <div style={styles.reportCardBody}>
                                        <p style={{ margin: '4px 0' }}><strong>Encargado:</strong> {rep.supervisor}</p>
                                        <p style={styles.truncatedText}><strong>Cuidadores:</strong> {rep.caregivers || 'Ninguno'}</p>
                                        <p style={styles.truncatedText}><strong>Personal:</strong> {rep.staff || 'Ninguno'}</p>
                                        <div style={styles.statsSummary}>
                                            <span style={{ fontSize: '12px', color: '#444', fontWeight: '500' }}>
                                                {stats.residents === 0 ? 'Sin novedades registradas' : `${stats.residents} residentes con novedades:`}
                                            </span>
                                            {stats.residents > 0 && (
                                                <div style={styles.statsBadgesRow}>
                                                    {stats.hospital > 0 && <span style={styles.miniBadgeRed}>{stats.hospital} Hospital</span>}
                                                    {stats.salida > 0 && <span style={styles.miniBadgeOrange}>{stats.salida} Salida</span>}
                                                    {stats.novedad > 0 && <span style={styles.miniBadgeBlue}>{stats.novedad} Novedades</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ ...styles.statsSummary, marginTop: '8px' }}>
                                            <span style={{ fontSize: '12px', color: '#444', fontWeight: '500' }}>
                                                {getHygieneStats(rep.hygienes)}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={styles.reportCardActions}>
                                        <button onClick={() => handleOpenReport(rep)}
                                            style={unread && isNurse ? styles.viewBtnUnread : styles.secondaryButton}>
                                            {unread && isNurse ? '👁 Ver Informe' : 'Ver / Editar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {showHabitaciones && (
                <div style={styles.modalBackdrop} onClick={() => setShowHabitaciones(false)}>
                    <div style={styles.habModalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.habModalHeader}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0a3a8a' }}>Gestión de Habitaciones</h3>
                            <button onClick={() => setShowHabitaciones(false)} style={styles.closeIconBtn}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div style={styles.habModalBody}>
                            <div style={styles.unassignedPanel}>
                                <p style={styles.panelTitle}>Sin habitación asignada</p>
                                {unassignedResidents.length === 0 ? (
                                    <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>Todos los residentes activos tienen habitación.</p>
                                ) : (
                                    unassignedResidents.map(r => (
                                        <div key={r.id} draggable
                                            onDragStart={e => handleDragResidentStart(e, r)}
                                            style={styles.miniResidentCard}>
                                            <span style={styles.miniAvatar}>{r.firstName[0]}{r.lastName[0]}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.firstName} {r.lastName}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div style={styles.roomGrid}>
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(room => (
                                    <div key={room} style={styles.roomBlock}>
                                        <p style={styles.roomLabel}>Hab. {room}</p>
                                        <div style={styles.bedsRow}>
                                            {(['A', 'B'] as const).map(bed => {
                                                const occupant = getResidentAtBed(room, bed);
                                                const key = `${room}-${bed}`;
                                                const isOver = dropTarget === key;
                                                return (
                                                    <div key={bed}
                                                        onDragOver={e => { e.preventDefault(); setDropTarget(key); }}
                                                        onDragLeave={() => setDropTarget(null)}
                                                        onDrop={() => handleDropOnBed(room, bed)}
                                                        style={{
                                                            ...styles.bedSlot,
                                                            border: isOver ? '2px dashed #0a3a8a' : '1.5px dashed #ccc',
                                                            backgroundColor: isOver ? '#eef4ff' : occupant ? '#f0f7ff' : '#fafafa',
                                                        }}>
                                                        <span style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>Cama {bed}</span>
                                                        {occupant ? (
                                                            <div style={styles.occupantChip}>
                                                                <span style={{ fontSize: '11px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                                                    {occupant.firstName} {occupant.lastName}
                                                                </span>
                                                                <button onClick={() => handleRemoveFromBed(occupant.id)}
                                                                    title="Quitar de esta cama" style={styles.removeBtn}>✕</button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: '#bbb', fontStyle: 'italic' }}>Vacía</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginTop: '12px' }}>
                            Arrastra una ficha hacia una casilla de cama para asignarla. Haz clic en ✕ para liberar una cama.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    moduleWrapper: {
        width: '100%', maxWidth: '1400px',
        display: 'flex', flexDirection: 'column' as const, gap: '20px',
    },
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
        display: 'flex', alignItems: 'center', transition: 'background-color 0.2s',
    },
    secondaryButton: {
        backgroundColor: 'transparent', border: '1px solid #ccc', color: '#555',
        padding: '8px 16px', borderRadius: '6px', fontSize: '14px',
        fontWeight: '500' as const, cursor: 'pointer', transition: 'background-color 0.2s',
    },
    viewBtnUnread: {
        backgroundColor: '#e65100', border: 'none', color: 'white',
        padding: '8px 16px', borderRadius: '6px', fontSize: '14px',
        fontWeight: '600' as const, cursor: 'pointer', transition: 'background-color 0.2s',
        boxShadow: '0 2px 4px rgba(230,81,0,0.3)',
    },
    reportsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px',
    },
    reportCard: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        boxShadow: '0 4px 6px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.05)',
        padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '12px',
    },
    reportCardUnread: {
        border: '2px solid #e65100',
        boxShadow: '0 4px 12px rgba(230,81,0,0.15)',
        backgroundColor: '#fffaf7',
    },
    reportCardHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #f0f0f0', paddingBottom: '8px',
    },
    dateBlock: { display: 'flex', alignItems: 'center' },
    shiftBadgeDay: {
        backgroundColor: '#fff3cd', color: '#856404', fontSize: '12px',
        fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', border: '1px solid #ffeeba',
    },
    shiftBadgeNight: {
        backgroundColor: '#e2e3e5', color: '#383d41', fontSize: '12px',
        fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', border: '1px solid #d6d8db',
    },
    reportCardBody: {
        fontSize: '14px', color: '#333', display: 'flex', flexDirection: 'column' as const, gap: '6px',
    },
    truncatedText: {
        margin: '4px 0', whiteSpace: 'nowrap' as const,
        overflow: 'hidden' as const, textOverflow: 'ellipsis' as const,
    },
    statsSummary: {
        marginTop: '8px', backgroundColor: '#f8f9fa', padding: '8px 12px',
        borderRadius: '6px', border: '1px solid #e9ecef',
    },
    statsBadgesRow: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '6px' },
    reportCardActions: {
        marginTop: 'auto', display: 'flex', justifyContent: 'flex-end',
        borderTop: '1px solid #f0f0f0', paddingTop: '10px',
    },
    emptyState: {
        gridColumn: '1 / -1', backgroundColor: 'white', borderRadius: '12px',
        padding: '50px', textAlign: 'center' as const,
        border: '1px solid #e1e4e8', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    },
    miniBadgeRed: { backgroundColor: '#fce8e6', color: '#c5221f', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' as const },
    miniBadgeOrange: { backgroundColor: '#fef3d6', color: '#b06000', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' as const },
    miniBadgeBlue: { backgroundColor: '#e8f0fe', color: '#1a73e8', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' as const },
    // Badge prominente para Enfermero — naranja oscuro con ícono de mensaje
    unreadBadgeNurse: {
        position: 'absolute' as const, top: '-10px', left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#e65100', color: 'white',
        padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
        fontWeight: 'bold' as const, display: 'flex', alignItems: 'center',
        boxShadow: '0 2px 6px rgba(230,81,0,0.4)', zIndex: 1,
        whiteSpace: 'nowrap' as const,
    },
    // Badge sutil para otros roles — gris azulado
    unreadBadgeOther: {
        position: 'absolute' as const, top: '-10px', left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#455a64', color: 'white',
        padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
        fontWeight: 'bold' as const, display: 'flex', alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 1,
        whiteSpace: 'nowrap' as const,
    },
    habitacionesButton: {
        backgroundColor: '#1a6b3a', border: 'none', color: 'white', padding: '8px 16px',
        borderRadius: '6px', fontSize: '14px', fontWeight: '500' as const, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
    },
    modalBackdrop: {
        position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(10,58,138,0.35)', backdropFilter: 'blur(5px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    },
    habModalContent: {
        backgroundColor: 'white', borderRadius: '16px', padding: '24px',
        width: '95%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto' as const,
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', border: '1px solid #e1e4e8',
        display: 'flex', flexDirection: 'column' as const,
    },
    habModalHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #e1e4e8', paddingBottom: '14px', marginBottom: '16px',
    },
    closeIconBtn: {
        backgroundColor: 'transparent', border: 'none', color: '#666', cursor: 'pointer',
        display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px',
    },
    habModalBody: {
        display: 'flex', gap: '20px', alignItems: 'flex-start',
    },
    unassignedPanel: {
        flex: '0 0 180px', borderRight: '1px solid #e1e4e8', paddingRight: '16px',
        display: 'flex', flexDirection: 'column' as const, gap: '8px',
    },
    panelTitle: {
        margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold' as const,
        color: '#0a3a8a', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
    },
    miniResidentCard: {
        display: 'flex', alignItems: 'center', gap: '8px',
        backgroundColor: '#f0f4ff', border: '1px solid #c7d7f5', borderRadius: '8px',
        padding: '8px 10px', cursor: 'grab', userSelect: 'none' as const,
    },
    miniAvatar: {
        width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#0a3a8a',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 'bold' as const, flexShrink: 0,
    },
    roomGrid: {
        flex: 1, display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px',
    },
    roomBlock: {
        border: '1px solid #e1e4e8', borderRadius: '8px',
        padding: '8px', backgroundColor: '#fafafa',
    },
    roomLabel: {
        margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold' as const,
        color: '#0a3a8a', textAlign: 'center' as const,
    },
    bedsRow: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
    bedSlot: {
        borderRadius: '6px', padding: '6px 8px', display: 'flex',
        flexDirection: 'column' as const, alignItems: 'center', minHeight: '54px',
        transition: 'all 0.15s', justifyContent: 'center',
    },
    occupantChip: {
        width: '100%', display: 'flex', alignItems: 'center', gap: '4px',
        backgroundColor: '#dbeafe', borderRadius: '4px', padding: '3px 6px',
    },
    removeBtn: {
        backgroundColor: 'transparent', border: 'none', color: '#c5221f',
        cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' as const,
        padding: '0 2px', lineHeight: 1, flexShrink: 0,
    },
};

export default NovedadesList;
