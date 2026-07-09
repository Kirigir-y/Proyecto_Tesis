import { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { CALENDAR_EVENT_TYPES, PERIODIC_ACTIVITIES, getEventColor } from '../../utils/calendarEventTypes';

const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toTimeString().slice(0, 5);
};

const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${nombresMeses[d.getMonth()].slice(0, 3)}`;
};

const CalendarioList = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fechaMostrada, setFechaMostrada] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const [priorityEvents, setPriorityEvents] = useState<any[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [showAllPriorities, setShowAllPriorities] = useState(false);

    const hoy = new Date();

    useEffect(() => { fetchEvents(); fetchPriorityEvents(); }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/calendar-events');
            setEvents(res.data);
        } catch (e) {
            console.error('Error al obtener los eventos:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchPriorityEvents = async () => {
        try {
            const res = await api.get('/calendar-events/priorities');
            setPriorityEvents(res.data);
        } catch (e) {
            console.error('Error al obtener las prioridades:', e);
        }
    };

    const cambiarMes = (dir: number) => {
        const nueva = new Date(fechaMostrada);
        nueva.setMonth(nueva.getMonth() + dir);
        setFechaMostrada(nueva);
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

    const dias = generarDiasMes();

    const eventosDelDia = (dia: number) => {
        return events.filter(ev => {
            const fecha = new Date(ev.startDate);
            return fecha.getDate() === dia &&
                fecha.getMonth() === fechaMostrada.getMonth() &&
                fecha.getFullYear() === fechaMostrada.getFullYear();
        });
    };

    const esHoy = (dia: number) =>
        dia === hoy.getDate() &&
        fechaMostrada.getMonth() === hoy.getMonth() &&
        fechaMostrada.getFullYear() === hoy.getFullYear();

    const handleDelete = async (eventId: string) => {
        if (!confirm('¿Eliminar este evento?')) return;
        try {
            await api.delete(`/calendar-events/${eventId}`);
            await fetchEvents();
            await fetchPriorityEvents();
        } catch (e) {
            console.error('Error al eliminar el evento:', e);
            alert('No se pudo eliminar el evento.');
        }
    };

    const handleMarkDone = async (eventId: string) => {
        try {
            await api.put(`/calendar-events/${eventId}`, { completed: true });
            await fetchEvents();
            await fetchPriorityEvents();
        } catch (e) {
            console.error('Error al marcar la actividad como hecha:', e);
            alert('No se pudo marcar la actividad como hecha.');
        }
    };

    const handleDeleteRecurring = async (recurrenceGroupId: string) => {
        if (!confirm('¿Eliminar TODAS las repeticiones de esta actividad periódica? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/calendar-events/recurring/${recurrenceGroupId}`);
            await fetchEvents();
            await fetchPriorityEvents();
        } catch (e) {
            console.error('Error al eliminar la actividad periódica:', e);
            alert('No se pudo eliminar la actividad periódica.');
        }
    };

    const handleDragStart = (index: number) => setDraggedIndex(index);

    const handleDragOver = (e: DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const updated = [...priorityEvents];
        const [moved] = updated.splice(draggedIndex, 1);
        updated.splice(index, 0, moved);
        setDraggedIndex(index);
        setPriorityEvents(updated);
    };

    const handleDragEnd = async () => {
        setDraggedIndex(null);
        try {
            await api.put('/calendar-events/reorder', { ids: priorityEvents.map(e => e.id) });
        } catch (e) {
            console.error('Error al reordenar prioridades:', e);
        }
    };

    const eventosSeleccionados = selectedDay !== null ? eventosDelDia(selectedDay) : [];
    const visiblePriorities = priorityEvents.slice(0, 7);
    const hiddenPriorities = priorityEvents.slice(7);

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
                    <h2 style={styles.moduleTitle}>Calendario</h2>
                </div>
                <button onClick={() => navigate('/dashboard/calendario/nuevo')} style={styles.primaryButton}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Nuevo Evento
                </button>
            </div>

            <div style={styles.mainRow}>
                <div style={styles.calendarPanel}>
                    <div style={styles.monthNav}>
                        <button onClick={() => cambiarMes(-1)} style={styles.navButton}>← Mes anterior</button>
                        <h3 style={styles.monthTitle}>{nombresMeses[fechaMostrada.getMonth()]} {fechaMostrada.getFullYear()}</h3>
                        <button onClick={() => cambiarMes(1)} style={styles.navButton}>Mes siguiente →</button>
                    </div>

                    {loading ? (
                        <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Cargando eventos...</p>
                    ) : (
                        <div style={styles.grid}>
                            {diasSemana.map(d => <div key={d} style={styles.dayHeader}>{d}</div>)}
                            {dias.map((dia, i) => {
                                if (!dia) return <div key={i} style={styles.emptyCell}></div>;
                                const eventosDia = eventosDelDia(dia);
                                return (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedDay(dia)}
                                        style={esHoy(dia) ? { ...styles.dayCell, ...styles.dayCellToday } : styles.dayCell}
                                    >
                                        <p style={esHoy(dia) ? { ...styles.dayNumber, color: '#0a3a8a' } : styles.dayNumber}>{dia}</p>
                                        <div style={styles.eventsInCell}>
                                            {eventosDia.slice(0, 3).map((ev) => (
                                                <div key={ev.id} style={{ ...styles.eventChip, backgroundColor: getEventColor(ev.type, ev.completed) }} title={ev.title}>
                                                    {ev.title}
                                                </div>
                                            ))}
                                            {eventosDia.length > 3 && (
                                                <p style={styles.moreEvents}>+{eventosDia.length - 3} más</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>

                <div style={styles.priorityPanel}>
                    {priorityEvents.length > 0 && (<>
                        <h3 style={styles.priorityPanelTitle}>Prioridades</h3>
                        <div style={styles.priorityList}>
                            {visiblePriorities.map((ev, index) => (
                                <div
                                    key={ev.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => navigate(`/dashboard/calendario/${ev.id}`)}
                                    style={{
                                        ...styles.priorityCard,
                                        backgroundColor: `${getEventColor(ev.type, ev.completed)}26`,
                                        borderLeft: `4px solid ${getEventColor(ev.type, ev.completed)}`,
                                        opacity: draggedIndex === index ? 0.4 : 1,
                                    }}
                                    title={ev.title}
                                >
                                    <p style={styles.priorityCardTitle}>{ev.title}</p>
                                    <p style={styles.priorityCardMeta}>{formatShortDate(ev.startDate)} · {formatTime(ev.startDate)}</p>
                                </div>
                            ))}
                        </div>

                        {hiddenPriorities.length > 0 && (
                            <button style={styles.priorityMoreBtn} onClick={() => setShowAllPriorities(true)}>
                                <span style={{ fontSize: '18px', lineHeight: '10px' }}>•••</span>
                                <span>+{hiddenPriorities.length} más</span>
                            </button>
                        )}
                    </>)}

                    <div style={styles.legendInPanel}>
                        <p style={styles.legendPanelTitle}>Tipos de evento</p>
                        {CALENDAR_EVENT_TYPES.map(t => (
                            <div key={t.name} style={styles.legendItem}>
                                <div style={{ ...styles.legendDot, backgroundColor: t.color }}></div>
                                <span>{t.name}</span>
                            </div>
                        ))}
                        {PERIODIC_ACTIVITIES.map(t => (
                            <div key={t.name} style={styles.legendItem}>
                                <div style={{ ...styles.legendDot, backgroundColor: t.color }}></div>
                                <span>{t.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showAllPriorities && (
                <div style={styles.modalBackdrop} onClick={() => setShowAllPriorities(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0a3a8a' }}>Todas las prioridades</h3>
                            <button onClick={() => setShowAllPriorities(false)} style={styles.closeIconBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div style={styles.eventList}>
                            {priorityEvents.map((ev, index) => (
                                <div
                                    key={ev.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => navigate(`/dashboard/calendario/${ev.id}`)}
                                    style={{
                                        ...styles.priorityCard,
                                        backgroundColor: `${getEventColor(ev.type, ev.completed)}26`,
                                        borderLeft: `4px solid ${getEventColor(ev.type, ev.completed)}`,
                                        opacity: draggedIndex === index ? 0.4 : 1,
                                        marginBottom: '10px',
                                    }}
                                >
                                    <p style={styles.priorityCardTitle}>{ev.title}</p>
                                    <p style={styles.priorityCardMeta}>{formatShortDate(ev.startDate)} · {formatTime(ev.startDate)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedDay !== null && (
                <div style={styles.modalBackdrop} onClick={() => setSelectedDay(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0a3a8a' }}>
                                {selectedDay} de {nombresMeses[fechaMostrada.getMonth()]} {fechaMostrada.getFullYear()}
                            </h3>
                            <button onClick={() => setSelectedDay(null)} style={styles.closeIconBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {eventosSeleccionados.length === 0 ? (
                            <p style={{ color: '#666', padding: '20px 0', textAlign: 'center' }}>No hay eventos programados para este día.</p>
                        ) : (
                            <div style={styles.eventList}>
                                {eventosSeleccionados.map(ev => (
                                    <div key={ev.id} style={styles.eventCard}>
                                        <div style={{ ...styles.eventCardHeader, borderLeft: `4px solid ${getEventColor(ev.type, ev.completed)}` }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '16px', color: '#222' }}>{ev.title}</h4>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '13px', color: '#666' }}>{ev.type}</span>
                                                    {ev.resident && (
                                                        <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                                            👤 Residente: {ev.resident.firstName} {ev.resident.lastName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={styles.eventCardBody}>
                                            <p style={{ margin: '4px 0' }}>
                                                <strong>Hora:</strong> {formatTime(ev.startDate)}
                                                {ev.endDate ? ` - ${formatTime(ev.endDate)}` : ''}
                                            </p>
                                            {ev.location && <p style={{ margin: '4px 0' }}><strong>Ubicación:</strong> {ev.location}</p>}
                                            {ev.description && <p style={{ margin: '4px 0' }}>{ev.description}</p>}
                                            <p style={{ margin: '4px 0', fontSize: '12px', color: '#999' }}>Creado por: {ev.createdBy}</p>
                                            {ev.recurrenceGroupId && (
                                                <p style={{ margin: '4px 0', fontSize: '12px', color: '#fb8c00', fontWeight: 600 as const }}>
                                                    Actividad periódica
                                                </p>
                                            )}
                                            {ev.completed && (
                                                <p style={{ margin: '4px 0', fontSize: '12px', color: '#4caf50', fontWeight: 600 as const }}>
                                                    ✅ Completada
                                                </p>
                                            )}
                                        </div>
                                        <div style={styles.eventCardActions}>
                                            {!ev.completed && (
                                                <button onClick={() => handleMarkDone(ev.id)} style={styles.doneBtn}>Hecho</button>
                                            )}
                                            <button onClick={() => navigate(`/dashboard/calendario/${ev.id}`)} style={styles.editBtn}>Editar</button>
                                            <button onClick={() => handleDelete(ev.id)} style={styles.deleteBtn}>Eliminar</button>
                                            {ev.recurrenceGroupId && (
                                                <button onClick={() => handleDeleteRecurring(ev.recurrenceGroupId)} style={styles.deleteAllBtn}>
                                                    Eliminar todas las repeticiones
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={styles.modalFooter}>
                            <button onClick={() => navigate('/dashboard/calendario/nuevo')} style={styles.primaryButton}>
                                Nuevo Evento
                            </button>
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
    mainRow: {
        display: 'flex', gap: '20px', alignItems: 'flex-start',
    },
    calendarPanel: {
        flex: 1, minWidth: 0,
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    },
    priorityPanel: {
        flex: '0 0 280px',
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
        display: 'flex', flexDirection: 'column' as const, gap: '12px',
    },
    priorityPanelTitle: { margin: 0, fontSize: '16px', color: '#0a3a8a', fontWeight: 'bold' },
    priorityList: {
        display: 'flex', flexDirection: 'column' as const, gap: '8px',
    },
    priorityCard: {
        borderRadius: '8px', padding: '8px 12px', cursor: 'grab',
        transition: 'opacity 0.15s', userSelect: 'none' as const,
    },
    priorityCardTitle: {
        margin: 0, fontSize: '13px', fontWeight: '600' as const, color: '#222',
        whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const,
    },
    priorityCardMeta: { margin: '2px 0 0 0', fontSize: '11px', color: '#666' },
    priorityMoreBtn: {
        backgroundColor: '#f8f9fa', border: '1px dashed #ccc', borderRadius: '8px',
        padding: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', gap: '4px', color: '#555', fontSize: '12px', fontWeight: '600' as const,
    },
    monthNav: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px',
    },
    monthTitle: { margin: 0, fontSize: '20px', fontWeight: 'bold' as const, color: '#222' },
    navButton: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333', padding: '8px 16px',
        borderRadius: '6px', fontSize: '14px', fontWeight: '500' as const, cursor: 'pointer',
    },
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px',
    },
    dayHeader: {
        textAlign: 'center' as const, fontWeight: 'bold' as const, color: '#555',
        padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '13px',
    },
    emptyCell: { minHeight: '100px' },
    dayCell: {
        minHeight: '100px', padding: '8px', borderRadius: '8px', border: '1px solid #e1e4e8',
        cursor: 'pointer', backgroundColor: '#fff', transition: 'background-color 0.15s',
        display: 'flex', flexDirection: 'column' as const,
    },
    dayCellToday: {
        border: '2px solid #0a3a8a', backgroundColor: 'rgba(10,58,138,0.05)',
    },
    dayNumber: { margin: '0 0 6px 0', fontWeight: 'bold' as const, fontSize: '14px', color: '#333' },
    eventsInCell: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
    eventChip: {
        fontSize: '11px', color: 'white', padding: '3px 6px', borderRadius: '4px',
        whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const,
        fontWeight: '600' as const,
    },
    moreEvents: { margin: 0, fontSize: '11px', color: '#666', fontWeight: '600' as const },
    legendInPanel: {
        borderTop: '1px solid #e1e4e8', paddingTop: '14px', marginTop: '4px',
        display: 'flex', flexDirection: 'column' as const, gap: '8px',
    },
    legendPanelTitle: {
        margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' as const,
        color: '#0a3a8a', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
    },
    legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#444' },
    legendDot: { width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0 },
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
    eventList: { display: 'flex', flexDirection: 'column' as const, gap: '12px', marginTop: '16px' },
    eventCard: {
        border: '1px solid #e1e4e8', borderRadius: '8px', overflow: 'hidden',
        backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    },
    eventCardHeader: { padding: '10px 14px', backgroundColor: '#f8f9fa' },
    eventCardBody: { padding: '10px 14px', fontSize: '14px', color: '#444' },
    eventCardActions: {
        display: 'flex', justifyContent: 'flex-end', gap: '10px',
        padding: '10px 14px', borderTop: '1px solid #f0f0f0',
    },
    doneBtn: {
        backgroundColor: '#a5d6a7', border: '1px solid #81c784', color: '#1b5e20',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
    },
    editBtn: {
        backgroundColor: 'transparent', border: '1px solid #0a3a8a', color: '#0a3a8a',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
    },
    deleteBtn: {
        backgroundColor: 'transparent', border: '1px solid #c5221f', color: '#c5221f',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
    },
    deleteAllBtn: {
        backgroundColor: '#c5221f', border: '1px solid #c5221f', color: 'white',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
    },
    modalFooter: {
        marginTop: '16px', display: 'flex', justifyContent: 'flex-end',
        borderTop: '1px solid #e1e4e8', paddingTop: '15px',
    },
};

export default CalendarioList;
