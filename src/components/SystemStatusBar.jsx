import Icon from './Icon';
import { formatTimestamp } from '../utils/dateFormat';
export default function SystemStatusBar({ states, total, records, activePumps, pumpCount, loading }) {
  const successCount = states.filter(state => !state.loading && !state.error).length;
  const dates = records.map(record => record.timestamp).filter(value => typeof value === 'string' && Number.isFinite(Date.parse(value)));
  const latest = dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  const irrigation = activePumps > 0 ? 'Watering' : pumpCount === total ? 'Idle' : 'Unknown / partial data';
  const items = [
    ['cloud', 'Cloud connection', loading ? 'Connecting' : successCount === total ? 'Connected' : successCount > 0 ? 'Partially connected' : 'Unavailable'],
    ['network', 'Sensor network', `${records.length} / ${total} readings available`],
    ['pump', 'Irrigation system', irrigation],
    ['clock', 'Last data update', formatTimestamp(latest)],
  ];
  return <section className="system-status" aria-label="System status">
    <dl className="status-grid">{items.map(([icon, label, value]) => <div key={label}><Icon name={icon} /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl>
    <p className="status-caption">Status reflects the latest API retrieval. Device connectivity is not reported.</p>
  </section>;
}
