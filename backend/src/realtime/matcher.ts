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

const normalize = (value: string): string => value.trim().toLowerCase();

function resolveDirection(dep: RealtimeDeparture): string {
  return dep.towards || dep.direction;
}

export function matchRealtimeToTrips(
  departures: RealtimeDeparture[],
  activeTrips: ActiveTrip[]
): MatchedVehicle[] {
  const availableTrips = [...activeTrips];

  return departures
    .map((dep) => {
      const realtimeDirection = normalize(resolveDirection(dep));
      const tripIndex = availableTrips.findIndex((candidate) => {
        if (candidate.line !== dep.line) return false;
        if (!realtimeDirection) return true;
        return normalize(candidate.direction).includes(realtimeDirection);
      });

      if (tripIndex === -1) return null;

      const [trip] = availableTrips.splice(tripIndex, 1);

      const delaySeconds =
        dep.timeReal && dep.timePlanned
          ? Math.floor(
              (new Date(dep.timeReal).getTime() - new Date(dep.timePlanned).getTime()) / 1000
            )
          : 0;

      return {
        vehicleId: `${trip.tripId}-${dep.rbl}`,
        line: dep.line,
        direction: resolveDirection(dep),
        nextStop: dep.stopName,
        delaySeconds,
        trip,
        countdown: dep.countdown
      };
    })
    .filter((value): value is MatchedVehicle => Boolean(value));
}
