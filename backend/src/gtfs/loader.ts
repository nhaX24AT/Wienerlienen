import fs from 'node:fs';
import path from 'node:path';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import yauzl from 'yauzl';
import { GtfsData } from './types.js';

const GTFS_URL =
  'https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip';

const REQUIRED_FILES = [
  'stops.txt',
  'routes.txt',
  'trips.txt',
  'stop_times.txt',
  'shapes.txt',
  'calendar.txt'
] as const;

export async function ensureGtfsData(dataDir: string): Promise<GtfsData> {
  const zipPath = path.join(dataDir, 'gtfs.zip');
  if (!fs.existsSync(zipPath)) {
    await fs.promises.mkdir(dataDir, { recursive: true });
    const response = await fetch(GTFS_URL);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download GTFS: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(zipPath, buffer);
  }

  const extracted = await unzipSelected(zipPath, dataDir);

  const readCsv = async (name: string) => {
    const raw = await fs.promises.readFile(path.join(extracted, name), 'utf-8');
    return parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  };

  const [stops, routes, trips, stopTimes, shapes, calendar] = await Promise.all(
    REQUIRED_FILES.map(readCsv)
  );

  return {
    stops: stops.map((row: any) => ({
      ...row,
      stop_lat: Number(row.stop_lat),
      stop_lon: Number(row.stop_lon)
    })),
    routes,
    trips,
    stopTimes: stopTimes.map((row: any) => ({
      ...row,
      stop_sequence: Number(row.stop_sequence),
      shape_dist_traveled: row.shape_dist_traveled
        ? Number(row.shape_dist_traveled)
        : undefined
    })),
    shapes: shapes.map((row: any) => ({
      ...row,
      shape_pt_lat: Number(row.shape_pt_lat),
      shape_pt_lon: Number(row.shape_pt_lon),
      shape_pt_sequence: Number(row.shape_pt_sequence),
      shape_dist_traveled: row.shape_dist_traveled
        ? Number(row.shape_dist_traveled)
        : undefined
    })),
    calendar: calendar.map((row: any) => ({
      ...row,
      monday: Number(row.monday),
      tuesday: Number(row.tuesday),
      wednesday: Number(row.wednesday),
      thursday: Number(row.thursday),
      friday: Number(row.friday),
      saturday: Number(row.saturday),
      sunday: Number(row.sunday)
    }))
  };
}

function unzipSelected(zipPath: string, outDir: string): Promise<string> {
  const extractDir = path.join(outDir, 'gtfs');
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        reject(err ?? new Error('Unable to open zip'));
        return;
      }
      fs.mkdirSync(extractDir, { recursive: true });
      zip.readEntry();
      zip.on('entry', (entry) => {
        if (!REQUIRED_FILES.includes(entry.fileName as any)) {
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) {
            reject(streamErr ?? new Error('Unable to open entry stream'));
            return;
          }
          const output = fs.createWriteStream(path.join(extractDir, entry.fileName));
          stream.pipe(output);
          output.on('finish', () => zip.readEntry());
          output.on('error', reject);
        });
      });
      zip.once('end', () => resolve(extractDir));
      zip.once('error', reject);
    });
  });
}
