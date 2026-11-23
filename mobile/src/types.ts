export type Role = 'admin' | 'TENS' | 'Enfermero' | 'cuidador';
export type Shift = 'dia' | 'noche';
export type Bed = 'A' | 'B';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}

export interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  rut: string | null;
  fechaNacimiento: string | null;
  room: number | null;
  bed: Bed | null;
  estado: string;
  requiereDesimpactacion: boolean;
  requiereColacionNocturna: boolean;
  diagnostico: string | null;
  observaciones: string | null;
}

export interface HygieneEntry {
  room: number;
  bed: string;
  aseoCavidades: boolean;
  corteCapilar: boolean;
  corteUnas: boolean;
  aseoBucal: boolean;
  cambioPanal: boolean;
  banoDucha: boolean;
  afeitado: boolean;
  lubricacion: boolean;
}

export interface FeedingEntry {
  room: number;
  bed: string;
  desayuno: number;
  merienda: number;
  almuerzo: number;
  once: number;
  cena: number;
  colacionNocturna: number | null;
}

export interface NightCareEntry {
  room: number;
  bed: string;
  ordenCloset: boolean;
  ordenCajasAseo: boolean;
  cambioSabanas: boolean;
  retiroBotellasHidratacion: boolean;
  lubricacionPiel: boolean;
  retiroOrinal: boolean;
  aseoOrinal: boolean;
}

export interface ShiftReport {
  id: string;
  date: string;
  shift: Shift;
  supervisor: string;
  caregivers: string | null;
  staff: string | null;
  incidents: any[];
  hygienes: HygieneEntry[];
  feedings: FeedingEntry[];
  nightCares: NightCareEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  senderRole: string;
  content: string;
  createdAt: string;
  pinned?: boolean;
  pinOrder?: number | null;
  pinnedBy?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  createdBy: string;
  priority: number;
  completed: boolean;
}

export type VisitLogType = 'visita' | 'salida';

export interface VisitLog {
  id: string;
  residentId: string;
  resident: Resident;
  type: VisitLogType;
  horaInicio: string;
  horaFin: string | null;
  personaNombre: string;
  personaRelacion: string | null;
  motivo: string | null;
  registradoPor: string;
  createdAt: string;
  updatedAt: string;
}

export type SupplyStatus = 'disponible' | 'poco' | 'falta';

export interface SupplyItem {
  id: string;
  name: string;
  status: SupplyStatus;
  note: string | null;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
