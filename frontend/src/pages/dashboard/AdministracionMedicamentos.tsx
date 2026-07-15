import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';



interface Prescription {
    id: string;
    instructions: string;
    frequency: string;
    stock: number;
    medication: {
        id: string;
        name: string;
        presentation: string;
        dosage?: string;
        dosageUnit?: string;
        stock?: number;
    };
}

interface AdministrationLog {
    id: string;
    doseAdministered: number;
    dosageValue?: string;
    status: 'administrado' | 'rechazado' | 'omitido';
    administeredBy: string;
    notes: string;
    administeredAt: string;
    createdAt: string;
    prescription: {
        id: string;
        medication: {
            name: string;
        };
    };
}

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Los turnos empiezan a las 08:00. Antes de esa hora todavía es el turno noche que
// comenzó el día anterior, así que la columna "activa" de la grilla sigue siendo ayer.
const getShiftDateString = (date: Date) => {
    if (date.getHours() >= 8) return getLocalDateString(date);
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalDateString(yesterday);
};

const DOSE_PRESETS = [0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

export default function AdministracionMedicamentos() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
    const [allAdminLogs, setAllAdminLogs] = useState<AdministrationLog[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    const [referenceDate, setReferenceDate] = useState<Date>(new Date());
    const [slotDoses, setSlotDoses] = useState<Record<string, number>>({});
    const [hoveredExtraKey, setHoveredExtraKey] = useState<string | null>(null);
    const [tempExtraSlots, setTempExtraSlots] = useState<Record<string, Array<{ id: string; time: string; dose: number }>>>({});

    const addTempExtraSlot = (prescId: string, dateStr: string) => {
        const key = `${prescId}-${dateStr}`;
        const newSlot = {
            id: Math.random().toString(36).substring(2, 9),
            time: '',
            dose: 1
        };
        setTempExtraSlots(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), newSlot]
        }));
    };

    const adjustTempExtraDose = (key: string, slotId: string, step: number) => {
        setTempExtraSlots(prev => {
            const slots = prev[key] || [];
            const updated = slots.map(s => {
                if (s.id === slotId) {
                    const idx = DOSE_PRESETS.indexOf(s.dose);
                    let nextIdx = idx + step;
                    if (nextIdx >= 0 && nextIdx < DOSE_PRESETS.length) {
                        return { ...s, dose: DOSE_PRESETS[nextIdx] };
                    }
                }
                return s;
            });
            return { ...prev, [key]: updated };
        });
    };

    const updateTempExtraTime = (key: string, slotId: string, time: string) => {
        setTempExtraSlots(prev => {
            const slots = prev[key] || [];
            const updated = slots.map(s => {
                if (s.id === slotId) {
                    return { ...s, time };
                }
                return s;
            });
            return { ...prev, [key]: updated };
        });
    };

    const handleToggleOnTempExtra = async (prescription: Prescription, dateStr: string, slotTime: string, doseVal: number, key: string, slotId: string) => {
        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const adminDateTime = new Date(year, month - 1, day);
            const [hours, minutes] = slotTime.split(':');
            adminDateTime.setHours(parseInt(hours) || 0);
            adminDateTime.setMinutes(parseInt(minutes) || 0);

            const med = prescription.medication;
            const concentrationStr = med.dosage ? `${med.dosage} ${med.dosageUnit || ''}` : '';

            await api.post('/medications-administration', {
                residentMedicationId: prescription.id,
                doseAdministered: doseVal,
                dosageValue: concentrationStr,
                status: 'administrado',
                administeredAt: adminDateTime.toISOString(),
                notes: 'Registro rápido desde grilla'
            });

            // Remove from temp slots
            setTempExtraSlots(prev => {
                const slots = prev[key] || [];
                const updated = slots.filter(s => s.id !== slotId);
                return { ...prev, [key]: updated };
            });

            fetchAllData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Error al registrar administración.');
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = () => {
        setLoadingData(true);
        Promise.all([
            api.get('/residents/medications/inventory'),
            api.get('/medications-administration'),
        ])
            .then(([invRes, logsRes]) => {
                setAllPrescriptions(invRes.data);
                setAllAdminLogs(logsRes.data);
            })
            .catch(err => console.error("Error al cargar datos", err))
            .finally(() => setLoadingData(false));
    };

    const filteredPrescriptions = searchQuery.trim()
        ? allPrescriptions.filter((p: any) => {
            const name = `${p.resident?.firstName ?? ''} ${p.resident?.lastName ?? ''}`.toLowerCase();
            const rut = (p.resident?.rut ?? '').toLowerCase();
            const q = searchQuery.toLowerCase();
            return name.includes(q) || rut.includes(q);
        })
        : allPrescriptions;

    const grouped = Object.values(
        filteredPrescriptions.reduce((acc: any, p: any) => {
            const key = p.residentId;
            if (!acc[key]) acc[key] = { resident: p.resident, prescriptions: [] };
            acc[key].prescriptions.push(p);
            return acc;
        }, {})
    ) as Array<{ resident: any; prescriptions: Prescription[] }>;

    const getWeekDates = (refDate: Date) => {
        const dates = [];
        const temp = new Date(refDate);
        const day = temp.getDay();
        const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(temp.setDate(diff));

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(d);
        }
        return dates;
    };

    const weekDates = getWeekDates(referenceDate);

    const formatWeekRange = () => {
        const first = weekDates[0];
        const last = weekDates[6];
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
        return `Semana del ${first.toLocaleDateString('es-CL', options)} al ${last.toLocaleDateString('es-CL', { ...options, year: 'numeric' })}`;
    };

    const handlePrevWeek = () => {
        const nextDate = new Date(referenceDate);
        nextDate.setDate(nextDate.getDate() - 7);
        setReferenceDate(nextDate);
    };

    const handleNextWeek = () => {
        const nextDate = new Date(referenceDate);
        nextDate.setDate(nextDate.getDate() + 7);
        setReferenceDate(nextDate);
    };

    const handleCurrentWeek = () => {
        setReferenceDate(new Date());
    };

    const parseScheduledHours = (instructions: string, frequency: string): string[] => {
        const inst = instructions || '';
        const freq = frequency || '';
        const combined = `${inst} ${freq}`;

        const dashMatch = combined.match(/\b\d{1,2}(?:-\d{1,2})+\b/);
        if (dashMatch) {
            return dashMatch[0].split('-').map(h => `${h.padStart(2, '0')}:00`);
        }

        const timeRegex = /\b([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])\b/g;
        const times: string[] = [];
        let match;
        while ((match = timeRegex.exec(combined)) !== null) {
            times.push(`${match[1].padStart(2, '0')}:${match[2]}`);
        }
        if (times.length > 0) {
            return times.sort();
        }

        // Frecuencia personalizada ("Otro" en el formulario de Residente), ej: "cada 6 horas".
        // Los turnos empiezan a las 08:00, así que no se generan horarios antes de esa hora
        // (si el intervalo daría una toma de madrugada, se registra como dosis "Extra" en vez
        // de aparecer como horario fijo de la grilla).
        const customHourMatch = combined.toLowerCase().match(/cada\s+(\d{1,2})\s*h/);
        if (customHourMatch) {
            const interval = parseInt(customHourMatch[1], 10);
            if (interval > 0 && interval <= 24) {
                const slots: string[] = [];
                for (let h = 8; h < 8 + 24; h += interval) {
                    const hourOfDay = h % 24;
                    if (hourOfDay >= 8) slots.push(`${hourOfDay.toString().padStart(2, '0')}:00`);
                }
                return Array.from(new Set(slots)).sort();
            }
        }

        const f = freq.toLowerCase();
        if (f.includes('c/8h')) {
            return ['08:00', '16:00', '22:00'];
        } else if (f.includes('c/12h')) {
            return ['08:00', '20:00'];
        } else if (f.includes('c/24h') || f.includes('diario')) {
            const singleHour = inst.match(/a\s+las\s+(\d{1,2})/i) || inst.match(/en\s+la\s+mañana\s+(\d{1,2})/i);
            if (singleHour) {
                return [`${singleHour[1].padStart(2, '0')}:00`];
            }
            return ['09:00'];
        } else if (f.includes('s/n') || f.includes('sos') || f.includes('necesario')) {
            return [];
        }

        return ['09:00'];
    };

    const formatDose = (val: number) => {
        if (val === 0.2) return '1/5';
        if (val === 0.25) return '1/4';
        if (val === 0.5) return '1/2';
        if (val === 0.75) return '3/4';
        return String(val);
    };

    const getDoseValue = (key: string) => {
        return slotDoses[key] !== undefined ? slotDoses[key] : 1;
    };

    const adjustDose = (key: string, step: number) => {
        const current = getDoseValue(key);
        const idx = DOSE_PRESETS.indexOf(current);
        let nextIdx = idx + step;
        if (nextIdx >= 0 && nextIdx < DOSE_PRESETS.length) {
            setSlotDoses(prev => ({ ...prev, [key]: DOSE_PRESETS[nextIdx] }));
        }
    };

    const handleToggleOn = async (prescription: Prescription, dateStr: string, slotTime: string | null, doseVal: number) => {
        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const adminDateTime = new Date(year, month - 1, day);
            if (slotTime) {
                const [hours, minutes] = slotTime.split(':');
                adminDateTime.setHours(parseInt(hours) || 0);
                adminDateTime.setMinutes(parseInt(minutes) || 0);
            } else {
                const now = new Date();
                adminDateTime.setHours(now.getHours());
                adminDateTime.setMinutes(now.getMinutes());
            }

            const med = prescription.medication;
            const concentrationStr = med.dosage ? `${med.dosage} ${med.dosageUnit || ''}` : '';

            await api.post('/medications-administration', {
                residentMedicationId: prescription.id,
                doseAdministered: doseVal,
                dosageValue: concentrationStr,
                status: 'administrado',
                administeredAt: adminDateTime.toISOString(),
                notes: 'Registro rápido desde grilla'
            });

            fetchAllData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Error al registrar administración.');
        }
    };

    const getLogsForCell = (prescriptionId: string, dateStr: string) => {
        return allAdminLogs.filter(log => {
            if (log.prescription?.id !== prescriptionId) return false;
            const logDate = getLocalDateString(new Date(log.administeredAt));
            return logDate === dateStr;
        });
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                    Volver
                </button>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '200px' }}>
                    <h2 style={styles.title}>Administración de Medicamentos</h2>
                </div>
                <div style={{ width: '90px' }} />
            </div>

            {/* Buscador de Residente */}
            <div style={styles.searchBox}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input 
                    type="text" 
                    placeholder="Buscar residente por nombre o RUT para ver su administración de medicamentos..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            {/* Navegación Semanal */}
            <div className="adm-week-nav" style={styles.weekNav}>
                <button onClick={handlePrevWeek} style={styles.navBtn}>
                    ← Semana Anterior
                </button>
                <span style={styles.weekTitle}>{formatWeekRange()}</span>
                <div className="adm-week-btns" style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleCurrentWeek} style={styles.navBtnSecundario}>
                        Semana Actual
                    </button>
                    <button onClick={handleNextWeek} style={styles.navBtn}>
                        Semana Siguiente →
                    </button>
                </div>
            </div>

            {/* Listado de Grillas agrupadas por Residente (Estilo limpio como inventario) */}
            {loadingData ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando...</p>
            ) : grouped.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No hay medicamentos activos para mostrar.</p>
            ) : (
                grouped.map(({ resident, prescriptions }) => {
                    const avatarInitials = `${resident?.firstName?.[0] ?? ''}${resident?.lastName?.[0] ?? ''}`.toUpperCase();
                    return (
                        <div key={resident?.id ?? 'unknown'} style={styles.residentCard}>
                            {/* Cabecera limpia del Residente */}
                            <div style={styles.residentCardHeader}>
                                <div style={styles.residentAvatar}>
                                    {avatarInitials}
                                </div>
                                <div>
                                    <h4 style={styles.residentName}>{resident?.firstName} {resident?.lastName}</h4>
                                    <p style={styles.residentMeta}>
                                        Hab. {resident?.room} · Cama {resident?.bed}
                                    </p>
                                </div>
                                <div style={styles.medCount}>
                                    {prescriptions.length} {prescriptions.length === 1 ? 'medicamento' : 'medicamentos'}
                                </div>
                            </div>

                            {/* Tabla limpia semanal */}
                            <div style={styles.tableScroll}>
                                <table style={styles.table}>
                                    <thead style={styles.thead}>
                                        <tr>
                                            <th style={{ ...styles.th, width: '25%' }}>Medicamento</th>
                                            {weekDates.map((date, idx) => {
                                                const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                                                const dayLabel = days[idx];
                                                const dayNum = date.getDate().toString().padStart(2, '0');
                                                const monthNum = (date.getMonth() + 1).toString().padStart(2, '0');
                                                const isToday = getShiftDateString(new Date()) === getLocalDateString(date);

                                                return (
                                                    <th key={idx} style={{
                                                        ...styles.th,
                                                        textAlign: 'center',
                                                        backgroundColor: isToday ? '#e6f0ff' : 'transparent',
                                                        color: isToday ? '#0a3a8a' : '#000000',
                                                        borderBottom: isToday ? '2px solid #0a3a8a' : '1.5px solid #cbd5e1',
                                                        width: '10%'
                                                    }}>
                                                        <div>{dayLabel}</div>
                                                        <div style={styles.thDate}>{dayNum}/{monthNum}</div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prescriptions.map((presc, pIdx) => {
                                            const med = presc.medication;
                                            const scheduledHours = parseScheduledHours(presc.instructions, presc.frequency);
                                            const isSOS = scheduledHours.length === 0;
                                            const rowBg = pIdx % 2 === 0 ? 'white' : '#fafbfc';

                                            return (
                                                <tr key={presc.id} style={{ ...styles.tr, backgroundColor: rowBg }}>
                                                    {/* Celda de Medicamento */}
                                                    <td style={styles.medCell}>
                                                        <div style={styles.medName}>
                                                            {med.name}
                                                            <span style={styles.badge}>{med.presentation}</span>
                                                        </div>
                                                        <div style={styles.medInstr}>
                                                            <strong>Inst: </strong>{presc.instructions || 'Sin instrucciones adicionales'}
                                                        </div>
                                                        <div style={styles.medMeta}>
                                                            <span>Freq: {presc.frequency}</span>
                                                            <div style={{ marginTop: '4px' }}>
                                                                <span>Cápsulas: </span>
                                                                <strong style={{ color: presc.stock <= 2 ? '#991b1b' : '#065f46' }}>{presc.stock}</strong>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Celdas de los Días */}
                                                    {weekDates.map((date, idx) => {
                                                        const dateStr = getLocalDateString(date);
                                                        const cellLogs = getLogsForCell(presc.id, dateStr);
                                                        const isToday = getShiftDateString(new Date()) === getLocalDateString(date);
                                                        const cellKey = `${presc.id}-${dateStr}`;

                                                        const renderedSlots = scheduledHours.map(slotTime => {
                                                            const matchedLog = cellLogs.find(log => {
                                                                const logTime = new Date(log.administeredAt);
                                                                const [sh, sm] = slotTime.split(':').map(Number);
                                                                const slotMinutes = sh * 60 + sm;
                                                                const logMinutes = logTime.getHours() * 60 + logTime.getMinutes();
                                                                return Math.abs(slotMinutes - logMinutes) <= 150;
                                                            });

                                                            return {
                                                                time: slotTime,
                                                                log: matchedLog,
                                                            };
                                                        });

                                                        const extraLogs = cellLogs.filter(log => {
                                                            return !renderedSlots.some(slot => slot.log?.id === log.id);
                                                        });

                                                        const currentTempSlots = tempExtraSlots[cellKey] || [];

                                                        return (
                                                            <td key={idx} style={styles.dayCell}>
                                                                <div style={styles.slotContainer}>
                                                                    {!isSOS && renderedSlots.map((slot, sIdx) => {
                                                                        const key = `${presc.id}-${dateStr}-${slot.time}`;
                                                                        const currentDose = getDoseValue(key);

                                                                        if (slot.log) {
                                                                            const log = slot.log;
                                                                            return (
                                                                                <div
                                                                                    key={sIdx}
                                                                                    style={{ ...styles.badgeBase, ...styles.badgeAdministrado }}
                                                                                    title={`Administrado por: ${log.administeredBy}`}
                                                                                >
                                                                                    ✓ {slot.time} ({formatDose(log.doseAdministered)})
                                                                                </div>
                                                                            );
                                                                        } else {
                                                                            return (
                                                                                <div key={sIdx} style={{ ...styles.stepperRow, opacity: isToday ? 1 : 0.5 }}>
                                                                                    <div style={styles.stepper}>
                                                                                        <button disabled={!isToday} onClick={() => adjustDose(key, -1)} style={{ ...styles.stepBtn, cursor: isToday ? 'pointer' : 'not-allowed' }}>-</button>
                                                                                        <span style={styles.stepValue}>{formatDose(currentDose)}</span>
                                                                                        <button disabled={!isToday} onClick={() => adjustDose(key, 1)} style={{ ...styles.stepBtn, cursor: isToday ? 'pointer' : 'not-allowed' }}>+</button>
                                                                                    </div>
                                                                                    <button
                                                                                        disabled={!isToday}
                                                                                        onClick={() => handleToggleOn(presc, dateStr, slot.time, currentDose)}
                                                                                        style={{
                                                                                            ...styles.badgeBase,
                                                                                            ...styles.badgePendiente,
                                                                                            cursor: isToday ? 'pointer' : 'not-allowed'
                                                                                        }}
                                                                                    >
                                                                                        + {slot.time}
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        }
                                                                    })}

                                                                    {extraLogs.map((log, eIdx) => {
                                                                        const logTimeFormatted = new Date(log.administeredAt).toLocaleTimeString('es-CL', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        });

                                                                        return (
                                                                            <div
                                                                                key={`extra-${eIdx}`}
                                                                                style={{ ...styles.badgeBase, ...styles.badgeAdministrado }}
                                                                                title={`Administrado por: ${log.administeredBy}`}
                                                                            >
                                                                                ✓ {logTimeFormatted} ({formatDose(log.doseAdministered)}) (E)
                                                                            </div>
                                                                        );
                                                                    })}

                                                                    {/* Temporary Extra Slots */}
                                                                    {currentTempSlots.map((tempSlot) => {
                                                                        return (
                                                                            <div key={tempSlot.id} style={styles.stepperRow}>
                                                                                <input
                                                                                    type="time"
                                                                                    value={tempSlot.time}
                                                                                    onChange={(e) => updateTempExtraTime(cellKey, tempSlot.id, e.target.value)}
                                                                                    style={{
                                                                                        padding: '3px 5px',
                                                                                        fontSize: '11px',
                                                                                        border: '1px solid #cbd5e1',
                                                                                        borderRadius: '6px',
                                                                                        width: '75px',
                                                                                        height: '28px',
                                                                                        boxSizing: 'border-box'
                                                                                    }}
                                                                                />
                                                                                <div style={styles.stepper}>
                                                                                    <button onClick={() => adjustTempExtraDose(cellKey, tempSlot.id, -1)} style={styles.stepBtn}>-</button>
                                                                                    <span style={styles.stepValue}>{formatDose(tempSlot.dose)}</span>
                                                                                    <button onClick={() => adjustTempExtraDose(cellKey, tempSlot.id, 1)} style={styles.stepBtn}>+</button>
                                                                                </div>
                                                                                <button
                                                                                    disabled={!tempSlot.time}
                                                                                    onClick={() => handleToggleOnTempExtra(presc, dateStr, tempSlot.time, tempSlot.dose, cellKey, tempSlot.id)}
                                                                                    style={{
                                                                                        ...styles.badgeBase,
                                                                                        ...(tempSlot.time ? styles.badgePendiente : { ...styles.badgePendiente, opacity: 0.5, cursor: 'not-allowed' }),
                                                                                        flex: 'none',
                                                                                        width: 'auto',
                                                                                        padding: '0 8px'
                                                                                    }}
                                                                                >
                                                                                    ✓ Listo
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}

                                                                    {isSOS && (
                                                                        <div style={{ ...styles.stepperRow, opacity: isToday ? 1 : 0.5 }}>
                                                                            <div style={styles.stepper}>
                                                                                <button disabled={!isToday} onClick={() => adjustDose(`${presc.id}-${dateStr}-sos`, -1)} style={{ ...styles.stepBtn, cursor: isToday ? 'pointer' : 'not-allowed' }}>-</button>
                                                                                <span style={styles.stepValue}>{formatDose(getDoseValue(`${presc.id}-${dateStr}-sos`))}</span>
                                                                                <button disabled={!isToday} onClick={() => adjustDose(`${presc.id}-${dateStr}-sos`, 1)} style={{ ...styles.stepBtn, cursor: isToday ? 'pointer' : 'not-allowed' }}>+</button>
                                                                            </div>
                                                                            <button
                                                                                disabled={!isToday}
                                                                                onClick={() => handleToggleOn(presc, dateStr, null, getDoseValue(`${presc.id}-${dateStr}-sos`))}
                                                                                style={{
                                                                                    ...styles.sosButton,
                                                                                    cursor: isToday ? 'pointer' : 'not-allowed'
                                                                                }}
                                                                            >
                                                                                + SOS
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {!isSOS && (
                                                                        <div style={{ ...styles.stepperRow, opacity: isToday ? 1 : 0.5 }}>
                                                                            <div style={styles.stepper}>
                                                                                <button disabled={!isToday} onClick={() => adjustDose(`${presc.id}-${dateStr}-extra`, -1)} style={{ ...styles.stepBtn, cursor: isToday ? 'pointer' : 'not-allowed' }}>-</button>
                                                                                <span style={styles.stepValue}>{formatDose(getDoseValue(`${presc.id}-${dateStr}-extra`))}</span>
                                                                                <button disabled={!isToday} onClick={() => adjustDose(`${presc.id}-${dateStr}-extra`, 1)} style={{ ...styles.stepBtn, cursor: isToday ? 'pointer' : 'not-allowed' }}>+</button>
                                                                            </div>
                                                                            <button
                                                                                disabled={!isToday}
                                                                                onClick={() => addTempExtraSlot(presc.id, dateStr)}
                                                                                style={{
                                                                                    ...styles.sosButton,
                                                                                    cursor: isToday ? 'pointer' : 'not-allowed',
                                                                                    backgroundColor: (isToday && hoveredExtraKey === `${presc.id}-${dateStr}-extra`) ? '#e0f2fe' : '#f8fafc',
                                                                                    borderColor: (isToday && hoveredExtraKey === `${presc.id}-${dateStr}-extra`) ? '#7dd3fc' : '#cbd5e1',
                                                                                    color: (isToday && hoveredExtraKey === `${presc.id}-${dateStr}-extra`) ? '#0369a1' : '#475569'
                                                                                }}
                                                                                onMouseEnter={() => isToday && setHoveredExtraKey(`${presc.id}-${dateStr}-extra`)}
                                                                                onMouseLeave={() => isToday && setHoveredExtraKey(null)}
                                                                            >
                                                                                + Extra
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

const styles = {
    container: { width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
    
    header: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '2px solid #e1e4e8', 
        paddingBottom: '15px', 
        flexWrap: 'wrap' as const, 
        gap: '15px' 
    },
    backBtn: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333', padding: '8px 14px',
        borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        fontWeight: '600' as const, transition: 'background-color 0.2s',
    },
    title: { margin: 0, fontSize: '22px', color: '#0a3a8a', fontWeight: 'bold' },

    searchBox: {
        display: 'flex', alignItems: 'center', gap: '8px',
        backgroundColor: 'white', border: '1.5px solid #cbd5e1', borderRadius: '8px',
        padding: '9px 14px',
    },
    searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', fontFamily: 'inherit' },

    weekNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' },
    navBtn: {
        backgroundColor: 'white', border: '1.5px solid #cbd5e1', borderRadius: '8px',
        padding: '8px 16px', fontSize: '14px', fontWeight: '600' as const, cursor: 'pointer',
        color: '#334155', transition: 'all 0.15s'
    },
    navBtnSecundario: {
        backgroundColor: '#e1e4e8', border: 'none', borderRadius: '8px',
        padding: '8px 16px', fontSize: '14px', fontWeight: '600' as const, cursor: 'pointer',
        color: '#333', transition: 'all 0.15s'
    },
    weekTitle: { fontSize: '16px', fontWeight: 'bold' as const, color: '#0f172a' },
    
    // Tarjeta de residente (Estilo limpio como inventario)
    residentCard: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: '24px'
    },
    residentCardHeader: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 20px', backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e1e4e8',
    },
    residentAvatar: {
        width: '38px', height: '38px', borderRadius: '50%',
        backgroundColor: '#0a3a8a', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: 'bold' as const, flexShrink: 0,
    },
    residentName: { margin: 0, fontSize: '15px', fontWeight: 'bold' as const, color: '#000000' },
    residentMeta: { margin: '2px 0 0', fontSize: '12px', color: '#374151', fontWeight: '500' },
    medCount: {
        marginLeft: 'auto', fontSize: '12px', color: '#0a3a8a',
        backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: '12px', padding: '2px 10px', fontWeight: '600' as const,
    },

    // Tabla con diseño alineado
    tableScroll: { width: '100%', overflowX: 'auto' as const },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    thead: { backgroundColor: '#f8f9fa' },
    th: {
        padding: '11px 14px', fontSize: '12px',
        fontWeight: '800' as const, color: '#000000', borderBottom: '1.5px solid #cbd5e1',
        whiteSpace: 'nowrap' as const
    },
    thDate: { fontSize: '11px', color: '#666', marginTop: '2px', fontWeight: 'normal' as const },
    tr: { borderBottom: '2px solid #cbd5e1', transition: 'background-color 0.1s' },
    td: { padding: '12px 14px', verticalAlign: 'top' as const },
    
    medCell: { padding: '12px 14px 12px 18px', minWidth: '260px', verticalAlign: 'top' as const },
    medName: { fontWeight: '700' as const, color: '#000000', fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '6px' },
    badge: { fontSize: '11px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' as const },
    medInstr: { fontSize: '12px', color: '#374151', marginTop: '6px', fontStyle: 'italic' as const, lineHeight: '1.4' },
    medMeta: { fontSize: '12px', color: '#374151', marginTop: '8px', fontWeight: '500' },
    dayCell: { padding: '8px', minWidth: '150px', verticalAlign: 'top' as const, borderLeft: '1px solid #e2e8f0' },
    slotContainer: { display: 'flex', flexDirection: 'column' as const, gap: '8px', alignItems: 'stretch' },
    
    stepperRow: { display: 'flex', alignItems: 'center', gap: '6px' },
    stepper: {
        display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px',
        backgroundColor: '#f8fafc', overflow: 'hidden', height: '28px', flexShrink: 0
    },
    stepBtn: {
        border: 'none', background: 'none', width: '22px', height: '100%', fontSize: '12px',
        fontWeight: 'bold', cursor: 'pointer', color: '#475569', display: 'flex',
        alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.1s'
    },
    stepValue: {
        fontSize: '11px', fontWeight: 'bold' as const, color: '#1e293b', width: '24px',
        textAlign: 'center' as const
    },

    badgeBase: {
        padding: '6px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' as const,
        cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '4px', textDecoration: 'none', flex: 1, boxSizing: 'border-box' as const, transition: 'all 0.1s ease',
        height: '28px'
    },
    badgePendiente: {
        backgroundColor: 'white', border: '1.5px dashed #cbd5e1', color: '#64748b'
    },
    badgeAdministrado: {
        backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', width: '100%', cursor: 'default'
    },
    sosButton: {
        backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '6px',
        padding: '5px 8px', fontSize: '11px', color: '#475569', cursor: 'pointer',
        fontWeight: 'bold' as const, transition: 'all 0.15s', height: '28px', flex: 1
    }
};
