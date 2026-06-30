import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export type DashboardUser = { id: string; username: string; role: string };
export type DashboardContext = { user: DashboardUser };

const DashboardLayout = () => {
    const [user, setUser] = useState<DashboardUser | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (!stored) { navigate('/'); return; }
        setUser(JSON.parse(stored));
    }, [navigate]);

    useEffect(() => {
        if (!user) return;
        const restrictedForCuidador = ['/dashboard/residentes', '/dashboard/medicamentos'];
        if (user.role === 'cuidador' && restrictedForCuidador.some(p => location.pathname.startsWith(p))) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, location.pathname, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    if (!user) return null;

    return (
        <div style={styles.container}>
            <nav style={styles.navbar}>
                <div style={styles.navLeft}>
                    <div style={{ ...styles.navBrand, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                        <span style={{ fontWeight: 'bold' }}>Panel</span>
                    </div>
                    {[
                        { label: 'Residentes', path: '/dashboard/residentes' },
                        { label: 'Novedades', path: '/dashboard/novedades' },
                        { label: 'Calendario', path: '/dashboard/calendario' },
                        { label: 'Medicamentos', path: '/dashboard/medicamentos' },
                    ].filter(link => {
                        if (user.role !== 'cuidador') return true;
                        return link.label !== 'Residentes' && link.label !== 'Medicamentos';
                    }).map(link => {
                        const active = location.pathname.startsWith(link.path);
                        return (
                            <button key={link.path} onClick={() => navigate(link.path)}
                                style={active ? styles.navLinkActive : styles.navLink}>
                                {link.label}
                            </button>
                        );
                    })}
                </div>
                <div style={styles.navRight}>
                    <span style={styles.userText}>{user.username} ({user.role})</span>
                    <button onClick={handleLogout} style={styles.logoutButton}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
                            <path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z" />
                        </svg>
                        Salir
                    </button>
                </div>
            </nav>
            <div style={styles.mainContent}>
                <Outlet context={{ user } as DashboardContext} />
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh', width: '100vw', backgroundColor: '#f5f7fb',
        fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
        display: 'flex', flexDirection: 'column' as const, overflowX: 'hidden' as const,
    },
    navbar: {
        backgroundColor: '#0a3a8a', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 20px', minHeight: '60px', height: 'auto', flexWrap: 'wrap' as const, gap: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 50,
    },
    navLeft: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const },
    navLink: {
        backgroundColor: 'transparent', color: 'rgba(255,255,255,0.8)', border: 'none',
        padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
        fontWeight: '500' as const, transition: 'background-color 0.2s',
    },
    navLinkActive: {
        backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none',
        padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
        fontWeight: 'bold' as const,
    },
    navBrand: {
        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px',
        backgroundColor: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '4px',
    },
    navRight: { display: 'flex', alignItems: 'center', gap: '15px' },
    userText: { fontSize: '14px', fontWeight: '500' as const },
    logoutButton: {
        backgroundColor: 'transparent', color: 'white',
        border: '1px solid rgba(255,255,255,0.3)', padding: '6px 12px',
        borderRadius: '4px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', fontSize: '14px', transition: 'background-color 0.2s',
    },
    mainContent: {
        flex: 1, padding: '30px', display: 'flex',
        justifyContent: 'center', alignItems: 'flex-start',
    },
};

export default DashboardLayout;
