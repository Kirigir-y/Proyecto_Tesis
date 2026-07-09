export interface CalendarEventType {
    name: string;
    color: string;
}

export const CALENDAR_EVENT_TYPES: CalendarEventType[] = [
    { name: 'Retiro de medicamento', color: '#e67e22' },
    { name: 'Control Médico', color: '#1976d2' },
    { name: 'Retiro de Medicamentos Crónicos', color: '#db8744ff' },
    { name: 'Retiro de Medicamentos Psicotrópicos', color: '#8e24aa' },
    { name: 'Retiro PACAM', color: '#e91e63' },
    { name: 'Visitas de Instituciones', color: '#3c13b7ff' },
    { name: 'Horas para exámenes', color: '#2db3e8ff' },
    { name: 'Visitas Familiares', color: '#f7bc3fff' },
    { name: 'Otro', color: '#757575' },
];

export const getEventTypeColor = (typeName: string): string => {
    const found = CALENDAR_EVENT_TYPES.find(t => t.name === typeName);
    return found?.color || '#757575';
};

// Procedimientos periódicos comunes y de alta relevancia para personas mayores
// Colores suaves/desaturados para distinguirlos sin saturar la vista (incl. de noche)
export const PERIODIC_ACTIVITIES: CalendarEventType[] = [
    { name: 'Desimpactación Fecal Manual', color: '#bd7a72' },
    { name: 'Curación de Heridas / Úlceras', color: '#8aab6f' },
    { name: 'Cambio de Sonda Vesical', color: '#5fa3ad' },
    { name: 'Cambio de Sonda Nasogástrica', color: '#cdb35a' },
    { name: 'Control de Glicemia', color: '#a586bf' },
    { name: 'Control de Presión Arterial', color: '#d14a4aff' },
];

export const getPeriodicActivityColor = (typeName: string): string | null => {
    const found = PERIODIC_ACTIVITIES.find(a => a.name === typeName);
    return found?.color ?? null;
};

export const COMPLETED_COLOR = '#aadbacff';

export const getEventColor = (typeName: string, completed?: boolean): string => {
    if (completed) return COMPLETED_COLOR;
    return getPeriodicActivityColor(typeName) ?? getEventTypeColor(typeName);
};
