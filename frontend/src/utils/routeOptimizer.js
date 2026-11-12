/**
 * Client-Side Route Optimizer & Geocoding Utilities
 * Computes road distances, "Najdik pehle", "Kam se kam total km",
 * and splits Google Maps directions into multi-part URLs.
 */

export const DEFAULT_WAREHOUSE = {
  name: 'Manesar Sector 1, Gurgaon',
  address: 'Sector 1, IMT Manesar, Gurugram, Haryana 122051',
  lat: 28.3588,
  lng: 76.9382
};

export const ROAD_FACTOR = 1.4;
export const AVERAGE_SPEED_KMH = 30.0;
export const SERVICE_TIME_MIN = 10;

export function parseLatLng(loc) {
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
  const direct = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (direct) {
    const lat = parseFloat(direct[1]);
    const lng = parseFloat(direct[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  const qMatch = trimmed.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  return null;
}

export function haversineDistanceKm(p1, p2) {
  if (!p1 || !p2) return 0;
  const R = 6371.0;
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

export function haversineRoadEstimate(p1, p2) {
  const straight = haversineDistanceKm(p1, p2);
  const roadKm = Math.round(straight * ROAD_FACTOR * 10) / 10;
  const minutes = Math.max(2, Math.round((roadKm / AVERAGE_SPEED_KMH) * 60));
  return { distanceKm: roadKm, durationMin: minutes, isApprox: true };
}

/**
 * Local storage cache key for warehouse distances
 */
const STORAGE_CACHE_KEY = 'wh_distance_cache_v1';

function getLocalStorageCache() {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setLocalStorageCache(obj) {
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {}
}

export function clearDistanceCache() {
  try {
    localStorage.removeItem(STORAGE_CACHE_KEY);
  } catch (e) {}
}

export function getCachedWarehouseDistance(warehouse, target) {
  if (!warehouse || !target) return { distanceKm: 0, durationMin: 0, isApprox: true };
  const r = (n) => Number(n).toFixed(4);
  const key = `${r(warehouse.lat)},${r(warehouse.lng)}__${r(target.lat)},${r(target.lng)}`;

  const cache = getLocalStorageCache();
  if (cache[key]) return cache[key];

  const est = haversineRoadEstimate(warehouse, target);
  cache[key] = est;
  setLocalStorageCache(cache);
  return est;
}

/**
 * Solve "Najdik pehle" tour
 */
export function solveNajdikPehleClient(stops, warehouse, options = {}) {
  if (!stops || stops.length === 0) {
    return { orderIndices: [], stops: [], legs: [], totalKm: 0, totalTourMin: 0, returnLeg: null };
  }

  const allPoints = [warehouse, ...stops];
  const totalPts = allPoints.length;
  const matrix = Array.from({ length: totalPts }, () => Array(totalPts).fill(null));
  for (let i = 0; i < totalPts; i++) {
    for (let j = 0; j < totalPts; j++) {
      if (i === j) {
        matrix[i][j] = { distanceKm: 0, durationMin: 0 };
      } else {
        matrix[i][j] = haversineRoadEstimate(allPoints[i], allPoints[j]);
      }
    }
  }

  const N = stops.length;
  const visited = new Set();
  const orderIndices = [];
  let currentMatIdx = 0;

  for (let step = 0; step < N; step++) {
    let nearestIdx = -1;
    let minCost = Infinity;

    for (let i = 0; i < N; i++) {
      if (!visited.has(i)) {
        const matIdx = i + 1;
        const c = matrix[currentMatIdx][matIdx];
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
      currentMatIdx = nearestIdx + 1;
    }
  }

  return formatTour(orderIndices, stops, warehouse, matrix, options.departureTime || '07:00');
}

/**
 * Solve "Kam se kam total km"
 */
export function solveKamSeKamKmClient(stops, warehouse, options = {}) {
  if (!stops || stops.length === 0) {
    return { orderIndices: [], stops: [], legs: [], totalKm: 0, totalTourMin: 0, returnLeg: null };
  }

  const N = stops.length;
  const allPoints = [warehouse, ...stops];
  const totalPts = allPoints.length;
  const matrix = Array.from({ length: totalPts }, () => Array(totalPts).fill(null));
  for (let i = 0; i < totalPts; i++) {
    for (let j = 0; j < totalPts; j++) {
      if (i === j) {
        matrix[i][j] = { distanceKm: 0, durationMin: 0 };
      } else {
        matrix[i][j] = haversineRoadEstimate(allPoints[i], allPoints[j]);
      }
    }
  }

  if (N <= 12) {
    // Exact Held-Karp DP
    const numStates = 1 << N;
    const memoCost = Array.from({ length: numStates }, () => new Float64Array(N).fill(Infinity));
    const memoPrev = Array.from({ length: numStates }, () => new Int8Array(N).fill(-1));

    for (let i = 0; i < N; i++) {
      memoCost[1 << i][i] = matrix[0][i + 1].distanceKm || 0;
    }

    for (let mask = 1; mask < numStates; mask++) {
      for (let u = 0; u < N; u++) {
        if (!(mask & (1 << u))) continue;
        const currentCost = memoCost[mask][u];
        if (currentCost === Infinity) continue;

        for (let v = 0; v < N; v++) {
          if (mask & (1 << v)) continue;
          const nextMask = mask | (1 << v);
          const newCost = currentCost + (matrix[u + 1][v + 1].distanceKm || 0);
          if (newCost < memoCost[nextMask][v]) {
            memoCost[nextMask][v] = newCost;
            memoPrev[nextMask][v] = u;
          }
        }
      }
    }

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
    return formatTour(orderIndices, stops, warehouse, matrix, options.departureTime || '07:00');
  }

  // 2-opt heuristic for N > 12
  const initial = solveNajdikPehleClient(stops, warehouse, options);
  let tour = [...initial.orderIndices];
  let improved = true;
  let iterations = 0;

  while (improved && iterations < 300) {
    improved = false;
    iterations++;
    for (let i = 0; i < N - 1; i++) {
      for (let k = i + 1; k < N; k++) {
        const p1 = i === 0 ? 0 : tour[i - 1] + 1;
        const p2 = tour[i] + 1;
        const p3 = tour[k] + 1;
        const p4 = k === N - 1 ? 0 : tour[k + 1] + 1;

        const currentDist = (matrix[p1][p2].distanceKm || 0) + (matrix[p3][p4].distanceKm || 0);
        const newDist = (matrix[p1][p3].distanceKm || 0) + (matrix[p2][p4].distanceKm || 0);

        if (newDist + 0.001 < currentDist) {
          const slice = tour.slice(i, k + 1).reverse();
          tour.splice(i, slice.length, ...slice);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return formatTour(tour, stops, warehouse, matrix, options.departureTime || '07:00');
}

function formatTour(orderIndices, stops, warehouse, matrix, departureTime = '07:00') {
  const N = orderIndices.length;
  const orderedStops = [];
  const legs = [];
  let totalKm = 0;
  let totalDrivingMin = 0;

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
  let prevMatrixIdx = 0;

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
    currentClockMin += SERVICE_TIME_MIN;

    const targetTimeMin = stop.demand_time ? parseMin(stop.demand_time) : null;
    const isLate = targetTimeMin !== null && currentClockMin - SERVICE_TIME_MIN > targetTimeMin + 15;
    const isOddTime = targetTimeMin !== null && (targetTimeMin < 360 || targetTimeMin > 1200);

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

export function generateMultiPartMapsLinksClient(stops, warehouse) {
  if (!stops || stops.length === 0) return [];
  const coords = [warehouse, ...stops.map((s) => parseLatLng(s.google_location) || s), warehouse].filter(
    (p) => p && p.lat && p.lng
  );

  const CHUNK_SIZE = 8;
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

export const solveNearestFirstClient = solveNajdikPehleClient;
export const solveShortestKmClient = solveKamSeKamKmClient;
