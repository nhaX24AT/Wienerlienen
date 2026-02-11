import { LookupTables } from '../gtfs/lookup.js';
import { MatchedVehicle } from './matcher.js';

export interface VehiclePosition {
  vehicleId: string;
  line: string;
  direction: string;
  nextStop: string;
  delay: number;
  lat: number;
  lng: number;
}

function parseGtfsTime(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

export function interpolateVehiclePositions(
  matched: MatchedVehicle[],
  lookups: LookupTables,
  now: Date
): VehiclePosition[] {
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  return matched.flatMap((vehicle) => {
    const stops = vehicle.trip.stopTimes;
    const shape = lookups.shapesById.get(vehicle.trip.shapeId) ?? [];
    if (stops.length < 2 || shape.length < 2) return [];

    const segmentIndex = stops.findIndex((stop, i) => {
      if (i === 0) return false;
      return parseGtfsTime(stop.arrival_time) >= nowSec;
    });
    if (segmentIndex <= 0) return [];

    const prev = stops[segmentIndex - 1];
    const next = stops[segmentIndex];

    const t0 = parseGtfsTime(prev.departure_time);
    const t1 = parseGtfsTime(next.arrival_time);
    const denom = Math.max(t1 - t0, 1);
    const progress = Math.max(0, Math.min(1, (nowSec - t0) / denom));

    const d0 = prev.shape_dist_traveled ?? 0;
    const d1 = next.shape_dist_traveled ?? shape[shape.length - 1].shape_dist_traveled ?? d0 + 1;
    const targetDist = d0 + (d1 - d0) * progress;

    const point = interpolateOnShape(shape, targetDist);

    return [
      {
        vehicleId: vehicle.vehicleId,
        line: vehicle.line,
        direction: vehicle.direction,
        nextStop: vehicle.nextStop,
        delay: vehicle.delaySeconds,
        lat: point.lat,
        lng: point.lng
      }
    ];
  });
}

function interpolateOnShape(
  shape: Array<{ shape_pt_lat: number; shape_pt_lon: number; shape_dist_traveled?: number }>,
  targetDist: number
): { lat: number; lng: number } {
  for (let i = 1; i < shape.length; i++) {
    const prev = shape[i - 1];
    const next = shape[i];
    const d0 = prev.shape_dist_traveled ?? i - 1;
    const d1 = next.shape_dist_traveled ?? i;
    if (targetDist > d1) continue;
    const ratio = d1 === d0 ? 0 : (targetDist - d0) / (d1 - d0);
    return {
      lat: prev.shape_pt_lat + (next.shape_pt_lat - prev.shape_pt_lat) * ratio,
      lng: prev.shape_pt_lon + (next.shape_pt_lon - prev.shape_pt_lon) * ratio
    };
  }
  const last = shape[shape.length - 1];
  return { lat: last.shape_pt_lat, lng: last.shape_pt_lon };
}
