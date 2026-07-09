# Documentación — 29 de junio de 2026

Ese día hubo dos focos de trabajo sobre el mismo proyecto:

1. **Claude Code** (esta herramienta) implementó el módulo de Medicamentos completo, el pivote de inventario por residente, y conectó toda la navegación del dashboard (que hasta ese momento no estaba enlazada).
2. El usuario le encargó a **Antigravity** (otra herramienta agéntica) una serie de ajustes de seguimiento sobre esos mismos módulos. Esas instrucciones se documentan tal como fueron entregadas — al momento de escribir esto no hay cambios de archivo posteriores a los de Claude Code en este working tree, así que su implementación (si ya se aplicó) vive en otro entorno/checkout no reflejado acá.

---

## Parte 1 — Trabajo de Claude Code

### 1. Conexión del dashboard (antes desconectado)
Antes de hoy, `App.tsx` solo renderizaba `<Login/>` sin router, y `app.module.ts` solo registraba `UsersModule`/`AuthModule` — el resto de los módulos ya existía como archivos pero no era alcanzable desde la app.

- `backend/src/app.module.ts`: se registraron `ShiftReportsModule`, `CalendarModule`, `ResidentsModule`, `MedicationsModule`; además `synchronize` pasó de `true` fijo a `process.env.NODE_ENV !== 'production'`.
- `frontend/src/App.tsx`: se agregó React Router completo (`BrowserRouter`/`Routes`/`Route`) con todas las rutas de `/dashboard/*` (novedades, calendario, residentes, medicamentos).
- `frontend/src/pages/dashboard/DashboardLayout.tsx` y `DashboardHome.tsx` (nuevos): navbar de navegación entre módulos + grid de accesos rápidos, con visibilidad de "Administración de medicamento" / "Retiro de medicamento" condicionada por rol.

### 2. Módulo de Medicamentos (backend, construido desde cero)
- `Medication` (catálogo): identificación, presentación/vía, información clínica, `stock`/`minStock`/`unitsPerPackage`, proveedor, `registeredBy`, fechas, `estado` calculado dinámicamente (Agotado / Vencido / Por Vencer / Stock Bajo / Disponible).
- `MedicationMovement`: historial de ENTRADA/SALIDA/MODIFICACION sobre el catálogo.
- CRUD completo + `GET/POST :id/movements` en `medications.controller.ts`.

### 3. Pivote de arquitectura: inventario por residente
Implementación inicial: un `dispenseMedication` que descontaba del `stock` compartido del catálogo. El usuario corrigió esto explícitamente porque la empresa **no maneja un inventario general** — cada residente necesita su propio seguimiento, aunque comparta el medicamento del catálogo con otros.

Cambio aplicado:
- `ResidentMedication` (prescripción): vincula `Resident` ↔ `Medication`, con `instructions`, `frequency`, `startDate`, `active` (soft-delete) y **`stock` propio del residente**.
- `ResidentMedicationMovement`: ledger de ENTRADA/SALIDA por prescripción, independiente del catálogo.
- `residents.service.ts`/`controller.ts`/`module.ts` reescritos: se eliminó el flujo de dispensación contra el catálogo; se agregó `GET /residents/medications/inventory` (todas las prescripciones activas, para la vista de inventario consolidado) y `GET/POST /residents/:id/medications/:prescId/movements`.
- Se quitó el botón "Dispensar" de la ficha de residente (queda reservado para un futuro módulo de administración de medicamento).

### 4. Frontend de medicamentos y residentes
- `MedicamentosLista.tsx`: se agregaron dos tabs — "Catálogo de medicamentos" (activo por defecto al cierre de la sesión) e "Inventario por residente" (agrupado por residente, con su propio stock y acciones Entrada/Retiro/Historial).
- `MedicamentosForm.tsx`: formulario de catálogo con identificación, presentación/vía, fechas, proveedor.
- `ResidentesForm.tsx`: sección "Medicamentos recetados" — selecciona un medicamento del catálogo y registra instrucciones/frecuencia/fecha de inicio, sin acciones de stock.

### 5. Pendiente al cierre de la sesión de Claude
Quedó identificado pero sin implementar: mostrar el tab de Inventario por defecto, mover las alertas de stock mínimo del catálogo al inventario, y mostrar `registeredBy`/proveedor en el inventario. **Este pendiente quedó superado por las instrucciones que el usuario le dio a Antigravity (Parte 2)**, que cubren lo mismo con más detalle.

---

## Parte 2 — Instrucciones entregadas a Antigravity

El usuario le pidió a Antigravity revisar el trabajo de Claude sobre "ficha de residentes" y "retiro de medicamento", y aplicar lo siguiente:

1. **Orden de tabs**: que el "Inventario de residentes" se muestre primero, intercambiando su posición con "Catálogo de medicamentos".
2. **Alertas de stock**: mover la alerta de stock mínimo y el stock visible del catálogo al inventario — el catálogo deja de representar un inventario real. Registrar un medicamento solo registra la *ficha/entidad de un producto*, no una existencia física con stock; los stocks viven únicamente en los inventarios de cada residente.
3. **Acciones de stock centralizadas**: agregar/quitar stock (entrada/salida) debe existir **solo** en el módulo de retiro de medicamento (inventario por residente) — no en la ficha de residente.
4. **Stock mínimo fijo**: el umbral de stock mínimo queda integrado al sistema con valor **5** (no es un campo que se configure por medicamento/residente).
5. **Ficha de residente simplificada**: solo permite seleccionar el medicamento (que luego aparece en el inventario) y registrar indicaciones — todo lo de stock/movimientos queda fuera de esta pantalla.
6. **Inventario por residente = catálogo + asignación**: debe mostrar toda la información que antes se mostraba en el catálogo (incluido su historial), pero ahora asignada a la persona correspondiente.
7. **Edición del catálogo restringida**: solo se puede editar Lote y Fecha de vencimiento; esos cambios deben quedar registrados en un historial propio del catálogo.
8. **Autocompletado**: los campos que falten al registrar se rellenan con los datos ya existentes del medicamento; "Registrado por" se completa automáticamente con la cuenta del usuario que hace el registro.
9. **Ajustes de UI**: centrar el texto en la sección de medicamentos, agregar un botón "volver al panel de módulos", y corregir el comportamiento responsive del navbar.
10. **Limpieza de UI**: quitar el mensaje "medicamento registrado" debajo del título, quitar los botones debajo del buscador del catálogo (sin uso), y en el historial de un medicamento quitar las columnas Stock, Stock anterior, Stock nuevo y Residente (ya no aplican en ese apartado).
