import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const toLocalDateString = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayIso = () => toLocalDateString(new Date());

const TYPE_LABEL: Record<string, string> = { visita: 'Visita', salida: 'Salida' };
const TYPE_COLOR: Record<string, string> = { visita: '#1a73e8', salida: '#e8a53d' };

const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

const VisitasSalidasList = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [selectedDate, setSelectedDate] = useState(todayIso());
    const [fechaMostrada, setFechaMostrada] = useState(new Date());
    const [showAll, setShowAll] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/visit-logs');
            setLogs(res.data);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo cargar el registro de visitas y salidas.');
        } finally {
            setLoading(false);
        }
    };

    const logsByDate = useMemo(() => {
        const map = new Map<string, any[]>();
        for (const log of logs) {
            const key = toLocalDateString(new Date(log.horaInicio));
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(log);
        }
        return map;
    }, [logs]);

    const cambiarMes = (dir: number) => {
        const nueva = new Date(fechaMostrada);
        nueva.setDate(1);
        nueva.setMonth(nueva.getMonth() + dir);
        setFechaMostrada(nueva);
    };

    const irAHoy = () => {
        setFechaMostrada(new Date());
        setSelectedDate(todayIso());
        setShowAll(false);
    };

    const generarDiasMes = () => {
        const año = fechaMostrada.getFullYear();
        const mes = fechaMostrada.getMonth();
        const primerDia = new Date(año, mes, 1).getDay();
        const offset = primerDia === 0 ? 6 : primerDia - 1;
        const diasEnMes = new Date(año, mes + 1, 0).getDate();
        const dias: (number | null)[] = [];
        for (let i = 0; i < offset; i++) dias.push(null);
        for (let d = 1; d <= diasEnMes; d++) dias.push(d);
        return dias;
    };

    const fechaDelDia = (dia: number) =>
        toLocalDateString(new Date(fechaMostrada.getFullYear(), fechaMostrada.getMonth(), dia));

    const dias = generarDiasMes();
    const hoy = todayIso();
    const visibleLogs = showAll ? logs : (logsByDate.get(selectedDate) || []);

    const tituloLista = showAll
        ? 'Todo el historial'
        : new Date(`${selectedDate}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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
                    <h2 style={styles.moduleTitle}>Visitas y Salidas</h2>
                </div>
            </div>



            <div style={styles.calendarPanel}>
                <div className="cal-month-nav" style={styles.monthNav}>
                    <button onClick={() => cambiarMes(-1)} style={styles.navButton}>← Mes anterior</button>
                    <h3 style={styles.monthTitle}>{nombresMeses[fechaMostrada.getMonth()]} {fechaMostrada.getFullYear()}</h3>
                    <button onClick={() => cambiarMes(1)} style={styles.navButton}>Mes siguiente →</button>
                </div>

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Cargando registros...</p>
                ) : (
                    <div className="cal-grid" style={styles.grid}>
                        {diasSemana.map(d => <div key={d} style={styles.dayHeader}>{d}</div>)}
                        {dias.map((dia, i) => {
                            if (!dia) return <div key={i} className="cal-day-cell" style={styles.emptyCell}></div>;
                            const fecha = fechaDelDia(dia);
                            const delDia = logsByDate.get(fecha) || [];
                            const visitas = delDia.filter(l => l.type === 'visita').length;
                            const salidas = delDia.filter(l => l.type === 'salida').length;
                            const seleccionado = !showAll && fecha === selectedDate;
                            return (
                                <div
                                    key={i}
                                    className="cal-day-cell"
                                    onClick={() => { setSelectedDate(fecha); setShowAll(false); }}
                                    style={{
                                        ...styles.dayCell,
                                        ...(fecha === hoy ? styles.dayCellToday : {}),
                                        ...(seleccionado ? styles.dayCellSelected : {}),
                                    }}
                                >
                                    <p style={fecha === hoy ? { ...styles.dayNumber, color: '#0a3a8a' } : styles.dayNumber}>{dia}</p>
                                    <div style={styles.eventsInCell}>
                                        {visitas > 0 && (
                                            <div className="cal-event-chip" style={{ ...styles.eventChip, backgroundColor: TYPE_COLOR.visita }}>
                                                {visitas} {visitas === 1 ? 'visita' : 'visitas'}
                                            </div>
                                        )}
                                        {salidas > 0 && (
                                            <div className="cal-event-chip" style={{ ...styles.eventChip, backgroundColor: TYPE_COLOR.salida }}>
                                                {salidas} {salidas === 1 ? 'salida' : 'salidas'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={styles.legendRow}>
                    <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: TYPE_COLOR.visita }} />Visita</span>
                    <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: TYPE_COLOR.salida }} />Salida</span>
                </div>
            </div>

            <div style={styles.toolBar}>
                <h3 style={styles.listTitle}>{tituloLista}</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                    {(showAll || selectedDate !== hoy) && (
                        <button onClick={irAHoy} style={styles.filterBtn}>Hoy</button>
                    )}
                    <button
                        onClick={() => setShowAll(v => !v)}
                        style={showAll ? styles.filterBtnActive : styles.filterBtn}
                    >
                        {showAll ? 'Viendo todo el historial' : 'Ver todo el historial'}
                    </button>
                </div>
            </div>

            {!loading && visibleLogs.length === 0 ? (
                <div style={styles.emptyState}>
                    <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>Sin registros para mostrar.</p>
                </div>
            ) : (
                <div style={styles.cardsGrid}>
                    {visibleLogs.map((log) => (
                        <div key={log.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <span style={styles.cardResident}>
                                    {log.resident ? `${log.resident.firstName} ${log.resident.lastName}` : 'Residente'}
                                </span>
                                <span style={log.type === 'salida' ? styles.badgeSalida : styles.badgeVisita}>
                                    {TYPE_LABEL[log.type] || log.type}
                                </span>
                            </div>
                            <p style={styles.cardLine}>
                                <strong>{formatTime(log.horaInicio)}</strong>
                                {log.horaFin ? ` — ${formatTime(log.horaFin)}` : ' — en curso'}
                                {' · '}{new Date(log.horaInicio).toLocaleDateString('es-CL')}
                            </p>
                            <p style={styles.cardLine}>
                                {log.type === 'salida' ? 'Retira: ' : 'Visita: '}
                                {log.personaNombre}{log.personaRelacion ? ` (${log.personaRelacion})` : ''}
                            </p>
                            {log.motivo && <p style={styles.cardMotivo}>{log.motivo}</p>}
                            <p style={styles.cardFooter}>Registrado por {log.registradoPor}</p>
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
        borderBottom: '2px solid #e1e4e8', paddingBottom: '15px', flexWrap: 'wrap' as const, gap: '12px',
    },
    moduleTitle: { margin: 0, fontSize: '22px', color: '#0a3a8a', fontWeight: 'bold' },
    backButton: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333', padding: '8px 14px',
        borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
    },
    hint: { margin: 0, fontSize: '13px', color: '#666', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '12px 16px' },
    calendarPanel: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)', padding: '20px',
    },
    monthNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    monthTitle: { margin: 0, fontSize: '20px', fontWeight: 'bold' as const, color: '#222' },
    navButton: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333', padding: '8px 16px',
        borderRadius: '6px', fontSize: '14px', fontWeight: '500' as const, cursor: 'pointer',
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' },
    dayHeader: {
        textAlign: 'center' as const, fontWeight: 'bold' as const, color: '#555',
        padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '13px',
    },
    emptyCell: { minHeight: '80px' },
    dayCell: {
        minHeight: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #e1e4e8',
        cursor: 'pointer', backgroundColor: '#fff', transition: 'background-color 0.15s',
        display: 'flex', flexDirection: 'column' as const,
    },
    dayCellToday: { border: '2px solid #0a3a8a', backgroundColor: 'rgba(10,58,138,0.05)' },
    dayCellSelected: { backgroundColor: 'rgba(10,58,138,0.12)', boxShadow: 'inset 0 0 0 2px #0a3a8a' },
    dayNumber: { margin: '0 0 6px 0', fontWeight: 'bold' as const, fontSize: '14px', color: '#333' },
    eventsInCell: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
    eventChip: {
        fontSize: '11px', color: 'white', padding: '3px 6px', borderRadius: '4px',
        whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const,
        fontWeight: '600' as const,
    },
    legendRow: { display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e1e4e8' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#444' },
    legendDot: { width: '12px', height: '12px', borderRadius: '3px', display: 'inline-block' },
    toolBar: { display: 'flex', gap: '12px', flexWrap: 'wrap' as const, alignItems: 'center', justifyContent: 'space-between' },
    listTitle: { margin: 0, fontSize: '16px', color: '#0a3a8a', textTransform: 'capitalize' as const },
    filterBtn: {
        padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #ddd',
        backgroundColor: 'white', color: '#555', fontSize: '13px', cursor: 'pointer',
    },
    filterBtnActive: {
        padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #0a3a8a',
        backgroundColor: '#0a3a8a', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' as const,
    },
    emptyState: {
        backgroundColor: 'white', borderRadius: '12px', padding: '50px',
        textAlign: 'center' as const, border: '1px solid #e1e4e8',
    },
    cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
    card: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)', padding: '16px',
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    cardResident: { fontSize: '15px', fontWeight: 'bold' as const, color: '#0a3a8a' },
    badgeVisita: {
        backgroundColor: '#e8f0fe', color: '#1a73e8', border: '1px solid #d2e3fc',
        padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' as const,
    },
    badgeSalida: {
        backgroundColor: '#fef3d6', color: '#b06000', border: '1px solid #feebb6',
        padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' as const,
    },
    cardLine: { margin: '4px 0', fontSize: '13px', color: '#333' },
    cardMotivo: { margin: '4px 0', fontSize: '12px', color: '#666', fontStyle: 'italic' },
    cardFooter: { margin: '8px 0 0 0', fontSize: '11px', color: '#999', borderTop: '1px solid #f0f0f0', paddingTop: '8px' },
};

export default VisitasSalidasList;
