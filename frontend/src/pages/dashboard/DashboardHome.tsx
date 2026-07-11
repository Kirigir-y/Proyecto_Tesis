import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { DashboardContext } from './DashboardLayout';
import api from '../../api/axios';
import { countUnread } from '../../utils/reportReadTracker';

const DashboardHome = () => {
    const { user } = useOutletContext<DashboardContext>();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        api.get('/shift-reports')
            .then(res => setUnreadCount(countUnread(res.data, user.id)))
            .catch(() => { });
    }, [user.id]);

    return (
        <div style={styles.grid}>
            {/* ── Novedades — con badge estilo WhatsApp ── */}
            <div style={{ ...styles.card, position: 'relative' }} onClick={() => navigate('/dashboard/novedades')}>
                {unreadCount > 0 && (
                    <div style={styles.waBadge} title={`${unreadCount} informe(s) nuevo(s) o actualizado(s)`}>
                        {/* Ícono de chat (burbuja de mensaje) */}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                        <span style={{ marginLeft: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                            {unreadCount}
                        </span>
                    </div>
                )}
                <div style={styles.iconContainer}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#005bbb" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H5v-2h6v2zm0-4H5v-2h6v2zm8-4H5V7h14v2zm0 8h-6v-6h6v6z" />
                    </svg>
                </div>
                <h3 style={styles.cardTitle}>Novedades</h3>
                {unreadCount > 0 && (
                    <p style={styles.cardSubtitle}>
                        {unreadCount} informe{unreadCount > 1 ? 's' : ''} sin revisar
                    </p>
                )}
            </div>

            <div style={styles.card} onClick={() => navigate('/dashboard/calendario')}>
                <div style={styles.iconContainer}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#d9534f" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" />
                    </svg>
                </div>
                <h3 style={styles.cardTitle}>Calendario</h3>
            </div>

            {(user.role === 'admin' || user.role === 'TENS' || user.role === 'Enfermero') && (
                <div style={styles.card} onClick={() => navigate('/dashboard/residentes')}>
                    <div style={styles.iconContainer}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="#5cb85c" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            <path d="M16 11V8h2v3h3v2h-3v3h-2v-3h-3v-2h3z" fill="#f0ad4e" />
                        </svg>
                    </div>
                    <h3 style={styles.cardTitle}>Ficha de residentes</h3>
                </div>
            )}

            {(user.role === 'TENS' || user.role === 'admin') && (
                <div style={styles.card} onClick={() => navigate('/dashboard/administracion')}>
                    <div style={styles.iconContainer}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="#f0ad4e" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="#e74c3c" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', opacity: 0.8 }}>
                            <path d="M6 10.5C6 8.01472 8.01472 6 10.5 6h3C15.9853 6 18 8.01472 18 10.5v3C18 15.9853 15.9853 18 13.5 18h-3C8.01472 18 6 15.9853 6 13.5v-3zm10.5 1.5H12V7.5C14.4853 7.5 16.5 9.51472 16.5 12z" />
                        </svg>
                    </div>
                    <h3 style={styles.cardTitle}>Administración de medicamento</h3>
                </div>
            )}

            {(user.role === 'Enfermero' || user.role === 'admin' || user.role === 'TENS') && (
                <div style={styles.card} onClick={() => navigate('/dashboard/medicamentos')}>
                    <div style={styles.iconContainer}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="#5bc0de" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12z" />
                            <path d="M12 8l-4 4h3v4h2v-4h3l-4-4z" />
                        </svg>
                    </div>
                    <h3 style={styles.cardTitle}>Retiro de medicamento</h3>
                </div>
            )}
        </div>
    );
};

const styles = {
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '25px', width: '100%', maxWidth: '1200px',
    },
    card: {
        backgroundColor: 'white', borderRadius: '10px', padding: '30px 20px',
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid #e1e4e8',
    },
    iconContainer: {
        position: 'relative' as const, marginBottom: '20px',
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60px',
    },
    cardTitle: {
        margin: 0, fontSize: '16px', color: '#0a3a8a',
        fontWeight: 'bold', textAlign: 'center' as const,
    },
    cardSubtitle: {
        margin: '6px 0 0 0', fontSize: '12px', color: '#e65100',
        fontWeight: '600' as const, textAlign: 'center' as const,
    },
    // Badge estilo WhatsApp: círculo verde en esquina superior derecha
    waBadge: {
        position: 'absolute' as const,
        top: '-10px',
        right: '-10px',
        backgroundColor: '#25D366',   // verde WhatsApp
        color: 'white',
        borderRadius: '50px',
        minWidth: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 7px',
        boxShadow: '0 2px 8px rgba(37,211,102,0.5)',
        border: '2px solid white',
        zIndex: 1,
    },
};

export default DashboardHome;
