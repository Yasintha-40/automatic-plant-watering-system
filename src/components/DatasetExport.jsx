import { useEffect, useMemo, useState } from 'react';
import { plants, fetchPlantRecords, errorMessage } from '../services/plantApi';
import { downloadCSV, getDatasetFilename, CSV_COLUMNS, exportResearchCSV } from '../utils/csvExport';
import { filterRecordsByStage, getExperimentIds, getDataQualitySummary } from '../utils/researchData';
import Icon from './Icon';

export default function DatasetExport() {
  const [plantId, setPlantId] = useState('all');
  const [limit, setLimit] = useState(50);
  const [stage, setStage] = useState('all');
  const [experimentId, setExperimentId] = useState('all');
  const [retryKey, setRetryKey] = useState(0);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPlantRecords(plantId, limit, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setRecords(data); setError(null); } })
      .catch(err => { if (!controller.signal.aborted) { setRecords([]); setError(errorMessage(err)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [plantId, limit, retryKey]);

  const experimentIds = useMemo(() => getExperimentIds(records), [records]);
  const filteredRecords = useMemo(() => {
    const stageRecords = filterRecordsByStage(records, stage);
    return experimentId === 'all' ? stageRecords : stageRecords.filter(record => record.experiment_id === experimentId);
  }, [records, stage, experimentId]);
  const quality = useMemo(() => getDataQualitySummary(records), [records]);

  const resetFeedback = () => { setError(null); setSuccess(null); };
  const handleDownload = () => {
    if (exporting || loading || error) return;
    setExporting(true);
    resetFeedback();
    try {
      const csvContent = exportResearchCSV(filteredRecords);
      const filename = getDatasetFilename(plantId);
      downloadCSV(csvContent, filename);
      const targetPlant = plantId === 'all' ? 'All Plants' : (plants.find(p => p.id === plantId)?.name ?? plantId);
      setSuccess({ count: filteredRecords.length, filename, plant: targetPlant });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const selectPlant = value => { setLoading(true); setPlantId(value); resetFeedback(); };

  return (
    <section id="export" className="export-section" aria-labelledby="export-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 / RESEARCH DATA</p>
          <h2 id="export-heading">Dataset Export</h2>
          <p>Download raw sensor records for debugging, development, and future experimental analysis.</p>
        </div>
        <span className="section-meta">CSV · {CSV_COLUMNS.length} Research Attributes</span>
      </div>

      <div className="export-card">
        <div className="export-card-header">
          <div className="export-card-title">
            <span className="export-icon-badge"><Icon name="database" /></span>
            <div><h3>IoT Research Dataset Export</h3><p>Direct AWS sensor pipeline extraction with unaltered telemetry.</p></div>
          </div>
        </div>

        <div className="export-controls">
          <label className="export-control-group">
            <span className="control-label">Plant Selection</span>
            <select id="export-plant-select" value={plantId} onChange={e => selectPlant(e.target.value)} disabled={loading || exporting}>
              <option value="all">All Plants</option>
              {plants.map(plant => <option key={plant.id} value={plant.id}>{plant.name} ({plant.id})</option>)}
            </select>
          </label>
          <label className="export-control-group">
            <span className="control-label">Record Limit</span>
            <select id="export-limit-select" value={limit} onChange={e => { setLoading(true); setLimit(Number(e.target.value)); resetFeedback(); }} disabled={loading || exporting}>
              <option value={20}>20 records</option><option value={50}>50 records</option><option value={100}>100 records</option>
            </select>
          </label>
          <label className="export-control-group">
            <span className="control-label">Data Stage</span>
            <select id="export-stage-select" value={stage} onChange={e => { setStage(e.target.value); setExperimentId('all'); resetFeedback(); }} disabled={loading || exporting}>
              <option value="all">All Records</option><option value="development">Development / Testing</option>
              <option value="experiment">Experimental</option><option value="legacy">Legacy / Unclassified</option>
            </select>
          </label>
          {experimentIds.length > 0 && <label className="export-control-group">
            <span className="control-label">Experiment</span>
            <select id="export-experiment-select" value={experimentId} onChange={e => { setExperimentId(e.target.value); resetFeedback(); }} disabled={loading || exporting}>
              <option value="all">All Experiments</option>
              {experimentIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>}
          <div className="export-action-group">
            <span className="control-label" aria-hidden="true">&nbsp;</span>
            <button type="button" id="download-csv-btn" onClick={handleDownload} disabled={loading || exporting || Boolean(error)} aria-busy={exporting} className="export-button">
              <Icon name={exporting ? 'refresh' : 'download'} className={exporting ? 'spin' : ''} />
              {loading ? 'Loading records...' : exporting ? 'Preparing dataset...' : 'Download CSV'}
            </button>
          </div>
        </div>

        {loading && <p className="dataset-load-status" role="status">Fetching records from AWS…</p>}
        {error && <div className="error-state export-feedback" role="alert"><Icon name="alert" /><div><strong>Dataset unavailable</strong><p>{error}</p></div><button type="button" className="text-button" onClick={() => { setLoading(true); setRetryKey(value => value + 1); }} disabled={loading}>Retry</button></div>}
        {stage === 'experiment' && quality.experimental === 0 && !loading && !error && <div className="export-warning" role="status"><Icon name="info" /><p>No validated experimental records are available yet. Complete final sensor calibration and begin an experimental run before using data for machine-learning training.</p></div>}
        {success && <div className="export-success" role="status"><Icon name="check" /><div><strong>Dataset ready</strong><p>Downloaded <b>{success.count}</b> records ({success.plant}) to <code>{success.filename}</code>.</p></div></div>}

        {!loading && !error && <div className="data-quality" aria-labelledby="data-quality-heading">
          <h3 id="data-quality-heading">Data Quality Summary</h3>
          <dl className="quality-grid">
            <div><dt>Total fetched records</dt><dd>{quality.total}</dd></div>
            <div><dt><span className="research-badge badge-green">Experimental</span></dt><dd>{quality.experimental}</dd></div>
            <div><dt><span className="research-badge badge-amber">Development</span></dt><dd>{quality.development}</dd></div>
            <div><dt><span className="research-badge badge-legacy">Legacy</span></dt><dd>{quality.legacy}</dd></div>
            <div><dt>Records with missing fields</dt><dd>{quality.missingFields}</dd></div>
          </dl>
        </div>}

        <aside className="export-warning"><Icon name="info" /><p>Only records marked as Experimental and collected after final sensor calibration should be used for final machine-learning training and evaluation. Development records remain available for debugging and system development.</p></aside>
        <details className="export-schema-details">
          <summary>View exported schema ({CSV_COLUMNS.length} columns)</summary>
          <div className="schema-tag-grid">{CSV_COLUMNS.map(col => <span key={col} className="schema-tag"><code>{col}</code></span>)}</div>
        </details>
      </div>
    </section>
  );
}
