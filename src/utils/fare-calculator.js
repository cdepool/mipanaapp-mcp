/**
 * Calcula la tarifa de un viaje considerando múltiples factores
 */
export class FareCalculator {
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

  /**
   * Obtiene la tasa de cambio oficial del BCV desde DolarAPI
   * Implementa caché de 1 hora para evitar llamadas excesivas
   */
  async getUsdRate() {
    const now = Date.now();
    
    // Usar caché si está disponible y no ha expirado
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
      
      // Actualizar caché
      this.usdRateCache = rate;
      this.usdRateCacheTime = now;
      
      return rate;
    } catch (error) {
      console.warn('Error obteniendo tasa de cambio de DolarAPI, usando fallback:', error.message);
      return this.usdRate; // Fallback a la tasa configurada
    }
  }

  async calculate(distanceKm, durationMin, options = {}) {
    const {
      currency = 'BS',
      surge = 1.0, // Multiplicador de demanda (1.0 = normal, 1.5 = alta demanda)
      fuelSurcharge = true
    } = options;

    // Cálculo base
    let fare = this.baseFare;
    fare += distanceKm * this.perKm;
    fare += durationMin * this.perMin;

    // Recargo por gasolina si el precio subió
    if (fuelSurcharge && this.fuelPrice > 0.50) {
      const fuelExtra = (this.fuelPrice - 0.50) * 10;
      fare += fuelExtra;
    }

    // Aplicar multiplicador de demanda
    fare *= surge;

    // Aplicar tarifa mínima
    fare = Math.max(fare, this.minFare);

    // Redondear a 2 decimales
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

  /**
   * Calcula el estimado de comisión de la plataforma
   */
  calculateCommission(fareAmount, commissionRate = 0.15) {
    const commission = fareAmount * commissionRate;
    const driverEarnings = fareAmount - commission;
    
    return {
      total_fare: fareAmount,
      platform_commission: parseFloat(commission.toFixed(2)),
      driver_earnings: parseFloat(driverEarnings.toFixed(2)),
      commission_rate: commissionRate
    };
  }
}
