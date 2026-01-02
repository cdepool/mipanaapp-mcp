export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
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
      features: [
        'Integración con DolarAPI para tasa BCV en tiempo real',
        'Cálculo de tarifas con múltiples factores',
        'Búsqueda de conductores por geolocalización',
        'Cálculos geográficos precisos (Haversine)',
      ],
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
