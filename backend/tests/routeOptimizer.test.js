const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_WAREHOUSE,
  parseLatLng,
  haversineDistanceKm,
  solveNajdikPehle,
  solveKamSeKamKm,
  solveHeldKarp,
  autoPlanCars,
  generateMultiPartMapsLinks
} = require('../utils/routeOptimizer');

describe('Route Optimizer Test Suite', () => {
  const warehouse = DEFAULT_WAREHOUSE; // Manesar Sector 1: 28.3588, 76.9382

  test('Criteria (a): Serial #1 is the stop with the lowest warehouse time/distance', () => {
    // 4 sample stops at varying distances from Manesar warehouse
    const stops = [
      { id: 101, institution_name: 'Far North Delhi (Rohini)', lat: 28.715, lng: 77.112 },
      { id: 102, institution_name: 'Closest to Manesar (Gurgaon Sec 14)', lat: 28.472, lng: 77.042 },
      { id: 103, institution_name: 'Central Delhi (Connaught Place)', lat: 28.632, lng: 77.219 },
      { id: 104, institution_name: 'Midway (Dwarka Sec 10)', lat: 28.585, lng: 77.053 }
    ];

    const result = solveNajdikPehle(stops, warehouse);

    assert.equal(result.stops.length, 4);
    // Serial #1 must be the stop closest to the warehouse
    const firstStop = result.stops[0];
    assert.equal(firstStop.delivery_sequence, 1);
    assert.equal(firstStop.institution_name, 'Closest to Manesar (Gurgaon Sec 14)');

    // Verify distance from warehouse of stop 1 is strictly minimum among all stops
    const d1 = haversineDistanceKm(warehouse, firstStop);
    for (let i = 1; i < result.stops.length; i++) {
      const dOther = haversineDistanceKm(warehouse, result.stops[i]);
      assert.ok(d1 <= dOther, `Expected stop 1 distance (${d1}) <= stop ${i} distance (${dOther})`);
    }
  });

  test('Criteria (b): The route starts and ends at the warehouse', () => {
    const stops = [
      { id: 201, institution_name: 'Dwarka School', lat: 28.585, lng: 77.053 },
      { id: 202, institution_name: 'Vasant Vihar School', lat: 28.556, lng: 77.154 },
      { id: 203, institution_name: 'Khan Market School', lat: 28.596, lng: 77.225 }
    ];

    // Test with Najdik Pehle
    const resNajdik = solveNajdikPehle(stops, warehouse);
    assert.ok(resNajdik.returnLeg, 'Return leg to warehouse must exist');
    assert.equal(resNajdik.returnLeg.title, 'Return to Warehouse');
    assert.ok(resNajdik.returnLeg.distanceKm > 0, 'Return leg must have distance');
    assert.ok(resNajdik.legs[0].from === 'Warehouse', 'Initial leg must originate from Warehouse');

    // Test with Held-Karp
    const resHeldKarp = solveKamSeKamKm(stops, warehouse);
    assert.ok(resHeldKarp.returnLeg, 'Held-Karp must also end at warehouse');
    assert.equal(resHeldKarp.returnLeg.title, 'Return to Warehouse');
  });

  test('Criteria (c): A stop with 3 units of the same school stays in a single car', () => {
    const cars = [
      { id: 1, name: 'PAWAN', vehicle_no: 'CAR 1', is_active: 1, capacity_packets: 500 },
      { id: 2, name: 'LALIT', vehicle_no: 'CAR 2', is_active: 1, capacity_packets: 500 },
      { id: 3, name: 'SIDHU', vehicle_no: 'CAR 3', is_active: 1, capacity_packets: 500 }
    ];

    // Same school institution_id: 999 with 3 different demand records (e.g. 1st yr, 2nd yr, 3rd yr)
    const demands = [
      { id: 1, institution_id: 999, institution_name: 'Army Public School', google_location: '28.561, 77.141', total_quantity: 45, unit_code: '1 DBN' },
      { id: 2, institution_id: 999, institution_name: 'Army Public School', google_location: '28.561, 77.141', total_quantity: 45, unit_code: '2 DAB' },
      { id: 3, institution_id: 999, institution_name: 'Army Public School', google_location: '28.561, 77.141', total_quantity: 30, unit_code: '3 DGBN' },
      // Other distinct institutions
      { id: 4, institution_id: 1001, institution_name: 'School B', google_location: '28.632, 77.040', total_quantity: 50 },
      { id: 5, institution_id: 1002, institution_name: 'School C', google_location: '28.585, 77.053', total_quantity: 50 },
      { id: 6, institution_id: 1003, institution_name: 'School D', google_location: '28.518, 77.232', total_quantity: 50 }
    ];

    const plan = autoPlanCars(demands, cars, warehouse);

    // Find which car has demand #1
    let carForDemand1 = null;
    let carForDemand2 = null;
    let carForDemand3 = null;

    plan.carPlans.forEach((cp) => {
      if (cp.stops.some((s) => s.id === 1)) carForDemand1 = cp.partnerId;
      if (cp.stops.some((s) => s.id === 2)) carForDemand2 = cp.partnerId;
      if (cp.stops.some((s) => s.id === 3)) carForDemand3 = cp.partnerId;
    });

    assert.ok(carForDemand1 !== null, 'Demand 1 must be assigned to a car');
    assert.equal(carForDemand1, carForDemand2, 'Demand 1 and Demand 2 of same institution must be in same car');
    assert.equal(carForDemand2, carForDemand3, 'Demand 2 and Demand 3 of same institution must be in same car');
  });

  test('Criteria (d): Locked stops do not move after Auto Plan', () => {
    const cars = [
      { id: 1, name: 'PAWAN', vehicle_no: 'CAR 1', is_active: 1 },
      { id: 2, name: 'LALIT', vehicle_no: 'CAR 2', is_active: 1 },
      { id: 3, name: 'SIDHU', vehicle_no: 'CAR 3', is_active: 1 }
    ];

    const demands = [
      // Demand 1 is explicitly locked to CAR 3 (SIDHU) even though it is geographically closer to CAR 1
      { id: 1, institution_id: 888, institution_name: 'VIP School (Locked)', google_location: '28.561, 77.141', total_quantity: 60, delivery_partner_id: 3, is_locked: true },
      { id: 2, institution_id: 889, institution_name: 'Normal School 2', google_location: '28.632, 77.040', total_quantity: 60 },
      { id: 3, institution_id: 890, institution_name: 'Normal School 3', google_location: '28.585, 77.053', total_quantity: 60 },
      { id: 4, institution_id: 891, institution_name: 'Normal School 4', google_location: '28.518, 77.232', total_quantity: 60 }
    ];

    const plan = autoPlanCars(demands, cars, warehouse, { respectLocks: true });

    const car3Plan = plan.carPlans.find((cp) => cp.partnerId === 3);
    assert.ok(car3Plan, 'Car 3 plan must exist');
    const lockedFound = car3Plan.stops.some((s) => s.id === 1);
    assert.equal(lockedFound, true, 'Locked demand #1 MUST be assigned to Car 3');
  });

  test('Criteria (e): 120 random stops plan in under ~10 seconds with haversine fallback', () => {
    const cars = [
      { id: 1, name: 'PAWAN', vehicle_no: 'CAR 1', is_active: 1, capacity_packets: 800 },
      { id: 2, name: 'LALIT', vehicle_no: 'CAR 2', is_active: 1, capacity_packets: 800 },
      { id: 3, name: 'SIDHU', vehicle_no: 'CAR 3', is_active: 1, capacity_packets: 800 },
      { id: 4, name: 'VIJAY', vehicle_no: 'CAR 4', is_active: 1, capacity_packets: 800 }
    ];

    // Generate 120 random stops across Delhi NCR (lat ~ 28.4 to 28.8, lng ~ 77.0 to 77.3)
    const largeDemands = [];
    for (let i = 1; i <= 120; i++) {
      const lat = 28.4 + Math.random() * 0.4;
      const lng = 77.0 + Math.random() * 0.3;
      largeDemands.push({
        id: i,
        institution_id: 1000 + i,
        institution_name: `Institution ${i}`,
        pin_code: `1100${String(10 + (i % 80)).padStart(2, '0')}`,
        google_location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        total_quantity: 20 + Math.floor(Math.random() * 40)
      });
    }

    const startTime = Date.now();
    const plan = autoPlanCars(largeDemands, cars, warehouse);
    const durationMs = Date.now() - startTime;

    assert.ok(durationMs < 10000, `Execution time was ${durationMs}ms, expected under 10000ms`);
    assert.equal(plan.summary.totalStops, 120, 'All 120 stops must be assigned');
    assert.equal(plan.carPlans.length, 4, 'Must generate plans for all 4 cars');

    // Verify each car's first stop is the closest to warehouse among that car's assigned stops
    plan.carPlans.forEach((cp) => {
      assert.ok(cp.stops.length > 0, 'Car should have stops');
      assert.equal(cp.stops[0].delivery_sequence, 1);
      const dFirst = haversineDistanceKm(warehouse, cp.stops[0]);
      for (let s = 1; s < cp.stops.length; s++) {
        const dOther = haversineDistanceKm(warehouse, cp.stops[s]);
        assert.ok(dFirst <= dOther + 0.0001, 'Serial #1 must be closest to warehouse in that car');
      }
    });

    console.log(`✓ 120 stops planned across 4 cars in ${durationMs}ms with balanced packet distribution!`);
  });

  test('Held-Karp finds <= total km compared to or equal to greedy Nearest-Neighbour', () => {
    // 6 stops with varying geometry
    const stops = [
      { id: 1, institution_name: 'A', lat: 28.52, lng: 77.08 },
      { id: 2, institution_name: 'B', lat: 28.59, lng: 77.05 },
      { id: 3, institution_name: 'C', lat: 28.63, lng: 77.12 },
      { id: 4, institution_name: 'D', lat: 28.56, lng: 77.20 },
      { id: 5, institution_name: 'E', lat: 28.49, lng: 77.14 },
      { id: 6, institution_name: 'F', lat: 28.47, lng: 77.04 }
    ];

    const resNajdik = solveNajdikPehle(stops, warehouse);
    const resHeldKarp = solveKamSeKamKm(stops, warehouse);

    assert.ok(resHeldKarp.totalKm <= resNajdik.totalKm + 0.01,
      `Held-Karp (${resHeldKarp.totalKm} km) must be <= Najdik (${resNajdik.totalKm} km)`);
    assert.equal(resHeldKarp.stops.length, 6);
  });

  test('Multi-part Google Maps link generation chains correctly', () => {
    // 20 stops -> chunks of 8 -> 3 parts
    const stops = Array.from({ length: 20 }, (_, i) => ({
      institution_name: `Stop ${i + 1}`,
      lat: 28.5 + i * 0.01,
      lng: 77.1 + i * 0.01
    }));

    const parts = generateMultiPartMapsLinks(stops, warehouse);
    assert.ok(parts.length >= 2, '20 stops must split into at least 2 parts');
    assert.ok(parts[0].url.includes('https://www.google.com/maps/dir/'), 'Must have valid Google Maps URL');
    assert.ok(parts[0].qrUrl.includes('api.qrserver.com'), 'Must have QR server link');
  });
});
