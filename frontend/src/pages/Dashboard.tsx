import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);

    // View States
    const [view, setView] = useState<'dashboard' | 'novedades'>('dashboard');
    const [novedadesSubView, setNovedadesSubView] = useState<'list' | 'form'>('list');

    // List of saved shift reports
    const [reports, setReports] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);

    // Active report form state
    const [editingReportId, setEditingReportId] = useState<string | null>(null);
    const [reportDate, setReportDate] = useState('');
    const [reportShift, setReportShift] = useState<'dia' | 'noche'>('dia');
    const [reportSupervisor, setReportSupervisor] = useState('');
    const [reportCaregivers, setReportCaregivers] = useState('');
    const [reportStaff, setReportStaff] = useState('');
    const [reportIncidents, setReportIncidents] = useState<any[]>([]);
    const [reportHygienes, setReportHygienes] = useState<any[]>([]);

    // Independent search filters for each table
    const [searchHygieneQuery, setSearchHygieneQuery] = useState('');
    const [searchRoomQuery, setSearchRoomQuery] = useState('');

    // Modal state for active resident incident editing
    const [activeResident, setActiveResident] = useState<{ room: number; bed: 'A' | 'B' } | null>(null);
    const [newIncidentDescription, setNewIncidentDescription] = useState('');
    const [newIncidentTitle, setNewIncidentTitle] = useState<'Hospital' | 'Salida' | 'Novedad'>('Novedad');
    const [showNewIncidentForm, setShowNewIncidentForm] = useState(false);

    // Mouse hover tracking for action buttons
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);

    // Session verification
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    // Fetch reports from backend
    const fetchReports = async () => {
        setLoadingReports(true);
        try {
            const response = await api.get('/shift-reports');
            setReports(response.data);
        } catch (error) {
            console.error('Error al obtener los informes:', error);
        } finally {
            setLoadingReports(false);
        }
    };

    // Load reports when novedades view is active
    useEffect(() => {
        if (view === 'novedades') {
            fetchReports();
        }
    }, [view]);

    if (!user) return null;

    // Helper to generate the 60 residents list (30 rooms * 2 beds)
    const residentsList: { room: number; bed: 'A' | 'B' }[] = [];
    for (let r = 1; r <= 30; r++) {
        residentsList.push({ room: r, bed: 'A' });
        residentsList.push({ room: r, bed: 'B' });
    }

    const filterResidents = (query: string) =>
        residentsList.filter((res) => {
            if (!query) return true;
            const q = query.toLowerCase();
            return (
                `habitacion ${res.room}`.includes(q) ||
                `hab ${res.room}`.includes(q) ||
                String(res.room).includes(q) ||
                `cama ${res.bed.toLowerCase()}`.includes(q) ||
                res.bed.toLowerCase().includes(q)
            );
        });

    const filteredResidentsHygiene = filterResidents(searchHygieneQuery);
    const filteredResidents = filterResidents(searchRoomQuery);

    // Initialize new shift report creation
    const handleNewReport = () => {
        setEditingReportId(null);
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setReportDate(`${yyyy}-${mm}-${dd}`);
        const currentHour = today.getHours();
        setReportShift(currentHour >= 8 && currentHour < 20 ? 'dia' : 'noche');
        setReportSupervisor(user.username);
        setReportCaregivers('');
        setReportStaff('');
        setReportIncidents([]);
        setReportHygienes([]);
        setSearchHygieneQuery('');
        setSearchRoomQuery('');
        setNovedadesSubView('form');
    };

    // Load existing shift report for editing
    const handleEditReport = (report: any) => {
        setEditingReportId(report.id);
        setReportDate(report.date);
        setReportShift(report.shift);
        setReportSupervisor(report.supervisor);
        setReportCaregivers(report.caregivers || '');
        setReportStaff(report.staff || '');
        setReportIncidents(report.incidents || []);
        setReportHygienes(report.hygienes || []);
        setSearchHygieneQuery('');
        setSearchRoomQuery('');
        setNovedadesSubView('form');
    };

    // Save shift report to database
    const handleSaveReport = async () => {
        if (!reportDate) {
            alert('Por favor, seleccione una fecha.');
            return;
        }
        if (!reportSupervisor.trim()) {
            alert('El encargado de turno no puede estar vacío.');
            return;
        }
        const payload = {
            date: reportDate,
            shift: reportShift,
            supervisor: reportSupervisor,
            caregivers: reportCaregivers,
            staff: reportStaff,
            incidents: reportIncidents,
            hygienes: reportHygienes,
            feedings: [],
        };
        try {
            if (editingReportId) {
                await api.put(`/shift-reports/${editingReportId}`, payload);
            } else {
                await api.post('/shift-reports', payload);
            }
            setNovedadesSubView('list');
            fetchReports();
        } catch (error) {
            console.error('Error al guardar el informe:', error);
            alert('Ocurrió un error al guardar el informe. Verifique los datos.');
        }
    };

    // Open incident manager modal for a specific resident
    const handleOpenResidentModal = (room: number, bed: 'A' | 'B') => {
        setActiveResident({ room, bed });
        setNewIncidentDescription('');
        setNewIncidentTitle('Novedad');
        setShowNewIncidentForm(false);
    };

    // Live analyzer for incident description
    const handleDescriptionChange = (text: string) => {
        setNewIncidentDescription(text);
        const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (normalized.includes('hospital')) {
            setNewIncidentTitle('Hospital');
        } else if (normalized.includes('salida del residente')) {
            setNewIncidentTitle('Salida');
        } else {
            setNewIncidentTitle('Novedad');
        }
    };

    // Append new incident to active report list
    const handleAddIncident = () => {
        if (!newIncidentDescription.trim()) {
            alert('La descripción de la novedad no puede estar vacía.');
            return;
        }
        if (!activeResident) return;
        setReportIncidents([...reportIncidents, {
            room: activeResident.room,
            bed: activeResident.bed,
            title: newIncidentTitle,
            description: newIncidentDescription,
        }]);
        setNewIncidentDescription('');
        setNewIncidentTitle('Novedad');
        setShowNewIncidentForm(false);
    };

    // Remove incident from report list
    const handleDeleteIncident = (incidentToRemove: any) => {
        setReportIncidents(prev => prev.filter(inc => inc !== incidentToRemove));
    };

    const getResidentIncidents = (room: number, bed: 'A' | 'B') =>
        reportIncidents.filter(inc => inc.room === room && inc.bed === bed);

    const getResidentHygiene = (room: number, bed: 'A' | 'B') => {
        const entry = reportHygienes.find(h => h.room === room && h.bed === bed);
        if (entry) return entry;
        return {
            room, bed,
            aseoCavidades: false, corteCapilar: false, corteUnas: false,
            aseoBucal: false, aseoPerineal: false, banoDucha: false,
            afeitado: false, lubricacion: false,
        };
    };

    const toggleHygieneField = (room: number, bed: 'A' | 'B', field: string) => {
        setReportHygienes(prev => {
            const index = prev.findIndex(h => h.room === room && h.bed === bed);
            if (index === -1) {
                return [...prev, {
                    room, bed,
                    aseoCavidades: false, corteCapilar: false, corteUnas: false,
                    aseoBucal: false, aseoPerineal: false, banoDucha: false,
                    afeitado: false, lubricacion: false,
                    [field]: true,
                }];
            }
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: !updated[index][field] };
            return updated;
        });
    };

    const renderToggle = (room: number, bed: 'A' | 'B', field: string, value: boolean) => (
        <button
            type="button"
            onClick={() => toggleHygieneField(room, bed, field)}
            style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                backgroundColor: value ? '#e6f4ea' : '#fce8e6',
                color: value ? '#137333' : '#c5221f',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: value ? '#ceead6' : '#fad2cf',
                boxShadow: value ? '0 1px 2px rgba(19,115,51,0.1)' : '0 1px 2px rgba(197,34,31,0.05)',
            }}
        >
            {value ? (
                <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Sí
                </>
            ) : (
                <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    No
                </>
            )}
        </button>
    );

    const getHighestPriorityTitle = (incidents: any[]) => {
        if (incidents.length === 0) return 'Sin Novedad';
        const titles = incidents.map(inc => inc.title);
        if (titles.includes('Hospital')) return 'Hospital';
        if (titles.includes('Salida')) return 'Salida';
        return 'Novedad';
    };

    const getIncidentsSummary = (incidents: any[]) => {
        if (incidents.length === 0) return '-';
        const text = incidents.map(inc => `[${inc.title}] ${inc.description}`).join(' | ');
        return text.length > 55 ? text.substring(0, 52) + '...' : text;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    };

    const getReportStats = (incidents: any[]) => {
        if (!incidents) return { residents: 0, hospital: 0, salida: 0, novedad: 0 };
        const uniqueResidents = new Set(incidents.map(inc => `${inc.room}-${inc.bed}`));
        return {
            residents: uniqueResidents.size,
            hospital: incidents.filter(inc => inc.title === 'Hospital').length,
            salida: incidents.filter(inc => inc.title === 'Salida').length,
            novedad: incidents.filter(inc => inc.title === 'Novedad').length,
        };
    };

    const getHygieneStats = (hygienes: any[]) => {
        if (!hygienes || hygienes.length === 0) return 'Sin registros de aseo clínico';
        const count = hygienes.filter(h =>
            h.aseoCavidades || h.corteCapilar || h.corteUnas || h.aseoBucal ||
            h.aseoPerineal || h.banoDucha || h.afeitado || h.lubricacion
        ).length;
        return `${count} residente(s) con aseo clínico`;
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'Hospital': return <span style={styles.badgeHospital}>Hospital</span>;
            case 'Salida': return <span style={styles.badgeSalida}>Salida</span>;
            case 'Novedad': return <span style={styles.badgeNovedad}>Novedad</span>;
            default: return <span style={styles.badgeSinNovedad}>Sin Novedad</span>;
        }
    };

    const renderSearchInput = (value: string, onChange: (v: string) => void) => (
        <div style={styles.searchWrapper}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#888', marginRight: '6px' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
                type="text"
                placeholder="Buscar Habitación o Cama (ej. 'Hab 5', 'A', '12')"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={styles.searchInput}
            />
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Top Navigation */}
            <nav style={styles.navbar}>
                <div style={styles.navLeft}>
                    <div style={{ ...styles.navBrand, cursor: 'pointer' }} onClick={() => setView('dashboard')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                        <span style={{ fontWeight: 'bold' }}>Panel</span>
                    </div>
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

            {/* Main Content Area */}
            <div style={styles.mainContent}>
                {view === 'dashboard' ? (
                    <div style={styles.grid}>
                        {/* Novedades */}
                        <div style={styles.card} onClick={() => setView('novedades')}>
                            <div style={styles.iconContainer}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="#005bbb" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H5v-2h6v2zm0-4H5v-2h6v2zm8-4H5V7h14v2zm0 8h-6v-6h6v6z" />
                                </svg>
                            </div>
                            <h3 style={styles.cardTitle}>Novedades</h3>
                        </div>
                        {/* Calendario */}
                        <div style={styles.card}>
                            <div style={styles.iconContainer}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="#d9534f" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" />
                                </svg>
                            </div>
                            <h3 style={styles.cardTitle}>Calendario</h3>
                        </div>
                        {/* Ficha de residentes */}
                        <div style={styles.card}>
                            <div style={styles.iconContainer}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="#5cb85c" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    <path d="M16 11V8h2v3h3v2h-3v3h-2v-3h-3v-2h3z" fill="#f0ad4e" />
                                </svg>
                            </div>
                            <h3 style={styles.cardTitle}>Ficha de residentes</h3>
                        </div>
                        {/* Administración de medicamento - TENS y admin */}
                        {(user.role === 'TENS' || user.role === 'admin') && (
                            <div style={styles.card}>
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
                        {/* Retiro de medicamento - Enfermero y admin */}
                        {(user.role === 'Enfermero' || user.role === 'admin') && (
                            <div style={styles.card}>
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
                ) : (
                    /* Novedades Module View */
                    <div style={styles.moduleWrapper}>
                        {/* Module Header */}
                        <div style={styles.moduleHeader}>
                            <button
                                onClick={() => {
                                    if (novedadesSubView === 'form') {
                                        setNovedadesSubView('list');
                                    } else {
                                        setView('dashboard');
                                    }
                                }}
                                style={styles.backButton}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                    <line x1="19" y1="12" x2="5" y2="12"></line>
                                    <polyline points="12 19 5 12 12 5"></polyline>
                                </svg>
                                Volver
                            </button>
                            <h2 style={styles.moduleTitle}>
                                {novedadesSubView === 'list'
                                    ? 'Historial de Informes de Turno'
                                    : (editingReportId ? 'Editar Informe de Turno' : 'Nuevo Informe de Turno')}
                            </h2>
                            {novedadesSubView === 'list' && (
                                <button onClick={handleNewReport} style={styles.primaryButton}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Nuevo Informe
                                </button>
                            )}
                        </div>

                        {/* Subview 1: Historial */}
                        {novedadesSubView === 'list' && (
                            <div style={styles.reportsGrid}>
                                {loadingReports ? (
                                    <p style={{ textAlign: 'center', gridColumn: '1 / -1', color: '#666', padding: '40px' }}>
                                        Cargando informes de turno...
                                    </p>
                                ) : reports.length === 0 ? (
                                    <div style={styles.emptyState}>
                                        <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#666' }}>
                                            No hay informes de turno registrados.
                                        </p>
                                        <button onClick={handleNewReport} style={styles.primaryButton}>Crear el Primero</button>
                                    </div>
                                ) : (
                                    reports.map((rep) => {
                                        const stats = getReportStats(rep.incidents);
                                        return (
                                            <div key={rep.id} style={styles.reportCard}>
                                                <div style={styles.reportCardHeader}>
                                                    <div style={styles.dateBlock}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', color: '#0a3a8a' }}>
                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                                        </svg>
                                                        <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{formatDate(rep.date)}</span>
                                                    </div>
                                                    <span style={rep.shift === 'dia' ? styles.shiftBadgeDay : styles.shiftBadgeNight}>
                                                        {rep.shift === 'dia' ? '☀ Día' : '🌙 Noche'}
                                                    </span>
                                                </div>
                                                <div style={styles.reportCardBody}>
                                                    <p style={{ margin: '4px 0' }}><strong>Encargado:</strong> {rep.supervisor}</p>
                                                    <p style={styles.truncatedText}><strong>Cuidadores:</strong> {rep.caregivers || 'Ninguno'}</p>
                                                    <p style={styles.truncatedText}><strong>Personal:</strong> {rep.staff || 'Ninguno'}</p>
                                                    <div style={styles.statsSummary}>
                                                        <span style={{ fontSize: '12px', color: '#444', fontWeight: '500' }}>
                                                            {stats.residents === 0 ? 'Sin novedades registradas' : `${stats.residents} residentes con novedades:`}
                                                        </span>
                                                        {stats.residents > 0 && (
                                                            <div style={styles.statsBadgesRow}>
                                                                {stats.hospital > 0 && <span style={styles.miniBadgeRed}>{stats.hospital} Hospital</span>}
                                                                {stats.salida > 0 && <span style={styles.miniBadgeOrange}>{stats.salida} Salida</span>}
                                                                {stats.novedad > 0 && <span style={styles.miniBadgeBlue}>{stats.novedad} Novedades</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ ...styles.statsSummary, marginTop: '8px' }}>
                                                        <span style={{ fontSize: '12px', color: '#444', fontWeight: '500' }}>
                                                            {getHygieneStats(rep.hygienes)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={styles.reportCardActions}>
                                                    <button onClick={() => handleEditReport(rep)} style={styles.secondaryButton}>
                                                        Ver / Editar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* Subview 2: Formulario */}
                        {novedadesSubView === 'form' && (
                            <div style={styles.formContainer}>
                                {/* Top fields */}
                                <div style={styles.formPanel}>
                                    <div style={styles.formGrid}>
                                        <div style={styles.inputWrapper}>
                                            <label style={styles.inputLabel}>Fecha:</label>
                                            <input
                                                type="date"
                                                value={reportDate}
                                                onChange={(e) => setReportDate(e.target.value)}
                                                style={styles.formInput}
                                            />
                                        </div>
                                        <div style={styles.inputWrapper}>
                                            <label style={styles.inputLabel}>Turno:</label>
                                            <div style={styles.toggleGroup}>
                                                <button
                                                    type="button"
                                                    onClick={() => setReportShift('dia')}
                                                    style={reportShift === 'dia' ? styles.toggleActive : styles.toggleInactive}
                                                >
                                                    ☀ Día
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReportShift('noche')}
                                                    style={reportShift === 'noche' ? styles.toggleActive : styles.toggleInactive}
                                                >
                                                    🌙 Noche
                                                </button>
                                            </div>
                                        </div>
                                        <div style={styles.inputWrapper}>
                                            <label style={styles.inputLabel}>Encargado de Turno:</label>
                                            <input
                                                type="text"
                                                value={reportSupervisor}
                                                onChange={(e) => setReportSupervisor(e.target.value)}
                                                disabled={user.role !== 'admin'}
                                                placeholder="Nombre del encargado..."
                                                style={{
                                                    ...styles.formInput,
                                                    backgroundColor: user.role !== 'admin' ? '#e9ecef' : '#ffffff',
                                                    color: user.role !== 'admin' ? '#495057' : '#000000',
                                                    cursor: user.role !== 'admin' ? 'not-allowed' : 'text',
                                                }}
                                            />
                                            {user.role !== 'admin' && (
                                                <span style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                    Solo los administradores pueden editar el encargado de turno.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ ...styles.formGrid, marginTop: '15px' }}>
                                        <div style={styles.inputWrapper}>
                                            <label style={styles.inputLabel}>Cuidadores de Turno:</label>
                                            <textarea
                                                value={reportCaregivers}
                                                onChange={(e) => setReportCaregivers(e.target.value)}
                                                placeholder="Ej: Ana Gómez, Carlos Pérez..."
                                                rows={2}
                                                style={styles.formTextarea}
                                            />
                                        </div>
                                        <div style={styles.inputWrapper}>
                                            <label style={styles.inputLabel}>Personal (Cocina, Aseo, etc.):</label>
                                            <textarea
                                                value={reportStaff}
                                                onChange={(e) => setReportStaff(e.target.value)}
                                                placeholder="Ej: Cocina: Marta Ortiz; Aseo: Juan Castro..."
                                                rows={2}
                                                style={styles.formTextarea}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ══════════════════════════════════════════════════
                                    TABLA DE ASEO CLÍNICO — encima de incidentes
                                ══════════════════════════════════════════════════ */}
                                <div style={styles.tablePanel}>
                                    <div style={styles.tablePanelHeader}>
                                        <h3 style={{ margin: 0, color: '#0a3a8a', fontSize: '18px' }}>
                                            Registro de Aseo Clínico (Habitaciones 1 a 30)
                                        </h3>
                                        {renderSearchInput(searchHygieneQuery, setSearchHygieneQuery)}
                                    </div>
                                    <div style={{ ...styles.tableScroll, maxHeight: '500px' }}>
                                        <table style={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={styles.th}>Habitación</th>
                                                    <th style={styles.th}>Cama</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Aseo Cavidades</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Corte Capilar</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Corte Uñas (Onicotomía)</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Aseo Bucal</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Aseo Perineal</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Baño / Ducha</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Afeitado / Rasurado</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Lubricación Piel</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredResidentsHygiene.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={10} style={{ ...styles.td, textAlign: 'center', color: '#666', padding: '20px' }}>
                                                            No se encontraron habitaciones para la búsqueda.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredResidentsHygiene.map((res) => {
                                                        const hygiene = getResidentHygiene(res.room, res.bed);
                                                        return (
                                                            <tr key={`aseo-${res.room}-${res.bed}`} style={styles.tr}>
                                                                <td style={{ ...styles.td, fontWeight: 'bold' }}>Habitación {res.room}</td>
                                                                <td style={styles.td}>Cama {res.bed}</td>
                                                                <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'aseoCavidades', hygiene.aseoCavidades)}</td>
                                                                <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'corteCapilar', hygiene.corteCapilar)}</td>
                                                                <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'corteUnas', hygiene.corteUnas)}</td>
                                                                <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'aseoBucal', hygiene.aseoBucal)}</td>
                                                                <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'aseoPerineal', hygiene.aseoPerineal)}</td>
                                                                <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'banoDucha', hygiene.banoDucha)}</td>
                                                                <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'afeitado', hygiene.afeitado)}</td>
                                                                <td style={{ ...styles.td, textAlign: 'center' }}>{renderToggle(res.room, res.bed, 'lubricacion', hygiene.lubricacion)}</td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* ══════════════════════════════════════════════════
                                    TABLA DE INCIDENTES DE RESIDENTES — debajo
                                ══════════════════════════════════════════════════ */}
                                <div style={styles.tablePanel}>
                                    <div style={styles.tablePanelHeader}>
                                        <h3 style={{ margin: 0, color: '#0a3a8a', fontSize: '18px' }}>
                                            Registro de Novedades (Habitaciones 1 a 30)
                                        </h3>
                                        {renderSearchInput(searchRoomQuery, setSearchRoomQuery)}
                                    </div>
                                    <div style={{ ...styles.tableScroll, maxHeight: '500px' }}>
                                        <table style={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={styles.th}>Habitación</th>
                                                    <th style={styles.th}>Cama</th>
                                                    <th style={styles.th}>Estado / Título Novedad</th>
                                                    <th style={styles.th}>Resumen Novedades</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredResidents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: '#666', padding: '20px' }}>
                                                            No se encontraron habitaciones para la búsqueda.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredResidents.map((res) => {
                                                        const incidents = getResidentIncidents(res.room, res.bed);
                                                        const highestStatus = getHighestPriorityTitle(incidents);
                                                        const summary = getIncidentsSummary(incidents);
                                                        const rowKey = `${res.room}-${res.bed}`;
                                                        const isHovered = hoveredKey === rowKey;
                                                        return (
                                                            <tr key={rowKey} style={styles.tr}>
                                                                <td style={{ ...styles.td, fontWeight: 'bold' }}>Habitación {res.room}</td>
                                                                <td style={styles.td}>Cama {res.bed}</td>
                                                                <td style={styles.td}>{renderStatusBadge(highestStatus)}</td>
                                                                <td style={{ ...styles.td, color: '#555', fontSize: '13px' }}>{summary}</td>
                                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                                    {incidents.length === 0 ? (
                                                                        <button
                                                                            type="button"
                                                                            onMouseEnter={() => setHoveredKey(rowKey)}
                                                                            onMouseLeave={() => setHoveredKey(null)}
                                                                            onClick={() => handleOpenResidentModal(res.room, res.bed)}
                                                                            style={isHovered ? styles.actionBtnHover : styles.actionBtnSinNovedad}
                                                                        >
                                                                            {isHovered ? 'Anotar Novedad' : 'Sin Novedad'}
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenResidentModal(res.room, res.bed)}
                                                                            style={styles.actionBtnHasNovedad}
                                                                        >
                                                                            Ver / Editar ({incidents.length})
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Form Footer Actions — fuera de los tablePanels */}
                                <div style={styles.formActions}>
                                    <button onClick={() => setNovedadesSubView('list')} style={styles.secondaryButton}>
                                        Cancelar
                                    </button>
                                    <button onClick={handleSaveReport} style={styles.saveButton}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                            <polyline points="7 3 7 8 15 8"></polyline>
                                        </svg>
                                        Guardar Informe
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Resident Incident Modal */}
            {activeResident && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0a3a8a' }}>
                                Habitación {activeResident.room} - Cama {activeResident.bed}
                            </h3>
                            <button onClick={() => setActiveResident(null)} style={styles.closeIconBtn} title="Cerrar modal">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            {!showNewIncidentForm && (
                                <button onClick={() => setShowNewIncidentForm(true)} style={styles.modalAddBtn}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}>
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Añadir Novedad
                                </button>
                            )}
                            {showNewIncidentForm && (
                                <div style={styles.incidentFormBox}>
                                    <label style={styles.modalFormLabel}>Registrar Novedad:</label>
                                    <textarea
                                        value={newIncidentDescription}
                                        onChange={(e) => handleDescriptionChange(e.target.value)}
                                        placeholder="Escriba los detalles aquí... Recuerde que palabras que contengan 'hospital' o 'salida del residente' cambiarán el título automáticamente."
                                        rows={4}
                                        style={styles.modalTextarea}
                                        autoFocus
                                    />
                                    <div style={styles.titleDetectorRow}>
                                        <span style={{ fontSize: '13px', color: '#555' }}>Título detectado: </span>
                                        {renderStatusBadge(newIncidentTitle)}
                                    </div>
                                    <div style={styles.incidentFormActions}>
                                        <button onClick={() => setShowNewIncidentForm(false)} style={styles.secondaryButton}>Cancelar</button>
                                        <button onClick={handleAddIncident} style={styles.primaryButton}>Añadir</button>
                                    </div>
                                </div>
                            )}
                            <div style={{ marginTop: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '6px', color: '#444' }}>
                                    Novedades del Turno Actual
                                </h4>
                                {getResidentIncidents(activeResident.room, activeResident.bed).length === 0 ? (
                                    <p style={{ color: '#777', fontStyle: 'italic', margin: '10px 0 0 0' }}>
                                        No hay novedades registradas para este residente.
                                    </p>
                                ) : (
                                    <div style={styles.incidentList}>
                                        {getResidentIncidents(activeResident.room, activeResident.bed).map((inc, index) => (
                                            <div key={index} style={styles.incidentCardItem}>
                                                <div style={styles.incidentCardHeader}>
                                                    {renderStatusBadge(inc.title)}
                                                    <button
                                                        onClick={() => handleDeleteIncident(inc)}
                                                        style={styles.deleteIncBtn}
                                                        title="Eliminar novedad"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div style={styles.incidentCardBody}>{inc.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setActiveResident(null)} style={styles.primaryButton}>
                                Listo / Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#f5f7fb',
        fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
        display: 'flex',
        flexDirection: 'column' as const,
        overflowX: 'hidden' as const,
    },
    navbar: {
        backgroundColor: '#0a3a8a',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        height: '60px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 50,
    },
    navLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
    navBrand: {
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '18px', backgroundColor: 'rgba(255,255,255,0.1)',
        padding: '8px 16px', borderRadius: '4px',
    },
    navRight: { display: 'flex', alignItems: 'center', gap: '15px' },
    userText: { fontSize: '14px', fontWeight: '500' },
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
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '25px', width: '100%', maxWidth: '1200px',
    },
    card: {
        backgroundColor: 'white', borderRadius: '10px', padding: '30px 20px',
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid #e1e4e8',
    },
    iconContainer: {
        position: 'relative' as const, marginBottom: '20px',
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60px',
    },
    cardTitle: {
        margin: 0, fontSize: '16px', color: '#0a3a8a',
        fontWeight: 'bold', textAlign: 'center' as const,
    },
    moduleWrapper: {
        width: '100%', maxWidth: '1400px',
        display: 'flex', flexDirection: 'column' as const, gap: '20px',
    },
    moduleHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '2px solid #e1e4e8', paddingBottom: '15px',
    },
    moduleTitle: { margin: 0, fontSize: '22px', color: '#0a3a8a', fontWeight: 'bold' },
    backButton: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333',
        padding: '8px 16px', borderRadius: '6px', fontSize: '14px',
        fontWeight: '500', cursor: 'pointer', display: 'flex',
        alignItems: 'center', transition: 'background-color 0.2s',
    },
    primaryButton: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white',
        padding: '8px 16px', borderRadius: '6px', fontSize: '14px',
        fontWeight: '500', cursor: 'pointer', display: 'flex',
        alignItems: 'center', transition: 'background-color 0.2s',
    },
    secondaryButton: {
        backgroundColor: 'transparent', border: '1px solid #ccc', color: '#555',
        padding: '8px 16px', borderRadius: '6px', fontSize: '14px',
        fontWeight: '500', cursor: 'pointer', transition: 'background-color 0.2s',
    },
    reportsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px',
    },
    reportCard: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        boxShadow: '0 4px 6px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.05)',
        padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '12px',
        transition: 'box-shadow 0.2s',
    },
    reportCardHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #f0f0f0', paddingBottom: '8px',
    },
    dateBlock: { display: 'flex', alignItems: 'center' },
    shiftBadgeDay: {
        backgroundColor: '#fff3cd', color: '#856404', fontSize: '12px',
        fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', border: '1px solid #ffeeba',
    },
    shiftBadgeNight: {
        backgroundColor: '#e2e3e5', color: '#383d41', fontSize: '12px',
        fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', border: '1px solid #d6d8db',
    },
    reportCardBody: {
        fontSize: '14px', color: '#333', display: 'flex', flexDirection: 'column' as const, gap: '6px',
    },
    truncatedText: {
        margin: '4px 0', whiteSpace: 'nowrap' as const,
        overflow: 'hidden' as const, textOverflow: 'ellipsis' as const,
    },
    statsSummary: {
        marginTop: '8px', backgroundColor: '#f8f9fa', padding: '8px 12px',
        borderRadius: '6px', border: '1px solid #e9ecef',
    },
    statsBadgesRow: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '6px' },
    reportCardActions: {
        marginTop: 'auto', display: 'flex', justifyContent: 'flex-end',
        borderTop: '1px solid #f0f0f0', paddingTop: '10px',
    },
    emptyState: {
        gridColumn: '1 / -1', backgroundColor: 'white', borderRadius: '12px',
        padding: '50px', textAlign: 'center' as const,
        border: '1px solid #e1e4e8', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    },
    formContainer: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
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
    },
    toggleGroup: { display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #ccc' },
    toggleActive: {
        flex: 1, backgroundColor: '#0a3a8a', color: 'white', border: 'none',
        padding: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s',
    },
    toggleInactive: {
        flex: 1, backgroundColor: '#fff', color: '#333', border: 'none',
        padding: '10px', cursor: 'pointer', fontSize: '14px', transition: 'background-color 0.2s',
    },
    tablePanel: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    },
    tablePanelHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px',
    },
    searchWrapper: {
        display: 'flex', alignItems: 'center', border: '1.5px solid #ccc',
        borderRadius: '8px', padding: '6px 12px', width: '100%', maxWidth: '350px',
    },
    searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', fontFamily: 'inherit' },
    tableScroll: {
        overflowX: 'auto' as const, overflowY: 'auto' as const,
        border: '1px solid #e1e4e8', borderRadius: '8px',
    },
    table: { width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const, fontSize: '14px' },
    th: {
        backgroundColor: '#f8f9fa', color: '#555', fontWeight: 'bold',
        padding: '12px 16px', borderBottom: '2px solid #e1e4e8',
        position: 'sticky' as const, top: 0, zIndex: 10, whiteSpace: 'nowrap' as const,
    },
    td: { padding: '12px 16px', borderBottom: '1px solid #e1e4e8' },
    tr: { transition: 'background-color 0.15s' },
    badgeHospital: {
        backgroundColor: '#fce8e6', color: '#c5221f', border: '1px solid #fad2cf',
        padding: '4px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '13px', display: 'inline-block',
    },
    badgeSalida: {
        backgroundColor: '#fef3d6', color: '#b06000', border: '1px solid #feebb6',
        padding: '4px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '13px', display: 'inline-block',
    },
    badgeNovedad: {
        backgroundColor: '#e8f0fe', color: '#1a73e8', border: '1px solid #d2e3fc',
        padding: '4px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '13px', display: 'inline-block',
    },
    badgeSinNovedad: {
        backgroundColor: '#e6f4ea', color: '#137333', border: '1px solid #ceead6',
        padding: '4px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '13px', display: 'inline-block',
    },
    miniBadgeRed: { backgroundColor: '#fce8e6', color: '#c5221f', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
    miniBadgeOrange: { backgroundColor: '#fef3d6', color: '#b06000', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
    miniBadgeBlue: { backgroundColor: '#e8f0fe', color: '#1a73e8', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
    actionBtnSinNovedad: {
        backgroundColor: 'transparent', border: '1px solid #137333', color: '#137333',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500',
        cursor: 'pointer', width: '130px', transition: 'all 0.2s ease',
    },
    actionBtnHover: {
        backgroundColor: '#137333', border: '1px solid #137333', color: 'white',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
        cursor: 'pointer', width: '130px', boxShadow: '0 2px 4px rgba(19,115,51,0.2)', transition: 'all 0.2s ease',
    },
    actionBtnHasNovedad: {
        backgroundColor: '#0a3a8a', border: '1px solid #0a3a8a', color: 'white',
        padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
        cursor: 'pointer', width: '130px', boxShadow: '0 2px 4px rgba(10,58,138,0.2)', transition: 'background-color 0.2s',
    },
    formActions: { display: 'flex', justifyContent: 'flex-end', gap: '15px', paddingBottom: '20px' },
    saveButton: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white', padding: '12px 24px',
        borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
        display: 'flex', alignItems: 'center', boxShadow: '0 4px 6px rgba(10,58,138,0.2)',
        transition: 'background-color 0.2s',
    },
    modalBackdrop: {
        position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(10,58,138,0.35)', backdropFilter: 'blur(5px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white', borderRadius: '16px', padding: '24px',
        width: '90%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto' as const,
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        border: '1px solid #e1e4e8', display: 'flex', flexDirection: 'column' as const,
    },
    modalHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #e1e4e8', paddingBottom: '12px',
    },
    closeIconBtn: {
        backgroundColor: 'transparent', border: 'none', color: '#666', cursor: 'pointer',
        display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px', transition: 'background-color 0.2s',
    },
    modalAddBtn: {
        backgroundColor: 'white', border: '2px dashed #0a3a8a', color: '#0a3a8a',
        borderRadius: '8px', padding: '12px', width: '100%', fontSize: '15px',
        fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center',
        alignItems: 'center', transition: 'all 0.2s',
    },
    incidentFormBox: {
        backgroundColor: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: '10px',
        padding: '16px', marginTop: '10px', display: 'flex', flexDirection: 'column' as const, gap: '12px',
    },
    modalFormLabel: { fontSize: '14px', fontWeight: 'bold', color: '#333' },
    modalTextarea: {
        padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #ccc',
        fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const,
    },
    titleDetectorRow: {
        display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white',
        padding: '8px 12px', borderRadius: '6px', border: '1px solid #e9ecef',
    },
    incidentFormActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    incidentList: { display: 'flex', flexDirection: 'column' as const, gap: '12px', marginTop: '10px' },
    incidentCardItem: {
        border: '1px solid #e1e4e8', borderRadius: '8px', padding: '12px',
        backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    },
    incidentCardHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px',
    },
    deleteIncBtn: {
        backgroundColor: 'transparent', border: 'none', color: '#c5221f', cursor: 'pointer',
        padding: '4px', borderRadius: '4px', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center',
    },
    incidentCardBody: { fontSize: '14px', color: '#444', lineHeight: '1.4', whiteSpace: 'pre-wrap' as const },
    modalFooter: {
        marginTop: '25px', display: 'flex', justifyContent: 'flex-end',
        borderTop: '1px solid #e1e4e8', paddingTop: '15px',
    },
};

export default Dashboard;
