#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { calculateDistance, calculateETA } from './utils/distance.js';
import { FareCalculator } from './utils/fare-calculator.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://mdaksestqxfdxpirudsc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const fareCalc = new FareCalculator();

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

// ==================== HERRAMIENTAS (TOOLS) ====================

// 1. Buscar conductores disponibles
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'buscar_conductores_disponibles',
        description: 'Busca conductores disponibles en un radio específico alrededor de una ubicación',
        inputSchema: {
          type: 'object',
          properties: {
            latitud: {
              type: 'number',
              description: 'Latitud del punto de búsqueda',
            },
            longitud: {
              type: 'number',
              description: 'Longitud del punto de búsqueda',
            },
            radio_km: {
              type: 'number',
              description: 'Radio de búsqueda en kilómetros (por defecto: 5)',
              default: 5,
            },
          },
          required: ['latitud', 'longitud'],
        },
      },
      {
        name: 'crear_viaje',
        description: 'Crea una nueva solicitud de viaje con origen y destino',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'ID del usuario que solicita el viaje',
            },
            origen: {
              type: 'object',
              properties: {
                latitud: { type: 'number' },
                longitud: { type: 'number' },
                direccion: { type: 'string' },
              },
              required: ['latitud', 'longitud', 'direccion'],
            },
            destino: {
              type: 'object',
              properties: {
                latitud: { type: 'number' },
                longitud: { type: 'number' },
                direccion: { type: 'string' },
              },
              required: ['latitud', 'longitud', 'direccion'],
            },
            metodo_pago: {
              type: 'string',
              enum: ['efectivo', 'transferencia', 'pago_movil'],
              description: 'Método de pago para el viaje',
            },
          },
          required: ['user_id', 'origen', 'destino', 'metodo_pago'],
        },
      },
      {
        name: 'calcular_tarifa',
        description: 'Calcula la tarifa estimada de un viaje basado en distancia y duración',
        inputSchema: {
          type: 'object',
          properties: {
            distancia_km: {
              type: 'number',
              description: 'Distancia del viaje en kilómetros',
            },
            duracion_min: {
              type: 'number',
              description: 'Duración estimada del viaje en minutos (opcional)',
            },
            tipo_servicio: {
              type: 'string',
              enum: ['mototaxi', 'el_pana', 'el_amigo', 'full_pana'],
              description: 'Tipo de servicio solicitado',
              default: 'el_pana',
            },
            moneda: {
              type: 'string',
              enum: ['BS', 'USD'],
              description: 'Moneda para el cálculo (BS o USD)',
              default: 'BS',
            },
          },
          required: ['distancia_km'],
        },
      },
      {
        name: 'actualizar_ubicacion_conductor',
        description: 'Actualiza la ubicación en tiempo real de un conductor',
        inputSchema: {
          type: 'object',
          properties: {
            conductor_id: {
              type: 'string',
              description: 'ID del conductor',
            },
            latitud: {
              type: 'number',
              description: 'Latitud actual del conductor',
            },
            longitud: {
              type: 'number',
              description: 'Longitud actual del conductor',
            },
            rumbo: {
              type: 'number',
              description: 'Rumbo/dirección del conductor en grados (0-360, opcional)',
            },
          },
          required: ['conductor_id', 'latitud', 'longitud'],
        },
      },
      {
        name: 'obtener_estadisticas_conductor',
        description: 'Obtiene estadísticas de rendimiento de un conductor',
        inputSchema: {
          type: 'object',
          properties: {
            conductor_id: {
              type: 'string',
              description: 'ID del conductor',
            },
            periodo: {
              type: 'string',
              enum: ['today', 'week', 'month', 'all_time'],
              description: 'Período de tiempo para las estadísticas',
              default: 'today',
            },
          },
          required: ['conductor_id'],
        },
      },
      {
        name: 'completar_viaje',
        description: 'Marca un viaje como completado y calcula la tarifa final',
        inputSchema: {
          type: 'object',
          properties: {
            viaje_id: {
              type: 'string',
              description: 'ID del viaje a completar',
            },
            distancia_real_km: {
              type: 'number',
              description: 'Distancia real recorrida en kilómetros',
            },
            duracion_real_min: {
              type: 'number',
              description: 'Duración real del viaje en minutos',
            },
            calificacion: {
              type: 'number',
              description: 'Calificación del pasajero (1-5)',
              minimum: 1,
              maximum: 5,
            },
          },
          required: ['viaje_id', 'distancia_real_km', 'duracion_real_min'],
        },
      },
      {
        name: 'calcular_distancia',
        description: 'Calcula la distancia entre dos puntos geográficos',
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

// Manejador de llamadas a herramientas
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'buscar_conductores_disponibles': {
        const { latitud, longitud, radio_km = 5 } = args;
        
        // Buscar conductores en la base de datos
        const { data: conductores, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('status', 'available')
          .eq('is_online', true);

        if (error) throw error;

        // Filtrar por distancia
        const conductoresCercanos = (conductores || [])
          .map(conductor => {
            const distancia = calculateDistance(
              latitud,
              longitud,
              conductor.current_lat,
              conductor.current_lng
            );
            return { ...conductor, distancia_km: distancia };
          })
          .filter(c => c.distancia_km <= radio_km)
          .sort((a, b) => a.distancia_km - b.distancia_km);

        return {
          content: [
            {
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
            },
          ],
        };
      }

      case 'crear_viaje': {
        const { user_id, origen, destino, metodo_pago } = args;

        // Calcular distancia y tiempo estimado
        const distancia = calculateDistance(
          origen.latitud,
          origen.longitud,
          destino.latitud,
          destino.longitud
        );

        const duracionEstimada = calculateETA(distancia);

        // Calcular tarifa estimada
        const tarifaEstimada = fareCalc.calculate(distancia, duracionEstimada);

        // Crear el viaje en la base de datos
        const { data: viaje, error } = await supabase
          .from('rides')
          .insert({
            user_id,
            pickup_lat: origen.latitud,
            pickup_lng: origen.longitud,
            pickup_address: origen.direccion,
            dropoff_lat: destino.latitud,
            dropoff_lng: destino.longitud,
            dropoff_address: destino.direccion,
            payment_method: metodo_pago,
            status: 'pending',
            estimated_distance_km: distancia,
            estimated_duration_min: duracionEstimada,
            estimated_fare_bs: tarifaEstimada.amount_bs,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                viaje,
                estimacion_tarifa: tarifaEstimada,
                distancia_km: distancia,
                duracion_estimada_min: duracionEstimada,
              }, null, 2),
            },
          ],
        };
      }

      case 'calcular_tarifa': {
        const { distancia_km, duracion_min, tipo_servicio = 'el_pana', moneda = 'BS' } = args;
        
        const duracion = duracion_min || calculateETA(distancia_km);
        const tarifa = fareCalc.calculate(distancia_km, duracion, { currency: moneda });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                tipo_servicio,
                distancia_km,
                duracion_min: duracion,
                tarifa,
              }, null, 2),
            },
          ],
        };
      }

      case 'actualizar_ubicacion_conductor': {
        const { conductor_id, latitud, longitud, rumbo } = args;

        const updateData = {
          current_lat: latitud,
          current_lng: longitud,
          last_location_update: new Date().toISOString(),
        };

        if (rumbo !== undefined) {
          updateData.heading = rumbo;
        }

        const { data, error } = await supabase
          .from('drivers')
          .update(updateData)
          .eq('id', conductor_id)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                conductor: data,
                mensaje: 'Ubicación actualizada correctamente',
              }, null, 2),
            },
          ],
        };
      }

      case 'obtener_estadisticas_conductor': {
        const { conductor_id, periodo = 'today' } = args;

        let fechaInicio;
        const ahora = new Date();

        switch (periodo) {
          case 'today':
            fechaInicio = new Date(ahora.setHours(0, 0, 0, 0));
            break;
          case 'week':
            fechaInicio = new Date(ahora.setDate(ahora.getDate() - 7));
            break;
          case 'month':
            fechaInicio = new Date(ahora.setMonth(ahora.getMonth() - 1));
            break;
          case 'all_time':
            fechaInicio = new Date('2020-01-01');
            break;
          default:
            fechaInicio = new Date(ahora.setHours(0, 0, 0, 0));
        }

        const { data: viajes, error } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', conductor_id)
          .gte('created_at', fechaInicio.toISOString())
          .in('status', ['completed', 'cancelled']);

        if (error) throw error;

        const completados = viajes.filter(v => v.status === 'completed');
        const cancelados = viajes.filter(v => v.status === 'cancelled');
        
        const gananciaTotal = completados.reduce((sum, v) => sum + (v.final_amount || 0), 0);
        const distanciaTotal = completados.reduce((sum, v) => sum + (v.actual_distance_km || 0), 0);
        const calificacionPromedio = completados.length > 0
          ? completados.reduce((sum, v) => sum + (v.rating || 0), 0) / completados.length
          : 0;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                estadisticas: {
                  periodo,
                  total_viajes: viajes.length,
                  viajes_completados: completados.length,
                  viajes_cancelados: cancelados.length,
                  ganancia_total_bs: parseFloat(gananciaTotal.toFixed(2)),
                  distancia_total_km: parseFloat(distanciaTotal.toFixed(2)),
                  calificacion_promedio: parseFloat(calificacionPromedio.toFixed(2)),
                  tasa_cancelacion: viajes.length > 0 
                    ? parseFloat(((cancelados.length / viajes.length) * 100).toFixed(2))
                    : 0,
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'completar_viaje': {
        const { viaje_id, distancia_real_km, duracion_real_min, calificacion } = args;

        // Calcular tarifa final
        const tarifaFinal = fareCalc.calculate(distancia_real_km, duracion_real_min);

        const updateData = {
          status: 'completed',
          actual_distance_km: distancia_real_km,
          actual_duration_min: duracion_real_min,
          final_amount: tarifaFinal.amount_bs,
          completed_at: new Date().toISOString(),
        };

        if (calificacion) {
          updateData.rating = calificacion;
        }

        const { data, error } = await supabase
          .from('rides')
          .update(updateData)
          .eq('id', viaje_id)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                viaje: data,
                tarifa_final: tarifaFinal,
                mensaje: 'Viaje completado exitosamente',
              }, null, 2),
            },
          ],
        };
      }

      case 'calcular_distancia': {
        const { origen, destino } = args;

        const distancia = calculateDistance(
          origen.latitud,
          origen.longitud,
          destino.latitud,
          destino.longitud
        );

        const duracionEstimada = calculateETA(distancia);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                distancia_km: distancia,
                duracion_estimada_min: duracionEstimada,
                origen,
                destino,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MI PANA APP MCP Server ejecutándose en stdio');
}

main().catch((error) => {
  console.error('Error al iniciar servidor:', error);
  process.exit(1);
});
