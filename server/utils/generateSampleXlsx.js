const XLSX = require('xlsx');

/**
 * Generates an in-memory XLSX workbook with sample data for all four ingestion sheets.
 * Column names match the transformers exactly.
 * Returns a Buffer.
 */
function generateSampleXlsx() {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Executions ───────────────────────────────────
  const executions = [
    ['Test Key', 'Fix Version', 'Program', 'Environment', 'Component', 'Execution Status', 'Executed On'],
    ['XRAY-001', 'R1.0', 'Alpha', 'SIT',  'Alpha Core',    'PASS',    '2024-01-20'],
    ['XRAY-002', 'R1.0', 'Alpha', 'SIT',  'Alpha Portal',  'FAIL',    '2024-01-21'],
    ['XRAY-003', 'R1.0', 'Alpha', 'UAT',  'Alpha API',     'BLOCKED', '2024-01-22'],
    ['XRAY-004', 'R1.0', 'Beta',  'SIT',  'Beta Engine',   'PASS',    '2024-01-23'],
    ['XRAY-005', 'R1.0', 'Beta',  'UAT',  'Beta UI',       'FAIL',    '2024-01-24'],
    ['XRAY-006', 'R1.0', 'Gamma', 'SIT',  'Gamma Platform','PASS',    '2024-01-25'],
    ['XRAY-007', 'R1.0', 'Gamma', 'DEV',  'Gamma Sync',    'PASS',    '2024-01-26'],
    ['XRAY-008', 'R1.0', 'Delta', 'PERF', 'Delta Gateway', 'BLOCKED', '2024-01-27'],
    ['XRAY-009', 'R1.1', 'Alpha', 'UAT',  'Alpha Core',    'PASS',    '2024-05-21'],
    ['XRAY-010', 'R1.1', 'Beta',  'SIT',  'Beta Services', 'PASS',    '2024-05-22'],
    ['XRAY-011', 'R1.1', 'Gamma', 'UAT',  'Gamma Reports', 'FAIL',    '2024-05-23'],
    ['XRAY-012', 'R1.1', 'Delta', 'SIT',  'Delta Auth',    'PASS',    '2024-05-24'],
    ['XRAY-001', 'R2.0', 'Alpha', 'UAT',  'Alpha Core',    'PASS',    '2024-09-12'],
    ['XRAY-002', 'R2.0', 'Beta',  'SIT',  'Beta Engine',   'FAIL',    '2024-09-13'],
    ['XRAY-003', 'R2.0', 'Delta', 'UAT',  'Delta Data',    'PASS',    '2024-09-14'],
    ['XRAY-004', 'R2.1', 'Alpha', 'PROD', 'Alpha Portal',  'PASS',    '2025-01-10'],
    ['XRAY-005', 'R2.1', 'Gamma', 'UAT',  'Gamma Platform','BLOCKED', '2025-01-11'],
    ['XRAY-006', 'R3.0', 'Alpha', 'DEV',  'Alpha API',     'PASS',    '2025-07-05'],
    ['XRAY-007', 'R3.0', 'Beta',  'UAT',  'Beta UI',       'PASS',    '2025-07-06'],
    ['XRAY-008', 'R3.0', 'Delta', 'SIT',  'Delta Gateway', 'FAIL',    '2025-07-07'],
  ];

  // ── Sheet 2: Requirements ──────────────────────────────────
  const requirements = [
    ['Requirement Key', 'Summary',                          'Priority', 'Fix Version', 'Linked Test'],
    ['REQ-001',         'User login with MFA',              'High',     'R1.0',        'XRAY-001'  ],
    ['REQ-002',         'Password reset flow',              'High',     'R1.0',        'XRAY-002'  ],
    ['REQ-003',         'Session timeout enforcement',      'Medium',   'R1.0',        'XRAY-003'  ],
    ['REQ-004',         'Role-based access control',        'High',     'R1.0',        'XRAY-004'  ],
    ['REQ-005',         'Audit log for admin actions',      'Medium',   'R1.0',        'XRAY-005'  ],
    ['REQ-006',         'Data export to CSV',               'Low',      'R1.1',        'XRAY-006'  ],
    ['REQ-007',         'API rate limiting',                'High',     'R1.1',        'XRAY-007'  ],
    ['REQ-008',         'Search with filters',              'Medium',   'R1.1',        'XRAY-008'  ],
    ['REQ-009',         'Dashboard KPI widgets',            'Medium',   'R2.0',        'XRAY-009'  ],
    ['REQ-010',         'Notification email on failure',    'Low',      'R2.0',        'XRAY-010'  ],
    ['REQ-011',         'Multi-environment deploy support', 'High',     'R2.1',        'XRAY-011'  ],
    ['REQ-012',         'Load test under 1000 users',       'High',     'R2.1',        'XRAY-012'  ],
    ['REQ-013',         'CI/CD pipeline integration',       'Medium',   'R3.0',        'XRAY-001'  ],
    ['REQ-014',         'Accessibility WCAG 2.1 AA',        'Medium',   'R3.0',        'XRAY-002'  ],
    // Intentionally uncovered — no Linked Test
    ['REQ-015',         'Dark mode UI support',             'Low',      'R1.0',        ''          ],
    ['REQ-016',         'Offline mode caching',             'Medium',   'R2.0',        ''          ],
  ];

  // ── Sheet 3: Defects ──────────────────────────────────────
  const defects = [
    ['Fix Version', 'Program', 'Priority', 'Status',      'Created',    'Resolved'  ],
    ['R1.0',        'Alpha',   'Critical', 'Open',        '2024-01-18', ''          ],
    ['R1.0',        'Alpha',   'Critical', 'Open',        '2024-01-20', ''          ],
    ['R1.0',        'Beta',    'High',     'Open',        '2024-01-22', ''          ],
    ['R1.0',        'Gamma',   'Critical', 'Open',        '2024-01-25', ''          ],
    ['R1.0',        'Delta',   'Medium',   'Resolved',    '2024-01-28', '2024-03-10'],
    ['R1.0',        'Alpha',   'Low',      'Closed',      '2024-02-01', '2024-04-01'],
    ['R1.1',        'Beta',    'Critical', 'Resolved',    '2024-05-21', '2024-07-15'],
    ['R1.1',        'Gamma',   'High',     'Resolved',    '2024-05-23', '2024-07-20'],
    ['R1.1',        'Alpha',   'Medium',   'Closed',      '2024-06-01', '2024-07-30'],
    ['R2.0',        'Delta',   'Critical', 'Resolved',    '2024-09-12', '2024-11-01'],
    ['R2.0',        'Beta',    'High',     'Open',        '2024-09-15', ''          ],
    ['R2.0',        'Gamma',   'Critical', 'Resolved',    '2024-09-18', '2024-11-15'],
    ['R2.1',        'Alpha',   'High',     'In Progress', '2025-01-10', ''          ],
    ['R2.1',        'Delta',   'Medium',   'Open',        '2025-01-12', ''          ],
    ['R3.0',        'Beta',    'Low',      'Open',        '2025-07-05', ''          ],
  ];

  // ── Sheet 4: Releases ─────────────────────────────────────
  const releases = [
    ['Release', 'Version', 'Release Date', 'Status'   ],
    ['R1.0',    '1.0.0',   '2024-01-15',   'Completed'],
    ['R1.1',    '1.1.0',   '2024-05-20',   'Completed'],
    ['R2.0',    '2.0.0',   '2024-09-10',   'Completed'],
    ['R2.1',    '2.1.0',   '2025-01-08',   'Active'   ],
    ['R3.0',    '3.0.0',   '2025-07-01',   'Planning' ],
  ];

  function addSheet(name, data) {
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-width columns
    const colWidths = data[0].map((_, ci) =>
      Math.max(...data.map((row) => String(row[ci] ?? '').length)) + 2
    );
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));

    // Style header row (bold via cell metadata — supported by xlsx write)
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E9EEF4' } } };
    }

    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  addSheet('Executions',   executions);
  addSheet('Requirements', requirements);
  addSheet('Defects',      defects);
  addSheet('Releases',     releases);

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { generateSampleXlsx };
