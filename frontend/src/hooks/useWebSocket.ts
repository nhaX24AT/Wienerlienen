import { useEffect, useState } from 'react';
import { VehiclePosition } from '../types';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);

  useEffect(() => {
    const ws = new WebSocket((import.meta.env.VITE_WS_URL as string) ?? 'ws://localhost:4000/ws');

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setVehicles(payload.vehicles ?? []);
    };

    ws.onerror = () => {
      setVehicles([]);
    };

    return () => ws.close();
  }, []);

  return vehicles;
}
