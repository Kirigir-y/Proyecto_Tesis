import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const ESTADO_STYLE: Record<string, { bg: string; color: string; border: string }> = {
    'Disponible': { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    'Por Vencer': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
    'Stock Bajo': { bg: '#ffe4e6', color: '#9f1239', border: '#fda4af' },
    'Agotado': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
    'Vencido': { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

const TIPO_STYLE: Record<string, { bg: string; color: string }> = {
    'ENTRADA': { bg: '#d1fae5', color: '#065f46' },
    'SALIDA': { bg: '#fee2e2', color: '#991b1b' },
    'AJUSTE': { bg: '#e0e7ff', color: '#3730a3' },
};

const formatDate = (d: string | null) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}-${m}-${y}`;
};

const isExpiringSoon = (d: string | null) => {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
};

const isExpired = (d: string | null) => {
    if (!d) return false;
    return new Date(d).getTime() < Date.now();
};

const getResidentMedStatus = (presc: any) => {
    if (presc.stock === 0) return 'Agotado';
    const exp = presc.medication?.expirationDate;
    if (exp) {
        const diff = (new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (diff < 0) return 'Vencido';
        if (diff <= 30) return 'Por Vencer';
    }
    if (presc.stock <= 5) return 'Stock Bajo';
    return 'Disponible';
};

const MedicamentosLista = () => {
    const navigate = useNavigate();

    // ── Tabs ─────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'catalogo' | 'inventario'>('inventario');

    // ── Catálogo state ───────────────────────────────────────────────────────
    const [meds, setMeds] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');


    // Modal historial (catálogo)
    const [historialMed, setHistorialMed] = useState<any | null>(null);
    const [historial, setHistorial] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);



    // ── Inventario por residente state ───────────────────────────────────────
    const [inventory, setInventory] = useState<any[]>([]);
    const [loadingInv, setLoadingInv] = useState(false);

    // Modal movimiento por residente (Entrada / Salida)
    const [invMov, setInvMov] = useState<{ presc: any; tipo: 'ENTRADA' | 'SALIDA' } | null>(null);
    const [invMovQty, setInvMovQty] = useState('');
    const [invMovReason, setInvMovReason] = useState('');
    const [invMovBy, setInvMovBy] = useState('');
    const [savingInvMov, setSavingInvMov] = useState(false);

    // Modal historial por residente
    const [invHist, setInvHist] = useState<{ presc: any; movements: any[] } | null>(null);
    const [loadingInvHist, setLoadingInvHist] = useState(false);

    useEffect(() => { fetchMeds(); }, []);

    useEffect(() => { if (activeTab === 'inventario') fetchInventory(); }, [activeTab]);

    const fetchMeds = async () => {
        setLoading(true);
        try { const r = await api.get('/medications'); setMeds(r.data); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // ── Inventario por residente ───────────────────────────────────────────────
    const fetchInventory = async () => {
        setLoadingInv(true);
        try { const r = await api.get('/residents/medications/inventory'); setInventory(r.data); }
        catch (e) { console.error(e); }
        finally { setLoadingInv(false); }
    };

    // Agrupa prescripciones por residente
    const grouped = Object.values(
        inventory.reduce((acc: any, p: any) => {
            const key = p.residentId;
            if (!acc[key]) acc[key] = { resident: p.resident, prescriptions: [] };
            acc[key].prescriptions.push(p);
            return acc;
        }, {})
    ) as Array<{ resident: any; prescriptions: any[] }>;

    const openInvMov = (presc: any, tipo: 'ENTRADA' | 'SALIDA') => {
        setInvMov({ presc, tipo });
        setInvMovQty('');
        setInvMovReason('');
        setInvMovBy('');
    };

    const handleInvMovement = async () => {
        if (!invMov) return;
        const qty = parseInt(invMovQty);
        if (!qty || qty <= 0) { alert('Ingresa una cantidad válida.'); return; }
        setSavingInvMov(true);
        try {
            const { presc, tipo } = invMov;
            await api.post(`/residents/${presc.residentId}/medications/${presc.id}/movements`, {
                type: tipo,
                quantity: qty,
                reason: invMovReason || null,
                performedBy: invMovBy || null,
            });
            setInvMov(null);
            await fetchInventory();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Error al registrar movimiento.');
        } finally { setSavingInvMov(false); }
    };

    const openInvHistorial = async (presc: any) => {
        setInvHist({ presc, movements: [] });
        setLoadingInvHist(true);
        try {
            const r = await api.get(`/residents/${presc.residentId}/medications/${presc.id}/movements`);
            setInvHist({ presc, movements: r.data });
        } catch (e) { console.error(e); }
        finally { setLoadingInvHist(false); }
    };

    const openHistorial = async (med: any) => {
        setHistorialMed(med);
        setLoadingHistorial(true);
        try { const r = await api.get(`/medications/${med.id}/movements`); setHistorial(r.data); }
        catch (e) { console.error(e); }
        finally { setLoadingHistorial(false); }
    };



    const handleDelete = async (med: any) => {
        if (!confirm(`¿Eliminar "${med.name}"? Esta acción no se puede deshacer.`)) return;
        try { await api.delete(`/medications/${med.id}`); await fetchMeds(); }
        catch { alert('No se pudo eliminar.'); }
    };

    const filtered = meds.filter(m => {
        const q = search.toLowerCase();
        return !search || m.name.toLowerCase().includes(q)
            || (m.activeIngredient ?? '').toLowerCase().includes(q)
            || (m.lotNumber ?? '').toLowerCase().includes(q);
    });

    return (
        <div style={styles.wrapper}>
            {/* ── Header ── */}
            <div style={styles.header}>
                <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                    Volver
                </button>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '200px' }}>
                    <h2 style={styles.title}>Medicamentos</h2>
                </div>
                <button onClick={() => navigate('/dashboard/medicamentos/nuevo')} style={styles.primaryBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nuevo Medicamento
                </button>
            </div>

            {/* ── Tabs ── */}
            <div style={styles.tabRow}>
                <button onClick={() => setActiveTab('inventario')} style={activeTab === 'inventario' ? styles.tabActive : styles.tab}>
                    Inventario por residente
                </button>
                <button onClick={() => setActiveTab('catalogo')} style={activeTab === 'catalogo' ? styles.tabActive : styles.tab}>
                    Catálogo de medicamentos
                </button>
            </div>

            {/* ══ TAB: CATÁLOGO ══════════════════════════════════════════════════ */}
            {activeTab === 'catalogo' && <>

                {/* ── Toolbar ── */}
                <div style={styles.toolbar}>
                    <div style={styles.searchBox}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ flexShrink: 0 }}>
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, principio activo o lote..."
                            style={styles.searchInput} />
                    </div>
                </div>

                {/* ── Tabla ── */}
                <div style={styles.tableCard}>
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando...</p>
                    ) : filtered.length === 0 ? (
                        <div style={styles.empty}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
                                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
                            </svg>
                            <p style={{ color: '#999', margin: 0 }}>
                                {meds.length === 0 ? 'No hay medicamentos registrados.' : 'Sin resultados.'}
                            </p>
                            {meds.length === 0 && (
                                <button onClick={() => navigate('/dashboard/medicamentos/nuevo')} style={{ ...styles.primaryBtn, marginTop: '16px' }}>
                                    Registrar el primero
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.thead}>
                                        <th style={{ ...styles.th, width: '32px' }}></th>
                                        <th style={styles.th}>Medicamento</th>
                                        <th style={styles.th}>Dosis</th>
                                        <th style={styles.th}>Forma / Vía</th>
                                        <th style={styles.th}>Lote</th>
                                        <th style={styles.th}>F. Vencimiento</th>
                                        <th style={styles.th}>Registrado por</th>
                                        <th style={{ ...styles.th, textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((med, idx) => {
                                        const exp = med.expirationDate;
                                        const expColor = isExpired(exp) ? '#991b1b' : isExpiringSoon(exp) ? '#92400e' : '#333';
                                        return (
                                            <tr key={med.id} style={{ ...styles.tr, backgroundColor: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                                                {/* icono */}
                                                <td style={{ ...styles.td, paddingLeft: '16px' }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8">
                                                        <path d="m10.5 20.5-7-7a5 5 0 1 1 7-7l7 7a5 5 0 0 1-7 7Z" />
                                                        <path d="m8.5 8.5 7 7" />
                                                    </svg>
                                                </td>
                                                {/* nombre */}
                                                <td style={styles.td}>
                                                    <p style={styles.medName}>{med.name}</p>
                                                    {med.activeIngredient && <p style={styles.medSub}>{med.activeIngredient}</p>}
                                                </td>
                                                {/* dosis */}
                                                <td style={styles.td}>
                                                    {(med.dosage || med.dosageUnit) ? (
                                                        <span style={styles.dosisBadge}>
                                                            {med.dosage ?? ''}{med.dosageUnit ? ` ${med.dosageUnit}` : ''}
                                                        </span>
                                                    ) : <span style={{ color: '#ccc' }}>—</span>}
                                                </td>
                                                {/* forma / vía */}
                                                <td style={{ ...styles.td, fontSize: '13px' }}>
                                                    {med.presentation && <p style={{ margin: 0, color: '#374151' }}>{med.presentation}</p>}
                                                    {med.route && <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '11px' }}>{med.route}</p>}
                                                    {!med.presentation && !med.route && <span style={{ color: '#ccc' }}>—</span>}
                                                </td>
                                                {/* lote */}
                                                <td style={{ ...styles.td, color: '#555', fontSize: '13px' }}>
                                                    {med.lotNumber ?? '—'}
                                                </td>
                                                {/* vencimiento */}
                                                <td style={{ ...styles.td, fontWeight: exp ? '600' : 'normal', color: expColor, fontSize: '13px' }}>
                                                    {formatDate(exp)}
                                                    {isExpired(exp) && <span style={styles.expiredTag}> Vencido</span>}
                                                    {isExpiringSoon(exp) && !isExpired(exp) && <span style={styles.soonTag}> Pronto</span>}
                                                </td>
                                                {/* registrado por */}
                                                <td style={{ ...styles.td, color: '#555', fontSize: '13px' }}>
                                                    {med.registeredBy ?? '—'}
                                                </td>
                                                {/* acciones */}
                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                        {/* Historial */}
                                                        <button title="Ver historial de movimientos"
                                                            onClick={() => openHistorial(med)}
                                                            style={styles.actionBtnGray}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                                            </svg>
                                                        </button>
                                                        {/* Editar */}
                                                        <button title="Editar medicamento"
                                                            onClick={() => navigate(`/dashboard/medicamentos/${med.id}`)}
                                                            style={styles.actionBtnBlue}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>
                                                        {/* Eliminar */}
                                                        <button title="Eliminar"
                                                            onClick={() => handleDelete(med)}
                                                            style={styles.actionBtnDanger}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                                                                <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Modal Historial ── */}
                {historialMed && (
                    <div style={styles.backdrop} onClick={() => setHistorialMed(null)}>
                        <div style={styles.modal} onClick={e => e.stopPropagation()}>
                            <div style={styles.modalHeader}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: '#0a3a8a' }}>Historial de movimientos</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#666' }}>{historialMed.name}</p>
                                </div>
                                <button onClick={() => setHistorialMed(null)} style={styles.closeBtn}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>

                            {loadingHistorial ? (
                                <p style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Cargando...</p>
                            ) : historial.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }}>
                                    Sin movimientos registrados.
                                </p>
                            ) : (
                                <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                                    <table style={{ ...styles.table, marginTop: '12px' }}>
                                        <thead>
                                            <tr style={styles.thead}>
                                                <th style={styles.th}>Fecha</th>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Tipo</th>
                                                <th style={styles.th}>Motivo</th>
                                                <th style={styles.th}>Detalles</th>
                                                <th style={styles.th}>Realizado por</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historial.map((mv, idx) => {
                                                const ts = TIPO_STYLE[mv.type] ?? { bg: '#f1f5f9', color: '#475569' };
                                                const dt = new Date(mv.createdAt);
                                                const fecha = `${dt.getDate().toString().padStart(2, '0')}-${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getFullYear()} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
                                                return (
                                                    <tr key={mv.id} style={{ ...styles.tr, backgroundColor: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                                                        <td style={{ ...styles.td, fontSize: '12px', whiteSpace: 'nowrap' }}>{fecha}</td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                                            <span style={{ backgroundColor: ts.bg, color: ts.color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                                                                {mv.type}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...styles.td, fontSize: '12px' }}>{mv.reason ?? '—'}</td>
                                                        <td style={{ ...styles.td, fontSize: '12px' }}>{mv.notes ?? '—'}</td>
                                                        <td style={{ ...styles.td, fontSize: '12px' }}>{mv.performedBy ?? '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}



            </> /* fin tab catálogo */}

            {/* ══ TAB: INVENTARIO POR RESIDENTE ══════════════════════════════════ */}
            {activeTab === 'inventario' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {loadingInv ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando inventario...</p>
                    ) : grouped.length === 0 ? (
                        <div style={styles.empty}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <p style={{ color: '#999', margin: 0 }}>No hay residentes con medicamentos asignados.</p>
                            <p style={{ color: '#bbb', fontSize: '13px', marginTop: '6px' }}>Asigna medicamentos desde la ficha de cada residente.</p>
                        </div>
                    ) : (
                        grouped.map(({ resident, prescriptions: prescs }) => (
                            <div key={resident?.id ?? prescs[0]?.residentId} style={styles.residentCard}>
                                {/* Cabecera del residente */}
                                <div style={styles.residentCardHeader}>
                                    <div style={styles.residentAvatar}>
                                        {resident ? `${resident.firstName?.[0] ?? ''}${resident.lastName?.[0] ?? ''}`.toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <p style={styles.residentName}>
                                            {resident ? `${resident.firstName} ${resident.lastName}` : 'Residente desconocido'}
                                        </p>
                                        {resident?.room && (
                                            <p style={styles.residentMeta}>Hab. {resident.room} · Cama {resident.bed}</p>
                                        )}
                                    </div>
                                    <span style={styles.medCount}>{prescs.length} medicamento{prescs.length !== 1 ? 's' : ''}</span>
                                </div>

                                {/* Tabla de medicamentos */}
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr style={styles.thead}>
                                                <th style={styles.th}>Medicamento</th>
                                                <th style={styles.th}>Dosis</th>
                                                <th style={styles.th}>Indicaciones</th>
                                                <th style={styles.th}>Frecuencia</th>
                                                <th style={styles.th}>Lote</th>
                                                <th style={styles.th}>F. Vencimiento</th>
                                                <th style={styles.th}>Proveedor / Farmacia</th>
                                                <th style={styles.th}>Registrado por</th>
                                                <th style={styles.th}>F. Ingreso</th>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Stock residente</th>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Estado</th>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prescs.map((presc: any, idx: number) => {
                                                const med = presc.medication;
                                                const stockOut = presc.stock === 0;
                                                const status = getResidentMedStatus(presc);
                                                const estadoS = ESTADO_STYLE[status] ?? ESTADO_STYLE['Disponible'];
                                                const exp = med?.expirationDate;
                                                const expColor = isExpired(exp) ? '#991b1b' : isExpiringSoon(exp) ? '#92400e' : '#333';
                                                return (
                                                    <tr key={presc.id} style={{ ...styles.tr, backgroundColor: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                                                        <td style={styles.td}>
                                                            <p style={styles.medName}>{med?.name ?? '—'}</p>
                                                            {med?.activeIngredient && <p style={styles.medSub}>{med.activeIngredient}</p>}
                                                        </td>
                                                        <td style={styles.td}>
                                                            {(med?.dosage || med?.dosageUnit) ? (
                                                                <span style={styles.dosisBadge}>{med.dosage ?? ''}{med.dosageUnit ? ` ${med.dosageUnit}` : ''}</span>
                                                            ) : <span style={{ color: '#ccc' }}>—</span>}
                                                        </td>
                                                        <td style={{ ...styles.td, fontSize: '12px', color: '#555', maxWidth: '150px' }}>
                                                            {presc.instructions ?? <span style={{ color: '#ccc' }}>—</span>}
                                                        </td>
                                                        <td style={{ ...styles.td, fontSize: '12px' }}>
                                                            {presc.frequency ? (
                                                                <span style={styles.freqBadge}>{presc.frequency}</span>
                                                            ) : <span style={{ color: '#ccc' }}>—</span>}
                                                        </td>
                                                        <td style={{ ...styles.td, color: '#555', fontSize: '13px' }}>
                                                            {med?.lotNumber ?? '—'}
                                                        </td>
                                                        <td style={{ ...styles.td, fontWeight: exp ? '600' : 'normal', color: expColor, fontSize: '13px' }}>
                                                            {formatDate(exp)}
                                                            {isExpired(exp) && <span style={styles.expiredTag}> Vencido</span>}
                                                            {isExpiringSoon(exp) && !isExpired(exp) && <span style={styles.soonTag}> Pronto</span>}
                                                        </td>
                                                        <td style={{ ...styles.td, color: '#555', fontSize: '13px' }}>
                                                            {med?.supplier ?? '—'}
                                                        </td>
                                                        <td style={{ ...styles.td, color: '#555', fontSize: '13px' }}>
                                                            {med?.registeredBy ?? '—'}
                                                        </td>
                                                        <td style={{ ...styles.td, color: '#555', fontSize: '13px' }}>
                                                            {formatDate(med?.entryDate)}
                                                        </td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: stockOut ? '#991b1b' : presc.stock <= 5 ? '#92400e' : '#065f46' }}>
                                                                {presc.stock}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                                            <span style={{
                                                                backgroundColor: estadoS.bg, color: estadoS.color,
                                                                border: `1px solid ${estadoS.border}`,
                                                                padding: '3px 10px', borderRadius: '20px',
                                                                fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap',
                                                            }}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                                <button title="Registrar entrada" onClick={() => openInvMov(presc, 'ENTRADA')} style={styles.actionBtnGreen}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                                                    </svg>
                                                                </button>
                                                                <button title="Registrar retiro" onClick={() => openInvMov(presc, 'SALIDA')} disabled={stockOut}
                                                                    style={{ ...styles.actionBtnRed, opacity: stockOut ? 0.4 : 1 }}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                                                    </svg>
                                                                </button>
                                                                <button title="Ver historial" onClick={() => openInvHistorial(presc)} style={styles.actionBtnGray}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}

                    {/* ── Modal: Movimiento de inventario residente ── */}
                    {invMov && (
                        <div style={styles.backdrop} onClick={() => setInvMov(null)}>
                            <div style={{ ...styles.modal, maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
                                <div style={styles.modalHeader}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', color: invMov.tipo === 'SALIDA' ? '#991b1b' : '#065f46' }}>
                                            {invMov.tipo === 'ENTRADA' ? 'Registrar entrada' : 'Registrar retiro'}
                                        </h3>
                                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#666' }}>
                                            {invMov.presc.medication?.name}
                                            {invMov.presc.medication?.dosage ? ` · ${invMov.presc.medication.dosage}${invMov.presc.medication.dosageUnit ?? ''}` : ''}
                                        </p>
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#888' }}>
                                            Stock actual: <strong>{invMov.presc.stock}</strong>
                                        </p>
                                    </div>
                                    <button onClick={() => setInvMov(null)} style={styles.closeBtn}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                    <div style={styles.fieldGroup}>
                                        <label style={styles.fieldLabel}>Cantidad:</label>
                                        <input type="number" min={1} value={invMovQty} onChange={e => setInvMovQty(e.target.value)} style={styles.fieldInput} placeholder="Ej: 5" />
                                    </div>
                                    <div style={styles.fieldGroup}>
                                        <label style={styles.fieldLabel}>Motivo:</label>
                                        <input type="text" value={invMovReason} onChange={e => setInvMovReason(e.target.value)} style={styles.fieldInput}
                                            placeholder={invMov.tipo === 'ENTRADA' ? 'Ej: Reposición semanal' : 'Ej: Administrado por enfermera'} />
                                    </div>
                                    <div style={styles.fieldGroup}>
                                        <label style={styles.fieldLabel}>Realizado por:</label>
                                        <input type="text" value={invMovBy} onChange={e => setInvMovBy(e.target.value)} style={styles.fieldInput} placeholder="Nombre del enfermero/a" />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                    <button onClick={() => setInvMov(null)} style={styles.cancelBtn}>Cancelar</button>
                                    <button onClick={handleInvMovement} disabled={savingInvMov}
                                        style={{ ...styles.primaryBtn, backgroundColor: invMov.tipo === 'SALIDA' ? '#dc2626' : '#16a34a' }}>
                                        {savingInvMov ? 'Guardando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Modal: Historial de residente ── */}
                    {invHist && (
                        <div style={styles.backdrop} onClick={() => setInvHist(null)}>
                            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                                <div style={styles.modalHeader}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', color: '#0a3a8a' }}>Historial de movimientos</h3>
                                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#666' }}>
                                            {invHist.presc.medication?.name} — {invHist.presc.resident?.firstName ?? ''} {invHist.presc.resident?.lastName ?? ''}
                                        </p>
                                    </div>
                                    <button onClick={() => setInvHist(null)} style={styles.closeBtn}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                {loadingInvHist ? (
                                    <p style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Cargando...</p>
                                ) : invHist.movements.length === 0 ? (
                                    <p style={{ textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }}>Sin movimientos registrados.</p>
                                ) : (
                                    <div style={{ overflowY: 'auto', maxHeight: '55vh', marginTop: '12px' }}>
                                        <table style={styles.table}>
                                            <thead>
                                                <tr style={styles.thead}>
                                                    <th style={styles.th}>Fecha</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Tipo</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Cantidad</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Ant.</th>
                                                    <th style={{ ...styles.th, textAlign: 'center' }}>Nuevo</th>
                                                    <th style={styles.th}>Motivo</th>
                                                    <th style={styles.th}>Realizado por</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invHist.movements.map((mv: any, idx: number) => {
                                                    const ts = TIPO_STYLE[mv.type] ?? { bg: '#f1f5f9', color: '#475569' };
                                                    const dt = new Date(mv.createdAt);
                                                    const fecha = `${dt.getDate().toString().padStart(2, '0')}-${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getFullYear()} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
                                                    return (
                                                        <tr key={mv.id} style={{ ...styles.tr, backgroundColor: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                                                            <td style={{ ...styles.td, fontSize: '12px', whiteSpace: 'nowrap' as const }}>{fecha}</td>
                                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                                <span style={{ backgroundColor: ts.bg, color: ts.color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{mv.type}</span>
                                                            </td>
                                                            <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold' }}>{mv.quantity}</td>
                                                            <td style={{ ...styles.td, textAlign: 'center', color: '#666' }}>{mv.previousStock}</td>
                                                            <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: mv.newStock < mv.previousStock ? '#991b1b' : '#065f46' }}>{mv.newStock}</td>
                                                            <td style={{ ...styles.td, fontSize: '12px' }}>{mv.reason ?? '—'}</td>
                                                            <td style={{ ...styles.td, fontSize: '12px' }}>{mv.performedBy ?? '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

const styles = {
    wrapper: { width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e1e4e8', paddingBottom: '15px', flexWrap: 'wrap' as const, gap: '15px' },
    title: { margin: 0, fontSize: '22px', color: '#0a3a8a', fontWeight: 'bold' },
    subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#888' },
    backBtn: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333', padding: '8px 14px',
        borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        fontWeight: '600' as const, transition: 'background-color 0.2s',
    },
    primaryBtn: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white', padding: '9px 18px',
        borderRadius: '7px', fontSize: '14px', fontWeight: '600' as const, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
    },
    toolbar: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
    searchBox: {
        display: 'flex', alignItems: 'center', gap: '8px',
        backgroundColor: 'white', border: '1.5px solid #ddd', borderRadius: '8px',
        padding: '9px 14px',
    },
    searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', fontFamily: 'inherit' },
    filterRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' as const },
    filterBtn: {
        padding: '5px 12px', borderRadius: '6px', border: '1.5px solid #ddd',
        backgroundColor: 'white', color: '#555', fontSize: '12px', cursor: 'pointer',
    },
    filterActive: {
        padding: '5px 12px', borderRadius: '6px', border: '1.5px solid #0a3a8a',
        backgroundColor: '#0a3a8a', color: 'white', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' as const,
    },
    tableCard: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden',
    },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    thead: { backgroundColor: '#f8f9fa' },
    th: {
        padding: '11px 14px', textAlign: 'left' as const, fontSize: '12px',
        fontWeight: '700' as const, color: '#444', borderBottom: '1.5px solid #e1e4e8',
        whiteSpace: 'nowrap' as const,
    },
    tr: { borderBottom: '1px solid #f0f0f0', transition: 'background-color 0.1s' },
    td: { padding: '12px 14px', verticalAlign: 'middle' as const },
    medName: { margin: 0, fontSize: '14px', fontWeight: '600' as const, color: '#111' },
    medSub: { margin: '2px 0 0', fontSize: '11px', color: '#888' },
    dosisBadge: {
        display: 'inline-block', backgroundColor: '#f0f9ff', color: '#0369a1',
        border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '6px',
        fontSize: '12px', fontWeight: '700' as const, whiteSpace: 'nowrap' as const,
    },
    expiredTag: {
        backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '9px',
        padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold',
    },
    soonTag: {
        backgroundColor: '#fef3c7', color: '#92400e', fontSize: '9px',
        padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold',
    },
    actionBtnRed: {
        border: '1.5px solid #fca5a5', backgroundColor: '#fee2e2', color: '#991b1b',
        borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    },
    actionBtnGreen: {
        border: '1.5px solid #6ee7b7', backgroundColor: '#d1fae5', color: '#065f46',
        borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    },
    actionBtnGray: {
        border: '1.5px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#475569',
        borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    },
    actionBtnBlue: {
        border: '1.5px solid #93c5fd', backgroundColor: '#eff6ff', color: '#1d4ed8',
        borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    },
    actionBtnDanger: {
        border: '1.5px solid #fca5a5', backgroundColor: 'white', color: '#dc2626',
        borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    },
    empty: {
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        padding: '60px', color: '#999',
    },
    backdrop: {
        position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(10,58,138,0.3)',
        backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: 1000,
    },
    modal: {
        backgroundColor: 'white', borderRadius: '14px', padding: '24px',
        width: '95%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto' as const,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #e1e4e8',
    },
    modalHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        borderBottom: '1px solid #e1e4e8', paddingBottom: '14px',
    },
    closeBtn: {
        backgroundColor: 'transparent', border: 'none', color: '#666',
        cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px',
    },
    fieldGroup: { display: 'flex', flexDirection: 'column' as const, gap: '5px' },
    fieldLabel: { fontSize: '13px', fontWeight: 'bold' as const, color: '#444' },
    fieldInput: {
        padding: '9px 12px', borderRadius: '7px', border: '1.5px solid #ccc',
        fontSize: '14px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const,
    },
    cancelBtn: {
        backgroundColor: 'transparent', border: '1.5px solid #ccc', color: '#555',
        padding: '8px 16px', borderRadius: '7px', fontSize: '14px', cursor: 'pointer',
    },

    // ── Tabs ──────────────────────────────────────────────────────────────────
    tabRow: {
        display: 'flex', gap: '4px',
        borderBottom: '2px solid #e1e4e8', paddingBottom: '0',
    },
    tab: {
        padding: '10px 20px', border: 'none', background: 'transparent',
        color: '#666', fontSize: '14px', fontWeight: '500' as const, cursor: 'pointer',
        borderBottom: '2px solid transparent', marginBottom: '-2px',
    },
    tabActive: {
        padding: '10px 20px', border: 'none', background: 'transparent',
        color: '#0a3a8a', fontSize: '14px', fontWeight: '700' as const, cursor: 'pointer',
        borderBottom: '2px solid #0a3a8a', marginBottom: '-2px',
    },

    // ── Inventario por residente ───────────────────────────────────────────────
    residentCard: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden',
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
    residentName: { margin: 0, fontSize: '15px', fontWeight: 'bold' as const, color: '#111' },
    residentMeta: { margin: '2px 0 0', fontSize: '12px', color: '#888' },
    medCount: {
        marginLeft: 'auto', fontSize: '12px', color: '#0a3a8a',
        backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: '12px', padding: '2px 10px', fontWeight: '600' as const,
    },
    freqBadge: {
        display: 'inline-block', backgroundColor: '#f0fdf4', color: '#166534',
        border: '1px solid #bbf7d0', borderRadius: '12px', padding: '2px 8px',
        fontSize: '11px', fontWeight: '600' as const, whiteSpace: 'nowrap' as const,
    },
};

export default MedicamentosLista;
