import { MapContainer, Popup, TileLayer, CircleMarker } from 'react-leaflet';
import { VehiclePosition } from '../types';
import { lineColor } from '../utils/colors';
import 'leaflet/dist/leaflet.css';

interface Props {
  vehicles: VehiclePosition[];
}

export function TransitMap({ vehicles }: Props) {
  return (
    <MapContainer
      center={[48.2082, 16.3738]}
      zoom={12}
      style={{ width: '100%', height: '100vh', background: '#0f172a' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {vehicles.map((vehicle) => (
        <CircleMarker
          key={vehicle.vehicleId}
          center={[vehicle.lat, vehicle.lng]}
          radius={7}
          pathOptions={{ color: lineColor(vehicle.line), fillOpacity: 0.9 }}
        >
          <Popup>
            <strong>{vehicle.line}</strong> → {vehicle.direction}
            <br />
            Next stop: {vehicle.nextStop}
            <br />
            Delay: {vehicle.delay}s
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
