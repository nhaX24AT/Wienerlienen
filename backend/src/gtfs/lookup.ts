import { ActiveTrip, GtfsData, ShapePoint, StopTime } from './types.js';

export interface LookupTables {
  stopTimesByTrip: Map<string, StopTime[]>;
  shapesById: Map<string, ShapePoint[]>;
  lineByRouteId: Map<string, string>;
}

export function buildLookups(data: GtfsData): LookupTables {
  const stopTimesByTrip = new Map<string, StopTime[]>();
  for (const stopTime of data.stopTimes) {
    const list = stopTimesByTrip.get(stopTime.trip_id) ?? [];
    list.push(stopTime);
    stopTimesByTrip.set(stopTime.trip_id, list);
  }
  for (const [tripId, times] of stopTimesByTrip) {
    stopTimesByTrip.set(
      tripId,
      times.sort((a, b) => a.stop_sequence - b.stop_sequence)
    );
  }

  const shapesById = new Map<string, ShapePoint[]>();
  for (const point of data.shapes) {
    const list = shapesById.get(point.shape_id) ?? [];
    list.push(point);
    shapesById.set(point.shape_id, list);
  }
  for (const [shapeId, points] of shapesById) {
    shapesById.set(
      shapeId,
      points.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
    );
  }

  const lineByRouteId = new Map(
    data.routes.map((r) => [r.route_id, r.route_short_name])
  );

  return { stopTimesByTrip, shapesById, lineByRouteId };
}

function toDaySeconds(gtfsTime: string): number {
  const [h, m, s] = gtfsTime.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

export function getActiveTrips(now: Date, data: GtfsData, lookups: LookupTables): ActiveTrip[] {
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const weekdayFields = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ] as const;
  const weekdayField = weekdayFields[now.getDay()];

  const activeServices = new Set(
    data.calendar
      .filter(
        (c) =>
          c[weekdayField] === 1 && c.start_date <= ymd && c.end_date >= ymd
      )
      .map((c) => c.service_id)
  );

  const secondsNow = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  return data.trips
    .filter((trip) => activeServices.has(trip.service_id))
    .map((trip) => {
      const stopTimes = lookups.stopTimesByTrip.get(trip.trip_id) ?? [];
      return { trip, stopTimes };
    })
    .filter(({ stopTimes }) => {
      if (stopTimes.length === 0) return false;
      const first = toDaySeconds(stopTimes[0].departure_time);
      const last = toDaySeconds(stopTimes[stopTimes.length - 1].arrival_time);
      return secondsNow >= first && secondsNow <= last;
    })
    .map(({ trip, stopTimes }) => ({
      tripId: trip.trip_id,
      routeId: trip.route_id,
      line: lookups.lineByRouteId.get(trip.route_id) ?? trip.route_id,
      direction: trip.trip_headsign,
      shapeId: trip.shape_id,
      stopTimes
    }));
}
