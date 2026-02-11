import { TransitMap } from './components/Map';
import { useVehicles } from './hooks/useWebSocket';

export default function App() {
  const vehicles = useVehicles();

  return (
    <div>
      <TransitMap vehicles={vehicles} />
      <div
        style={{
          position: 'fixed',
          right: 12,
          bottom: 12,
          color: 'white',
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 12
        }}
      >
        Datenquelle: Stadt Wien – data.wien.gv.at
      </div>
    </div>
  );
}
