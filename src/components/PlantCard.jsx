import StatusBadge from './StatusBadge';
import MoistureBar from './MoistureBar';
import IrrigationPanel from './IrrigationPanel';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorState from './ErrorState';
import Icon from './Icon';
import { displayValue } from '../services/plantApi';
import { formatTimestamp } from '../utils/dateFormat';

export default function PlantCard({ plant, state, onRetry, refreshing }) {
  const { data, error, loading } = state || {};
  const active = data?.pump_state === 1;
  const status = active ? 'Watering' : data?.watering_label === 1 ? 'Needs Water' : data?.watering_label === 0 ? 'Normal' : 'Unknown';
  return <article className={`plant-card${active ? ' plant-active' : ''}`} aria-labelledby={`plant-${plant.id}`}>
    <div className="plant-heading"><div className="plant-name"><span className="plant-icon"><Icon name="leaf" /></span><div><h3 id={`plant-${plant.id}`}>{plant.name}</h3><p>{plant.id} <span>·</span> Valve {plant.valve}</p></div></div>
      <StatusBadge tone={error ? 'amber' : active ? 'green' : data?.watering_label === 1 ? 'amber' : 'neutral'}>{error ? 'Data delayed' : loading ? 'Connecting' : status}</StatusBadge>
    </div>
    <span className={`requirement requirement-${plant.requirement.toLowerCase()}`} title={`${plant.requirement} Water Requirement`}>{plant.requirement} water</span>
    {error && <ErrorState title={`Unable to load ${plant.name} data.`} message={error} retained={Boolean(data)} onRetry={onRetry} disabled={refreshing} />}
    {!data ? loading ? <LoadingSkeleton kind="plant" /> : <div className="empty-state"><Icon name="leaf" /><p>{error ? 'Waiting for a successful reading.' : 'No sensor readings available yet.'}</p></div> : <>
      <MoistureBar moisture={data.soil_moisture} target={data.target_moisture} />
      <dl className="sensor-grid">
        {[
          ['temperature', 'Temperature', displayValue(data.temperature, ' °C')],
          ['humidity', 'Humidity', displayValue(data.humidity, '%')],
          ['gauge', 'Water level', displayValue(data.water_level)],
          ['droplets', 'Raw moisture', displayValue(data.soil_raw)],
        ].map(([icon, label, value]) => <div key={label}><Icon name={icon} /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}
      </dl>
      <IrrigationPanel data={data} />
      <footer className="reading-time"><Icon name="clock" /><span>Last updated<time dateTime={data.timestamp || undefined} title={data.timestamp}>{formatTimestamp(data.timestamp)}</time></span></footer>
    </>}
  </article>;
}
