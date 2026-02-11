import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

export interface RblMapping {
  rbl: number;
  line: string;
  direction: string;
  transportType: string;
}

export async function loadRblMappings(dataDir: string): Promise<RblMapping[]> {
  const filePath = path.join(dataDir, 'wienerlinien-ogd-steige.csv');
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = await fs.promises.readFile(filePath, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    trim: true
  });

  return rows
    .filter((row: any) => row.RBL && row.LINIE)
    .map((row: any) => ({
      rbl: Number(row.RBL),
      line: row.LINIE,
      direction: row.RICHTUNG ?? '',
      transportType: row.VERKEHRSMITTEL ?? ''
    }));
}
