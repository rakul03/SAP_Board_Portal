import { AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { getDocumentsFromFlow, type SharePointDocument } from '../services/flowService';
import { PageHeader } from '../components/PageHeader';
import styles from './FlowTest.module.css';

interface FlowTestProps {
  onBack: () => void;
}

export function FlowTest({ onBack }: FlowTestProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [documents, setDocuments] = useState<SharePointDocument[]>([]);
  const [rawResponse, setRawResponse] = useState<string>('');

  const handleTestFlow = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setDocuments([]);
    setRawResponse('');

    try {
      console.log('Calling getDocumentsFromFlow...');
      const result = await getDocumentsFromFlow();

      console.log('Flow response:', result);
      setRawResponse(JSON.stringify(result, null, 2));
      setDocuments(Array.isArray(result) ? result : []);
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Flow error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Flow Test"
        subtitle="Test Power Automate flow connection"
        actions={
          <button type="button" className="secondary-btn" onClick={onBack}>
            Back
          </button>
        }
      />

      <div className={styles.testSection}>
        <div className={styles.card}>
          <h3>Test Flow Connection</h3>
          <p>Click the button below to call the Power Automate flow and retrieve documents from SharePoint.</p>

          <button
            type="button"
            className="primary-btn"
            onClick={handleTestFlow}
            disabled={loading}
            style={{ marginTop: '16px' }}
          >
            {loading ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Test Flow
              </>
            )}
          </button>
        </div>

        {error && (
          <div className={styles.alert} style={{ borderColor: '#d32f2f' }}>
            <AlertCircle size={20} style={{ color: '#d32f2f' }} />
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#d32f2f' }}>Error</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{error}</p>
              <details style={{ marginTop: '12px', fontSize: '12px' }}>
                <summary style={{ cursor: 'pointer', color: '#0f4024' }}>Show details</summary>
                <pre style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', overflow: 'auto', marginTop: '8px' }}>
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {success && (
          <div className={styles.alert} style={{ borderColor: '#388e3c' }}>
            <CheckCircle size={20} style={{ color: '#388e3c' }} />
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#388e3c' }}>Success!</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                Flow executed successfully. Found {documents.length} document(s).
              </p>
            </div>
          </div>
        )}

        {rawResponse && (
          <div className={styles.card}>
            <h3>Raw Response</h3>
            <pre className={styles.jsonBlock}>{rawResponse}</pre>
          </div>
        )}

        {documents.length > 0 && (
          <div className={styles.card}>
            <h3>Documents Retrieved</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Created</th>
                  <th>Modified</th>
                  <th>Author</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.ID}>
                    <td>{doc.ID}</td>
                    <td>{doc.Title}</td>
                    <td>{String(doc.Created)}</td>
                    <td>{String(doc.Modified)}</td>
                    <td>{doc.Author || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.card} style={{ backgroundColor: '#f0f7ff', borderColor: '#0f4024' }}>
          <h3 style={{ color: '#0f4024' }}>How to Use</h3>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
            <li>Make sure you opened this app via the <strong>Power Apps Local Play URL</strong> (not localhost)</li>
            <li>Click "Test Flow" button above</li>
            <li>Check if flow executes and returns documents</li>
            <li>View the JSON response and verify the structure</li>
            <li>If successful, Documents screen will work automatically</li>
          </ol>
        </div>

        <div className={styles.card} style={{ backgroundColor: '#fff3e0', borderColor: '#f57c00' }}>
          <h3 style={{ color: '#f57c00' }}>Troubleshooting</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
            <li><strong>Power Apps context not available:</strong> Open via Power Apps Local Play URL, not localhost</li>
            <li><strong>Logic flows connector not available:</strong> Check power.config.json has flow reference</li>
            <li><strong>Flow returned no data:</strong> Check Power Automate flow executed successfully</li>
            <li>Check browser console (F12) for detailed error messages</li>
          </ul>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
