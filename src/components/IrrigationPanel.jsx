import StatusBadge from './StatusBadge';
import Icon from './Icon';
import { displayValue } from '../services/plantApi';
export default function IrrigationPanel({ data }) {
  const active = data.pump_state === 1;
  return <section className={`irrigation-panel${active ? ' is-active' : ''}`} aria-label="Irrigation details">
    <div className="irrigation-heading"><h4><Icon name="droplets" />Irrigation</h4><StatusBadge tone={active ? 'green' : 'neutral'}>{active ? 'Watering' : data.pump_state === 0 ? 'Idle' : 'Unknown'}</StatusBadge></div>
    <dl>
      <div><dt>Pump status</dt><dd>{active ? 'ON' : data.pump_state === 0 ? 'OFF' : 'Unknown'}</dd></div>
      <div><dt>Valve ID</dt><dd>{displayValue(data.valve_id)}</dd></div>
      <div><dt>Water volume</dt><dd>{data.water_volume === 0 ? 'No watering event' : displayValue(data.water_volume)}</dd></div>
      <div><dt>Watering duration</dt><dd>{data.watering_duration === 0 ? '—' : displayValue(data.watering_duration)}</dd></div>
      <div><dt>Watering status</dt><dd>{active ? 'Watering' : data.watering_label === 1 ? 'Needs Water' : data.watering_label === 0 ? 'Normal' : 'Unknown'}</dd></div>
    </dl>
  </section>;
}
