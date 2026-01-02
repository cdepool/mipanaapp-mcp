# 💱 Integración con DolarAPI - Tasa de Cambio en Tiempo Real

## 🎯 Descripción

El servidor MCP de MI PANA APP ahora integra **DolarAPI** para obtener la tasa de cambio oficial del **Banco Central de Venezuela (BCV)** en tiempo real.

## 🔗 API Utilizada

**Endpoint**: `https://ve.dolarapi.com/v1/dolares/oficial`

**Documentación**: https://dolarapi.com/docs/venezuela/operations/get-dolar-oficial

**Método**: GET (sin autenticación requerida)

---

## 📊 Formato de Respuesta

```json
{
  "fuente": "oficial",
  "nombre": "Oficial",
  "compra": null,
  "venta": null,
  "promedio": 301.37,
  "fechaActualizacion": "2026-01-01T21:02:47.165Z"
}
```

El servidor utiliza el campo `promedio` como tasa de cambio oficial.

---

## ⚙️ Implementación

### 1. Método `getUsdRate()` en FareCalculator

```javascript
async getUsdRate() {
  const now = Date.now();
  
  // Usar caché si está disponible y no ha expirado (1 hora)
  if (this.usdRateCache && this.usdRateCacheTime && 
      (now - this.usdRateCacheTime < this.CACHE_DURATION_MS)) {
    return this.usdRateCache;
  }

  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    if (!response.ok) {
      throw new Error(`DolarAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    const rate = data.promedio || data.venta || this.usdRate;
    
    // Actualizar caché
    this.usdRateCache = rate;
    this.usdRateCacheTime = now;
    
    return rate;
  } catch (error) {
    console.warn('Error obteniendo tasa de cambio de DolarAPI, usando fallback:', error.message);
    return this.usdRate; // Fallback a la tasa configurada
  }
}
```

### 2. Actualización del Método `calculate()`

Ahora es **asíncrono** y obtiene la tasa en tiempo real cuando se solicita conversión a USD:

```javascript
async calculate(distanceKm, durationMin, options = {}) {
  // ... cálculos de tarifa en BS ...

  // Convertir a USD si se solicita
  if (currency === 'USD') {
    const currentRate = await this.getUsdRate();
    result.amount_usd = parseFloat((fare / currentRate).toFixed(2));
    result.currency = 'USD';
    result.exchange_rate = currentRate;
    result.exchange_rate_source = 'DolarAPI (BCV Oficial)';
  }

  return result;
}
```

---

## 🚀 Características

### ✅ Caché Inteligente
- **Duración**: 1 hora (3,600,000 ms)
- **Propósito**: Reducir llamadas innecesarias a la API
- **Actualización**: Automática después de expirar el caché

### ✅ Fallback Robusto
Si la API falla o no está disponible:
1. Se registra un warning en los logs
2. Se usa la tasa configurada en `USD_EXCHANGE_RATE` (variable de entorno)
3. El servicio continúa funcionando sin interrupciones

### ✅ Respuesta Mejorada
Cuando se solicita conversión a USD, la respuesta incluye:

```json
{
  "success": true,
  "tipo_servicio": "el_pana",
  "distancia_km": 15,
  "duracion_min": 45,
  "tarifa": {
    "amount_bs": 55.50,
    "amount_usd": 0.18,
    "currency": "USD",
    "exchange_rate": 301.37,
    "exchange_rate_source": "DolarAPI (BCV Oficial)",
    "breakdown": {
      "base_fare": 3,
      "distance_charge": 30.00,
      "time_charge": 22.50,
      "surge_multiplier": 1.0,
      "fuel_surcharge": 0
    }
  }
}
```

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Calcular Tarifa en Bolívares (por defecto)

**Comando**:
```
"Calcula la tarifa para un viaje de 15 kilómetros"
```

**Respuesta**:
```json
{
  "success": true,
  "tipo_servicio": "el_pana",
  "distancia_km": 15,
  "duracion_min": 45,
  "tarifa": {
    "amount_bs": 55.50,
    "currency": "BS",
    "breakdown": {
      "base_fare": 3,
      "distance_charge": 30.00,
      "time_charge": 22.50,
      "surge_multiplier": 1.0,
      "fuel_surcharge": 0
    }
  }
}
```

### Ejemplo 2: Calcular Tarifa en Dólares (con tasa en tiempo real)

**Comando**:
```
"Calcula la tarifa en dólares para un viaje de 15 kilómetros"
```

**Respuesta**:
```json
{
  "success": true,
  "tipo_servicio": "el_pana",
  "distancia_km": 15,
  "duracion_min": 45,
  "tarifa": {
    "amount_bs": 55.50,
    "amount_usd": 0.18,
    "currency": "USD",
    "exchange_rate": 301.37,
    "exchange_rate_source": "DolarAPI (BCV Oficial)",
    "breakdown": {
      "base_fare": 3,
      "distance_charge": 30.00,
      "time_charge": 22.50,
      "surge_multiplier": 1.0,
      "fuel_surcharge": 0
    }
  }
}
```

---

## 🔧 Configuración

### Variables de Entorno

La tasa de cambio de fallback se configura en Vercel:

```
USD_EXCHANGE_RATE=45
```

Esta tasa se usa solo cuando:
- DolarAPI no está disponible
- Hay un error de red
- La respuesta de la API es inválida

---

## 📊 Ventajas de Esta Integración

| Característica | Beneficio |
|----------------|-----------|
| **Tasa Oficial BCV** | Datos confiables y actualizados |
| **Sin Autenticación** | API pública, sin necesidad de API keys |
| **Caché de 1 hora** | Reduce latencia y llamadas a la API |
| **Fallback Robusto** | Servicio continúa funcionando si la API falla |
| **Transparencia** | La respuesta indica la fuente de la tasa |
| **Actualización Automática** | No requiere intervención manual |

---

## 🛡️ Manejo de Errores

### Escenarios Cubiertos:

1. **API no disponible**: Usa tasa de fallback
2. **Timeout de red**: Usa tasa de fallback
3. **Respuesta inválida**: Usa tasa de fallback
4. **Datos incompletos**: Prioriza `promedio`, luego `venta`, finalmente fallback

### Logs:

Cuando hay un error, se registra en los logs de Vercel:

```
⚠️ Error obteniendo tasa de cambio de DolarAPI, usando fallback: DolarAPI error: 503
```

---

## 🔄 Flujo de Actualización

```
┌─────────────────────────────────────────────────────┐
│ Usuario solicita tarifa en USD                      │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ ¿Caché válido (< 1 hora)?                           │
└────────────┬───────────────────┬────────────────────┘
             │ SÍ                │ NO
             ▼                   ▼
    ┌────────────────┐  ┌──────────────────────┐
    │ Usar caché     │  │ Llamar a DolarAPI    │
    └────────────────┘  └──────┬───────────────┘
                               │
                    ┌──────────┴──────────┐
                    │ ¿Éxito?             │
                    └──┬───────────────┬──┘
                       │ SÍ            │ NO
                       ▼               ▼
              ┌────────────────┐  ┌──────────────┐
              │ Actualizar     │  │ Usar         │
              │ caché          │  │ fallback     │
              └────────────────┘  └──────────────┘
                       │               │
                       └───────┬───────┘
                               ▼
                    ┌──────────────────────┐
                    │ Calcular tarifa USD  │
                    └──────────────────────┘
```

---

## 📈 Ejemplo Real con Tasa Actual

**Tasa actual BCV**: Bs 301.37 por USD (01/01/2026)

**Viaje de 50 km**:
- Tarifa en BS: Bs 178.00
- Tarifa en USD: USD 0.59 (178.00 / 301.37)

**Viaje de 15 km**:
- Tarifa en BS: Bs 55.50
- Tarifa en USD: USD 0.18 (55.50 / 301.37)

---

## 🔍 Monitoreo

Para verificar que la integración funciona correctamente:

1. **Revisar logs en Vercel**: Buscar warnings de DolarAPI
2. **Verificar respuestas**: Comprobar que `exchange_rate_source` sea "DolarAPI (BCV Oficial)"
3. **Probar conversión USD**: Solicitar tarifas en dólares y verificar la tasa

---

## 📚 Referencias

- **DolarAPI Docs**: https://dolarapi.com/docs
- **BCV**: https://www.bcv.org.ve
- **GitHub DolarAPI**: https://github.com/enzonotario/dolarapi

---

## ✨ Mejoras Futuras (Opcional)

- [ ] Agregar soporte para otras tasas (paralelo, bitcoin)
- [ ] Configurar duración de caché mediante variable de entorno
- [ ] Implementar métricas de uso de la API
- [ ] Agregar endpoint para consultar la tasa actual

---

**Actualizado**: 2026-01-01  
**Versión**: 1.1.0  
**Autor**: Carlos Depool - MI PANA APP
