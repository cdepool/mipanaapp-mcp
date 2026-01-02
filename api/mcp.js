import { createClient } from '@supabase/supabase-js';

// Utilidades de cálculo
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

const toRad = (degrees) => degrees * (Math.PI / 180);

const calculateETA = (distanceKm) => {
  const avgSpeedKmh = 20;
  return Math.ceil((distanceKm / avgSpeedKmh) * 60);
};

// Calculador de tarifas con DolarAPI
class FareCalculator {
  constructor(config = {}) {
    this.baseFare = config.baseFare || parseFloat(process.env.BASE_FARE_BS) || 3;
    this.perKm = config.perKm || parseFloat(process.env.PER_KM_BS) || 2;
    this.perMin = config.perMin || parseFloat(process.env.PER_MIN_BS) || 0.5;
    this.minFare = config.minFare || parseFloat(process.env.MIN_FARE_BS) || 5;
    this.fuelPrice = config.fuelPrice || parseFloat(process.env.FUEL_PRICE_BS) || 0.50;
    this.usdRate = config.usdRate || parseFloat(process.env.USD_EXCHANGE_RATE) || 45;
    this.usdRateCache = null;
    this.usdRateCacheTime = null;
    this.CACHE_DURATION_MS = 3600000; // 1 hora
  }

  async getUsdRate() {
    const now = Date.now();
    
    if (this.usdRateCache && this.usdRateCacheTime && (now - this.usdRateCacheTime < this.CACHE_DURATION_MS)) {
      return this.usdRateCache;
    }

    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!response.ok) {
        throw new Error(`DolarAPI error: ${response.status}`);
      }
      
      const data = await response.json();
      const rate = data.promedio || data.venta || this.usdRate;
      
      this.usdRateCache = rate;
      this.usdRateCacheTime = now;
      
      return rate;
    } catch (error) {
      console.warn('Error obteniendo tasa de cambio de DolarAPI, usando fallback:', error.message);
      return this.usdRate;
    }
  }

  async calculate(distanceKm, durationMin, options = {}) {
    const { currency = 'BS', surge = 1.0, fuelSurcharge = true } = options;

    let fare = this.baseFare;
    fare += distanceKm * this.perKm;
    fare += durationMin * this.perMin;

    if (fuelSurcharge && this.fuelPrice > 0.50) {
      fare += (this.fuelPrice - 0.50) * 10;
    }

    fare *= surge;
    fare = Math.max(fare, this.minFare);
    fare = parseFloat(fare.toFixed(2));

    const result = {
      amount_bs: fare,
      currency: 'BS',
      breakdown: {
        base_fare: this.baseFare,
        distance_charge: parseFloat((distanceKm * this.perKm).toFixed(2)),
        time_charge: parseFloat((durationMin * this.perMin).toFixed(2)),
        surge_multiplier: surge,
        fuel_surcharge: fuelSurcharge ? parseFloat(((this.fuelPrice - 0.50) * 10).toFixed(2)) : 0
      }
    };

    if (currency === 'USD') {
      const currentRate = await this.getUsdRate();
      result.amount_usd = parseFloat((fare / currentRate).toFixed(2));
      result.currency = 'USD';
      result.exchange_rate = currentRate;
      result.exchange_rate_source = 'DolarAPI (BCV Oficial)';
    }

    return result;
  }
}

// Inicializar clientes
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const fareCalc = new FareCalculator();

// Handler principal para Vercel
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Endpoint raíz - información del servidor
  if (req.method === 'GET' && req.url === '/') {
    return res.status(200).json({
      name: 'MI PANA APP MCP Server',
      version: '1.1.0',
      status: 'running',
      endpoints: {
        mcp: '/api/mcp',
      },
      tools: [
        'buscar_conductores_disponibles',
        'crear_viaje',
        'calcular_tarifa',
        'actualizar_ubicacion_conductor',
        'obtener_estadisticas_conductor',
        'completar_viaje',
        'calcular_distancia',
      ],
    });
  }

  // Endpoint MCP - manejo de herramientas
  if (req.method === 'POST') {
    try {
      const { method, params } = req.body;

      // Listar herramientas disponibles
      if (method === 'tools/list') {
        return res.status(200).json({
          tools: [
            {
              name: 'buscar_conductores_disponibles',
              description: 'Busca conductores disponibles en un radio específico alrededor de una ubicación',
              inputSchema: {
                type: 'object',
                properties: {
                  latitud: { type: 'number', description: 'Latitud del punto de búsqueda' },
                  longitud: { type: 'number', description: 'Longitud del punto de búsqueda' },
                  radio_km: { type: 'number', description: 'Radio de búsqueda en kilómetros', default: 5 },
                },
                required: ['latitud', 'longitud'],
              },
            },
            {
              name: 'calcular_tarifa',
              description: 'Calcula la tarifa estimada de un viaje basado en distancia y duración',
              inputSchema: {
                type: 'object',
                properties: {
                  distancia_km: { type: 'number', description: 'Distancia del viaje en kilómetros' },
                  duracion_min: { type: 'number', description: 'Duración estimada del viaje en minutos (opcional)' },
                  tipo_servicio: { type: 'string', enum: ['mototaxi', 'el_pana', 'el_amigo', 'full_pana'], default: 'el_pana' },
                  moneda: { type: 'string', enum: ['BS', 'USD'], description: 'Moneda para la tarifa (BS o USD)', default: 'BS' },
                },
                required: ['distancia_km'],
              },
            },
            {
              name: 'calcular_distancia',
              description: 'Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine',
              inputSchema: {
                type: 'object',
                properties: {
                  origen: {
                    type: 'object',
                    properties: {
                      latitud: { type: 'number' },
                      longitud: { type: 'number' },
                    },
                    required: ['latitud', 'longitud'],
                  },
                  destino: {
                    type: 'object',
                    properties: {
                      latitud: { type: 'number' },
                      longitud: { type: 'number' },
                    },
                    required: ['latitud', 'longitud'],
                  },
                },
                required: ['origen', 'destino'],
              },
            },
          ],
        });
      }

      // Ejecutar herramienta
      if (method === 'tools/call') {
        const { name, arguments: args } = params;

        switch (name) {
          case 'buscar_conductores_disponibles': {
            const { latitud, longitud, radio_km = 5 } = args;
            
            const { data: conductores, error } = await supabase
              .from('drivers')
              .select('*')
              .eq('is_available', true)
              .eq('status', 'active');

            if (error) throw error;

            const conductoresCercanos = (conductores || [])
              .map(conductor => {
                if (!conductor.current_lat || !conductor.current_lng) return null;
                const distancia = calculateDistance(
                  latitud, longitud,
                  conductor.current_lat, conductor.current_lng
                );
                return { ...conductor, distancia_km: distancia };
              })
              .filter(c => c && c.distancia_km <= radio_km)
              .sort((a, b) => a.distancia_km - b.distancia_km);

            return res.status(200).json({
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  total: conductoresCercanos.length,
                  conductores: conductoresCercanos,
                  area_busqueda: {
                    centro: { latitud, longitud },
                    radio_km,
                  },
                }, null, 2),
              }],
            });
          }

          case 'calcular_tarifa': {
            const { distancia_km, duracion_min, tipo_servicio = 'el_pana', moneda = 'BS' } = args;
            const duracion = duracion_min || calculateETA(distancia_km);
            const tarifa = await fareCalc.calculate(distancia_km, duracion, { currency: moneda });

            return res.status(200).json({
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  tipo_servicio,
                  distancia_km,
                  duracion_min: duracion,
                  tarifa,
                }, null, 2),
              }],
            });
          }

          case 'calcular_distancia': {
            const { origen, destino } = args;
            const distancia = calculateDistance(
              origen.latitud, origen.longitud,
              destino.latitud, destino.longitud
            );
            const duracion = calculateETA(distancia);

            return res.status(200).json({
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  distancia_km: distancia,
                  duracion_estimada_min: duracion,
                  origen,
                  destino,
                }, null, 2),
              }],
            });
          }

          default:
            throw new Error(`Herramienta desconocida: ${name}`);
        }
      }

      return res.status(400).json({ error: 'Método no soportado' });
    } catch (error) {
      console.error('Error en handler:', error);
      return res.status(500).json({
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
          }, null, 2),
        }],
        isError: true,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
