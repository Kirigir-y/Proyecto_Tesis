import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ESTADOS = ['Activo', 'Fallecido'];
const ESTADO_COLORS: Record<string, string> = {
    'Activo': '#137333', 'Fallecido': '#555',
};

const MIN_RESIDENT_AGE = 60;

const calculateAge = (fechaNacimiento: string): number => {
    const birth = new Date(fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

const formatFechaHora = (d: Date) =>
    `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

// Colapsa las repeticiones de una misma actividad periódica (mismo recurrenceGroupId) en una sola fila:
// se muestra "Completado" solo cuando todas las repeticiones ya se cumplieron, es decir, hasta el
// término del período; el botón Ver/Editar apunta a la próxima repetición pendiente.
const groupResidentEvents = (events: any[]) => {
    const groups = new Map<string, any[]>();
    events.forEach(ev => {
        const key = ev.recurrenceGroupId || ev.id;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(ev);
    });

    return Array.from(groups.values())
        .map(group => {
            const sorted = [...group].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            const allCompleted = sorted.every(e => e.completed);
            return {
                first,
                last,
                isPeriodic: Boolean(first.recurrenceGroupId),
                allCompleted,
                count: sorted.length,
                target: sorted.find(e => !e.completed) || last,
            };
        })
        .sort((a, b) => new Date(a.first.startDate).getTime() - new Date(b.first.startDate).getTime());
};

const FRECUENCIAS = ['Diario', 'c/8h', 'c/12h', 'c/24h', 'Semanal', 'S/N (si es necesario)', 'Otro'];

// ── RUT chileno ──
// Dígito verificador según módulo 11
const computeRutDv = (body: string) => {
    let sum = 0, mul = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i], 10) * mul;
        mul = mul === 7 ? 2 : mul + 1;
    }
    const rest = 11 - (sum % 11);
    return rest === 11 ? '0' : rest === 10 ? 'K' : String(rest);
};

const formatRutBody = (body: string) => body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Extrae solo el cuerpo numérico de un RUT guardado (descarta puntos y dígito verificador)
const parseRutBody = (stored: string) => {
    const cleaned = (stored || '').replace(/[.\s]/g, '');
    const body = cleaned.includes('-') ? cleaned.split('-')[0] : cleaned.replace(/[kK]$/, '');
    return body.replace(/\D/g, '').slice(0, 8);
};

const ResidentesForm = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [rutBody, setRutBody] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [room, setRoom] = useState('');
    const [bed, setBed] = useState<'A' | 'B' | ''>('');
    const [estado, setEstado] = useState('Activo');
    const [requiereColacionNocturna, setRequiereColacionNocturna] = useState(false);
    const [diagnostico, setDiagnostico] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [loading, setLoading] = useState(false);
    const [resEvents, setResEvents] = useState<any[]>([]);

    // ── Medicamentos recetados ──
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [allMeds, setAllMeds] = useState<any[]>([]);

    // Modal agregar prescripción
    const [showAddMed, setShowAddMed] = useState(false);
    const [selMedId, setSelMedId] = useState('');
    const [selInstructions, setSelInstructions] = useState('');
    const [selFrequency, setSelFrequency] = useState('');
    const [selCustomFrequency, setSelCustomFrequency] = useState('');
    const [selStartDate, setSelStartDate] = useState('');
    const [savingPresc, setSavingPresc] = useState(false);

    const fetchPrescriptions = async () => {
        try {
            const res = await api.get(`/residents/${id}/medications`);
            setPrescriptions(res.data);
        } catch { }
    };

    const fetchResidentEvents = async () => {
        try {
            const res = await api.get('/calendar-events');
            const filtered = res.data.filter((ev: any) => ev.residentId === id);
            setResEvents(filtered);
        } catch { }
    };

    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            api.get(`/residents/${id}`)
                .then(res => {
                    const r = res.data;
                    setFirstName(r.firstName);
                    setLastName(r.lastName);
                    setRutBody(parseRutBody(r.rut || ''));
                    setFechaNacimiento(r.fechaNacimiento || '');
                    setRoom(r.room ? String(r.room) : '');
                    setBed(r.bed || '');
                    setEstado(r.estado || 'Activo');
                    setRequiereColacionNocturna(Boolean(r.requiereColacionNocturna));
                    setDiagnostico(r.diagnostico || '');
                    setObservaciones(r.observaciones || '');
                })
                .catch(() => {
                    showToast('No se pudo cargar el residente.');
                    navigate('/dashboard/residentes');
                })
                .finally(() => setLoading(false));

            fetchPrescriptions();
            fetchResidentEvents();
            api.get('/medications').then(r => setAllMeds(r.data)).catch(() => { });
        }
    }, [id, isEditing, navigate]);


    const handleAddPrescription = async () => {
        if (!selMedId) { showToast('Selecciona un medicamento.'); return; }
        if (selFrequency === 'Otro' && !selCustomFrequency.trim()) {
            showToast('Especifica cada cuánto se administra (ej: cada 6 horas).');
            return;
        }
        // Si se eligió "Otro", se guarda directamente el texto ingresado (ej: "Cada 6 horas")
        // en vez de la etiqueta genérica, para que Administración de Medicamentos pueda
        // calcular el horario real de dosis a partir de esa frecuencia.
        const finalFrequency = selFrequency === 'Otro' ? selCustomFrequency.trim() : selFrequency;
        setSavingPresc(true);
        try {
            await api.post(`/residents/${id}/medications`, {
                medicationId: selMedId,
                instructions: selInstructions || null,
                frequency: finalFrequency || null,
                startDate: selStartDate || null,
            });
            setShowAddMed(false);
            setSelMedId(''); setSelInstructions(''); setSelFrequency(''); setSelCustomFrequency(''); setSelStartDate('');
            await fetchPrescriptions();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Error al agregar medicamento.');
        } finally { setSavingPresc(false); }
    };

    const handleRemovePresc = async (prescId: string, medName: string) => {
        if (!confirm(`¿Quitar "${medName}" de los medicamentos recetados?`)) return;
        try {
            await api.delete(`/residents/${id}/medications/${prescId}`);
            await fetchPrescriptions();
        } catch { showToast('No se pudo quitar el medicamento.'); }
    };

    const handleSave = async () => {
        if (!firstName.trim()) { showToast('El nombre es obligatorio.'); return; }
        if (!lastName.trim()) { showToast('El apellido es obligatorio.'); return; }
        if (!rutBody) { showToast('El RUT es obligatorio.'); return; }
        if (rutBody.length < 7) { showToast('El RUT está incompleto.'); return; }
        if (!fechaNacimiento) { showToast('La fecha de nacimiento es obligatoria.'); return; }
        if (calculateAge(fechaNacimiento) < MIN_RESIDENT_AGE) {
            showToast(`El residente debe tener al menos ${MIN_RESIDENT_AGE} años.`);
            return;
        }
        if (!isEditing && estado === 'Fallecido') {
            showToast('No se puede crear un residente con estado "Fallecido". Guárdelo como Activo y luego edítelo.');
            return;
        }
        const payload: any = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            rut: `${formatRutBody(rutBody)}-${computeRutDv(rutBody)}`,
            fechaNacimiento: fechaNacimiento || null,
            room: room ? Number(room) : null,
            bed: bed || null,
            estado,
            requiereColacionNocturna,
            diagnostico: diagnostico.trim() || null,
            observaciones: observaciones.trim() || null,
        };
        try {
            if (isEditing && id) {
                await api.put(`/residents/${id}`, payload);
            } else {
                await api.post('/residents', payload);
            }
            navigate('/dashboard/residentes');
        } catch (e: any) {
            const msg = e?.response?.data?.message || 'Error al guardar el residente.';
            showToast(msg);
        }
    };

    if (loading) return <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando...</p>;

    return (
        <div style={styles.moduleWrapper}>
            <div style={styles.moduleHeader}>
                <button onClick={() => navigate('/dashboard/residentes')} style={styles.backButton}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Volver
                </button>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '200px' }}>
                    <h2 style={styles.moduleTitle}>{isEditing ? 'Editar Residente' : 'Nuevo Residente'}</h2>
                </div>
                <div style={{ width: '100px' }} />
            </div>

            <div style={styles.formPanel}>
                <h3 style={styles.sectionTitle}>Datos personales</h3>
                <div style={styles.formGrid}>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>Nombre(s):</label>
                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                            style={styles.formInput} placeholder="Ej: María Elena" />
                    </div>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>Apellido(s):</label>
                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                            style={styles.formInput} placeholder="Ej: García López" />
                    </div>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>RUT:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="text" inputMode="numeric" value={formatRutBody(rutBody)}
                                onChange={e => setRutBody(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                style={{ ...styles.formInput, flex: 1, minWidth: 0 }} placeholder="Ej: 12.345.678" />
                            <span style={styles.rutDvBox}>- {rutBody ? computeRutDv(rutBody) : '·'}</span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#999' }}>El dígito verificador se calcula automáticamente.</span>
                    </div>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>Fecha de nacimiento:</label>
                        <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)}
                            style={styles.formInput} />
                    </div>
                </div>

                <h3 style={{ ...styles.sectionTitle, marginTop: '24px' }}>Ubicación y estado</h3>
                <div style={styles.formGrid}>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>Habitación (1-30):</label>
                        <input type="number" value={room} min={1} max={30}
                            onChange={e => setRoom(e.target.value)} style={styles.formInput} placeholder="Ej: 5" />
                    </div>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>Cama:</label>
                        <div style={styles.toggleGroup}>
                            {(['A', 'B'] as const).map(b => (
                                <button key={b} type="button" onClick={() => setBed(b)}
                                    style={bed === b ? styles.toggleActive : styles.toggleInactive}>
                                    Cama {b}
                                </button>
                            ))}
                            <button type="button" onClick={() => setBed('')}
                                style={bed === '' ? styles.toggleActive : styles.toggleInactive}>
                                Sin asignar
                            </button>
                        </div>
                    </div>
                    <div style={{ ...styles.inputWrapper, gridColumn: '1 / -1' }}>
                        <label style={styles.inputLabel}>Estado:</label>
                        <div style={styles.estadoGroup}>
                            {(isEditing ? ESTADOS : ['Activo']).map(e => (
                                <button key={e} type="button" onClick={() => setEstado(e)}
                                    style={{
                                        ...styles.estadoBtn,
                                        border: `1.5px solid ${ESTADO_COLORS[e]}`,
                                        backgroundColor: estado === e ? ESTADO_COLORS[e] : 'transparent',
                                        color: estado === e ? 'white' : ESTADO_COLORS[e],
                                    }}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ ...styles.inputWrapper, gridColumn: '1 / -1' }}>
                        <label style={styles.inputLabel}>Colación nocturna:</label>
                        <button type="button" onClick={() => setRequiereColacionNocturna(v => !v)}
                            style={{
                                ...styles.estadoBtn, alignSelf: 'flex-start',
                                border: `1.5px solid ${requiereColacionNocturna ? '#0a3a8a' : '#999'}`,
                                backgroundColor: requiereColacionNocturna ? '#0a3a8a' : 'transparent',
                                color: requiereColacionNocturna ? 'white' : '#666',
                            }}>
                            {requiereColacionNocturna ? '✓ Requiere colación nocturna' : 'No requiere colación nocturna'}
                        </button>
                        <span style={{ fontSize: '11.5px', color: '#999' }}>
                            Define si este residente aparece en la tabla de colación nocturna del informe de turno noche en Novedades.
                        </span>
                    </div>
                </div>

                <h3 style={{ ...styles.sectionTitle, marginTop: '24px' }}>Información clínica</h3>

                <div style={{ marginBottom: '16px' }}>
                    {isEditing ? (
                        <span
                            onClick={() => navigate('/dashboard/calendario/nuevo', { state: { recurring: true, residentId: id } })}
                            style={{ color: '#888', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                            + Agregar actividad periódica para vincular al calendario
                        </span>
                    ) : (
                        <span style={{ color: '#bbb', fontSize: '13px' }}>
                            + Agregar actividad periódica para vincular al calendario (disponible después de guardar el residente)
                        </span>
                    )}
                </div>

                <div style={styles.inputWrapper}>
                    <label style={styles.inputLabel}>Diagnóstico principal:</label>
                    <input type="text" value={diagnostico} onChange={e => setDiagnostico(e.target.value)}
                        style={styles.formInput} placeholder="Ej: Demencia senil, HTA, DM2..." />
                </div>
                <div style={{ ...styles.inputWrapper, marginTop: '16px' }}>
                    <label style={styles.inputLabel}>Observaciones generales:</label>
                    <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                        rows={4} style={styles.formTextarea}
                        placeholder="Alergias, indicaciones especiales, antecedentes relevantes..." />
                </div>
            </div>

            {/* ── Medicamentos recetados (solo en edición) ── */}
            {isEditing && (
                <div style={styles.formPanel}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ ...styles.sectionTitle, margin: 0, border: 'none', paddingBottom: 0 }}>Medicamentos recetados</h3>
                        <button onClick={() => { setShowAddMed(true); if (allMeds.length === 0) api.get('/medications').then(r => setAllMeds(r.data)).catch(() => { }); }}
                            style={styles.addMedBtn}>
                            + Agregar medicamento
                        </button>
                    </div>
                    <div style={{ borderTop: '1px solid #e1e4e8', paddingTop: '16px' }}>
                        {prescriptions.length === 0 ? (
                            <p style={{ color: '#999', fontStyle: 'italic', margin: 0, fontSize: '14px' }}>
                                Sin medicamentos recetados. Agrega uno con el botón de arriba.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {prescriptions.map(presc => {
                                    const med = presc.medication;
                                    return (
                                        <div key={presc.id} style={styles.prescRow}>
                                            <div style={styles.prescIcon}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8">
                                                    <path d="m10.5 20.5-7-7a5 5 0 1 1 7-7l7 7a5 5 0 0 1-7 7Z" />
                                                    <path d="m8.5 8.5 7 7" />
                                                </svg>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={styles.prescName}>{med?.name ?? '—'}</span>
                                                    {(med?.dosage || med?.dosageUnit) && (
                                                        <span style={styles.prescDosis}>{med.dosage} {med.dosageUnit}</span>
                                                    )}
                                                    {presc.frequency && (
                                                        <span style={styles.prescFreq}>{presc.frequency}</span>
                                                    )}
                                                </div>
                                                {presc.instructions && (
                                                    <p style={styles.prescInstr}>{presc.instructions}</p>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                                <button onClick={() => handleRemovePresc(presc.id, med?.name ?? '')}
                                                    style={styles.removePrescBtn} title="Quitar de recetados">
                                                    Quitar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {isEditing && (
                <div style={styles.formPanel}>
                    <h3 style={styles.sectionTitle}>Procedimientos Clínicos y Eventos (Calendario)</h3>

                    <div style={{ paddingTop: '8px' }}>
                        {resEvents.length === 0 ? (
                            <p style={{ color: '#999', fontStyle: 'italic', margin: 0, fontSize: '14px' }}>
                                No hay procedimientos o eventos registrados para este residente en el calendario.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {groupResidentEvents(resEvents).map(({ first, last, isPeriodic, allCompleted, count, target }) => {
                                    const fechaInicio = formatFechaHora(new Date(first.startDate));
                                    const fechaLabel = isPeriodic
                                        ? (count > 1 ? `${fechaInicio} → ${formatFechaHora(new Date(last.startDate))} (${count} repeticiones)` : `Desde ${fechaInicio} (actividad periódica)`)
                                        : fechaInicio;
                                    return (
                                        <div key={first.recurrenceGroupId || first.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            backgroundColor: '#f8fafc', border: '1px solid #e1e4e8',
                                            borderRadius: '8px', padding: '12px 16px', fontSize: '14px', gap: '10px'
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#111' }}>{first.title}</span>
                                                    <span style={{
                                                        backgroundColor: '#f1f5f9', color: '#475569',
                                                        borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: 'bold'
                                                    }}>{first.type}</span>
                                                    {isPeriodic && (
                                                        <span style={{
                                                            backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
                                                            borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: 'bold'
                                                        }}>Periódica</span>
                                                    )}
                                                    {allCompleted && (
                                                        <span style={{
                                                            backgroundColor: '#d1fae5', color: '#065f46',
                                                            borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: 'bold'
                                                        }}>Completado</span>
                                                    )}
                                                </div>
                                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                                                    <strong>Fecha y Hora:</strong> {fechaLabel} {first.location ? `· Ubicación: ${first.location}` : ''}
                                                </p>
                                                {first.description && (
                                                    <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#444', fontStyle: 'italic' }}>
                                                        "{first.description}"
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => navigate(`/dashboard/calendario/${target.id}`)}
                                                style={{
                                                    backgroundColor: 'white', border: '1.5px solid #cbd5e1', color: '#475569',
                                                    borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                Ver / Editar
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modal: Agregar medicamento ── */}
            {showAddMed && (
                <div style={styles.backdrop} onClick={() => setShowAddMed(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, color: '#0a3a8a', fontSize: '18px' }}>Agregar medicamento recetado</h3>
                            <button onClick={() => setShowAddMed(false)} style={styles.closeBtn}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                            <div style={styles.mField}>
                                <label style={styles.mLabel}>Medicamento *</label>
                                <select value={selMedId} onChange={e => setSelMedId(e.target.value)} style={styles.mInput}>
                                    <option value="">— Seleccionar del inventario —</option>
                                    {allMeds.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}{m.dosage ? ` ${m.dosage}${m.dosageUnit ?? ''}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.mField}>
                                <label style={styles.mLabel}>Instrucciones de administración</label>
                                <textarea value={selInstructions} onChange={e => setSelInstructions(e.target.value)}
                                    rows={2} style={{ ...styles.mInput, resize: 'vertical' as const }}
                                    placeholder="Ej: 1 comprimido cada 8 horas con el desayuno" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={styles.mField}>
                                    <label style={styles.mLabel}>Frecuencia</label>
                                    <select value={selFrequency} onChange={e => {
                                        setSelFrequency(e.target.value);
                                        if (e.target.value !== 'Otro') setSelCustomFrequency('');
                                    }} style={styles.mInput}>
                                        <option value="">— Seleccionar —</option>
                                        {FRECUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div style={styles.mField}>
                                    <label style={styles.mLabel}>Fecha de inicio</label>
                                    <input type="date" value={selStartDate} onChange={e => setSelStartDate(e.target.value)} style={styles.mInput} />
                                </div>
                            </div>
                            {selFrequency === 'Otro' && (
                                <div style={styles.mField}>
                                    <label style={styles.mLabel}>Especifica cada cuánto se administra</label>
                                    <input type="text" value={selCustomFrequency} onChange={e => setSelCustomFrequency(e.target.value)}
                                        style={styles.mInput} placeholder="Ej: cada 6 horas, cada 4 horas" />
                                    <span style={{ fontSize: '11px', color: '#888' }}>
                                        Si escribes "cada N horas", Administración de Medicamentos generará automáticamente los horarios de dosis correspondientes.
                                    </span>
                                </div>
                            )}
                        </div>
                        <div style={styles.modalActions}>
                            <button onClick={() => setShowAddMed(false)} style={styles.cancelBtn}>Cancelar</button>
                            <button onClick={handleAddPrescription} disabled={savingPresc} style={styles.confirmBtn}>
                                {savingPresc ? 'Guardando...' : 'Agregar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.formActions}>
                <button onClick={() => navigate('/dashboard/residentes')} style={styles.secondaryButton}>Cancelar</button>
                <button onClick={handleSave} style={styles.saveButton}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Guardar
                </button>
            </div>
        </div>
    );
};

const styles = {
    moduleWrapper: { width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
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
    formPanel: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    },
    sectionTitle: { margin: '0 0 16px 0', fontSize: '16px', color: '#0a3a8a', fontWeight: 'bold' as const, borderBottom: '1px solid #e1e4e8', paddingBottom: '8px' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' },
    inputWrapper: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
    inputLabel: { fontSize: '14px', fontWeight: 'bold', color: '#444' },
    formInput: {
        padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #ccc',
        fontSize: '15px', outline: 'none', fontFamily: 'inherit',
    },
    rutDvBox: {
        padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #ccc',
        backgroundColor: '#f8f9fa', fontSize: '15px', fontWeight: 'bold' as const,
        color: '#0a3a8a', whiteSpace: 'nowrap' as const, flexShrink: 0,
    },
    formTextarea: {
        padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #ccc',
        fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' as const,
        width: '100%', boxSizing: 'border-box' as const,
    },
    toggleGroup: { display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #ccc' },
    toggleActive: {
        flex: 1, backgroundColor: '#0a3a8a', color: 'white', border: 'none',
        padding: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
    },
    toggleInactive: {
        flex: 1, backgroundColor: 'white', color: '#555', border: 'none',
        padding: '10px', cursor: 'pointer', fontSize: '14px',
    },
    estadoGroup: { display: 'flex', gap: '10px', flexWrap: 'wrap' as const },
    estadoBtn: {
        padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
        fontSize: '14px', fontWeight: '600' as const, transition: 'all 0.15s',
    },
    formActions: { display: 'flex', justifyContent: 'flex-end', gap: '15px', paddingBottom: '20px' },
    secondaryButton: {
        backgroundColor: 'transparent', border: '1px solid #ccc', color: '#555',
        padding: '8px 16px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer',
    },
    saveButton: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white', padding: '12px 24px',
        borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
        display: 'flex', alignItems: 'center', boxShadow: '0 4px 6px rgba(10,58,138,0.2)',
    },

    // ── Medicamentos recetados ──────────────────────────────────────────────
    addMedBtn: {
        backgroundColor: '#1a6b3a', color: 'white', border: 'none', borderRadius: '7px',
        padding: '8px 14px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
    },
    prescRow: {
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
        padding: '12px 14px',
    },
    prescIcon: {
        flexShrink: 0, width: '36px', height: '36px', borderRadius: '8px',
        backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #fed7aa',
    },
    prescName: { fontSize: '14px', fontWeight: 'bold' as const, color: '#1e293b' },
    prescDosis: {
        fontSize: '12px', backgroundColor: '#f0f9ff', color: '#0369a1',
        border: '1px solid #bae6fd', borderRadius: '12px', padding: '2px 8px',
    },
    prescFreq: {
        fontSize: '12px', backgroundColor: '#f0fdf4', color: '#166534',
        border: '1px solid #bbf7d0', borderRadius: '12px', padding: '2px 8px',
    },
    prescInstr: { margin: '4px 0 0', fontSize: '12px', color: '#475569', fontStyle: 'italic' as const },
    stockWarn: {
        fontSize: '11px', backgroundColor: '#fef2f2', color: '#991b1b',
        border: '1px solid #fecaca', borderRadius: '10px', padding: '1px 7px', fontWeight: '600' as const,
    },
    stockLow: {
        fontSize: '11px', backgroundColor: '#fffbeb', color: '#92400e',
        border: '1px solid #fde68a', borderRadius: '10px', padding: '1px 7px', fontWeight: '600' as const,
    },
    dispenseBtn: {
        backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px',
        padding: '6px 12px', fontSize: '12px', fontWeight: '600' as const, cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
    },
    removePrescBtn: {
        backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #fca5a5',
        borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
    },

    // ── Modales ─────────────────────────────────────────────────────────────
    backdrop: {
        position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    modal: {
        backgroundColor: 'white', borderRadius: '14px', padding: '24px 28px',
        width: '90%', maxWidth: '560px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        maxHeight: '90vh', overflowY: 'auto' as const,
    },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
    closeBtn: {
        background: 'none', border: 'none', fontSize: '18px', color: '#666', cursor: 'pointer',
        padding: '2px 6px', flexShrink: 0,
    },
    mField: { display: 'flex', flexDirection: 'column' as const, gap: '5px' },
    mLabel: { fontSize: '13px', fontWeight: 'bold' as const, color: '#444' },
    mInput: {
        padding: '9px 12px', borderRadius: '7px', border: '1.5px solid #ccc',
        fontSize: '14px', outline: 'none', fontFamily: 'inherit', width: '100%',
        boxSizing: 'border-box' as const,
    },
    cancelBtn: {
        backgroundColor: 'transparent', border: '1px solid #ccc', color: '#555',
        padding: '9px 18px', borderRadius: '7px', fontSize: '14px', cursor: 'pointer',
    },
    confirmBtn: {
        backgroundColor: '#0a3a8a', color: 'white', border: 'none',
        padding: '9px 20px', borderRadius: '7px', fontSize: '14px',
        fontWeight: '600' as const, cursor: 'pointer',
    },
};

export default ResidentesForm;
