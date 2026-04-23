import { useEffect, useState } from 'react';
import { Sap_initiative_sapsService } from '../generated/services/Sap_initiative_sapsService';
import { Sap_auditlog_sapsService } from '../generated/services/Sap_auditlog_sapsService';
import { Sap_portfolioowner_sapsService } from '../generated/services/Sap_portfolioowner_sapsService';
import styles from './DataverseViewer.module.css';

interface TabType {
  id: 'initiatives' | 'auditlogs' | 'owners';
  label: string;
}

const TABS: TabType[] = [
  { id: 'initiatives', label: 'Initiatives (Sap_initiative_saps)' },
  { id: 'auditlogs', label: 'Audit Logs (Sap_auditlog_saps)' },
  { id: 'owners', label: 'Portfolio Owners (Sap_portfolioowner_saps)' },
];

export function DataverseViewer() {
  const [activeTab, setActiveTab] = useState<'initiatives' | 'auditlogs' | 'owners'>('initiatives');
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load initiatives
      const initiativesResult = await Sap_initiative_sapsService.getAll({
        select: [
          'sap_initiative_sapid',
          'sap_initiativename',
          'sap_category',
          'sap_description',
          'sap_budgetaed',
          'sap_demandnumber',
          'sap_status',
          'sap_urgency',
          'sap_owner_namename',
          'sap_currentprocessasis',
          'sap_enhancedprocesstobe',
          'sap_comments',
          'sap_implementer',
          'statecode',
          'statuscode',
          'createdby',
          'createdon',
          'modifiedby',
          'modifiedon',
        ],
      });

      if (initiativesResult && 'value' in initiativesResult) {
        setInitiatives(initiativesResult.value as any[]);
      }

      // Load audit logs
      const auditLogsResult = await Sap_auditlog_sapsService.getAll({
        select: [
          'sap_auditlog_sapid',
          'sap_eventname',
          'sap_log_date',
          'sap_log_description',
          'sap_log_severity',
          'sap_initiativenamename',
          '_sap_initiativename_value',
          'statecode',
          'statuscode',
          'createdby',
          'createdon',
          'modifiedby',
          'modifiedon',
        ],
      });

      if (auditLogsResult && 'value' in auditLogsResult) {
        setAuditLogs(auditLogsResult.value as any[]);
      }

      // Load owners
      const ownersResult = await Sap_portfolioowner_sapsService.getAll({
        select: [
          'sap_portfolioowner_sapid',
          'sap_ownername',
          'sap_email',
          'sap_owner_id',
          'statecode',
          'statuscode',
          'createdby',
          'createdon',
          'modifiedby',
          'modifiedon',
        ],
      });

      if (ownersResult && 'value' in ownersResult) {
        setOwners(ownersResult.value as any[]);
      }
    } catch (err) {
      console.error('Error loading Dataverse data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(null)';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 100);
    if (typeof value === 'string' && value.length > 100) return value.slice(0, 100) + '...';
    return String(value);
  };

  const renderTable = (data: any[], title: string) => {
    if (data.length === 0) {
      return <div className={styles.emptyState}>No records found</div>;
    }

    const columns = Object.keys(data[0] || {});

    return (
      <div className={styles.tableWrapper}>
        <h3>{title}</h3>
        <p className={styles.recordCount}>Total Records: {data.length}</p>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col} className={styles.th}>
                    <span title={col}>{col}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className={styles.tr}>
                  {columns.map((col) => (
                    <td key={col} className={styles.td}>
                      <span title={formatValue(row[col])}>{formatValue(row[col])}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📊 Dataverse Data Viewer</h1>
        <p>Raw data from Dataverse tables</p>
        <button className={styles.refreshBtn} onClick={loadData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div className={styles.error}>Error: {error}</div>}

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <p>Loading data from Dataverse...</p>
          </div>
        ) : (
          <>
            {activeTab === 'initiatives' && renderTable(initiatives, 'Sap_initiative_saps Table')}
            {activeTab === 'auditlogs' && renderTable(auditLogs, 'Sap_auditlog_saps Table')}
            {activeTab === 'owners' && renderTable(owners, 'Sap_portfolioowner_saps Table')}
          </>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.label}>Initiatives:</span>
            <span className={styles.value}>{initiatives.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>Audit Logs:</span>
            <span className={styles.value}>{auditLogs.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>Owners:</span>
            <span className={styles.value}>{owners.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
