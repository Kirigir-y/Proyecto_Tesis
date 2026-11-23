import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { io } from 'socket.io-client';
import api from '../api/client';
import { getAuthToken } from '../api/authToken';
import { getSocketUrl } from '../config';
import { getCurrentShiftInfo } from '../utils/shift';
import { useAuth } from './AuthContext';
import type { FeedingEntry, HygieneEntry, NightCareEntry, Resident, Shift, ShiftReport } from '../types';

const SHIFT_CHECK_INTERVAL_MS = 30_000;

const emptyHygiene = (room: number, bed: string): HygieneEntry => ({
  room, bed,
  aseoCavidades: false, corteCapilar: false, corteUnas: false, aseoBucal: false,
  cambioPanal: false, banoDucha: false, afeitado: false, lubricacion: false,
});

const emptyFeeding = (room: number, bed: string): FeedingEntry => ({
  room, bed, desayuno: 100, merienda: 100, almuerzo: 100, once: 100, cena: 100, colacionNocturna: null,
});

const emptyNightCare = (room: number, bed: string): NightCareEntry => ({
  room, bed,
  ordenCloset: false, ordenCajasAseo: false, cambioSabanas: false,
  retiroBotellasHidratacion: false, lubricacionPiel: false, retiroOrinal: false, aseoOrinal: false,
});

interface TurnoContextValue {
  date: string;
  shift: Shift;
  shiftPending: boolean;
  supervisor: string;
  caregivers: string;
  staff: string;
  reportId: string | null;
  residents: Resident[];
  hygienes: HygieneEntry[];
  feedings: FeedingEntry[];
  nightCares: NightCareEntry[];
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  loadAll: () => Promise<void>;
  getHygiene: (room: number, bed: string) => HygieneEntry;
  getFeeding: (room: number, bed: string) => FeedingEntry;
  getNightCare: (room: number, bed: string) => NightCareEntry;
  toggleHygiene: (room: number, bed: string, field: keyof HygieneEntry) => void;
  toggleNightCare: (room: number, bed: string, field: keyof NightCareEntry) => void;
  setFeedingValue: (room: number, bed: string, field: keyof FeedingEntry, value: number | null) => void;
  saveReport: () => Promise<void>;
  residentAt: (room: number, bed: string) => Resident | undefined;
}

const TurnoContext = createContext<TurnoContextValue | null>(null);

export const TurnoProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [date, setDate] = useState(() => getCurrentShiftInfo().date);
  const [shift, setShift] = useState<Shift>(() => getCurrentShiftInfo().shift);
  const [shiftPending, setShiftPending] = useState(false);
  const [supervisor, setSupervisor] = useState(user?.username || '');
  const [caregivers, setCaregivers] = useState('');
  const [staff, setStaff] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [hygienes, setHygienes] = useState<HygieneEntry[]>([]);
  const [feedings, setFeedings] = useState<FeedingEntry[]>([]);
  const [nightCares, setNightCares] = useState<NightCareEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadResidents = useCallback(async () => {
    try {
      const res = await api.get<Resident[]>('/residents');
      setResidents(res.data);
    } catch {
    }
  }, []);

  const loadReport = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get<ShiftReport | ''>('/shift-reports/by-date', { params: { date, shift } });
      const report = res.data as ShiftReport | null | '';
      if (report && (report as ShiftReport).id) {
        const r = report as ShiftReport;
        setReportId(r.id);
        setSupervisor(r.supervisor);
        setCaregivers(r.caregivers || '');
        setStaff(r.staff || '');
        setHygienes(r.hygienes || []);
        setFeedings(r.feedings || []);
        setNightCares(r.nightCares || []);
      } else {
        setReportId(null);
        setSupervisor(user?.username || '');
        setCaregivers('');
        setStaff('');
        setHygienes([]);
        setFeedings([]);
        setNightCares([]);
      }
      setDirty(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [date, shift, user?.username]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadResidents(), loadReport()]);
  }, [loadResidents, loadReport]);

  useEffect(() => { loadReport(); }, [date, shift]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadResidents(); }, [loadResidents]);

  const syncShift = useCallback(() => {
    const current = getCurrentShiftInfo();
    if (current.date === date && current.shift === shift) {
      setShiftPending(false);
      return;
    }
    if (dirty) {
      setShiftPending(true);
      return;
    }
    setShiftPending(false);
    setDate(current.date);
    setShift(current.shift);
  }, [date, shift, dirty]);

  useEffect(() => {
    syncShift();
    const interval = setInterval(syncShift, SHIFT_CHECK_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncShift();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [syncShift]);

  const currentRef = useRef({ date, shift, dirty, loadReport });
  currentRef.current = { date, shift, dirty, loadReport };

  useEffect(() => {
    const socket = io(`${getSocketUrl()}/shift-reports`, { auth: { token: getAuthToken() } });
    socket.on('shift-report:updated', (evt: { date: string; shift: Shift; changedBy?: string }) => {
      const cur = currentRef.current;
      if (evt.date !== cur.date || evt.shift !== cur.shift) return;
      if (evt.changedBy && evt.changedBy === user?.username) return;
      if (!cur.dirty) {
        cur.loadReport(true);
        return;
      }
      Alert.alert(
        'Informe actualizado',
        `${evt.changedBy || 'Otra persona'} modificó este informe desde la plataforma. ¿Recargar? Se perderán tus cambios sin guardar.`,
        [
          { text: 'Más tarde', style: 'cancel' },
          { text: 'Recargar', style: 'destructive', onPress: () => currentRef.current.loadReport(true) },
        ],
      );
    });
    return () => { socket.disconnect(); };
  }, [user?.username]);

  const residentAt = useCallback(
    (room: number, bed: string) => residents.find((r) => r.room === room && r.bed === bed),
    [residents],
  );

  const getHygiene = useCallback(
    (room: number, bed: string) => hygienes.find((h) => h.room === room && h.bed === bed) || emptyHygiene(room, bed),
    [hygienes],
  );
  const getFeeding = useCallback(
    (room: number, bed: string) => feedings.find((f) => f.room === room && f.bed === bed) || emptyFeeding(room, bed),
    [feedings],
  );
  const getNightCare = useCallback(
    (room: number, bed: string) => nightCares.find((n) => n.room === room && n.bed === bed) || emptyNightCare(room, bed),
    [nightCares],
  );

  const toggleHygiene = useCallback((room: number, bed: string, field: keyof HygieneEntry) => {
    setHygienes((prev) => {
      const idx = prev.findIndex((h) => h.room === room && h.bed === bed);
      if (idx === -1) {
        const entry = emptyHygiene(room, bed);
        (entry as any)[field] = true;
        return [...prev, entry];
      }
      const updated = [...prev];
      const entry = { ...updated[idx] };
      (entry as any)[field] = !(entry as any)[field];
      updated[idx] = entry;
      return updated;
    });
    setDirty(true);
  }, []);

  const toggleNightCare = useCallback((room: number, bed: string, field: keyof NightCareEntry) => {
    setNightCares((prev) => {
      const idx = prev.findIndex((n) => n.room === room && n.bed === bed);
      if (idx === -1) {
        const entry = emptyNightCare(room, bed);
        (entry as any)[field] = true;
        return [...prev, entry];
      }
      const updated = [...prev];
      const entry = { ...updated[idx] };
      (entry as any)[field] = !(entry as any)[field];
      updated[idx] = entry;
      return updated;
    });
    setDirty(true);
  }, []);

  const setFeedingValue = useCallback((room: number, bed: string, field: keyof FeedingEntry, value: number | null) => {
    setFeedings((prev) => {
      const idx = prev.findIndex((f) => f.room === room && f.bed === bed);
      if (idx === -1) {
        const entry = emptyFeeding(room, bed);
        (entry as any)[field] = value;
        return [...prev, entry];
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
    setDirty(true);
  }, []);

  const saveReport = useCallback(async () => {
    setSaving(true);
    try {
      const payload = { date, shift, supervisor, caregivers, staff, hygienes, feedings, nightCares };
      const res = await api.post<ShiftReport>('/shift-reports', payload);
      setReportId(res.data.id);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [date, shift, supervisor, caregivers, staff, hygienes, feedings, nightCares]);

  return (
    <TurnoContext.Provider
      value={{
        date, shift, shiftPending,
        supervisor, caregivers, staff,
        reportId, residents, hygienes, feedings, nightCares,
        loading, saving, dirty,
        loadAll, getHygiene, getFeeding, getNightCare,
        toggleHygiene, toggleNightCare, setFeedingValue, saveReport, residentAt,
      }}
    >
      {children}
    </TurnoContext.Provider>
  );
};

export const useTurno = (): TurnoContextValue => {
  const ctx = useContext(TurnoContext);
  if (!ctx) throw new Error('useTurno debe usarse dentro de <TurnoProvider>');
  return ctx;
};
