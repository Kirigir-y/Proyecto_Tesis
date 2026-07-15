import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const startTime = performance.now();
        console.log('[LOGIN] Formulario enviado', {
            username,
            passwordLength: password.length,
            timestamp: new Date().toISOString(),
        });

        if (!username.trim() || !password) {
            console.warn('[LOGIN] Campos vacíos detectados, se bloquea el envío', {
                usernameVacio: !username.trim(),
                passwordVacio: !password,
            });
            setError('Debe ingresar usuario y contraseña');
            return;
        }

        setError('');
        try {
            console.log('[LOGIN] Enviando petición POST /auth/login...');
            const response = await api.post('/auth/login', {
                username: username.trim(),
                password,
            });
            console.log(`[LOGIN] Respuesta recibida en ${Math.round(performance.now() - startTime)}ms`, {
                status: response.status,
                user: response.data.user,
                tokenRecibido: Boolean(response.data.access_token),
            });

            // Save token and user role
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            console.log('[LOGIN] Token y usuario guardados en localStorage');

            console.log('[LOGIN] Redirigiendo a /dashboard');
            navigate('/dashboard');
        } catch (err: any) {
            console.error(`[LOGIN] Falló en ${Math.round(performance.now() - startTime)}ms`);
            console.error('[LOGIN] Error completo:', err);
            console.error('[LOGIN] Detalle del error:', {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                mensajeAxios: err.message,
                codigo: err.code,
                urlDestino: err.config?.baseURL + err.config?.url,
            });

            const serverMessage = err.response?.data?.message;
            if (serverMessage) {
                console.warn('[LOGIN] Mensaje del servidor:', serverMessage);
                setError(Array.isArray(serverMessage) ? serverMessage[0] : serverMessage);
            } else if (err.message) {
                console.warn('[LOGIN] Sin respuesta del servidor, error de red/conexión');
                setError(`Error de conexión: ${err.message}`);
            } else {
                setError('Credenciales incorrectas');
            }
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.header}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '4px' }}>
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#2bb8ae" />
                    </svg>
                    <h2 style={styles.title}>Ingrese</h2>
                </div>

                {error && <p style={{ color: '#c0392b', textAlign: 'center', margin: '0 0 10px 0' }}>{error}</p>}

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Usuario:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={styles.input}
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Contraseña:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input}
                    />
                </div>

                <button type="submit" style={styles.button}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                        <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17Z" fill="white" />
                    </svg>
                    Iniciar Sesion
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(150deg, #081b3f 0%, #0d3a8f 55%, #1568b8 100%)',
        fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
        margin: 0,
        padding: 0
    },
    form: {
        padding: '3rem 3.5rem',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 45px rgba(4,16,48,0.35)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1.2rem',
        width: '100%',
        maxWidth: '400px',
        boxSizing: 'border-box' as const
    },
    header: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        marginBottom: '15px'
    },
    title: {
        margin: 0,
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#0a2255'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '6px'
    },
    label: {
        fontSize: '14px',
        color: '#0a2255',
        fontWeight: '500'
    },
    input: {
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1.5px solid #c3d0e6',
        backgroundColor: 'transparent',
        fontSize: '16px',
        outline: 'none',
        color: '#0a2255',
        width: '100%',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit'
    },
    button: {
        padding: '14px',
        backgroundColor: '#2bb8ae',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '15px',
        width: '100%',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit'
    }
};

export default Login;