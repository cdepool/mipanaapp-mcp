import { FareCalculator } from './src/utils/fare-calculator.js';

// Crear instancia del calculador
const fareCalc = new FareCalculator({
  baseFare: 3,
  perKm: 2,
  perMin: 0.5,
  minFare: 5,
  fuelPrice: 0.50,
  usdRate: 45 // Fallback
});

console.log('🧪 Pruebas de FareCalculator con DolarAPI\n');
console.log('=' .repeat(60));

// Prueba 1: Tarifa en Bolívares
console.log('\n📊 Prueba 1: Viaje de 15 km en Bolívares');
console.log('-'.repeat(60));
const test1 = await fareCalc.calculate(15, 45, { currency: 'BS' });
console.log(JSON.stringify(test1, null, 2));

// Prueba 2: Tarifa en Dólares (con DolarAPI)
console.log('\n💵 Prueba 2: Viaje de 15 km en Dólares (DolarAPI)');
console.log('-'.repeat(60));
const test2 = await fareCalc.calculate(15, 45, { currency: 'USD' });
console.log(JSON.stringify(test2, null, 2));

// Prueba 3: Viaje con alta demanda
console.log('\n🔥 Prueba 3: Viaje de 10 km con alta demanda (1.5x)');
console.log('-'.repeat(60));
const test3 = await fareCalc.calculate(10, 30, { currency: 'BS', surge: 1.5 });
console.log(JSON.stringify(test3, null, 2));

// Prueba 4: Viaje muy corto (tarifa mínima)
console.log('\n🚗 Prueba 4: Viaje muy corto (tarifa mínima)');
console.log('-'.repeat(60));
const test4 = await fareCalc.calculate(0.5, 2, { currency: 'BS' });
console.log(JSON.stringify(test4, null, 2));

// Prueba 5: Viaje largo en USD
console.log('\n🛣️  Prueba 5: Viaje largo de 50 km en USD');
console.log('-'.repeat(60));
const test5 = await fareCalc.calculate(50, 150, { currency: 'USD' });
console.log(JSON.stringify(test5, null, 2));

// Prueba 6: Segunda llamada USD (debe usar caché)
console.log('\n♻️  Prueba 6: Segunda llamada USD (caché)');
console.log('-'.repeat(60));
const test6 = await fareCalc.calculate(20, 60, { currency: 'USD' });
console.log(JSON.stringify(test6, null, 2));

console.log('\n' + '='.repeat(60));
console.log('✅ Todas las pruebas completadas\n');
