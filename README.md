# Vienna Live Transit Map (Wiener Linien)

Full-stack app that shows Wiener Linien vehicles on a live Vienna map by interpolating positions from realtime departure countdowns and GTFS shape geometry.

## Stack

- Backend: Node.js + Express + WebSocket + TypeScript
- Frontend: React 18 + Vite + TypeScript + Leaflet
- Data: Wiener Linien OGD realtime monitor + GTFS + static CSV mappings

## Features implemented

- GTFS downloader and parser (`stops`, `routes`, `trips`, `stop_times`, `shapes`, `calendar`)
- Lookup-table builder (`trip -> stop_times`, `shape -> shape points`, `route -> line`)
- Active trip resolver for current service day
- Realtime poller with round-robin RBL batching and 15s polling
- Realtime-to-trip matcher (line + direction heuristic)
- Shape-based interpolation for estimated vehicle coordinates
- WebSocket endpoint delivering vehicle positions
- Live Leaflet map centered on Vienna with colored markers and popup details
- Required CC-BY attribution label

## Run locally

### Backend

```bash
cd backend
npm install
npm run dev
```

Place Wiener Linien CSV files in `backend/data/`:

- `wienerlinien-ogd-steige.csv`

Backend starts at `http://localhost:4000` and WebSocket at `ws://localhost:4000/ws`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Notes

- Current implementation starts with U-Bahn RBLs (`ptMetro`) to keep load controlled.
- Interpolation quality improves when `shape_dist_traveled` is present in GTFS stop_times and shapes.
- Realtime API must be queried at minimum 15-second interval.
