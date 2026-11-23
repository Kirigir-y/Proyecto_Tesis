# R.A.O.C. App (Expo / React Native)

Aplicación móvil para el personal cuidador del ELEAM. Permite registrar el aseo,
la alimentación y las actividades del turno noche, consultar el calendario,
gestionar el inventario de insumos, registrar visitas y salidas de los
residentes y comunicarse por mensajería en tiempo real. Se conecta al mismo
backend NestJS que la plataforma web (`../backend`).

## 1. Conexión con el servidor

La aplicación no necesita configurarse: al abrirse busca automáticamente el
servidor dentro de la red Wi-Fi (servicio `GET /api/health`, puerto 3000). El
celular y el computador servidor deben estar conectados a la misma red.

- **Dirección fija (opcional):** si el servidor está en otra red o en internet,
  se puede definir `EXPO_PUBLIC_API_URL` antes de compilar. Para compilar con
  EAS se configura en el perfil correspondiente de `eas.json` (EAS no lee el
  archivo `.env` local). Ver `.env.example`.
- **Configuración manual (soporte técnico):** en la pantalla de inicio de
  sesión, mantener presionado el título abre el ingreso manual de la dirección
  del servidor. Queda guardada en el celular.

## 2. Levantar el backend

Desde la raíz del repositorio:

```
docker compose up -d --build
```

Levanta la base de datos, el backend (puerto 3000) y la plataforma web
(puerto 80). Los datos de conexión se definen en el archivo `.env` de la raíz
(ver `.env.example`).

## 3. Desarrollo

La pantalla de Mensajes usa `react-native-keyboard-controller`, que incluye
código nativo, por lo que no funciona con Expo Go. Se necesita un
*development build* propio (una sola vez):

```
npm install
npm install -g eas-cli
eas login
eas build --platform android --profile development
```

Después de instalar ese APK en el celular, el trabajo diario se hace con:

```
npx expo start
```

y se escanea el código QR desde la aplicación instalada. Solo hay que repetir
el build si se agrega otra librería nativa.

## 4. Generar el APK para instalar

```
eas build --platform android --profile preview
```

Genera el instalador final, autónomo, que se instala en los celulares del
establecimiento.

## 5. Primer ingreso

Al iniciarse con la base de datos vacía, el backend crea la cuenta `admin` con
la contraseña `admin123` (o la definida en `ADMIN_INITIAL_PASSWORD`). Las
demás cuentas (Enfermero, TENS y Cuidador) se crean desde "Gestión de usuarios"
en la plataforma web.

## Estructura

- `src/config.ts` y `src/api/discovery.ts`: dirección del servidor y búsqueda
  automática en la red.
- `src/context/AuthContext.tsx`: inicio de sesión; el token se guarda con
  `expo-secure-store`.
- `src/context/TurnoContext.tsx`: informe del turno actual (aseo, alimentación
  y turno noche), con cambio automático de turno y sincronización en tiempo real.
- `src/screens/turno/`: registro por habitación y cama.
- `src/screens/calendario/`: consulta de eventos.
- `src/screens/visitas/`: visitas y salidas de los residentes.
- `src/screens/inventario/`: inventario de insumos.
- `src/screens/mensajes/`: mensajería en tiempo real con mensajes fijados.

## Seguridad

- El backend valida los permisos de cada rol, sin depender de lo que muestre la
  aplicación. Por ejemplo, el cuidador no puede modificar las novedades del
  informe de turno aunque la aplicación lo intente.
- Todas las rutas, salvo el inicio de sesión y `/api/health`, exigen un token
  de sesión válido.
