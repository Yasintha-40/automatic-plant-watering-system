export const API_URL = 'https://wrw4z562lj.execute-api.ap-southeast-2.amazonaws.com/sensor-data';
export const plants = [
  { id: 'P01', name: 'Aloe Vera', valve: 'V01', requirement: 'Low' },
  { id: 'P02', name: 'Chilli', valve: 'V02', requirement: 'Medium' },
  { id: 'P03', name: 'Mint', valve: 'V03', requirement: 'High' },
];
export async function getPlantHistory(plantId, limit = 20, signal) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(`${API_URL}?plant_id=${encodeURIComponent(plantId)}&limit=${limit}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error(`Sensor API returned HTTP ${response.status}.`);
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Sensor API returned invalid JSON.'); }
  if (!Array.isArray(result.data)) throw new Error('Sensor API response is missing its data array.');
  if (result.data.some(record => !record || typeof record !== 'object' || Array.isArray(record))) {
    throw new Error('Sensor API returned an invalid record.');
  }
  return result.data;
}
export async function getPlantLatest(plantId, signal) {
  return (await getPlantHistory(plantId, 1, signal))[0] ?? null;
}
export async function fetchPlantRecords(plantId = 'all', limit = 50, signal) {
  const parsedLimit = Number(limit) || 50;
  if (!plantId || plantId === 'all' || plantId === 'ALL') {
    const results = await Promise.all(
      plants.map(async plant => {
        try {
          return await getPlantHistory(plant.id, parsedLimit, signal);
        } catch (error) {
          throw new Error(`Failed to fetch records for ${plant.name} (${plant.id}): ${error.message}`);
        }
      })
    );
    const combined = results.flat();
    return combined.sort((a, b) => {
      const timeA = a.timestamp ? Date.parse(a.timestamp) : 0;
      const timeB = b.timestamp ? Date.parse(b.timestamp) : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.plant_id || '').localeCompare(b.plant_id || '');
    });
  }

  const records = await getPlantHistory(plantId, parsedLimit, signal);
  return [...records].sort((a, b) => {
    const timeA = a.timestamp ? Date.parse(a.timestamp) : 0;
    const timeB = b.timestamp ? Date.parse(b.timestamp) : 0;
    return timeA - timeB;
  });
}
export const isNumber = value => typeof value === 'number' && Number.isFinite(value);
export const displayValue = (value, unit = '') => value === null || value === undefined || value === '' ? '—' : `${value}${unit}`;
export const errorMessage = error => error.name === 'TimeoutError' ? 'Request timed out. Retrying on the next refresh.' : error.message || 'Unable to reach the sensor API.';

