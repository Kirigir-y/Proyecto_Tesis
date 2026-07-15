import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 5000;

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
    error: { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '⚠' },
    success: { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: '✓' },
    info: { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', icon: 'ℹ' },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextId = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'error') => {
        const id = nextId.current++;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <style>{`
                @keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            <div style={styles.container}>
                {toasts.map(t => {
                    const s = TYPE_STYLES[t.type];
                    return (
                        <div key={t.id} style={{ ...styles.toast, backgroundColor: s.bg, border: `1.5px solid ${s.border}`, color: s.color }}>
                            <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1 }}>{s.icon}</span>
                            <span style={{ flex: 1 }}>{t.message}</span>
                            <button onClick={() => dismiss(t.id)} style={styles.closeBtn} aria-label="Cerrar mensaje">✕</button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextValue => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
    return ctx;
};

const styles = {
    container: {
        position: 'fixed' as const, top: '20px', right: '20px', zIndex: 3000,
        display: 'flex', flexDirection: 'column' as const, gap: '10px',
        maxWidth: '380px', width: 'calc(100% - 40px)',
    },
    toast: {
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        borderRadius: '10px', padding: '12px 14px', fontSize: '13.5px', fontWeight: 500,
        boxShadow: '0 10px 25px rgba(0,0,0,0.14)', animation: 'toast-in 0.18s ease-out',
    },
    closeBtn: {
        background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
        opacity: 0.6, fontSize: '13px', padding: 0, flexShrink: 0, lineHeight: 1,
    },
};
