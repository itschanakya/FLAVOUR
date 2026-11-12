/**
 * Route Optimizer Module
 * Pure algorithms for delivery planning, road distance computation,
 * TSP route optimization (Najdik pehle & Held-Karp / 2-opt),
 * capacitated clustering, and multi-part Google Maps directions.
 */

const DEFAULT_WAREHOUSE = {
  name: 'Manesar Sector 1, Gurgaon',
  address: 'Sector 1, IMT Manesar, Gurugram, Haryana 122051',
  lat: 28.3588,
  lng: 76.9382
};

// Average road winding factor vs straight line (aerial) distance in Delhi-NCR
const ROAD_FACTOR = 1.4;
// Average urban delivery vehicle transit speed in km/h
const AVERAGE_SPEED_KMH = 30.0;
// Unloading / verification time per stop in minutes
const SERVICE_TIME_MIN = 10;

/**
 * Parses latitude and longitude from various formats:
 * - Direct coordinate string: "28.561285, 77.141532"
 * - Object with lat/lng
 * - Google Maps URL containing coordinates: @28.5612,77.1415 or ?q=28.5612,77.1415
 */
function parseLatLng(loc) {
  if (!loc) return null;
  if (typeof loc === 'object' && loc.lat !== undefined && loc.lng !== undefined) {
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
    return null;
  }
  if (typeof loc !== 'string') return null;

  const trimmed = loc.trim();
  // Direct "lat, lng" e.g. "28.56128572385452, 77.14153200982712"
  const direct = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (direct) {
    const lat = parseFloat(direct[1]);
    const lng = parseFloat(direct[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Google Maps @lat,lng e.g. https://www.google.com/maps/@28.561285,77.141532,15z
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Query parameter ?q=lat,lng or ?ll=lat,lng or query=lat,lng
  const qMatch = trimmed.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  return null;
}

/**
 * Calculates Great-Circle distance (Haversine formula) in kilometers
 */
function haversineDistanceKm(p1, p2) {
  if (!p1 || !p2) return 0;
  const R = 6371.0; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180.0;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180.0) *
      Math.cos((p2.lat * Math.PI) / 180.0) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes road distance and driving duration using Haversine * 1.4 approximation
 */
function haversineRoadEstimate(p1, p2) {
  const straight = haversineDistanceKm(p1, p2);
  const roadKm = Math.round(straight * ROAD_FACTOR * 10) / 10;
  const minutes = Math.max(2, Math.round((roadKm / AVERAGE_SPEED_KMH) * 60));
  return { distanceKm: roadKm, durationMin: minutes, isApprox: true };
}

/**
 * In-memory cache for road distances
 * Key: `${round4(lat1)},${round4(lng1)}__${round4(lat2)},${round4(lng2)}__${provider}`
 */
const distanceCache = new Map();

function cacheKey(p1, p2, provider = 'osrm') {
  const r = (n) => Number(n).toFixed(4);
  return `${r(p1.lat)},${r(p1.lng)}__${r(p2.lat)},${r(p2.lng)}__${provider}`;
}

/**
 * Queries OSRM table API in batches for road distances and durations.
 * Falls back to haversine approximation if OSRM is unreachable.
 * Coordinates format: Array of { lat, lng }
 */
async function fetchOsrmTable(points, options = {}) {
  const N = points.length;
  const matrix = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => ({ distanceKm: 0, durationMin: 0, isApprox: false }))
  );

  // If points <= 1, return trivial matrix
  if (N <= 1) return { matrix, provider: 'osrm', isFallback: false };

  // For small to medium sets (up to ~60 points), fetch in single OSRM request
  // OSRM expects coordinates as: {lng},{lat}
  const MAX_OSRM_POINTS = 60;
  let useFallback = false;

  if (N <= MAX_OSRM_POINTS && !options.forceFallback) {
    try {
      const coordStr = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
      const url = `http://router.project-osrm.org/table/v1/driving/${coordStr}?annotations=distance,duration`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.distances && data.durations) {
          for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
              if (i === j) {
                matrix[i][j] = { distanceKm: 0, durationMin: 0, isApprox: false };
              } else {
                const distMeters = data.distances[i][j] || 0;
                const durSeconds = data.durations[i][j] || 0;
                const dKm = Math.round((distMeters / 1000) * 10) / 10;
                const dMin = Math.max(1, Math.round(durSeconds / 60));
                matrix[i][j] = { distanceKm: dKm, durationMin: dMin, isApprox: false };
              }
            }
          }
          return { matrix, provider: 'osrm', isFallback: false };
        }
      }
      useFallback = true;
    } catch (err) {
      // Network timeout / blocked sandbox / OSRM demo down -> fallback gracefully
      useFallback = true;
    }
  } else {
    // If > 60 points or forced fallback, compute via chunked requests or haversine
    useFallback = true;
  }

  // Fallback: Haversine * 1.4
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) {
        matrix[i][j] = { distanceKm: 0, durationMin: 0, isApprox: false };
      } else {
        matrix[i][j] = haversineRoadEstimate(points[i], points[j]);
      }
    }
  }

  return { matrix, provider: 'haversine', isFallback: useFallback };
}

/**
 * Computes road distance & duration from warehouse to a target point
 */
function getWarehouseDistance(warehouse, target, matrixInfo = null) {
  if (!warehouse || !target) return { distanceKm: 0, durationMin: 0, isApprox: true };
  const key = cacheKey(warehouse, target, 'dist');
  if (distanceCache.has(key)) {
    return distanceCache.get(key);
  }
  const est = haversineRoadEstimate(warehouse, target);
  distanceCache.set(key, est);
  return est;
}

/**
 * Mode A: "Najdik pehle" (Nearest-Neighbour greedy TSP starting from warehouse)
 * 1. Start at warehouse (index 0).
 * 2. Serial #1 is the unvisited stop with the lowest road time/distance from warehouse.
 * 3. From stop 1, step to the nearest unvisited stop to stop 1, and so on.
 * 4. Return to warehouse from the last stop.
 *
 * @param {Array} stops - List of stops (each must have { lat, lng } or parsed geotag)
 * @param {Object} warehouse - { lat, lng }
 * @param {Array<Array>} costMatrix - Optional NxN distance/duration matrix (index 0 = warehouse, 1..N = stops)
 * @param {Object} options - { schoolTimeAware: boolean }
 */
function solveNajdikPehle(stops, warehouse, costMatrix = null, options = {}) {
  if (!stops || stops.length === 0) {
    return { orderIndices: [], stops: [], legs: [], totalKm: 0, totalDrivingMin: 0, totalTourMin: 0, returnLeg: null };
  }

  const N = stops.length;
  // If no cost matrix supplied, compute pairwise distance matrix
  let matrix = costMatrix;
  if (!matrix) {
    const allPoints = [warehouse, ...stops];
    const totalPts = allPoints.length;
    matrix = Array.from({ length: totalPts }, () => Array(totalPts).fill(null));
    for (let i = 0; i < totalPts; i++) {
      for (let j = 0; j < totalPts; j++) {
        if (i === j) {
          matrix[i][j] = { distanceKm: 0, durationMin: 0 };
        } else {
          matrix[i][j] = haversineRoadEstimate(allPoints[i], allPoints[j]);
        }
      }
    }
  }

  // If "School time ka dhyan rakho" is ON:
  // Sort into time buckets first (e.g. 05:00-07:00, 07:00-09:00, etc.)
  // and apply nearest-neighbour within each time bucket
  if (options.schoolTimeAware) {
    return solveTimeWindowNearest(stops, warehouse, matrix);
  }

  const visited = new Set();
  const orderIndices = []; // 0-based indices into `stops` array
  let currentMatrixIdx = 0; // index 0 in matrix is warehouse

  for (let step = 0; step < N; step++) {
    let nearestIdx = -1;
    let minCost = Infinity;

    for (let i = 0; i < N; i++) {
      if (!visited.has(i)) {
        const matIdx = i + 1; // stops are at matrix indices 1..N
        const c = matrix[currentMatrixIdx][matIdx];
        const cost = (c.durationMin || 0) * 1000 + (c.distanceKm || 0);
        if (cost < minCost) {
          minCost = cost;
          nearestIdx = i;
        }
      }
    }

    if (nearestIdx !== -1) {
      visited.add(nearestIdx);
      orderIndices.push(nearestIdx);
      currentMatrixIdx = nearestIdx + 1;
    }
  }

  return buildTourDetails(orderIndices, stops, warehouse, matrix);
}

/**
 * Solves route with School Time Awareness:
 * Stops with earlier delivery times come before later ones;
 * nearest-neighbour is applied within the same time group.
 */
function solveTimeWindowNearest(stops, warehouse, matrix) {
  const N = stops.length;
  // Parse time (e.g. "08:00" -> 480 minutes)
  const parseTime = (t) => {
    if (!t || typeof t !== 'string') return 480; // default 08:00
    const m = t.match(/(\d{1,2}):(\d{2})/);
    if (!m) return 480;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };

  // Group stops by 60-minute or direct time buckets
  const indexed = stops.map((s, idx) => ({
    idx,
    stop: s,
    minutes: parseTime(s.demand_time || s.first_demand_time)
  }));

  // Sort distinct time buckets
  const timeBuckets = Array.from(new Set(indexed.map((x) => x.minutes))).sort((a, b) => a - b);

  const orderIndices = [];
  let currentMatrixIdx = 0;

  for (const bucket of timeBuckets) {
    const bucketStops = indexed.filter((x) => x.minutes === bucket && !orderIndices.includes(x.idx));
    const visitedInBucket = new Set();

    while (visitedInBucket.size < bucketStops.length) {
      let nearestIdx = -1;
      let minCost = Infinity;

      for (const item of bucketStops) {
        if (!visitedInBucket.has(item.idx)) {
          const matIdx = item.idx + 1;
          const c = matrix[currentMatrixIdx][matIdx];
          const cost = (c.durationMin || 0) * 1000 + (c.distanceKm || 0);
          if (cost < minCost) {
            minCost = cost;
            nearestIdx = item.idx;
          }
        }
      }

      if (nearestIdx !== -1) {
        visitedInBucket.add(nearestIdx);
        orderIndices.push(nearestIdx);
        currentMatrixIdx = nearestIdx + 1;
      }
    }
  }

  return buildTourDetails(orderIndices, stops, warehouse, matrix);
}

/**
 * Mode B: "Kam se kam total km"
 * For N <= 12 stops: Exact Held-Karp Dynamic Programming (starts & ends at warehouse)
 * For N > 12 stops: Nearest Neighbour + 2-opt local search heuristic
 */
function solveKamSeKamKm(stops, warehouse, costMatrix = null) {
  if (!stops || stops.length === 0) {
    return { orderIndices: [], stops: [], legs: [], totalKm: 0, totalDrivingMin: 0, totalTourMin: 0, returnLeg: null };
  }

  const N = stops.length;
  let matrix = costMatrix;
  if (!matrix) {
    const allPoints = [warehouse, ...stops];
    const totalPts = allPoints.length;
    matrix = Array.from({ length: totalPts }, () => Array(totalPts).fill(null));
    for (let i = 0; i < totalPts; i++) {
      for (let j = 0; j < totalPts; j++) {
        if (i === j) {
          matrix[i][j] = { distanceKm: 0, durationMin: 0 };
        } else {
          matrix[i][j] = haversineRoadEstimate(allPoints[i], allPoints[j]);
        }
      }
    }
  }

  if (N <= 12) {
    return solveHeldKarp(stops, warehouse, matrix);
  } else {
    return solveTwoOpt(stops, warehouse, matrix);
  }
}

/**
 * Exact Held-Karp DP for TSP: Warehouse (0) -> all stops 1..N -> Warehouse (0)
 * Time complexity: O(2^N * N^2), space O(2^N * N)
 */
function solveHeldKarp(stops, warehouse, matrix) {
  const N = stops.length;
  const numStates = 1 << N;

  // memo[mask][u] = { cost, prev }
  // mask represents the set of visited stops (bit i is 1 if stops[i] visited)
  // u is the last visited stop (0-based index in `stops`)
  const memoCost = Array.from({ length: numStates }, () => new Float64Array(N).fill(Infinity));
  const memoPrev = Array.from({ length: numStates }, () => new Int8Array(N).fill(-1));

  // Base cases: starting from warehouse (0) to any stop i (matrix index i + 1)
  for (let i = 0; i < N; i++) {
    const mask = 1 << i;
    memoCost[mask][i] = matrix[0][i + 1].distanceKm || 0;
  }

  // Iterate over all subsets
  for (let mask = 1; mask < numStates; mask++) {
    for (let u = 0; u < N; u++) {
      if (!(mask & (1 << u))) continue;
      const currentCost = memoCost[mask][u];
      if (currentCost === Infinity) continue;

      // Try transitioning to unvisited stop v
      for (let v = 0; v < N; v++) {
        if (mask & (1 << v)) continue;
        const nextMask = mask | (1 << v);
        const distUV = matrix[u + 1][v + 1].distanceKm || 0;
        const newCost = currentCost + distUV;
        if (newCost < memoCost[nextMask][v]) {
          memoCost[nextMask][v] = newCost;
          memoPrev[nextMask][v] = u;
        }
      }
    }
  }

  // Complete tour by returning to warehouse (0)
  const fullMask = (1 << N) - 1;
  let bestCost = Infinity;
  let bestLast = -1;

  for (let i = 0; i < N; i++) {
    const totalDist = memoCost[fullMask][i] + (matrix[i + 1][0].distanceKm || 0);
    if (totalDist < bestCost) {
      bestCost = totalDist;
      bestLast = i;
    }
  }

  // Reconstruct path
  const orderIndices = [];
  let curr = bestLast;
  let mask = fullMask;

  while (curr !== -1) {
    orderIndices.push(curr);
    const p = memoPrev[mask][curr];
    mask ^= 1 << curr;
    curr = p;
  }
  orderIndices.reverse();

  return buildTourDetails(orderIndices, stops, warehouse, matrix);
}

/**
 * 2-opt local search optimization for N > 12 stops
 */
function solveTwoOpt(stops, warehouse, matrix) {
  // Start with Nearest-Neighbour initial tour
  const nn = solveNajdikPehle(stops, warehouse, matrix);
  let tour = [...nn.orderIndices]; // indices 0..N-1
  const N = tour.length;
  if (N <= 2) return nn;

  const getDist = (fromMatIdx, toMatIdx) => matrix[fromMatIdx][toMatIdx].distanceKm || 0;

  let improved = true;
  let iterations = 0;
  const maxIterations = 500;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < N - 1; i++) {
      for (let k = i + 1; k < N; k++) {
        const p1 = i === 0 ? 0 : tour[i - 1] + 1;
        const p2 = tour[i] + 1;
        const p3 = tour[k] + 1;
        const p4 = k === N - 1 ? 0 : tour[k + 1] + 1;

        const currentDist = getDist(p1, p2) + getDist(p3, p4);
        const newDist = getDist(p1, p3) + getDist(p2, p4);

        if (newDist + 0.001 < currentDist) {
          // Reverse slice between i and k
          const slice = tour.slice(i, k + 1).reverse();
          tour.splice(i, slice.length, ...slice);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return buildTourDetails(tour, stops, warehouse, matrix);
}

/**
 * Builds comprehensive tour details: renumbered serials, leg km, durations,
 * ETAs (starting from departure time e.g. 07:00), and final return leg.
 */
function buildTourDetails(orderIndices, stops, warehouse, matrix, departureTime = '07:00') {
  const N = orderIndices.length;
  const orderedStops = [];
  const legs = [];
  let totalKm = 0;
  let totalDrivingMin = 0;

  // Parse departure time (minutes from midnight)
  const parseMin = (t) => {
    const m = (t || '07:00').match(/(\d{1,2}):(\d{2})/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 420;
  };
  const formatTime = (min) => {
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  let currentClockMin = parseMin(departureTime);
  let prevMatrixIdx = 0; // warehouse

  for (let step = 0; step < N; step++) {
    const stopIdx = orderIndices[step];
    const stop = stops[stopIdx];
    const matIdx = stopIdx + 1;

    const leg = matrix[prevMatrixIdx][matIdx];
    const legDist = leg.distanceKm || 0;
    const legDuration = leg.durationMin || 0;

    totalKm += legDist;
    totalDrivingMin += legDuration;
    currentClockMin += legDuration;

    const etaStr = formatTime(currentClockMin);
    // Departure from stop after service time
    currentClockMin += SERVICE_TIME_MIN;

    // Check time warning vs demand_time
    const targetTimeMin = stop.demand_time ? parseMin(stop.demand_time) : null;
    const isLate = targetTimeMin !== null && currentClockMin - SERVICE_TIME_MIN > targetTimeMin + 15;
    const isOddTime = targetTimeMin !== null && (targetTimeMin < 360 || targetTimeMin > 1200); // before 06:00 or after 20:00

    // Distance from warehouse
    const whDist = matrix[0][matIdx];

    const orderedStop = {
      ...stop,
      delivery_sequence: step + 1,
      leg_km: Math.round(legDist * 10) / 10,
      leg_min: legDuration,
      eta: etaStr,
      wh_distance_km: Math.round((whDist.distanceKm || 0) * 10) / 10,
      wh_duration_min: whDist.durationMin || 0,
      is_late: isLate,
      is_odd_time: isOddTime
    };

    orderedStops.push(orderedStop);
    legs.push({
      from: prevMatrixIdx === 0 ? 'Warehouse' : stops[orderIndices[step - 1]].institution_name,
      to: stop.institution_name,
      distanceKm: orderedStop.leg_km,
      durationMin: legDuration,
      eta: etaStr
    });

    prevMatrixIdx = matIdx;
  }

  // Return leg to warehouse
  let returnLeg = null;
  if (N > 0) {
    const lastMatIdx = orderIndices[N - 1] + 1;
    const ret = matrix[lastMatIdx][0];
    const retDist = Math.round((ret.distanceKm || 0) * 10) / 10;
    const retDur = ret.durationMin || 0;
    totalKm += retDist;
    totalDrivingMin += retDur;
    currentClockMin += retDur;

    returnLeg = {
      title: 'Return to Warehouse',
      address: warehouse.address || 'Sector 1, IMT Manesar, Gurugram',
      distanceKm: retDist,
      durationMin: retDur,
      returnTime: formatTime(currentClockMin)
    };
  }

  return {
    orderIndices,
    stops: orderedStops,
    legs,
    totalKm: Math.round(totalKm * 10) / 10,
    totalDrivingMin,
    totalTourMin: totalDrivingMin + N * SERVICE_TIME_MIN,
    returnLeg
  };
}

/**
 * Feature 3: Capacitated Geographical Clustering & Assignment to Cars ("Auto Plan")
 * 
 * Rules:
 * 1. All units of one institution STAY in the same car.
 * 2. Locked stops manually pinned to a car DO NOT move.
 * 3. Group by polar angle sweep around warehouse-to-Delhi corridor.
 * 4. Balance packets across cars (~ +-15% of average or by vehicle capacity).
 * 5. Run "Najdik pehle" route ordering for each car after assignment.
 */
function autoPlanCars(demands, cars, warehouse, options = {}) {
  if (!demands || demands.length === 0 || !cars || cars.length === 0) {
    return { carPlans: [], unassigned: [], summary: {} };
  }

  const activeCars = cars.filter((c) => c.is_active !== 0);
  const numCars = Math.max(1, activeCars.length);

  // Group demands by institution_id (Rule 1: all units of one school stay in same car)
  const instGroups = new Map();

  demands.forEach((d) => {
    // Check if geotagged
    const coords = parseLatLng(d.google_location);
    const instId = d.institution_id || `inst_${d.id}`;

    if (!instGroups.has(instId)) {
      instGroups.set(instId, {
        institution_id: instId,
        institution_name: d.institution_name,
        pin_code: d.pin_code,
        complete_address: d.complete_address,
        coords: coords,
        total_quantity: 0,
        demands: [],
        lockedCarId: null
      });
    }

    const group = instGroups.get(instId);
    group.total_quantity += Number(d.total_quantity) || 0;
    group.demands.push(d);

    // If demand is locked to a car, enforce lock
    if (d.is_locked || (options.respectLocks && d.delivery_partner_id)) {
      group.lockedCarId = d.delivery_partner_id;
    }
  });

  const validGroups = [];
  const unassignedNoGeo = [];

  for (const group of instGroups.values()) {
    if (!group.coords) {
      unassignedNoGeo.push(...group.demands);
    } else {
      validGroups.push(group);
    }
  }

  // Compute polar angle relative to warehouse
  validGroups.forEach((g) => {
    const dLat = g.coords.lat - warehouse.lat;
    const dLng = g.coords.lng - warehouse.lng;
    g.angle = Math.atan2(dLat, dLng); // -PI to PI
    g.distFromWh = haversineDistanceKm(warehouse, g.coords);
  });

  // Sort unlocked groups by angle (angular sweep creates natural spatial wedges)
  validGroups.sort((a, b) => a.angle - b.angle);

  // Initialize car buckets
  const carBuckets = activeCars.map((car) => ({
    car,
    partnerId: car.id,
    vehicle_no: car.vehicle_no,
    name: car.name,
    capacity: car.capacity_packets || 800,
    groups: [],
    totalPackets: 0
  }));

  const carMap = new Map(carBuckets.map((b) => [b.partnerId, b]));

  // Place locked groups first
  const remainingGroups = [];
  for (const group of validGroups) {
    if (group.lockedCarId && carMap.has(group.lockedCarId)) {
      const bucket = carMap.get(group.lockedCarId);
      bucket.groups.push(group);
      bucket.totalPackets += group.total_quantity;
    } else {
      remainingGroups.push(group);
    }
  }

  // Calculate target packets per car
  const totalRemainingPkts = remainingGroups.reduce((acc, g) => acc + g.total_quantity, 0);
  const targetPerCar = Math.max(1, Math.round(totalRemainingPkts / numCars));

  // Greedy angular sweep distribution
  let currentCarIdx = 0;
  for (const group of remainingGroups) {
    let bucket = carBuckets[currentCarIdx];

    // If current bucket has reached target capacity and there are subsequent buckets available
    if (
      bucket.totalPackets >= targetPerCar * 1.15 &&
      currentCarIdx < carBuckets.length - 1
    ) {
      currentCarIdx++;
      bucket = carBuckets[currentCarIdx];
    }

    bucket.groups.push(group);
    bucket.totalPackets += group.total_quantity;
  }

  // Build route plans per car using "Najdik pehle"
  const carPlans = carBuckets.map((bucket) => {
    const flatDemands = [];
    bucket.groups.forEach((g) => {
      g.demands.forEach((d) => {
        flatDemands.push({
          ...d,
          lat: g.coords.lat,
          lng: g.coords.lng
        });
      });
    });

    const route = solveNajdikPehle(flatDemands, warehouse, null, options);

    // Collect PIN code prefixes / localities
    const pinPrefixes = Array.from(
      new Set(
        flatDemands
          .map((d) => (d.pin_code ? String(d.pin_code).slice(0, 4) : ''))
          .filter(Boolean)
      )
    );

    return {
      car: bucket.car,
      partnerId: bucket.partnerId,
      vehicle_no: bucket.vehicle_no,
      driver_name: bucket.name,
      totalStops: flatDemands.length,
      totalPackets: bucket.totalPackets,
      totalKm: route.totalKm,
      totalDurationMin: route.totalTourMin,
      returnLeg: route.returnLeg,
      stops: route.stops,
      pinPrefixes,
      areaDescription: pinPrefixes.length > 0 ? `PINs: ${pinPrefixes.join(', ')}` : 'Delhi NCR'
    };
  });

  return {
    carPlans,
    unassignedNoGeo,
    summary: {
      totalCars: carPlans.length,
      totalStops: carPlans.reduce((acc, c) => acc + c.totalStops, 0),
      totalPackets: carPlans.reduce((acc, c) => acc + c.totalPackets, 0),
      totalKm: carPlans.reduce((acc, c) => acc + c.totalKm, 0),
      noGeoCount: unassignedNoGeo.length
    }
  };
}

/**
 * Feature 4: Google Maps Directions Link Splitter
 * Google Maps allows up to 8-9 waypoints per URL.
 * Splits route into sequential Parts:
 * Part 1: Warehouse -> Stops 1..7 -> Stop 8
 * Part 2: Stop 8 -> Stops 9..15 -> Stop 16 ... -> Warehouse
 */
function generateMultiPartMapsLinks(stops, warehouse) {
  if (!stops || stops.length === 0) return [];
  const coords = [warehouse, ...stops.map((s) => parseLatLng(s.google_location) || s), warehouse].filter(
    (p) => p && p.lat && p.lng
  );

  const CHUNK_SIZE = 8; // 1 origin + 8 waypoints + 1 destination = 10 pts max
  const parts = [];
  let partNum = 1;

  for (let i = 0; i < coords.length - 1; i += CHUNK_SIZE) {
    const chunk = coords.slice(i, Math.min(i + CHUNK_SIZE + 1, coords.length));
    if (chunk.length < 2) break;

    const origin = `${chunk[0].lat.toFixed(6)},${chunk[0].lng.toFixed(6)}`;
    const destination = `${chunk[chunk.length - 1].lat.toFixed(6)},${chunk[chunk.length - 1].lng.toFixed(6)}`;
    const waypoints = chunk
      .slice(1, chunk.length - 1)
      .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`)
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }

    const startLabel = i === 0 ? 'Warehouse' : `Stop #${i}`;
    const endIdx = i + chunk.length - 1;
    const endLabel = endIdx >= coords.length - 1 ? 'Warehouse' : `Stop #${endIdx}`;

    parts.push({
      partNumber: partNum,
      label: `Part ${partNum} (${startLabel} ➔ ${endLabel})`,
      url,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`
    });

    partNum++;
  }

  return parts;
}

module.exports = {
  DEFAULT_WAREHOUSE,
  ROAD_FACTOR,
  AVERAGE_SPEED_KMH,
  SERVICE_TIME_MIN,
  parseLatLng,
  haversineDistanceKm,
  haversineRoadEstimate,
  fetchOsrmTable,
  getWarehouseDistance,
  solveNajdikPehle,
  solveKamSeKamKm,
  solveNearestFirst: solveNajdikPehle,
  solveShortestKm: solveKamSeKamKm,
  solveHeldKarp,
  solveTwoOpt,
  autoPlanCars,
  generateMultiPartMapsLinks
};
