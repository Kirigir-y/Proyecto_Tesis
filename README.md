# Proyecto de Tesis - Orquestación con Docker Compose

Este proyecto consiste en una arquitectura de microservicios que incluye un **Frontend** (React + Vite), un **Backend** (NestJS) y una **Base de Datos** (PostgreSQL). Todos los componentes están orquestados mediante Docker Compose para facilitar su despliegue.

## Estructura del Proyecto

- `backend/`: Servidor de API construido con NestJS.
- `frontend/`: Aplicación cliente construida con React y Vite.
- `db/`: Scripts de inicialización y configuración de PostgreSQL.
- `docker-compose.yml`: Archivo de orquestación de servicios.
- `.env.example`: Ejemplo de las variables de entorno necesarias.

## Requisitos Previos

- Tener instalado [Docker](https://www.docker.com/get-started) y [Docker Compose](https://docs.docker.com/compose/install/).

## Instrucciones de Despliegue

Sigue estos pasos para levantar el proyecto en tu máquina local:

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DE_TU_REPOSITORIO>
   cd <NOMBRE_DE_LA_CARPETA>
   ```

2. **Configurar variables de entorno (Opcional):**
   El proyecto cuenta con valores por defecto razonables en el `docker-compose.yml`. Sin embargo, puedes personalizar la configuración creando un archivo `.develop.env`:
   ```bash
   cp .env.example .develop.env
   ```

3. **Levantar el proyecto:**
   Ejecuta el siguiente comando en la raíz del proyecto:
   ```bash
   docker compose up --build
   ```

## Acceso a los Servicios

Una vez que los contenedores estén en ejecución, puedes acceder a ellos en las siguientes direcciones:

- **Frontend:** [http://localhost](http://localhost) (Puerto 80)
- **Backend API:** [http://localhost:3000/api](http://localhost:3000/api) (Puerto 3000)
- **Base de Datos:** Puerto 5432

---
Desarrollado como parte de la entrega de Docker Compose.
