/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lng1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lng2 - Longitud del punto 2
 * @returns {number} Distancia en kilómetros
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(2));
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calcula el tiempo estimado de viaje basado en distancia
 * @param {number} distanceKm - Distancia en kilómetros
 * @returns {number} Tiempo en minutos
 */
export function calculateETA(distanceKm) {
  // Velocidad promedio en ciudad: 20 km/h
  const avgSpeedKmh = 20;
  const timeHours = distanceKm / avgSpeedKmh;
  const timeMinutes = Math.ceil(timeHours * 60);
  
  return timeMinutes;
}
