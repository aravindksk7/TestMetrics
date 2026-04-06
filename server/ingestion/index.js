require('dotenv').config();
const xlsxIngester  = require('./sources/xlsxIngester');
const xrayIngester  = require('./sources/xrayApiIngester');

const args   = process.argv.slice(2);
const source = (args.find((a) => a.startsWith('--source=')) || '').split('=')[1] || 'xlsx';

const ingester = source === 'xray' ? xrayIngester : xlsxIngester;

ingester.run()
  .then((summary) => { console.log(JSON.stringify(summary, null, 2)); process.exit(0); })
  .catch((err)    => { console.error(err.message); process.exit(1); });
