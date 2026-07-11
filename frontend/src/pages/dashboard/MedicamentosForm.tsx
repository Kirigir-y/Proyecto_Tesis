import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import api from '../../api/axios';
import type { DashboardContext } from './DashboardLayout';

const PRESENTACIONES = [
    { group: 'Sólidos orales', items: ['Comprimido', 'Cápsula', 'Polvo'] },
    { group: 'Líquidos', items: ['Jarabe', 'Gotas / Solución oral', 'Ampolla / Inyectable'] },
    { group: 'Tópicos', items: ['Crema / Ungüento', 'Gel / Loción', 'Parche'] },
    { group: 'Inhalados / Nasales', items: ['Inhalador (Puff)', 'Nebulización', 'Spray nasal'] },
    { group: 'Oftálmicos / Óticos', items: ['Gotas oftálmicas', 'Gotas óticas'] },
    { group: 'Rectales / Vaginales', items: ['Supositorio', 'Óvulo'] },
    { group: 'Otro', items: ['Otro'] },
];

const VIAS_POR_PRESENTACION: Record<string, string[]> = {
    'Comprimido': ['Oral (VO)', 'Sublingual (SL)'],
    'Cápsula': ['Oral (VO)'],
    'Polvo': ['Oral (VO)'],
    'Jarabe': ['Oral (VO)'],
    'Gotas / Solución oral': ['Oral (VO)'],
    'Ampolla / Inyectable': ['Intramuscular (IM)', 'Intravenosa (IV)', 'Subcutánea (SC)'],
    'Crema / Ungüento': ['Tópica / Cutánea'],
    'Gel / Loción': ['Tópica / Cutánea'],
    'Parche': ['Transdérmica'],
    'Inhalador (Puff)': ['Inhalada'],
    'Nebulización': ['Inhalada'],
    'Spray nasal': ['Nasal'],
    'Gotas oftálmicas': ['Oftálmica'],
    'Gotas óticas': ['Ótica'],
    'Supositorio': ['Rectal'],
    'Óvulo': ['Vaginal'],
    'Otro': ['Oral (VO)', 'Intravenosa (IV)', 'Intramuscular (IM)', 'Subcutánea (SC)', 'Tópica / Cutánea', 'Inhalada', 'Sublingual (SL)', 'Rectal', 'Oftálmica', 'Ótica', 'Transdérmica', 'Nasal', 'Vaginal'],
};

const UNIDADES_DOSIS = ['mg', 'mcg', 'UI', 'ml', 'gotas', '%'];


const MedicamentosForm = () => {
    const navigate = useNavigate();
    const { user } = useOutletContext<DashboardContext>();
    const isTens = user.role === 'TENS';
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);

    // TENS solo puede consultar el módulo: bloquear acceso directo por URL al formulario
    useEffect(() => {
        if (isTens) navigate('/dashboard/medicamentos', { replace: true });
    }, [isTens, navigate]);

    // Identificación
    const [name, setName] = useState('');
    const [activeIngredient, setActiveIngredient] = useState('');
    const [dosage, setDosage] = useState('');
    const [dosageUnit, setDosageUnit] = useState('');
    const [lotNumber, setLotNumber] = useState('');

    // Presentación y vía
    const [presentation, setPresentation] = useState('');
    const [route, setRoute] = useState('');

    const handlePresentationChange = (newVal: string) => {
        setPresentation(newVal);
        const validRoutes = VIAS_POR_PRESENTACION[newVal] || [];
        if (validRoutes.length === 1) {
            setRoute(validRoutes[0]);
        } else if (!validRoutes.includes(route)) {
            setRoute('');
        }
    };

    // Inventario
    const [stock, setStock] = useState('0');
    const [minStock, setMinStock] = useState('');
    const [unitsPerPackage, setUnitsPerPackage] = useState('');
    const [supplier, setSupplier] = useState('');
    const [registeredBy, setRegisteredBy] = useState('');

    // Fechas
    const [entryDate, setEntryDate] = useState(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const [expirationDate, setExpirationDate] = useState('');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            const stored = localStorage.getItem('user');
            if (stored) {
                const u = JSON.parse(stored);
                setRegisteredBy(u.username || '');
            }
        }
    }, [isEditing]);

    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            api.get(`/medications/${id}`)
                .then(res => {
                    const m = res.data;
                    setName(m.name ?? '');
                    setActiveIngredient(m.activeIngredient ?? '');
                    setDosage(m.dosage ?? '');
                    setDosageUnit(m.dosageUnit ?? '');
                    setLotNumber(m.lotNumber ?? '');
                    setPresentation(m.presentation ?? '');
                    setRoute(m.route ?? '');
                    setStock(String(m.stock ?? 0));
                    setMinStock(m.minStock ? String(m.minStock) : '');
                    setUnitsPerPackage(m.unitsPerPackage ? String(m.unitsPerPackage) : '');
                    setSupplier(m.supplier ?? '');
                    setRegisteredBy(m.registeredBy ?? '');
                    setEntryDate(m.entryDate ?? '');
                    setExpirationDate(m.expirationDate ?? '');
                })
                .catch(() => { alert('No se pudo cargar el medicamento.'); navigate('/dashboard/medicamentos'); })
                .finally(() => setLoading(false));
        }
    }, [id, isEditing, navigate]);

    const handleSave = async () => {
        if (!name.trim()) { alert('El nombre del medicamento es obligatorio.'); return; }
        const payload = {
            name: name.trim(),
            activeIngredient: activeIngredient.trim() || null,
            dosage: dosage.trim() || null,
            dosageUnit: dosageUnit.trim() || null,
            lotNumber: lotNumber.trim() || null,
            presentation: presentation || null,
            route: route || null,
            stock: Number(stock) || 0,
            minStock: minStock ? Number(minStock) : null,
            unitsPerPackage: unitsPerPackage ? Number(unitsPerPackage) : null,
            supplier: supplier.trim() || null,
            registeredBy: registeredBy.trim() || null,
            entryDate: entryDate || null,
            expirationDate: expirationDate || null,
        };
        try {
            if (isEditing && id) await api.put(`/medications/${id}`, payload);
            else await api.post('/medications', payload);
            navigate('/dashboard/medicamentos');
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Error al guardar.');
        }
    };

    const expiredWarning = expirationDate && new Date(expirationDate) < new Date();
    const expiringSoon = expirationDate && !expiredWarning &&
        (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30;

    if (loading) return <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando...</p>;

    return (
        <div style={s.wrapper}>
            {/* Header */}
            <div style={s.header}>
                <button onClick={() => navigate('/dashboard/medicamentos')} style={s.backBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                    Volver
                </button>
                <h2 style={s.title}>{isEditing ? 'Editar Medicamento' : 'Nuevo Medicamento'}</h2>
                <div style={{ width: '90px' }} />
            </div>

            {/* ── Sección 1: Identificación y Presentación ── */}
            <div style={s.card}>
                <h3 style={s.sectionTitle}>
                    <span style={s.sectionIcon}></span> Identificación y Presentación del medicamento
                </h3>
                <div style={s.grid2}>
                    <div style={s.field}>
                        <label style={s.label}>Nombre comercial <span style={s.required}>*</span></label>
                        <input value={name} onChange={e => setName(e.target.value)} disabled={isEditing}
                            style={{ ...s.input, ...(isEditing ? { backgroundColor: '#f8f9fa', color: '#666', cursor: 'not-allowed' } : {}) }} placeholder="Ej: Paracetamol, Enalapril" />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Forma farmacéutica</label>
                        <select value={presentation} onChange={e => handlePresentationChange(e.target.value)} style={s.input} disabled={isEditing}>
                            <option value="">— Seleccionar —</option>
                            {PRESENTACIONES.map(g => (
                                <optgroup key={g.group} label={g.group}>
                                    {g.items.map(i => <option key={i} value={i}>{i}</option>)}
                                </optgroup>
                            ))}
                        </select>
                        <span style={s.hint}>Tipo físico del medicamento</span>
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Principio activo (DCI)</label>
                        <input value={activeIngredient} onChange={e => setActiveIngredient(e.target.value)} disabled={isEditing}
                            style={{ ...s.input, ...(isEditing ? { backgroundColor: '#f8f9fa', color: '#666', cursor: 'not-allowed' } : {}) }} placeholder="Ej: Paracetamol, Enalapril maleato" />
                        <span style={s.hint}>Nombre genérico internacional</span>
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Vía de administración</label>
                        <select value={route} onChange={e => setRoute(e.target.value)} style={s.input} disabled={isEditing || !presentation}>
                            <option value="">{presentation ? '— Seleccionar —' : 'Selecciona forma farmacéutica...'}</option>
                            {(VIAS_POR_PRESENTACION[presentation] || []).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <span style={s.hint}>Cómo se administra al residente</span>
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Dosis por unidad</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input value={dosage} onChange={e => setDosage(e.target.value)} disabled={isEditing}
                                style={{ ...s.input, flex: 2, ...(isEditing ? { backgroundColor: '#f8f9fa', color: '#666', cursor: 'not-allowed' } : {}) }} placeholder="Ej: 500, 250, 10" type="text" />
                            <select value={dosageUnit} onChange={e => setDosageUnit(e.target.value)} disabled={isEditing}
                                style={{ ...s.input, flex: 1.2, ...(isEditing ? { backgroundColor: '#f8f9fa', color: '#666', cursor: 'not-allowed' } : {}) }}>
                                <option value="">Unidad</option>
                                {UNIDADES_DOSIS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <span style={s.hint}>Cantidad y unidad por dosis</span>
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>N° de Lote</label>
                        <input value={lotNumber} onChange={e => setLotNumber(e.target.value)}
                            style={s.input} placeholder="Ej: LOT-2024-0312" />
                    </div>
                </div>

                {/* Preview visual de la presentación */}
                {(presentation || route) && (
                    <div style={s.presentationPreview}>
                        {presentation && (
                            <span style={s.previewBadge}>
                                {getPresentationIcon(presentation)} {presentation}
                            </span>
                        )}
                        {route && (
                            <span style={{ ...s.previewBadge, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd' }}>
                                🩺 {route}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Sección 3: Fechas ── */}
            <div style={s.card}>
                <h3 style={s.sectionTitle}>
                    <span style={s.sectionIcon}></span> Fechas
                </h3>
                <div style={s.grid2}>
                    <div style={s.field}>
                        <label style={s.label}>Fecha de ingreso</label>
                        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} style={s.input} disabled={isEditing} />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Fecha de vencimiento</label>
                        <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
                            style={{ ...s.input, borderColor: expiredWarning ? '#dc2626' : expiringSoon ? '#d97706' : '#ccc' }} />
                        {expiredWarning && (
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626', fontWeight: 'bold' }}>
                                Este medicamento ya está vencido.
                            </p>
                        )}
                        {expiringSoon && (
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#d97706', fontWeight: 'bold' }}>
                                Vence en menos de 30 días.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Sección 5: Inventario ── */}
            <div style={s.card}>
                <h3 style={s.sectionTitle}>
                    <span style={s.sectionIcon}></span> Inventario
                </h3>
                <div style={s.grid3}>
                    <div style={s.field}>
                        <label style={s.label}>Unidades por envase</label>
                        <input type="number" min={1} value={unitsPerPackage} onChange={e => setUnitsPerPackage(e.target.value)} disabled={isEditing}
                            style={{ ...s.input, ...(isEditing ? { backgroundColor: '#f8f9fa', color: '#666', cursor: 'not-allowed' } : {}) }} placeholder="Ej: 30, 100, 10" />
                        <span style={s.hint}>Comprimidos / ampollas por caja</span>
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Proveedor / Farmacia</label>
                        <input value={supplier} onChange={e => setSupplier(e.target.value)} disabled={isEditing}
                            style={{ ...s.input, ...(isEditing ? { backgroundColor: '#f8f9fa', color: '#666', cursor: 'not-allowed' } : {}) }} placeholder="Ej: Farmacia Cruz Verde, CENABAST" />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Registrado por <span style={s.required}>*</span></label>
                        <input value={registeredBy} disabled={true}
                            style={{ ...s.input, backgroundColor: '#f8f9fa', color: '#666', cursor: 'not-allowed' }} placeholder="Nombre del enfermero/a encargado" />
                        <span style={s.hint}>Quién crea o actualiza esta entrada en el inventario</span>
                    </div>
                </div>
            </div>

            {/* Acciones */}
            <div style={s.actions}>
                <button onClick={() => navigate('/dashboard/medicamentos')} style={s.cancelBtn}>Cancelar</button>
                <button onClick={handleSave} style={s.saveBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                    </svg>
                    Guardar medicamento
                </button>
            </div>
        </div>
    );
};

const getPresentationIcon = (p: string): string => {
    const pl = p.toLowerCase();
    if (pl.includes('comprimido') || pl.includes('cápsula') || pl.includes('polvo')) return '💊';
    if (pl.includes('jarabe') || pl.includes('gotas') || pl.includes('solución') || pl.includes('ampolla') || pl.includes('inyectable')) return '💧';
    if (pl.includes('crema') || pl.includes('ungüento') || pl.includes('gel') || pl.includes('loción') || pl.includes('parche')) return '🧴';
    if (pl.includes('inhalador') || pl.includes('puff') || pl.includes('nebulización') || pl.includes('spray')) return '🌬️';
    if (pl.includes('oftálmicas') || pl.includes('óticas')) return '👁️';
    if (pl.includes('supositorio') || pl.includes('óvulo')) return '🧪';
    return '📦';
};

const s = {
    wrapper: { width: '100%', maxWidth: '920px', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '2px solid #e1e4e8', paddingBottom: '15px',
        flexWrap: 'wrap' as const, gap: '12px',
    },
    title: { margin: 0, fontSize: '22px', color: '#0a3a8a', fontWeight: 'bold' },
    backBtn: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333', padding: '8px 14px',
        borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    },
    card: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    },
    sectionTitle: {
        margin: '0 0 18px', fontSize: '15px', color: '#0a3a8a', fontWeight: 'bold' as const,
        borderBottom: '1px solid #e8edf5', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px',
    },
    sectionIcon: { fontSize: '18px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
    field: { display: 'flex', flexDirection: 'column' as const, gap: '5px' },
    label: { fontSize: '13px', fontWeight: '600' as const, color: '#374151' },
    required: { color: '#dc2626' },
    hint: { fontSize: '11px', color: '#9ca3af', marginTop: '1px' },
    input: {
        padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #ccc',
        fontSize: '14px', outline: 'none', fontFamily: 'inherit',
        width: '100%', boxSizing: 'border-box' as const, transition: 'border-color 0.15s',
    },
    presentationPreview: {
        marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' as const,
        padding: '10px 14px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e1e4e8',
    },
    previewBadge: {
        backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #86efac',
        padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' as const,
        display: 'inline-flex', alignItems: 'center', gap: '5px',
    },
    actions: {
        display: 'flex', justifyContent: 'flex-end', gap: '12px',
        paddingBottom: '20px', paddingTop: '4px',
    },
    cancelBtn: {
        backgroundColor: 'transparent', border: '1.5px solid #ccc', color: '#555',
        padding: '9px 18px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
    },
    saveBtn: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white', padding: '9px 22px',
        borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' as const, cursor: 'pointer',
        display: 'flex', alignItems: 'center', boxShadow: '0 4px 6px rgba(10,58,138,0.2)',
    },
};

export default MedicamentosForm;
