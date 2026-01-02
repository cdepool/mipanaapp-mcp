import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import cors from 'cors';

// Importar utilidades
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

class FareCalculator {
  constructor(config = {}) {
    this.baseFare = config.baseFare || parseFloat(process.env.BASE_FARE_BS) || 3;
    this.perKm = config.perKm || parseFloat(process.env.PER_KM_BS) || 2;
    this.perMin = config.perMin || parseFloat(process.env.PER_MIN_BS) || 0.5;
    this.minFare = config.minFare || parseFloat(process.env.MIN_FARE_BS) || 5;
    this.fuelPrice = config.fuelPrice || parseFloat(process.env.FUEL_PRICE_BS) || 0.50;
    this.usdRate = config.usdRate || parseFloat(process.env.USD_EXCHANGE_RATE) || 45;
  }

  calculate(distanceKm, durationMin, options = {}) {
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
      }
    };

    if (currency === 'USD') {
      result.amount_usd = parseFloat((fare / this.usdRate).toFixed(2));
      result.currency = 'USD';
    }

    return result;
  }
}

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://mdaksestqxfdxpirudsc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const fareCalc = new FareCalculator();

// Crear aplicación Express
const app = express();
app.use(cors());
app.use(express.json());

// Crear servidor MCP
const server = new Server(
  {
    name: 'mipanaapp-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Configurar herramientas (igual que en src/index.js)
server.setRequestHandler('tools/list', async () => {
  return {
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
        description: 'Calcula la tarifa estimada de un viaje',
        inputSchema: {
          type: 'object',
          properties: {
            distancia_km: { type: 'number', description: 'Distancia en kilómetros' },
            duracion_min: { type: 'number', description: 'Duración en minutos' },
            moneda: { type: 'string', enum: ['BS', 'USD'], default: 'BS' },
          },
          required: ['distancia_km'],
        },
      },
      {
        name: 'calcular_distancia',
        description: 'Calcula la distancia entre dos puntos',
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
  };
});

// Manejador de herramientas
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'buscar_conductores_disponibles': {
        const { latitud, longitud, radio_km = 5 } = args;
        
        const { data: conductores, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('status', 'available')
          .eq('is_online', true);

        if (error) throw error;

        const conductoresCercanos = (conductores || [])
          .map(conductor => {
            const distancia = calculateDistance(
              latitud, longitud,
              conductor.current_lat, conductor.current_lng
            );
            return { ...conductor, distancia_km: distancia };
          })
          .filter(c => c.distancia_km <= radio_km)
          .sort((a, b) => a.distancia_km - b.distancia_km);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              total: conductoresCercanos.length,
              conductores: conductoresCercanos,
            }, null, 2),
          }],
        };
      }

      case 'calcular_tarifa': {
        const { distancia_km, duracion_min, moneda = 'BS' } = args;
        const duracion = duracion_min || calculateETA(distancia_km);
        const tarifa = fareCalc.calculate(distancia_km, duracion, { currency: moneda });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, tarifa }, null, 2),
          }],
        };
      }

      case 'calcular_distancia': {
        const { origen, destino } = args;
        const distancia = calculateDistance(
          origen.latitud, origen.longitud,
          destino.latitud, destino.longitud
        );
        const duracion = calculateETA(distancia);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              distancia_km: distancia,
              duracion_estimada_min: duracion,
            }, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: false, error: error.message }, null, 2),
      }],
      isError: true,
    };
  }
});

// Endpoint principal
app.all('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/mcp', res);
  await server.connect(transport);
});

app.get('/', (req, res) => {
  res.json({
    name: 'MI PANA APP MCP Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      mcp: '/mcp',
    },
  });
});

// Exportar para Vercel
export default app;
