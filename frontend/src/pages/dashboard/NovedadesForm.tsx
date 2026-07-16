import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { markViewed } from '../../utils/reportReadTracker';
import type { DashboardContext } from './DashboardLayout';

const toLocalDateString = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Los turnos empiezan a las 08:00 (día) y a las 20:00 (noche). El turno noche cruza la
// medianoche, así que entre las 00:00 y las 07:59 todavía pertenece al turno noche que
// comenzó el día ANTERIOR, no al día calendario en curso.
const getCurrentShiftInfo = (now: Date): { date: string; shift: 'dia' | 'noche' } => {
    const hour = now.getHours();
    if (hour >= 8 && hour < 20) return { date: toLocalDateString(now), shift: 'dia' };
    if (hour >= 20) return { date: toLocalDateString(now), shift: 'noche' };
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { date: toLocalDateString(yesterday), shift: 'noche' };
};

// Rondas del turno noche: cada 2 horas, comenzando a las 02:00.
const RONDA_HORAS = ['02:00', '04:00', '06:00'];
const defaultRondas = () => RONDA_HORAS.map(hora => ({ hora, realizadoPor: '' }));

const defaultFeeding = (room: number, bed: 'A' | 'B') => ({
    room, bed,
    desayuno: 100, merienda: 100, almuerzo: 100, once: 100, cena: 100,
    colacionNocturna: 100,
});

const defaultHygiene = (room: number, bed: 'A' | 'B') => ({
    room, bed,
    aseoCavidades: false, corteCapilar: false, corteUnas: false,
    aseoBucal: false, cambioPanal: false, banoDucha: false,
    afeitado: false, lubricacion: false,
});

const defaultNightCare = (room: number, bed: 'A' | 'B') => ({
    room, bed,
    ordenCloset: false, ordenCajasAseo: false, cambioSabanas: false,
    retiroBotellasHidratacion: false, lubricacionPiel: false,
    retiroOrinal: false, aseoOrinal: false,
});

const NovedadesForm = () => {
    const { user } = useOutletContext<DashboardContext>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const isCuidador = user.role === 'cuidador';

    const [reportDate, setReportDate] = useState('');
    const [reportShift, setReportShift] = useState<'dia' | 'noche'>('dia');
    const [reportSupervisor, setReportSupervisor] = useState('');
    const [reportCaregivers, setReportCaregivers] = useState('');
    const [reportStaff, setReportStaff] = useState('');
    const [reportIncidents, setReportIncidents] = useState<any[]>([]);
    const [reportHygienes, setReportHygienes] = useState<any[]>([]);
    const [reportFeedings, setReportFeedings] = useState<any[]>([]);
    const [reportNightCares, setReportNightCares] = useState<any[]>([]);
    const [reportRondas, setReportRondas] = useState<{ hora: string; realizadoPor: string }[]>([]);
    const [notaAlimentacion, setNotaAlimentacion] = useState('');
    const [notaAseo, setNotaAseo] = useState('');
    const [notaNovedades, setNotaNovedades] = useState('');
    const [loading, setLoading] = useState(false);

    const [searchHygieneQuery, setSearchHygieneQuery] = useState('');
    const [searchFeedingQuery, setSearchFeedingQuery] = useState('');
    const [searchRoomQuery, setSearchRoomQuery] = useState('');

    const [activeResident, setActiveResident] = useState<{ room: number; bed: 'A' | 'B' } | null>(null);
    const [newIncidentDescription, setNewIncidentDescription] = useState('');
    const [newIncidentTitle, setNewIncidentTitle] = useState<'Hospital' | 'Salida' | 'Novedad'>('Novedad');
    const [showNewIncidentForm, setShowNewIncidentForm] = useState(false);

    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [residents, setResidents] = useState<any[]>([]);

    // Historial de cambios del informe (solo admin / Enfermero)
    const canViewHistory = user.role === 'admin' || user.role === 'Enfermero';
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        api.get('/residents').then(res => setResidents(res.data)).catch(() => {});
    }, []);

    const openHistory = async () => {
        if (!id) return;
        setShowHistory(true);
        setLoadingHistory(true);
        try {
            const res = await api.get(`/shift-reports/${id}/history`);
            setHistory(res.data);
        } catch {
            showToast('No se pudo cargar el historial de cambios.');
        } finally {
            setLoadingHistory(false);
        }
    };

    const getResidentName = (room: number, bed: 'A' | 'B'): string => {
        const r = residents.find(res => res.room === room && res.bed === bed);
        return r ? `${r.firstName} ${r.lastName}` : '';
    };

    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            api.get(`/shift-reports/${id}`)
                .then(res => {
                    const rep = res.data;
                    setReportDate(rep.date);
                    setReportShift(rep.shift);
                    setReportSupervisor(rep.supervisor);
                    setReportCaregivers(rep.caregivers || '');
                    setReportStaff(rep.staff || '');
                    setReportIncidents(rep.incidents || []);
                    setReportHygienes(rep.hygienes || []);
                    setReportFeedings(rep.feedings || []);
                    setReportNightCares(rep.nightCares || []);
                    setReportRondas(rep.rondas && rep.rondas.length > 0 ? rep.rondas : (rep.shift === 'noche' ? defaultRondas() : []));
                    setNotaAlimentacion(rep.notaAlimentacion || '');
                    setNotaAseo(rep.notaAseo || '');
                    setNotaNovedades(rep.notaNovedades || '');
                })
                .catch(() => {
                    showToast('No se pudo cargar el informe.');
                    navigate('/dashboard/novedades');
                })
                .finally(() => setLoading(false));
        } else {
            const { date: todayStr, shift: todayShift } = getCurrentShiftInfo(new Date());

            // Solo puede existir un informe por fecha + turno: si ya hay uno para hoy,
            // se continúa editando ese en vez de crear una tarjeta duplicada.
            setLoading(true);
            api.get('/shift-reports')
                .then(res => {
                    const existing = res.data.find((r: any) => r.date === todayStr && r.shift === todayShift);
                    if (existing) {
                        navigate(`/dashboard/novedades/${existing.id}`, { replace: true });
                        return;
                    }
                    setReportDate(todayStr);
                    setReportShift(todayShift);
                    setReportSupervisor(user.username);
                    if (todayShift === 'noche') setReportRondas(defaultRondas());
                })
                .catch(() => {
                    setReportDate(todayStr);
                    setReportShift(todayShift);
                    setReportSupervisor(user.username);
                    if (todayShift === 'noche') setReportRondas(defaultRondas());
                })
                .finally(() => setLoading(false));
        }
    }, [id, isEditing, navigate, user.username]);

    const residentsList: { room: number; bed: 'A' | 'B' }[] = [];
    for (let r = 1; r <= 30; r++) {
        residentsList.push({ room: r, bed: 'A' });
        residentsList.push({ room: r, bed: 'B' });
    }

    const filterResidents = (query: string) =>
        residentsList.filter((res) => {
            if (!query) return true;
            const q = query.toLowerCase();
            return (
                `habitacion ${res.room}`.includes(q) ||
                `hab ${res.room}`.includes(q) ||
                String(res.room).includes(q) ||
                `cama ${res.bed.toLowerCase()}`.includes(q) ||
                res.bed.toLowerCase().includes(q)
            );
        });

    const filteredResidentsHygiene = filterResidents(searchHygieneQuery);
    const filteredResidentsFeedings = filterResidents(searchFeedingQuery);
    const filteredResidents = filterResidents(searchRoomQuery);

    const handleSaveReport = async () => {
        if (!reportDate) { showToast('Por favor, seleccione una fecha.'); return; }
        if (!reportSupervisor.trim()) { showToast('El encargado de turno no puede estar vacío.'); return; }
        const payload = {
            date: reportDate, shift: reportShift,
            supervisor: reportSupervisor,
            caregivers: reportCaregivers, staff: reportStaff,
            incidents: reportIncidents,
            // La tabla de aseo clínico y la de actividades de turno noche son mutuamente
            // excluyentes según el turno del informe.
            hygienes: reportShift === 'dia' ? reportHygienes : [],
            nightCares: reportShift === 'noche' ? reportNightCares : [],
            feedings: reportFeedings,
            rondas: reportShift === 'noche' ? reportRondas : [],
            notaAlimentacion,
            notaAseo,
            notaNovedades,
        };
        try {
            let savedId = id;
            if (isEditing && id) {
                await api.put(`/shift-reports/${id}`, payload);
            } else {
                const res = await api.post('/shift-reports', payload);
                savedId = res.data.id;
            }
            // Quien crea o edita el informe no necesita ver una alerta de "no leído" sobre
            // su propio cambio: solo el resto de usuarios debería recibirla hasta que abran la tarjeta.
            if (savedId) markViewed(user.id, savedId);
            navigate('/dashboard/novedades');
        } catch (error: any) {
            console.error('Error al guardar el informe:', error);
            showToast(error?.response?.data?.message || 'Ocurrió un error al guardar el informe. Verifique los datos.');
        }
    };

    const handleOpenResidentModal = (room: number, bed: 'A' | 'B') => {
        setActiveResident({ room, bed });
        setNewIncidentDescription('');
        setNewIncidentTitle('Novedad');
        setShowNewIncidentForm(false);
    };

    const handleDescriptionChange = (text: string) => {
        setNewIncidentDescription(text);
    };

    const handleAddIncident = () => {
        if (!newIncidentDescription.trim()) { showToast('La descripción de la novedad no puede estar vacía.'); return; }
        if (!activeResident) return;
        setReportIncidents([...reportIncidents, {
            room: activeResident.room,
            bed: activeResident.bed,
            title: newIncidentTitle,
            description: newIncidentDescription,
        }]);
        setNewIncidentDescription('');
        setNewIncidentTitle('Novedad');
        setShowNewIncidentForm(false);
    };

    const handleDeleteIncident = (incidentToRemove: any) => {
        setReportIncidents(prev => prev.filter(inc => inc !== incidentToRemove));
    };

    const getResidentIncidents = (room: number, bed: 'A' | 'B') =>
        reportIncidents.filter(inc => inc.room === room && inc.bed === bed);

    const getResidentHygiene = (room: number, bed: 'A' | 'B') => {
        const entry = reportHygienes.find(h => h.room === room && h.bed === bed);
        return entry || defaultHygiene(room, bed);
    };

    const toggleHygieneField = (room: number, bed: 'A' | 'B', field: string) => {
        setReportHygienes(prev => {
            const index = prev.findIndex(h => h.room === room && h.bed === bed);
            if (index === -1) {
                return [...prev, { ...defaultHygiene(room, bed), [field]: true }];
            }
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: !updated[index][field] };
            return updated;
        });
    };

    const getResidentFeedings = (room: number, bed: 'A' | 'B') => {
        const entry = reportFeedings.find(f => f.room === room && f.bed === bed);
        return entry || defaultFeeding(room, bed);
    };

    const updateFeedingField = (room: number, bed: 'A' | 'B', field: string, value: number) => {
        setReportFeedings(prev => {
            const index = prev.findIndex(f => f.room === room && f.bed === bed);
            if (index === -1) {
                return [...prev, { ...defaultFeeding(room, bed), [field]: value }];
            }
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const getResidentNightCare = (room: number, bed: 'A' | 'B') => {
        const entry = reportNightCares.find(n => n.room === room && n.bed === bed);
        return entry || defaultNightCare(room, bed);
    };

    const toggleNightCareField = (room: number, bed: 'A' | 'B', field: string) => {
        setReportNightCares(prev => {
            const index = prev.findIndex(n => n.room === room && n.bed === bed);
            if (index === -1) {
                return [...prev, { ...defaultNightCare(room, bed), [field]: true }];
            }
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: !updated[index][field] };
            return updated;
        });
    };

    const updateRonda = (idx: number, realizadoPor: string) => {
        setReportRondas(prev => prev.map((r, i) => (i === idx ? { ...r, realizadoPor } : r)));
    };

    const requiresColacionNocturna = (room: number, bed: 'A' | 'B'): boolean => {
        const r = residents.find(res => res.room === room && res.bed === bed);
        return Boolean(r?.requiereColacionNocturna);
    };

    const renderToggle = (
        room: number, bed: 'A' | 'B', field: string, value: boolean,
        toggleFn: (room: number, bed: 'A' | 'B', field: string) => void = toggleHygieneField,
    ) => (
        <button
            type="button"
            onClick={() => toggleFn(room, bed, field)}
            style={{
                padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px',
                transition: 'all 0.2s ease',
                backgroundColor: value ? '#e6f4ea' : '#fce8e6',
                color: value ? '#137333' : '#c5221f',
                borderWidth: '1px', borderStyle: 'solid',
                borderColor: value ? '#ceead6' : '#fad2cf',
                boxShadow: value ? '0 1px 2px rgba(19,115,51,0.1)' : '0 1px 2px rgba(197,34,31,0.05)',
            }}
        >
            {value ? (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>Sí</>
            ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>No</>
            )}
        </button>
    );

    const feedingSelectStyle = (value: number) => ({
        padding: '6px 10px',
        borderRadius: '8px',
        border: '1px solid',
        fontSize: '12px',
        fontWeight: 'bold' as const,
        cursor: 'pointer',
        outline: 'none',
        backgroundColor: value === 100 ? '#e6f4ea' : value === 0 ? '#fce8e6' : '#fff8e6',
        color: value === 100 ? '#137333' : value === 0 ? '#c5221f' : '#7d4e00',
        borderColor: value === 100 ? '#ceead6' : value === 0 ? '#fad2cf' : '#ffe0a3',
    });

    const renderFeedingSelect = (room: number, bed: 'A' | 'B', field: string, value: number) => (
        <select
            value={value}
            onChange={(e) => updateFeedingField(room, bed, field, Number(e.target.value))}
            style={feedingSelectStyle(value)}
        >
            <option value={100}>100% — Completo</option>
            <option value={75}>75%</option>
            <option value={50}>50%</option>
            <option value={25}>25%</option>
            <option value={0}>0% — No comió</option>
        </select>
    );

    const getHighestPriorityTitle = (incidents: any[]) => {
        if (incidents.length === 0) return 'Sin Novedad';
        const titles = incidents.map(inc => inc.title);
        if (titles.includes('Hospital')) return 'Hospital';
        if (titles.includes('Salida')) return 'Salida';
        return 'Novedad';
    };

    const getIncidentsSummary = (incidents: any[]) => {
        if (incidents.length === 0) return '-';
        const text = incidents.map(inc => `[${inc.title}] ${inc.description}`).join(' | ');
        return text.length > 55 ? text.substring(0, 52) + '...' : text;
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'Hospital': return <span style={styles.badgeHospital}>Hospital</span>;
            case 'Salida': return <span style={styles.badgeSalida}>Salida</span>;
            case 'Novedad': return <span style={styles.badgeNovedad}>Novedad</span>;
            default: return <span style={styles.badgeSinNovedad}>Sin Novedad</span>;
        }
    };

    const renderNoteBox = (value: string, onChange: (v: string) => void) => (
        <div style={noteBoxStyles.wrapper}>
            <div style={noteBoxStyles.header}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b4b4b4ff" strokeWidth="2" style={{ marginRight: '6px', flexShrink: 0 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span style={noteBoxStyles.label}>Nota / Recordatorio para el próximo turno</span>
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Escribe aquí observaciones o recordatorios importantes para el turno siguiente..."
                rows={3}
                style={noteBoxStyles.textarea}
            />
        </div>
    );

    const renderSearchInput = (value: string, onChange: (v: string) => void) => (
        <div style={styles.searchWrapper}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#888', marginRight: '6px' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
                type="text"
                placeholder="Buscar Habitación o Cama (ej. 'Hab 5', 'A', '12')"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={styles.searchInput}
            />
        </div>
    );

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                Cargando informe...
            </div>
        );
    }

    return (
        <div style={styles.moduleWrapper}>
            <div style={styles.moduleHeader}>
                <button onClick={() => navigate('/dashboard/novedades')} style={styles.backButton}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Volver
                </button>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '200px' }}>
                    <h2 style={styles.moduleTitle}>
                        {isEditing ? 'Editar Informe de Turno' : 'Nuevo Informe de Turno'}
                    </h2>
                </div>
                <div style={{ width: '100px', display: 'flex', justifyContent: 'flex-end' }}>
                    {isEditing && canViewHistory && (
                        <button onClick={openHistory} style={styles.historyButton} title="Ver historial de cambios de este informe">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div style={styles.formContainer}>
                {/* Header fields */}
                <div style={styles.formPanel}>
                    <div style={styles.formGrid}>
                        <div style={styles.inputWrapper}>
                            <label style={styles.inputLabel}>Fecha:</label>
                            <input
                                type="date"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                style={styles.formInput}
                            />
                        </div>
                        <div style={styles.inputWrapper}>
                            <label style={styles.inputLabel}>Turno:</label>
                            <div style={{ ...styles.toggleActive, textAlign: 'center' as const, cursor: 'default' }}>
                                {reportShift === 'dia' ? '☀ Día (08:00–19:59)' : '🌙 Noche (20:00–07:59)'}
                            </div>
                            <span style={{ fontSize: '11px', color: '#666' }}>
                                El turno se determina automáticamente según la hora de creación del informe.
                            </span>
                        </div>
                        <div style={styles.inputWrapper}>
                            <label style={styles.inputLabel}>Encargado de Turno:</label>
                            <input
                                type="text"
                                value={reportSupervisor}
                                onChange={(e) => setReportSupervisor(e.target.value)}
                                disabled={user.role !== 'admin'}
                                placeholder="Nombre del encargado..."
                                style={{
                                    ...styles.formInput,
                                    backgroundColor: user.role !== 'admin' ? '#e9ecef' : '#ffffff',
                                    color: user.role !== 'admin' ? '#495057' : '#000000',
                                    cursor: user.role !== 'admin' ? 'not-allowed' : 'text',
                                }}
                            />
                            {user.role !== 'admin' && (
                                <span style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                    Solo los administradores pueden editar el encargado de turno.
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ ...styles.formGrid, marginTop: '15px' }}>
                        <div style={styles.inputWrapper}>
                            <label style={styles.inputLabel}>Cuidadores de Turno:</label>
                            <textarea
                                value={reportCaregivers}
                                onChange={(e) => setReportCaregivers(e.target.value)}
                                placeholder="Ej: Ana Gómez, Carlos Pérez..."
                                rows={2}
                                style={styles.formTextarea}
                            />
                        </div>
                        <div style={styles.inputWrapper}>
                            <label style={styles.inputLabel}>Personal (Cocina, Aseo, etc.):</label>
                            <textarea
                                value={reportStaff}
                                onChange={(e) => setReportStaff(e.target.value)}
                                placeholder="Ej: Cocina: Marta Ortiz; Aseo: Juan Castro..."
                                rows={2}
                                style={styles.formTextarea}
                            />
                        </div>
                    </div>

                    {reportShift === 'noche' && (
                        <div style={{ marginTop: '15px' }}>
                            <label style={styles.inputLabel}>Rondas nocturnas (cada 2 horas, desde las 02:00):</label>
                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' as const, marginTop: '8px' }}>
                                {reportRondas.map((ronda, idx) => (
                                    <div key={ronda.hora} style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px', minWidth: '170px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold' as const, color: '#0a3a8a' }}>{ronda.hora} hrs</span>
                                        <input
                                            type="text"
                                            value={ronda.realizadoPor}
                                            onChange={(e) => updateRonda(idx, e.target.value)}
                                            placeholder="Realizado por..."
                                            style={styles.formInput}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabla de Alimentación */}
                {(reportShift === 'dia' || residents.some(r => r.requiereColacionNocturna)) && (
                    <div style={styles.tablePanel}>
                        <div style={styles.tablePanelHeader}>
                            <h3 style={{ margin: 0, color: '#0a3a8a', fontSize: '18px' }}>
                                Registro de Alimentación (Habitaciones 1 a 30)
                            </h3>
                            {renderSearchInput(searchFeedingQuery, setSearchFeedingQuery)}
                        </div>
                        <div style={{ ...styles.tableScroll, maxHeight: '500px' }}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Habitación</th>
                                        <th style={styles.th}>Cama</th>
                                        <th style={styles.th}>Residente</th>
                                        {reportShift === 'dia' ? (
                                            <>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Desayuno</th>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Merienda</th>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Almuerzo</th>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Once</th>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Cena</th>
                                            </>
                                        ) : (
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Colación nocturna</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResidentsFeedings.length === 0 ? (
                                        <tr>
                                            <td colSpan={reportShift === 'dia' ? 8 : 4} style={{ ...styles.td, textAlign: 'center', color: '#666', padding: '20px' }}>
                                                No se encontraron habitaciones para la búsqueda.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredResidentsFeedings.map((res) => {
                                            const feeding = getResidentFeedings(res.room, res.bed);
                                            const needsColacion = requiresColacionNocturna(res.room, res.bed);
                                            return (
                                                <tr key={`feeding-${res.room}-${res.bed}`} style={styles.tr}>
                                                    <td style={{ ...styles.td, fontWeight: 'bold' }}>Hab. {res.room}</td>
                                                    <td style={styles.td}>Cama {res.bed}</td>
                                                    <td style={styles.td}>{getResidentName(res.room, res.bed)}</td>
                                                    {reportShift === 'dia' ? (
                                                        <>
                                                            <td style={{ ...styles.td, textAlign: 'center' }}>{renderFeedingSelect(res.room, res.bed, 'desayuno', feeding.desayuno)}</td>
                                                            <td style={{ ...styles.td, textAlign: 'center' }}>{renderFeedingSelect(res.room, res.bed, 'merienda', feeding.merienda)}</td>
                                                            <td style={{ ...styles.td, textAlign: 'center' }}>{renderFeedingSelect(res.room, res.bed, 'almuerzo', feeding.almuerzo)}</td>
                                                            <td style={{ ...styles.td, textAlign: 'center' }}>{renderFeedingSelect(res.room, res.bed, 'once', feeding.once)}</td>
                                                            <td style={{ ...styles.td, textAlign: 'center' }}>{renderFeedingSelect(res.room, res.bed, 'cena', feeding.cena)}</td>
                                                        </>
                                                    ) : (
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                                            {needsColacion
                                                                ? renderFeedingSelect(res.room, res.bed, 'colacionNocturna', feeding.colacionNocturna)
                                                                : null}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {renderNoteBox(notaAlimentacion, setNotaAlimentacion)}
                    </div>
                )}

                {/* Aseo Clínico (turno día) / Actividades de Turno Noche (turno noche) */}
                <div style={styles.tablePanel}>
                    <div style={styles.tablePanelHeader}>
                        <h3 style={{ margin: 0, color: '#0a3a8a', fontSize: '18px' }}>
                            {reportShift === 'dia'
                                ? 'Registro de Aseo Clínico (Habitaciones 1 a 30)'
                                : 'Actividades de Turno Noche (Habitaciones 1 a 30)'}
                        </h3>
                        {renderSearchInput(searchHygieneQuery, setSearchHygieneQuery)}
                    </div>
                    <div style={{ ...styles.tableScroll, maxHeight: '500px' }}>
                        <table style={styles.table}>
                            {reportShift === 'dia' ? (
                                <>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Habitación</th>
                                            <th style={styles.th}>Cama</th>
                                            <th style={styles.th}>Residente</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Aseo Cavidades</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Corte Uñas (Onicotomía)</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Aseo Bucal</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Cambio de Pañal</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Baño / Ducha</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Afeitado / Rasurado</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Lubricación Piel</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredResidentsHygiene.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} style={{ ...styles.td, textAlign: 'center', color: '#666', padding: '20px' }}>
                                                    No se encontraron habitaciones para la búsqueda.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredResidentsHygiene.map((res) => {
                                                const hygiene = getResidentHygiene(res.room, res.bed);
                                                return (
                                                    <tr key={`aseo-${res.room}-${res.bed}`} style={styles.tr}>
                                                        <td style={{ ...styles.td, fontWeight: 'bold' }}>Hab. {res.room}</td>
                                                        <td style={styles.td}>Cama {res.bed}</td>
                                                        <td style={styles.td}>{getResidentName(res.room, res.bed)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'aseoCavidades', hygiene.aseoCavidades)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'corteUnas', hygiene.corteUnas)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'aseoBucal', hygiene.aseoBucal)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'cambioPanal', hygiene.cambioPanal)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'banoDucha', hygiene.banoDucha)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'afeitado', hygiene.afeitado)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'lubricacion', hygiene.lubricacion)}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </>
                            ) : (
                                <>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Habitación</th>
                                            <th style={styles.th}>Cama</th>
                                            <th style={styles.th}>Residente</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Orden de Closet</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Orden Cajas Aseo</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Cambio de Sábanas</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Retiro de Botellas</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Lubricación Piel</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Retiro de Orinal</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Aseo de Orinal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredResidentsHygiene.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} style={{ ...styles.td, textAlign: 'center', color: '#666', padding: '20px' }}>
                                                    No se encontraron habitaciones para la búsqueda.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredResidentsHygiene.map((res) => {
                                                const nightCare = getResidentNightCare(res.room, res.bed);
                                                return (
                                                    <tr key={`noche-${res.room}-${res.bed}`} style={styles.tr}>
                                                        <td style={{ ...styles.td, fontWeight: 'bold' }}>Hab. {res.room}</td>
                                                        <td style={styles.td}>Cama {res.bed}</td>
                                                        <td style={styles.td}>{getResidentName(res.room, res.bed)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'ordenCloset', nightCare.ordenCloset, toggleNightCareField)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'ordenCajasAseo', nightCare.ordenCajasAseo, toggleNightCareField)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'cambioSabanas', nightCare.cambioSabanas, toggleNightCareField)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'retiroBotellasHidratacion', nightCare.retiroBotellasHidratacion, toggleNightCareField)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'lubricacionPiel', nightCare.lubricacionPiel, toggleNightCareField)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'retiroOrinal', nightCare.retiroOrinal, toggleNightCareField)}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'aseoOrinal', nightCare.aseoOrinal, toggleNightCareField)}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </>
                            )}
                        </table>
                    </div>
                    {renderNoteBox(notaAseo, setNotaAseo)}
                </div>

                {/* Incidents table */}
                <div style={styles.tablePanel}>
                    <div style={styles.tablePanelHeader}>
                        <h3 style={{ margin: 0, color: '#0a3a8a', fontSize: '18px' }}>
                            Registro de Novedades (Habitaciones 1 a 30)
                        </h3>
                        {renderSearchInput(searchRoomQuery, setSearchRoomQuery)}
                    </div>
                    <div style={{ ...styles.tableScroll, maxHeight: '500px' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Habitación</th>
                                    <th style={styles.th}>Cama</th>
                                    <th style={styles.th}>Residente</th>
                                    <th style={styles.th}>Estado / Título Novedad</th>
                                    <th style={styles.th}>Resumen Novedades</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResidents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#666', padding: '20px' }}>
                                            No se encontraron habitaciones para la búsqueda.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResidents.map((res) => {
                                        const incidents = getResidentIncidents(res.room, res.bed);
                                        const highestStatus = getHighestPriorityTitle(incidents);
                                        const summary = getIncidentsSummary(incidents);
                                        const rowKey = `${res.room}-${res.bed}`;
                                        const isHovered = hoveredKey === rowKey;
                                        return (
                                            <tr key={rowKey} style={styles.tr}>
                                                <td style={{ ...styles.td, fontWeight: 'bold' }}>Hab. {res.room}</td>
                                                <td style={styles.td}>Cama {res.bed}</td>
                                                <td style={styles.td}>{getResidentName(res.room, res.bed)}</td>
                                                <td style={styles.td}>{renderStatusBadge(highestStatus)}</td>
                                                <td style={{ ...styles.td, color: '#555', fontSize: '13px' }}>{summary}</td>
                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                    {isCuidador ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenResidentModal(res.room, res.bed)}
                                                            style={incidents.length === 0 ? styles.actionBtnSinNovedad : styles.actionBtnHasNovedad}
                                                        >
                                                            {incidents.length === 0 ? 'Sin novedades' : `Ver (${incidents.length})`}
                                                        </button>
                                                    ) : incidents.length === 0 ? (
                                                        <button
                                                            type="button"
                                                            onMouseEnter={() => setHoveredKey(rowKey)}
                                                            onMouseLeave={() => setHoveredKey(null)}
                                                            onClick={() => handleOpenResidentModal(res.room, res.bed)}
                                                            style={isHovered ? styles.actionBtnHover : styles.actionBtnSinNovedad}
                                                        >
                                                            {isHovered ? 'Anotar Novedad' : 'Sin Novedad'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenResidentModal(res.room, res.bed)}
                                                            style={styles.actionBtnHasNovedad}
                                                        >
                                                            Ver / Editar ({incidents.length})
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {renderNoteBox(notaNovedades, setNotaNovedades)}
                </div>

                {/* Footer actions */}
                <div style={styles.formActions}>
                    <button onClick={() => navigate('/dashboard/novedades')} style={styles.secondaryButton}>
                        Cancelar
                    </button>
                    <button onClick={handleSaveReport} style={styles.saveButton}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        Guardar Informe
                    </button>
                </div>
            </div>

            {/* Incident modal */}
            {activeResident && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0a3a8a' }}>
                                Habitación {activeResident.room} - Cama {activeResident.bed}
                            </h3>
                            <button onClick={() => setActiveResident(null)} style={styles.closeIconBtn} title="Cerrar modal">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            {!isCuidador && !showNewIncidentForm && (
                                <button onClick={() => setShowNewIncidentForm(true)} style={styles.modalAddBtn}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}>
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Añadir Novedad
                                </button>
                            )}
                            {showNewIncidentForm && (
                                <div style={styles.incidentFormBox}>
                                    <label style={styles.modalFormLabel}>Registrar Novedad:</label>
                                    <div style={styles.titleSelectorRow}>
                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#444' }}>Tipo:</span>
                                        <div style={styles.titleToggleGroup}>
                                            <button type="button" onClick={() => setNewIncidentTitle('Novedad')}
                                                style={newIncidentTitle === 'Novedad' ? styles.titleBtnNovedadActive : styles.titleBtnNovedad}>
                                                Novedad
                                            </button>
                                            <button type="button" onClick={() => setNewIncidentTitle('Hospital')}
                                                style={newIncidentTitle === 'Hospital' ? styles.titleBtnHospitalActive : styles.titleBtnHospital}>
                                                Hospital
                                            </button>
                                            <button type="button" onClick={() => setNewIncidentTitle('Salida')}
                                                style={newIncidentTitle === 'Salida' ? styles.titleBtnSalidaActive : styles.titleBtnSalida}>
                                                Salida
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={newIncidentDescription}
                                        onChange={(e) => handleDescriptionChange(e.target.value)}
                                        placeholder="Escriba los detalles de la novedad aquí..."
                                        rows={4}
                                        style={styles.modalTextarea}
                                        autoFocus
                                    />
                                    <div style={styles.incidentFormActions}>
                                        <button onClick={() => setShowNewIncidentForm(false)} style={styles.secondaryButton}>Cancelar</button>
                                        <button onClick={handleAddIncident} style={styles.primaryButton}>Añadir</button>
                                    </div>
                                </div>
                            )}
                            <div style={{ marginTop: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '6px', color: '#444' }}>
                                    Novedades del Turno Actual
                                </h4>
                                {getResidentIncidents(activeResident.room, activeResident.bed).length === 0 ? (
                                    <p style={{ color: '#777', fontStyle: 'italic', margin: '10px 0 0 0' }}>
                                        No hay novedades registradas para este residente.
                                    </p>
                                ) : (
                                    <div style={styles.incidentList}>
                                        {getResidentIncidents(activeResident.room, activeResident.bed).map((inc, index) => (
                                            <div key={index} style={styles.incidentCardItem}>
                                                <div style={styles.incidentCardHeader}>
                                                    {renderStatusBadge(inc.title)}
                                                    {!isCuidador && (
                                                        <button
                                                            onClick={() => handleDeleteIncident(inc)}
                                                            style={styles.deleteIncBtn}
                                                            title="Eliminar novedad"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={styles.incidentCardBody}>{inc.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setActiveResident(null)} style={styles.primaryButton}>
                                Listo / Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Historial de cambios del informe */}
            {showHistory && (
                <div style={styles.modalBackdrop} onClick={() => setShowHistory(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0a3a8a' }}>Historial de cambios</h3>
                            <button onClick={() => setShowHistory(false)} style={styles.closeIconBtn} title="Cerrar">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            {loadingHistory ? (
                                <p style={{ textAlign: 'center', color: '#666', padding: '20px 0' }}>Cargando historial...</p>
                            ) : history.length === 0 ? (
                                <p style={{ color: '#777', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                                    Sin cambios registrados para este informe.
                                </p>
                            ) : (
                                <div style={styles.incidentList}>
                                    {history.map(h => {
                                        const dt = new Date(h.createdAt);
                                        const fecha = `${dt.getDate().toString().padStart(2, '0')}-${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getFullYear()} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
                                        return (
                                            <div key={h.id} style={styles.incidentCardItem}>
                                                <div style={styles.incidentCardHeader}>
                                                    <span style={h.action === 'creado' ? styles.badgeSinNovedad : styles.badgeNovedad}>
                                                        {h.action === 'creado' ? 'Creado' : 'Editado'}
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: '#888' }}>{fecha}</span>
                                                </div>
                                                <div style={styles.incidentCardBody}>
                                                    <strong>{h.changedBy}</strong> — {h.summary}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowHistory(false)} style={styles.primaryButton}>Cerrar</button>
                        </div>
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
        backgroundColor: '#e1e4e8', border: 'none', color: '#333',
        padding: '8px 14px', borderRadius: '6px', fontSize: '13px',
        fontWeight: '600' as const, cursor: 'pointer', display: 'flex',
        alignItems: 'center', transition: 'background-color 0.2s',
    },
    historyButton: {
        backgroundColor: 'transparent', border: '1.5px solid #cbd5e1', color: '#475569',
        padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', transition: 'background-color 0.2s',
    },
    primaryButton: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white',
        padding: '8px 16px', borderRadius: '6px', fontSize: '14px',
        fontWeight: '500' as const, cursor: 'pointer', display: 'flex',
        alignItems: 'center', transition: 'background-color 0.2s',
    },
    secondaryButton: {
        backgroundColor: 'transparent', border: '1px solid #ccc', color: '#555',
        padding: '8px 16px', borderRadius: '6px', fontSize: '14px',
        fontWeight: '500' as const, cursor: 'pointer', transition: 'background-color 0.2s',
    },
    formContainer: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
    formPanel: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    inputWrapper: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
    inputLabel: { fontSize: '14px', fontWeight: 'bold', color: '#444' },
    formInput: {
        padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #ccc',
        fontSize: '15px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
    },
    formTextarea: {
        padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #ccc',
        fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' as const,
    },
    toggleGroup: { display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #ccc' },
    toggleActive: {
        flex: 1, backgroundColor: '#0a3a8a', color: 'white', border: 'none',
        padding: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s',
    },
    toggleInactive: {
        flex: 1, backgroundColor: '#fff', color: '#333', border: 'none',
        padding: '10px', cursor: 'pointer', fontSize: '14px', transition: 'background-color 0.2s',
    },
    tablePanel: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    },
    tablePanelHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px',
    },
    searchWrapper: {
        display: 'flex', alignItems: 'center', border: '1.5px solid #ccc',
        borderRadius: '8px', padding: '6px 12px', width: '100%', maxWidth: '350px',
    },
    searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', fontFamily: 'inherit' },
    tableScroll: {
        overflowX: 'auto' as const, overflowY: 'auto' as const,
        border: '1px solid #e1e4e8', borderRadius: '8px',
    },
    table: { width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const, fontSize: '14px' },
    th: {
        backgroundColor: '#f8f9fa', color: '#555', fontWeight: 'bold',
        padding: '12px 16px', borderBottom: '2px solid #e1e4e8',
        position: 'sticky' as const, top: 0, zIndex: 10, whiteSpace: 'nowrap' as const,
    },
    td: { padding: '12px 16px', borderBottom: '1px solid #e1e4e8' },
    tr: { transition: 'background-color 0.15s' },
    badgeHospital: {
        backgroundColor: '#fce8e6', color: '#c5221f', border: '1px solid #fad2cf',
        padding: '4px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '13px', display: 'inline-block',
    },
    badgeSalida: {
        backgroundColor: '#fef3d6', color: '#b06000', border: '1px solid #feebb6',
        padding: '4px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '13px', display: 'inline-block',
    },
    badgeNovedad: {
        backgroundColor: '#e8f0fe', color: '#1a73e8', border: '1px solid #d2e3fc',
        padding: '4px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '13px', display: 'inline-block',
    },
    badgeSinNovedad: {
        backgroundColor: '#e6f4ea', color: '#137333', border: '1px solid #ceead6',
        padding: '4px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '13px', display: 'inline-block',
    },
    actionBtnSinNovedad: {
        backgroundColor: 'transparent', border: '1px solid #137333', color: '#137333',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500' as const,
        cursor: 'pointer', width: '130px', transition: 'all 0.2s ease',
    },
    actionBtnHover: {
        backgroundColor: '#137333', border: '1px solid #137333', color: 'white',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const,
        cursor: 'pointer', width: '130px', boxShadow: '0 2px 4px rgba(19,115,51,0.2)', transition: 'all 0.2s ease',
    },
    actionBtnHasNovedad: {
        backgroundColor: '#0a3a8a', border: '1px solid #0a3a8a', color: 'white',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const,
        cursor: 'pointer', width: '130px', boxShadow: '0 2px 4px rgba(10,58,138,0.2)', transition: 'background-color 0.2s',
    },
    formActions: { display: 'flex', justifyContent: 'flex-end', gap: '15px', paddingBottom: '20px' },
    saveButton: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white', padding: '12px 24px',
        borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
        display: 'flex', alignItems: 'center', boxShadow: '0 4px 6px rgba(10,58,138,0.2)',
        transition: 'background-color 0.2s',
    },
    modalBackdrop: {
        position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(10,58,138,0.35)', backdropFilter: 'blur(5px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white', borderRadius: '16px', padding: '24px',
        width: '90%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto' as const,
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        border: '1px solid #e1e4e8', display: 'flex', flexDirection: 'column' as const,
    },
    modalHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #e1e4e8', paddingBottom: '12px',
    },
    closeIconBtn: {
        backgroundColor: 'transparent', border: 'none', color: '#666', cursor: 'pointer',
        display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px', transition: 'background-color 0.2s',
    },
    modalAddBtn: {
        backgroundColor: 'white', border: '2px dashed #0a3a8a', color: '#0a3a8a',
        borderRadius: '8px', padding: '12px', width: '100%', fontSize: '15px',
        fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center',
        alignItems: 'center', transition: 'all 0.2s',
    },
    incidentFormBox: {
        backgroundColor: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: '10px',
        padding: '16px', marginTop: '10px', display: 'flex', flexDirection: 'column' as const, gap: '12px',
    },
    modalFormLabel: { fontSize: '14px', fontWeight: 'bold', color: '#333' },
    modalTextarea: {
        padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #ccc',
        fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const,
    },
    titleSelectorRow: { display: 'flex', alignItems: 'center', gap: '10px' },
    titleToggleGroup: { display: 'flex', gap: '6px' },
    titleBtnNovedad: {
        padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' as const,
        border: '1.5px solid #1a73e8', backgroundColor: 'transparent', color: '#1a73e8',
    },
    titleBtnNovedadActive: {
        padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' as const,
        border: '1.5px solid #1a73e8', backgroundColor: '#1a73e8', color: 'white',
    },
    titleBtnHospital: {
        padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' as const,
        border: '1.5px solid #c5221f', backgroundColor: 'transparent', color: '#c5221f',
    },
    titleBtnHospitalActive: {
        padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' as const,
        border: '1.5px solid #c5221f', backgroundColor: '#c5221f', color: 'white',
    },
    titleBtnSalida: {
        padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' as const,
        border: '1.5px solid #b06000', backgroundColor: 'transparent', color: '#b06000',
    },
    titleBtnSalidaActive: {
        padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' as const,
        border: '1.5px solid #b06000', backgroundColor: '#b06000', color: 'white',
    },
    incidentFormActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    incidentList: { display: 'flex', flexDirection: 'column' as const, gap: '12px', marginTop: '10px' },
    incidentCardItem: {
        border: '1px solid #e1e4e8', borderRadius: '8px', padding: '12px',
        backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    },
    incidentCardHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px',
    },
    deleteIncBtn: {
        backgroundColor: 'transparent', border: 'none', color: '#c5221f', cursor: 'pointer',
        padding: '4px', borderRadius: '4px', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center',
    },
    incidentCardBody: { fontSize: '14px', color: '#444', lineHeight: '1.4', whiteSpace: 'pre-wrap' as const },
    modalFooter: {
        marginTop: '25px', display: 'flex', justifyContent: 'flex-end',
        borderTop: '1px solid #e1e4e8', paddingTop: '15px',
    },
};

const noteBoxStyles = {
    wrapper: {
        marginTop: '14px', backgroundColor: '#fffde7', border: '1px solid #5a5651ff',
        borderLeft: '4px solid #a7a5a3ff', borderRadius: '8px', padding: '12px 16px',
    },
    header: {
        display: 'flex', alignItems: 'center', marginBottom: '8px',
    },
    label: { fontSize: '13px', fontWeight: 'bold' as const, color: '#4e422dff' },
    textarea: {
        width: '100%', padding: '8px 10px', borderRadius: '6px',
        border: '1px solid #7b7667ff', backgroundColor: '#fffef5',
        fontSize: '13px', fontFamily: 'inherit', outline: 'none',
        resize: 'vertical' as const, color: '#333', boxSizing: 'border-box' as const,
    },
};

export default NovedadesForm;
