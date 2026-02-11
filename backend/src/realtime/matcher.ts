import { ActiveTrip } from '../gtfs/types.js';
import { RealtimeDeparture } from './poller.js';

export interface MatchedVehicle {
  vehicleId: string;
  line: string;
  direction: string;
  nextStop: string;
  delaySeconds: number;
  trip: ActiveTrip;
  countdown: number;
}

export function matchRealtimeToTrips(
  departures: RealtimeDeparture[],
  activeTrips: ActiveTrip[]
): MatchedVehicle[] {
  return departures
    .map((dep) => {
      const trip = activeTrips.find(
        (candidate) =>
          candidate.line === dep.line &&
          candidate.direction.toLowerCase().includes(dep.towards.toLowerCase())
      );

      if (!trip) return null;

      const delaySeconds =
        dep.timeReal && dep.timePlanned
          ? Math.floor(
              (new Date(dep.timeReal).getTime() - new Date(dep.timePlanned).getTime()) / 1000
            )
          : 0;

      return {
        vehicleId: `${trip.tripId}-${dep.rbl}`,
        line: dep.line,
        direction: dep.towards,
        nextStop: dep.stopName,
        delaySeconds,
        trip,
        countdown: dep.countdown
      };
    })
    .filter((value): value is MatchedVehicle => Boolean(value));
}
