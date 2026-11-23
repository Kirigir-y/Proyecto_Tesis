import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ROLES = [
    { value: 'cuidador', label: 'Cuidador' },
    { value: 'TENS', label: 'TENS' },
    { value: 'Enfermero', label: 'Enfermero' },
    { value: 'admin', label: 'Administrador' },
];

const UsuarioForm = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('cuidador');
    const [active, setActive] = useState(true);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isEditing) return;
        setLoading(true);
        api.get('/users')
            .then(res => {
                const found = res.data.find((u: any) => u.id === id);
                if (!found) { showToast('Usuario no encontrado.'); navigate('/dashboard/usuarios'); return; }
                setUsername(found.username);
                setEmail(found.email || '');
                setRole(found.role);
                setActive(found.active);
            })
            .catch((e) => showToast(e?.response?.data?.message || 'No se pudo cargar el usuario.'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSave = async () => {
        if (!username.trim()) { showToast('El nombre de usuario es obligatorio.'); return; }
        if (!isEditing && !password) { showToast('La contraseña es obligatoria para una cuenta nueva.'); return; }

        setSaving(true);
        try {
            if (isEditing) {
                const body: any = { username: username.trim(), email: email.trim() || null, role, active };
                if (password) body.password = password;
                await api.put(`/users/${id}`, body);
            } else {
                await api.post('/users', {
                    username: username.trim(),
                    email: email.trim() || undefined,
                    password,
                    role,
                });
            }
            navigate('/dashboard/usuarios');
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'No se pudo guardar la cuenta.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando...</p>;

    return (
        <div style={styles.formContainer}>
            <div style={styles.moduleHeader}>
                <button onClick={() => navigate('/dashboard/usuarios')} style={styles.backButton}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Volver
                </button>
                <h2 style={styles.moduleTitle}>{isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>
            </div>

            <div style={styles.formPanel}>
                <div style={styles.formGrid}>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>Nombre de usuario:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="ej: mgonzalez"
                            style={styles.formInput}
                        />
                    </div>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>Rol:</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} style={styles.formInput}>
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ ...styles.formGrid, marginTop: '15px' }}>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>
                            {isEditing ? 'Nueva contraseña (dejar en blanco para no cambiarla):' : 'Contraseña:'}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={isEditing ? '••••••••' : 'Contraseña inicial'}
                            style={styles.formInput}
                        />
                    </div>
                    <div style={styles.inputWrapper}>
                        <label style={styles.inputLabel}>Email (opcional):</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            style={styles.formInput}
                        />
                    </div>
                </div>

                {isEditing && (
                    <div style={{ marginTop: '15px' }}>
                        <label style={styles.checkboxLabel}>
                            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                            Cuenta activa (desmarcar para impedir el inicio de sesión sin eliminarla)
                        </label>
                    </div>
                )}
            </div>

            <div style={styles.formActions}>
                <button onClick={() => navigate('/dashboard/usuarios')} style={styles.secondaryButton}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </div>
    );
};

const styles = {
    formContainer: { width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
    moduleHeader: { display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '2px solid #e1e4e8', paddingBottom: '15px' },
    moduleTitle: { margin: 0, fontSize: '22px', color: '#0a3a8a', fontWeight: 'bold' },
    backButton: {
        backgroundColor: '#e1e4e8', border: 'none', color: '#333', padding: '8px 14px',
        borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
    },
    formPanel: {
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e1e4e8',
        padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    inputWrapper: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
    inputLabel: { fontSize: '14px', fontWeight: 'bold', color: '#444' },
    formInput: {
        padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #ccc',
        fontSize: '15px', outline: 'none', fontFamily: 'inherit',
    },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#444' },
    formActions: { display: 'flex', justifyContent: 'flex-end', gap: '15px' },
    secondaryButton: {
        backgroundColor: 'transparent', border: '1px solid #ccc', color: '#555',
        padding: '10px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '500' as const, cursor: 'pointer',
    },
    saveButton: {
        backgroundColor: '#0a3a8a', border: 'none', color: 'white', padding: '10px 24px',
        borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' as const, cursor: 'pointer',
    },
};

export default UsuarioForm;
