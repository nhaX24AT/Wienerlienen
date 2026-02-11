import fetch from 'node-fetch';

export interface RealtimeDeparture {
  rbl: number;
  line: string;
  direction: string;
  towards: string;
  countdown: number;
  timeReal?: string;
  timePlanned?: string;
  stopName: string;
}

export async function fetchRealtimeBatch(rblIds: number[]): Promise<RealtimeDeparture[]> {
  if (rblIds.length === 0) return [];
  const query = rblIds.join(',');
  const url = `https://www.wienerlinien.at/ogd_realtime/monitor?rbl=${query}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Realtime API returned ${response.status}`);
  }

  const json = (await response.json()) as any;
  const monitors = json?.data?.monitors ?? [];

  const rows: RealtimeDeparture[] = [];
  for (const monitor of monitors) {
    const stopName = monitor.locationStop?.properties?.title ?? monitor.locationStop?.properties?.name ?? 'Unknown';
    const rbl = Number(monitor.locationStop?.properties?.attributes?.rbl ?? 0);
    for (const line of monitor.lines ?? []) {
      const departures = line.departures?.departure ?? [];
      const next = departures[0]?.departureTime;
      if (!next) continue;
      rows.push({
        rbl,
        line: line.name,
        direction: line.direction ?? '',
        towards: line.towards ?? '',
        countdown: Number(next.countdown ?? 0),
        timeReal: next.timeReal,
        timePlanned: next.timePlanned,
        stopName
      });
    }
  }
  return rows;
}

export class RealtimePoller {
  private cursor = 0;
  constructor(
    private readonly allRbls: number[],
    private readonly batchSize = 40
  ) {}

  nextBatch(): number[] {
    if (this.allRbls.length <= this.batchSize) return this.allRbls;
    const start = this.cursor;
    const end = Math.min(start + this.batchSize, this.allRbls.length);
    this.cursor = end >= this.allRbls.length ? 0 : end;
    return this.allRbls.slice(start, end);
  }
}
