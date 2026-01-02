# 🚀 Guía de Despliegue - MI PANA APP MCP Server en Vercel

## 📋 Información del Proyecto

- **Repositorio GitHub**: https://github.com/cdepool/mipanaapp-mcp
- **Proyecto Supabase**: mi_pana_app (mdaksestqxfdxpirudsc)
- **Team Vercel**: cdepool's projects (team_FbcUs2nryQ0prDAhRrVFDj6E)

---

## 🔧 Pasos para Desplegar

### 1️⃣ Importar Proyecto en Vercel

1. Ve a: **https://vercel.com/new**
2. Selecciona **"Import Git Repository"**
3. Busca y selecciona: **`cdepool/mipanaapp-mcp`**
4. Haz clic en **"Import"**

### 2️⃣ Configurar el Proyecto

**Project Name**: `mipanaapp-mcp` (o el nombre que prefieras)

**Framework Preset**: Other (o None)

**Root Directory**: `./` (dejar por defecto)

**Build Command**: `npm install` (dejar por defecto)

**Output Directory**: (dejar vacío)

### 3️⃣ Configurar Variables de Entorno

En la sección **"Environment Variables"**, agrega las siguientes variables:

#### Variables Requeridas:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `SUPABASE_URL` | `https://mdaksestqxfdxpirudsc.supabase.co` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | `[TU_SERVICE_ROLE_KEY]` | Service role key de Supabase (¡SECRETO!) |

#### Variables de Configuración de Tarifas:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `BASE_FARE_BS` | `3` | Tarifa base en Bolívares |
| `PER_KM_BS` | `2` | Costo por kilómetro en Bolívares |
| `PER_MIN_BS` | `0.5` | Costo por minuto en Bolívares |
| `MIN_FARE_BS` | `5` | Tarifa mínima en Bolívares |
| `USD_EXCHANGE_RATE` | `45` | Tasa de cambio USD/BS |
| `FUEL_PRICE_BS` | `0.50` | Precio de combustible en Bolívares |

#### Variables Opcionales:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Entorno de ejecución |
| `PORT` | `3000` | Puerto (no necesario en Vercel) |

### 4️⃣ Obtener la Service Role Key de Supabase

1. Ve a: **https://supabase.com/dashboard/project/mdaksestqxfdxpirudsc/settings/api**
2. En la sección **"Project API keys"**
3. Busca **"service_role"** (secret)
4. Haz clic en **"Reveal"** y copia la clave
5. Pégala en la variable `SUPABASE_SERVICE_KEY` en Vercel

⚠️ **IMPORTANTE**: Esta clave tiene permisos completos. **NUNCA** la compartas públicamente.

### 5️⃣ Desplegar

1. Verifica que todas las variables estén configuradas
2. Haz clic en **"Deploy"**
3. Espera a que termine el despliegue (2-3 minutos)

---

## ✅ Verificar el Despliegue

Una vez completado el despliegue:

1. **Copia la URL del proyecto** (ejemplo: `https://mipanaapp-mcp.vercel.app`)
2. **Prueba el endpoint raíz**: Visita `https://tu-url.vercel.app/`
   - Deberías ver un JSON con información del servidor
3. **Prueba el endpoint MCP**: `https://tu-url.vercel.app/mcp`

---

## 🔗 Configurar el Conector en Manus

### Paso 1: Actualizar la URL del Conector

1. Ve a **Manus → Settings → Conectores**
2. Busca **"MI PANA APP - Gestión de Viajes"**
3. Haz clic en **"Editar"**
4. Actualiza la **URL** a: `https://tu-url.vercel.app/mcp`
5. Guarda los cambios

### Paso 2: Probar el Conector

Prueba con estos comandos en Manus:

```
"Calcula la tarifa para un viaje de 10 kilómetros"

"Calcula la distancia entre Caracas (10.4806, -66.9036) y Valencia (10.1621, -68.0078)"

"Busca conductores disponibles cerca de Acarigua (latitud: 9.5549, longitud: -69.1952)"
```

---

## 🐛 Solución de Problemas

### Error: "SUPABASE_SERVICE_KEY is not defined"

**Solución**: Verifica que la variable `SUPABASE_SERVICE_KEY` esté configurada en Vercel:
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega la variable con la service_role key correcta
4. Redespliega el proyecto

### Error: "Connection to Supabase failed"

**Solución**: Verifica que:
1. La URL de Supabase sea correcta: `https://mdaksestqxfdxpirudsc.supabase.co`
2. La service_role key sea válida y no haya expirado
3. El proyecto de Supabase esté activo

### Error 404 en /mcp

**Solución**: Verifica que:
1. El archivo `api/mcp.js` exista en el repositorio
2. El `vercel.json` tenga la configuración correcta de rutas
3. Redespliega el proyecto

### El conector no responde en Manus

**Solución**:
1. Verifica que la URL en Manus termine en `/mcp`
2. Prueba acceder directamente a la URL en el navegador
3. Revisa los logs de despliegue en Vercel

---

## 📊 Estructura del Proyecto Desplegado

```
https://tu-url.vercel.app/
├── /                    → Información del servidor (GET)
└── /mcp                 → Endpoint MCP (POST/SSE)
```

---

## 🔄 Actualizar el Servidor

Para actualizar el servidor después de cambios en el código:

1. Haz push de los cambios a GitHub:
   ```bash
   git add .
   git commit -m "Actualización del servidor"
   git push origin master
   ```

2. Vercel automáticamente detectará los cambios y redespliegará

O manualmente en Vercel:
1. Ve a tu proyecto en Vercel
2. Deployments → ... → Redeploy

---

## 📝 Notas Importantes

- ✅ El servidor está configurado para usar **SSE (Server-Sent Events)** para Vercel
- ✅ Las tarifas se calculan en **Bolívares (BS)** y pueden convertirse a **USD**
- ✅ La velocidad promedio asumida es **20 km/h** para cálculos de ETA
- ✅ El servidor soporta **CORS** para permitir solicitudes desde cualquier origen
- ⚠️ La **service_role key** tiene permisos completos en Supabase - manéjala con cuidado

---

## 🆘 Soporte

Si tienes problemas con el despliegue:

1. Revisa los logs en Vercel: Project → Deployments → [Tu despliegue] → View Function Logs
2. Verifica las variables de entorno en: Project → Settings → Environment Variables
3. Consulta la documentación de Vercel: https://vercel.com/docs

---

## ✨ ¡Listo!

Una vez completados estos pasos, tu servidor MCP estará funcionando y podrás usar todas las herramientas de gestión de viajes desde Manus.

**URL del Repositorio**: https://github.com/cdepool/mipanaapp-mcp
**Documentación Completa**: Ver README.md en el repositorio
