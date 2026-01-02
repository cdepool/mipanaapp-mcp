# MI PANA APP - MCP Server

Servidor MCP (Model Context Protocol) para gestión de viajes, conductores y tarifas de MI PANA APP.

## 🚀 Características

- **Búsqueda de conductores** disponibles por ubicación y radio
- **Cálculo de tarifas** dinámicas basadas en distancia y tiempo
- **Gestión de viajes** (crear, actualizar, completar)
- **Seguimiento en tiempo real** de ubicación de conductores
- **Estadísticas de conductores** por período
- **Cálculo de distancias** usando fórmula de Haversine

## 📋 Herramientas Disponibles

### 1. `buscar_conductores_disponibles`
Busca conductores disponibles en un radio específico.

**Parámetros:**
- `latitud` (number): Latitud del punto de búsqueda
- `longitud` (number): Longitud del punto de búsqueda
- `radio_km` (number, opcional): Radio de búsqueda en km (default: 5)

### 2. `crear_viaje`
Crea una nueva solicitud de viaje.

**Parámetros:**
- `user_id` (string): ID del usuario
- `origen` (object): { latitud, longitud, direccion }
- `destino` (object): { latitud, longitud, direccion }
- `metodo_pago` (string): efectivo | transferencia | pago_movil

### 3. `calcular_tarifa`
Calcula la tarifa estimada de un viaje.

**Parámetros:**
- `distancia_km` (number): Distancia en kilómetros
- `duracion_min` (number, opcional): Duración en minutos
- `tipo_servicio` (string, opcional): mototaxi | el_pana | el_amigo | full_pana
- `moneda` (string, opcional): BS | USD

### 4. `actualizar_ubicacion_conductor`
Actualiza la ubicación en tiempo real de un conductor.

**Parámetros:**
- `conductor_id` (string): ID del conductor
- `latitud` (number): Latitud actual
- `longitud` (number): Longitud actual
- `rumbo` (number, opcional): Dirección en grados (0-360)

### 5. `obtener_estadisticas_conductor`
Obtiene estadísticas de rendimiento de un conductor.

**Parámetros:**
- `conductor_id` (string): ID del conductor
- `periodo` (string, opcional): today | week | month | all_time

### 6. `completar_viaje`
Marca un viaje como completado y calcula la tarifa final.

**Parámetros:**
- `viaje_id` (string): ID del viaje
- `distancia_real_km` (number): Distancia real recorrida
- `duracion_real_min` (number): Duración real del viaje
- `calificacion` (number, opcional): Calificación 1-5

### 7. `calcular_distancia`
Calcula la distancia entre dos puntos geográficos.

**Parámetros:**
- `origen` (object): { latitud, longitud }
- `destino` (object): { latitud, longitud }

## 🛠️ Instalación Local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start
```

## 🚀 Despliegue en Vercel

### Opción 1: Desde GitHub

1. Sube el código a un repositorio de GitHub
2. Importa el proyecto en Vercel
3. Configura las variables de entorno en Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `BASE_FARE_BS`
   - `PER_KM_BS`
   - `PER_MIN_BS`
   - `MIN_FARE_BS`
   - `USD_EXCHANGE_RATE`
   - `FUEL_PRICE_BS`

### Opción 2: Desde CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# Configurar variables de entorno
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
# ... (agregar todas las variables)

# Redesplegar con las variables
vercel --prod
```

## 🔗 Configuración en Manus

Una vez desplegado en Vercel:

1. Obtén la URL de tu despliegue (ej: `https://mipanaapp-mcp.vercel.app`)
2. En Manus, ve a **Settings → Conectores**
3. Edita el conector "MI PANA APP - Gestión de Viajes"
4. Actualiza la URL a: `https://tu-proyecto.vercel.app/mcp`
5. Guarda los cambios

## 📊 Estructura del Proyecto

```
mipanaapp-mcp/
├── api/
│   └── mcp.js              # Endpoint para Vercel (SSE)
├── src/
│   ├── index.js            # Servidor principal (stdio)
│   ├── handlers/           # (Futuro: handlers específicos)
│   └── utils/
│       ├── distance.js     # Cálculos de distancia
│       └── fare-calculator.js  # Cálculo de tarifas
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

## 🧪 Pruebas

Ejemplos de uso con Manus:

```
"Busca conductores disponibles cerca de Acarigua (latitud: 9.5549, longitud: -69.1952)"

"Calcula la tarifa para un viaje de 10 kilómetros"

"Calcula la distancia entre Caracas (10.4806, -66.9036) y Maracay (10.2469, -67.5958)"
```

## 📝 Notas

- El servidor usa **Supabase** como base de datos
- Las tarifas se calculan en **Bolívares (BS)** y pueden convertirse a **USD**
- La velocidad promedio asumida es **20 km/h** para cálculos de ETA
- El servidor soporta tanto **stdio** (para uso local) como **SSE** (para Vercel)

## 🔒 Seguridad

- Nunca compartas tu `SUPABASE_SERVICE_KEY` públicamente
- Usa variables de entorno para todas las credenciales
- El service_role key tiene permisos completos en Supabase

## 📄 Licencia

MIT

## 👤 Autor

Carlos Depool - MI PANA APP
