// Read-only integration check: renders components using actual AWS records.
// Run with: node tests/liveUiSmoke.mjs
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { plants, getPlantLatest, getPlantHistory } from '../src/services/plantApi.js';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalError = console.error;
const renderErrors = [];
console.error = (...args) => { renderErrors.push(args.map(String).join(' ')); };
try {
  const { default: PlantCard } = await vite.ssrLoadModule('/src/components/PlantCard.jsx');
  const { default: SensorChart } = await vite.ssrLoadModule('/src/components/SensorChart.jsx');
  const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
  const initial = renderToStaticMarkup(createElement(App));
  assert.ok(initial.includes('Automatic Plant Watering'));
  assert.ok(initial.includes('Loading summary data'));
  assert.ok(initial.includes('Loading chart data'));
  assert.ok(initial.includes('Dataset Export'));
  assert.ok(initial.includes('Download CSV'));
  assert.ok(initial.includes('Current sensor records may include development and provisional calibration data'));
  for (const plant of plants) {
    const [latest, history] = await Promise.all([getPlantLatest(plant.id), getPlantHistory(plant.id, 20)]);
    assert.ok(latest, plant.id + ' latest reading missing');
    assert.ok(history.length > 0, plant.id + ' history missing');
    const card = renderToStaticMarkup(createElement(PlantCard, {
      plant, state: { data: latest, loading: false }, onRetry: () => {},
    }));
    assert.ok(card.includes(plant.name));
    assert.ok(card.includes(String(latest.soil_moisture) + '%'));
    if (latest.water_volume === 0) assert.ok(card.includes('No watering event'));
    for (const field of ['soil_moisture', 'temperature', 'humidity', 'water_level']) {
      const chart = renderToStaticMarkup(createElement(SensorChart, { records: history, field, label: field, unit: '', description: 'Actual AWS records', icon: 'chart' }));
      assert.ok(chart.includes('View exact readings'), plant.id + ' ' + field + ' chart missing');
      assert.ok(!chart.includes('NaN'), plant.id + ' ' + field + ' invalid chart geometry');
    }
    const staleCard = renderToStaticMarkup(createElement(PlantCard, {
      plant, state: { data: latest, error: 'Connection failed' }, onRetry: () => {},
    }));
    assert.ok(staleCard.includes('Last successful data is shown.'));
    assert.ok(staleCard.includes('Retry'));
    console.log(plant.id + ': latest card, retained-data error state and four real-data charts passed (' + history.length + ' history records).');
  }
  assert.equal(renderErrors.length, 0, renderErrors[0]);
  console.log('Initial loading layout and all real-data component render checks passed without React warnings.');
} finally {
  console.error = originalError;
  await vite.close();
}
