import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import SummaryCard from './components/SummaryCard';
import PlantCard from './components/PlantCard';
import SensorHistory from './components/SensorHistory';
import { plants, getPlantLatest, isNumber, errorMessage } from './services/plantApi';
import SystemStatusBar from './components/SystemStatusBar';
import ErrorState from './components/ErrorState';
import DatasetExport from './components/DatasetExport';
import Icon from './components/Icon';
import './App.css';

export default function App() {
  const [plantData, setPlantData] = useState(() => Object.fromEntries(plants.map(p => [p.id, { loading: true }])));
  const [refreshing, setRefreshing] = useState(true);
  const [lastSynced, setLastSynced] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const current = useRef(null);

  const loadData = useCallback(async () => {
    if (current.current) return;
    const controller = new AbortController();
    current.current = controller;
    setRefreshing(true);
    let received = false;
    await Promise.all(plants.map(async plant => {
      try {
        const data = await getPlantLatest(plant.id, controller.signal);
        if (controller.signal.aborted) return;
        received = true;
        setPlantData(previous => ({ ...previous, [plant.id]: { data, loading: false, error: null } }));
      } catch (error) {
        if (controller.signal.aborted) return;
        setPlantData(previous => ({ ...previous, [plant.id]: { ...previous[plant.id], loading: false, error: errorMessage(error) } }));
      }
    }));
    if (!controller.signal.aborted) {
      if (received) setLastSynced(new Date());
      setRefreshing(false);
      current.current = null;
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => { clearInterval(interval); current.current?.abort(); current.current = null; };
  }, [loadData]);

  const records = plants.filter(p => !plantData[p.id]?.error).map(p => plantData[p.id]?.data).filter(Boolean);
  const average = (field, unit) => {
    const values = records.map(record => record[field]).filter(isNumber);
    return values.length ? `${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)}${unit}` : '—';
  };
  const pumpRecords = records.filter(record => record.pump_state === 0 || record.pump_state === 1);
  const healthy = records.length === plants.length;
  const initialLoading = Object.values(plantData).some(state => state.loading);
  const activePumps = pumpRecords.filter(record => record.pump_state === 1).length;
  const allFailed = Object.values(plantData).every(state => state.error);
  const refreshAll = () => {
    if (current.current) return;
    loadData();
    setRefreshKey(key => key + 1);
  };
  return <div className="app-shell">
    <a className="skip-link" href="#overview">Skip to dashboard</a>
    <div className="app-bar"><div><span className="brand-mark"><Icon name="leaf" /></span><span>PlantCare <b>Research</b></span></div>
      <nav aria-label="Dashboard navigation"><a href="#overview">Overview</a><a href="#plants">Plants</a><a href="#history">History</a><a href="#export">Export</a></nav>
    </div>
    <main className="dashboard" id="overview">
      <Header refreshing={refreshing} lastSynced={lastSynced} healthy={healthy} onRefresh={refreshAll} />
      {allFailed && <ErrorState title="Unable to reach sensor data" message="Latest readings could not be retrieved. Check your connection and retry." onRetry={refreshAll} disabled={refreshing} />}
      <section className="summary-grid" aria-label="Latest sensor overview">
        <SummaryCard icon="leaf" label="Total Plants" value={plants.length} detail={`${records.length} of ${plants.length} readings available`} loading={initialLoading} />
        <SummaryCard icon="droplets" label="Average Soil Moisture" value={average('soil_moisture', '%')} detail="Across available plant readings" loading={initialLoading} />
        <SummaryCard icon="temperature" label="Average Temperature" value={average('temperature', ' °C')} detail="Current environment" loading={initialLoading} />
        <SummaryCard icon="humidity" label="Average Humidity" value={average('humidity', '%')} detail="Current environment" loading={initialLoading} />
        <SummaryCard icon="pump" label="Active Pumps" value={pumpRecords.length ? activePumps : '—'} detail={activePumps > 0 ? 'Irrigation in progress' : pumpRecords.length === plants.length ? 'Irrigation currently idle' : 'Pump data incomplete'} active={activePumps > 0} loading={initialLoading} />
      </section>
      <SystemStatusBar states={Object.values(plantData)} total={plants.length} records={records} activePumps={activePumps} pumpCount={pumpRecords.length} loading={initialLoading} />
      <section id="plants" aria-labelledby="plants-heading"><div className="section-heading"><div><p className="eyebrow">01 / LIVE OVERVIEW</p><h2 id="plants-heading">Plant Monitoring</h2><p>Live measurements and irrigation state for each plant.</p></div><span className="section-meta">{plants.length} monitored plants</span></div>
        <div className="plant-grid">{plants.map(plant => <PlantCard key={plant.id} plant={plant} state={plantData[plant.id]} onRetry={refreshAll} refreshing={refreshing} />)}</div>
      </section>
      <SensorHistory refreshKey={refreshKey} />
      <DatasetExport />
      <aside className="research-note"><Icon name="info" /><div><strong>Research & calibration note</strong><p>Sensor moisture percentages currently use provisional calibration values and will be replaced with validated calibration results during final experimental evaluation.</p></div></aside>
      <footer className="page-footer"><span>Automatic Plant Watering System</span><span>AI IoT Household Utility Management System</span></footer>
    </main>
  </div>;
}
