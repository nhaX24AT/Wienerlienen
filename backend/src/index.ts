import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { loadRblMappings } from './csv/parser.js';
import { ensureGtfsData } from './gtfs/loader.js';
import { buildLookups, getActiveTrips } from './gtfs/lookup.js';
import { interpolateVehiclePositions } from './realtime/interpolator.js';
import { matchRealtimeToTrips } from './realtime/matcher.js';
import { fetchRealtimeBatch, RealtimePoller } from './realtime/poller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

async function main() {
  const app = express();
  app.get('/health', (_req, res) => res.json({ ok: true }));

  const server = app.listen(Number(process.env.PORT ?? 4000), () => {
    console.log('Backend listening on http://localhost:4000');
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  console.log('Loading GTFS and OGD metadata...');
  const gtfs = await ensureGtfsData(dataDir);
  const lookups = buildLookups(gtfs);
  const mappings = await loadRblMappings(dataDir);

  const ubahnRbls = mappings
    .filter((m) => m.transportType === 'ptMetro')
    .slice(0, 240)
    .map((m) => m.rbl);

  const poller = new RealtimePoller(ubahnRbls, 40);

  const pollAndBroadcast = async () => {
    try {
      const now = new Date();
      const activeTrips = getActiveTrips(now, gtfs, lookups);
      const departures = await fetchRealtimeBatch(poller.nextBatch());
      const matched = matchRealtimeToTrips(departures, activeTrips);
      const positions = interpolateVehiclePositions(matched, lookups, now);

      const payload = JSON.stringify({
        timestamp: now.toISOString(),
        vehicles: positions
      });

      for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
          client.send(payload);
        }
      }
    } catch (error) {
      console.error('Polling cycle failed', error);
    }
  };

  setInterval(pollAndBroadcast, 15_000);
  await pollAndBroadcast();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
