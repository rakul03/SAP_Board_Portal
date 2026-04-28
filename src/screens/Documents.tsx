import { ArrowLeft, Loader, RefreshCw, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDocumentsFromFlow, type SharePointDocument } from '../services/flowService';
import { PageHeader } from '../components/PageHeader';
import styles from './Documents.module.css';

interface DocumentsProps {
  onBack: () => void;
}

export function Documents({ onBack }: DocumentsProps) {
  const [documents, setDocuments] = useState<SharePointDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await getDocumentsFromFlow();
        setDocuments(items);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch documents';
        console.error('Error fetching documents:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchDocuments();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    getDocumentsFromFlow()
      .then((items) => {
        setDocuments(items);
        setError(null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to fetch documents';
        setError(message);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Documents"
        subtitle="Documents from SAP Board SharePoint"
        actions={
          <div className={styles.headerActions}>
            <button
              type="button"
              className="secondary-btn"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button type="button" className="secondary-btn" onClick={onBack}>
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
        }
      />

      {error && (
        <div className={styles.errorBanner}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {loading && (
        <div className={styles.loadingContainer}>
          <Loader size={40} className={styles.spinner} />
          <p>Loading documents...</p>
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div className={styles.emptyState}>
          <FileText size={48} />
          <h3>No Documents Found</h3>
          <p>No documents are currently available in the Document Library.</p>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className={styles.listContainer}>
          <div className={styles.listStats}>
            <span className={styles.count}>
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </span>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Created</th>
                <th>Modified</th>
                <th>Author</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.ID} className={styles.row}>
                  <td className={styles.titleCell}>
                    <FileText size={16} className={styles.icon} />
                    <div>
                      <p className={styles.docTitle}>{doc.Title}</p>
                      <p className={styles.docId}>ID: {doc.ID}</p>
                    </div>
                  </td>
                  <td>{formatDate(doc.Created)}</td>
                  <td>{formatDate(doc.Modified)}</td>
                  <td>{doc.Author || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.infoFooter}>
        <p>
          <strong>Source:</strong> Power Automate Flow → SharePoint Document Library
        </p>
      </div>
    </div>
  );
}
