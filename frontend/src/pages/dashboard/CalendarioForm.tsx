import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { CALENDAR_EVENT_TYPES, PERIODIC_ACTIVITIES } from '../../utils/calendarEventTypes';

const toDateInput = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const toTimeInput = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
};

const CalendarioForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);

    const [title, setTitle] = useState('');
    const [type, setType] = useState(CALENDAR_EVENT_TYPES[0].name);
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [loading, setLoading] = useState(false);

    // Reposición / Retiro de medicamento
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [residentMedicationId, setResidentMedicationId] = useState('');

    // Vinculación general con Residentes
    const [residents, setResidents] = useState<any[]>([]);
    const [residentId, setResidentId] = useState('');

    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

    useEffect(() => {
        // Cargar inventario consolidado de residentes para vincular
        api.get('/residents/medications/inventory')
            .then(res => setPrescriptions(res.data))
            .catch(err => console.error("Error al cargar inventario", err));

        // Cargar residentes activos
        api.get('/residents')
            .then(res => setResidents(res.data.filter((r: any) => r.estado === 'Activo')))
            .catch(err => console.error("Error al cargar residentes", err));
    }, []);

    useEffect(() => {
        if (isRecurring) {
            if (!PERIODIC_ACTIVITIES.some(a => a.name === type)) setType(PERIODIC_ACTIVITIES[0].name);
        } else {
            if (!CALENDAR_EVENT_TYPES.some(t => t.name === type)) setType(CALENDAR_EVENT_TYPES[0].name);
        }
    }, [isRecurring]);

    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            api.get(`/calendar-events/${id}`)
                .then(res => {
                    const ev = res.data;
                    setTitle(ev.title);
                    setType(ev.type);
                    setDescription(ev.description || '');
                    setLocation(ev.location || '');
                    setResidentMedicationId(ev.residentMedicationId || '');
                    setResidentId(ev.residentId || '');
                    const start = new Date(ev.startDate);
                    setStartDate(toDateInput(start));
                    setStartTime(toTimeInput(start));
                    if (ev.endDate) {
                        const end = new Date(ev.endDate);
                        setEndDate(toDateInput(end));
                        setEndTime(toTimeInput(end));
                    }
                })
                .catch(() => {
                    alert('No se pudo cargar el evento.');
                    navigate('/dashboard/calendario');
                })
                .finally(() => setLoading(false));
        } else {
            const today = new Date();
            setStartDate(toDateInput(today));
        }
    }, [id, isEditing, navigate]);

    const handleSave = async () => {
        if (!title.trim()) { alert('El título es obligatorio.'); return; }
        if (!startDate) { alert('La fecha de inicio es obligatoria.'); return; }

        if (isRecurring) {
            if (!recurrenceEndDate) { alert('Debe indicar la fecha de término de la repetición.'); return; }

            try {
                await api.post('/calendar-events/recurring', {
                    title,
                    type,
                    description,
                    location,
                    startDate,
                    startTime,
                    recurrenceEndDate,
                    residentId: residentId || null,
                });
                navigate('/dashboard/calendario');
            } catch (error) {
                console.error('Error al crear la actividad periódica:', error);
                alert('Ocurrió un error al guardar la actividad periódica.');
            }
            return;
        }

        const payload: any = {
            title,
            type,
            description,
            location,
            startDate: new Date(`${startDate}T${startTime || '00:00'}`).toISOString(),
            endDate: endDate ? new Date(`${endDate}T${endTime || '23:59'}`).toISOString() : null,
            residentMedicationId: type === 'Retiro de medicamento' ? (residentMedicationId || null) : null,
            residentId: residentId || null,
        };

        try {
            if (isEditing && id) {
                await api.put(`/calendar-events/${id}`, payload);
            } else {
                await api.post('/calendar-events', payload);
            }
            navigate('/dashboard/calendario');
        } catch (error) {
            console.error('Error al guardar el evento:', error);
            alert('Ocurrió un error al guardar el evento. Verifique los datos.');
        }
    };

    if (loading) {
        return <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando evento...</p>;
    }

    return (
    <div style={styles.moduleWrapper}>
        <div style={styles.moduleHeader}>
            <button onClick={() => navigate('/dashboard/calendario')} style={styles.backButton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Volver
            </button>
            <div style={{ textAlign: 'center', flex: 1, minWidth: '200px' }}>
                <h2 style={styles.moduleTitle}>
                    {isEditing ? 'Editar Evento' : 'Nuevo Evento'}
                </h2>
            </div>
            <div style={{ width: '100px' }} />
        </div>

        <div style={styles.formPanel}>
            <div style={styles.formGrid}>
                <div style={styles.inputWrapper}>
                    <label style={styles.inputLabel}>Título:</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={styles.formInput} placeholder="Ej: Visita médica Sr. Pérez" />
                </div>

                <div style={styles.inputWrapper}>
                    <label style={styles.inputLabel}>{isRecurring ? 'Procedimiento periódico:' : 'Tipo de evento:'}</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        style={styles.formInput}
                    >
                        {(isRecurring ? PERIODIC_ACTIVITIES : CALENDAR_EVENT_TYPES).map(t => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {type === 'Retiro de medicamento' && (
                    <div style={{ ...styles.inputWrapper, gridColumn: '1 / -1' }}>
                        <label style={styles.inputLabel}>Medicamento de Residente (para alertar reposición):</label>
                        <select
                            value={residentMedicationId}
                            onChange={(e) => setResidentMedicationId(e.target.value)}
                            style={styles.formInput}
                        >
                            <option value="">-- Seleccionar Inventario / Residente --</option>
                            {prescriptions.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.resident ? `${p.resident.firstName} ${p.resident.lastName}` : 'Desconocido'} - {p.medication?.name} ({p.medication?.presentation || 'Sin presentación'})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ ...styles.inputWrapper, gridColumn: '1 / -1' }}>
                    <label style={styles.inputLabel}>Residente Asociado (Opcional):</label>
                    <select
                        value={residentId}
                        onChange={(e) => setResidentId(e.target.value)}
                        style={styles.formInput}
                    >
                        <option value="">-- No vincular a un residente específico --</option>
                        {residents.map(r => {
                            const sugText = r.requiereDesimpactacion ? '⭐ [Sugerido Desimpactación] ' : '';
                            return (
                                <option key={r.id} value={r.id}>
                                    {sugText}{r.firstName} {r.lastName} (Rut: {r.rut || 'S/R'})
                                </option>
                            );
                        })}
                    </select>
                    {type === 'Desimpactación Fecal Manual' && (
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#b91c1c', fontWeight: 'bold' }}>
                            💡 Nota: Se recomiendan prioritariamente los residentes con la estrella ⭐, ya que tienen activa la indicación de Desimpactación Fecal en sus fichas.
                        </p>
                    )}
                </div>

                <div style={styles.inputWrapper}>
                    <label style={styles.inputLabel}>Ubicación:</label>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} style={styles.formInput} placeholder="Ej: Habitación 5, Sala común" />
                </div>

                <div style={styles.inputWrapper}>
                    <label style={styles.inputLabel}>Fecha de inicio:</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.formInput} />
                </div>

                <div style={styles.inputWrapper}>
                    <label style={styles.inputLabel}>Hora de inicio:</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={styles.formInput} />
                </div>

                <div style={styles.inputWrapper}>
                    <label style={styles.inputLabel}>Fecha de término (opcional):</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.formInput} />
                </div>

                <div style={{ ...styles.inputWrapper, gridColumn: '1 / -1' }}>
                    <div
                        onClick={() => setIsRecurring(!isRecurring)}
                        style={isRecurring ? styles.recurringCardActive : styles.recurringCard}
                    >
                        <div style={{ flex: 1 }}>
                            <div style={styles.recurringTitle}>Actividad Periódica</div>
                            <div style={styles.recurringSubtitle}>Se repetirá automáticamente cada semana hasta la fecha indicada</div>
                        </div>
                        <div style={isRecurring ? styles.toggleSwitchOn : styles.toggleSwitchOff}>
                            <div style={isRecurring ? styles.toggleKnobOn : styles.toggleKnobOff} />
                        </div>
                    </div>
                </div>

                {isRecurring && (
                    <>
                        <div style={styles.inputWrapper}>
                            <label style={styles.inputLabel}>Repetir hasta:</label>
                            <input
                                type="date"
                                value={recurrenceEndDate}
                                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                style={styles.formInput}
                            />
                        </div>
                    </>
                )}

                <div style={styles.inputWrapper}>
                    <label style={styles.inputLabel}>Hora de término (opcional):</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={styles.formInput} />
                </div>
            </div>

            <div style={{ ...styles.inputWrapper, marginTop: '20px' }}>
                <label style={styles.inputLabel}>Descripción:</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={styles.formTextarea} rows={4} placeholder="Detalles adicionales del evento..." />
            </div>
        </div>

        <div style={styles.formActions}>
            <button onClick={() => navigate('/dashboard/calendario')} style={styles.secondaryButton}>
                Cancelar
            </button>
            <button onClick={handleSave} style={styles.saveButton}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Guardar Evento
            </button>
        </div>
    </div>
);
};

const styles = {
    moduleWrapper: {
        width: '100%', maxWidth: '1000px',
        display: 'flex', flexDirection: 'column' as const, gap: '20px',
    },
    moduleHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '2px solid #e1e4e8', paddingBottom: '15px',
    },
    moduleTitle: { margin: 0, fontSize: '22px', color: '#0a3a8a', fontWeight: 'bold' },
    backButton: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333',
        padding: '8px 14px', borderRadius: '6px', fontSize: '13px',
        fontWeight: '600' as const, cursor: 'pointer', display: 'flex',
        alignItems: 'center', transition: 'background-color 0.2s',
    },
    secondaryButton: {
        backgroundColor: 'transparent', border: '1px solid #ccc', color: '#555',
        padding: '8px 16px', borderRadius: '6px', fontSize: '14px',
        fontWeight: '500' as const, cursor: 'pointer', transition: 'background-color 0.2s',
    },
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
        width: '100%', boxSizing: 'border-box' as const,
    },
    recurringCard: {
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 18px', borderRadius: '12px',
        border: '2px dashed #f0ad4e', backgroundColor: '#fff8ec',
        cursor: 'pointer', transition: 'all 0.2s ease',
    },
    recurringCardActive: {
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 18px', borderRadius: '12px',
        border: '2px solid #f0ad4e', backgroundColor: '#fff3da',
        cursor: 'pointer', transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(240,173,78,0.35)',
    },
    recurringTitle: { fontSize: '15px', fontWeight: 'bold' as const, color: '#8a5a00' },
    recurringSubtitle: { fontSize: '12px', color: '#b07d1e', marginTop: '2px' },
    toggleSwitchOff: {
        width: '46px', height: '26px', borderRadius: '13px', backgroundColor: '#ccc',
        position: 'relative' as const, transition: 'background-color 0.2s ease', flexShrink: 0,
    },
    toggleSwitchOn: {
        width: '46px', height: '26px', borderRadius: '13px', backgroundColor: '#f0ad4e',
        position: 'relative' as const, transition: 'background-color 0.2s ease', flexShrink: 0,
    },
    toggleKnobOff: {
        width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white',
        position: 'absolute' as const, top: '3px', left: '3px', transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
    toggleKnobOn: {
        width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white',
        position: 'absolute' as const, top: '3px', left: '23px', transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
    formActions: { display: 'flex', justifyContent: 'flex-end', gap: '15px', paddingBottom: '20px' },
    saveButton: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white', padding: '12px 24px',
        borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
        display: 'flex', alignItems: 'center', boxShadow: '0 4px 6px rgba(10,58,138,0.2)',
    },
};

export default CalendarioForm;
