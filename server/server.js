require('dotenv').config();
const express = require('express');
const morgan  = require('morgan');
const path    = require('path');

const { runMigrations } = require('./config/migrate');
const filterRoutes      = require('./routes/filterRoutes');
const metricsRoutes     = require('./routes/metricsRoutes');
const releaseRoutes     = require('./routes/releaseRoutes');
const configRoutes      = require('./routes/configRoutes');
const portfolioRoutes      = require('./routes/portfolioRoutes');
const efficiencyRoutes     = require('./routes/efficiencyRoutes');
const traceabilityRoutes   = require('./routes/traceabilityRoutes');
const stabilityRoutes      = require('./routes/stabilityRoutes');
const drilldownRoutes      = require('./routes/drilldownRoutes');

const app  = express();
const PORT = process.env.PORT || 3500;

app.use(morgan('dev'));
app.use(express.json());

// API routes
app.use('/api/filters',   filterRoutes);
app.use('/api/metrics',   metricsRoutes);
app.use('/api/releases',  releaseRoutes);

// Admin routes
app.use('/api/admin/ingest', require('./routes/adminRoutes'));
app.use('/api/admin',        configRoutes);
app.use('/api/portfolio',     portfolioRoutes);
app.use('/api/efficiency',   efficiencyRoutes);
app.use('/api/traceability', traceabilityRoutes);
app.use('/api/stability',    stabilityRoutes);
app.use('/api/drilldown',    drilldownRoutes);

// Cron-based ingestion
if (process.env.INGESTION_CRON) {
  const cron        = require('node-cron');
  const xrayIngester = require('./ingestion/sources/xrayApiIngester');
  cron.schedule(process.env.INGESTION_CRON, () => {
    console.log('[cron] Triggered Xray ingestion');
    xrayIngester.run().catch((err) => console.error('[cron] Error:', err.message));
  });
  console.log(`[server] Ingestion cron scheduled: ${process.env.INGESTION_CRON}`);
}

// Serve React client in production (added in M18)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

async function start() {
  await runMigrations();
  app.listen(PORT, () => console.log(`[server] Listening on http://localhost:${PORT}`));
}

start().catch((err) => { console.error(err); process.exit(1); });
