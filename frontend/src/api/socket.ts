import { io } from 'socket.io-client';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '') || window.location.origin;

export type ShiftReportUpdatedEvent = { id: string; date: string; shift: 'dia' | 'noche'; changedBy?: string };

export const connectShiftReportsSocket = (onUpdated: (evt: ShiftReportUpdatedEvent) => void) => {
    const socket = io(`${SOCKET_URL}/shift-reports`, { auth: { token: localStorage.getItem('token') } });
    socket.on('shift-report:updated', onUpdated);
    return () => { socket.disconnect(); };
};
