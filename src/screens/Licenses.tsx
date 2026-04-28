import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Key,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InitiativeForm } from '../components/InitiativeForm';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import type { Initiative } from '../types';
import styles from './Licenses.module.css';

interface LicensesProps {
  onOpenDetail: (licenseId: string) => void;
  onBack: () => void;
  comingFromContracts?: boolean;
}

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function expiryStatus(iso: string): 'expired' | 'expiring' | 'ok' | 'none' {
  if (!iso) return 'none';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'none';
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff < 0) return 'expired';
  if (diff < 30 * 24 * 60 * 60 * 1000) return 'expiring'; // within 30 days
  return 'ok';
}

export function Licenses({ onOpenDetail, onBack, comingFromContracts }: LicensesProps) {
  const { initiatives, createInitiative, updateInitiative, deleteInitiative, refresh } = useData();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Initiative | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Initiative | null>(null);

  const licenses = useMemo(
    () => initiatives.filter((i) => i.category === 'Licenses'),
    [initiatives],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return licenses;
    return licenses.filter(
      (l) => l.name.toLowerCase().includes(q) || (l.contractId || '').toLowerCase().includes(q),
    );
  }, [licenses, search]);

  const expiredCount = useMemo(
    () => licenses.filter((l) => expiryStatus(l.expiryDate || '') === 'expired').length,
    [licenses],
  );
  const expiringCount = useMemo(
    () => licenses.filter((l) => expiryStatus(l.expiryDate || '') === 'expiring').length,
    [licenses],
  );

  const handleCreate = async (values: Omit<Initiative, 'id' | 'updatedAt'>) => {
    const created = await createInitiative({ ...values, category: 'Licenses' });
    if (created) {
      showToast('License created successfully.', 'success');
      setCreateOpen(false);
    } else {
      showToast('Failed to create license.', 'error');
    }
  };

  const handleUpdate = async (values: Omit<Initiative, 'id' | 'updatedAt'>) => {
    if (!editing) return;
    try {
      await updateInitiative(editing.id, values);
      setEditing(null);
      showToast('License updated.', 'success');
    } catch (err: any) {
      showToast(`Update failed: ${err?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteInitiative(pendingDelete.id);
      setPendingDelete(null);
      showToast('License deleted.', 'success');
    } catch (err: any) {
      showToast(`Delete failed: ${err?.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Licenses"
        subtitle={
          comingFromContracts
            ? 'Select or create a license to link to your contract.'
            : 'Manage license procurement, renewals, and compliance.'
        }
        breadcrumbs={[
          'SAP Board Portfolio',
          ...(comingFromContracts ? ['Contracts'] : []),
          'Licenses',
        ]}
        actions={
          <>
            <button className="secondary-btn" onClick={onBack}>
              <ArrowLeft size={14} />
              {comingFromContracts ? 'Back to Contracts' : 'Categories'}
            </button>
            <button
              className="secondary-btn"
              onClick={() => { refresh(); showToast('Refreshed.', 'info'); }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button className="liquid-btn" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              New License
            </button>
          </>
        }
      />

      {/* Summary cards */}
      <div className={styles.summaryStrip}>
        <div className={styles.statCard}>
          <span className={styles.statIconWrap}>
            <Key size={20} />
          </span>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{licenses.length}</span>
            <span className={styles.statLabel}>Total Licenses</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIconWrap}>
            <AlertCircle size={20} />
          </span>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{expiredCount}</span>
            <span className={styles.statLabel}>Expired</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIconWrap}>
            <Calendar size={20} />
          </span>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{expiringCount}</span>
            <span className={styles.statLabel}>Expiring Soon</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by license name or reference ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search licenses"
          />
          {search && (
            <button type="button" className={styles.clearBtn} onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <span className={styles.resultPill}>
          <span className={styles.resultDot} />
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className={styles.dataPanel}>
        <div className={styles.tableHeader}>
          <span>License Name</span>
          <span>Reference ID</span>
          <span>Renewal Date</span>
          <span>Expiry Date</span>
          <span className={styles.headerActions}>Actions</span>
        </div>

        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Key size={26} />
              </div>
              <h3>{search ? 'No licenses match your search' : 'No licenses yet'}</h3>
              <p>
                {search
                  ? 'Try a different search term.'
                  : 'Click "New License" to create the first one.'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((license) => {
                const status = expiryStatus(license.expiryDate || '');
                const dateCls =
                  status === 'expired'
                    ? styles.dateExpired
                    : status === 'expiring'
                      ? styles.dateExpiring
                      : styles.dateCell;
                return (
                  <motion.div
                    key={license.id}
                    layout
                    className={styles.row}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => onOpenDetail(license.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(license.id); }
                    }}
                  >
                    <div className={styles.nameCell}>
                      <span className={styles.namePrimary}>{license.name}</span>
                    </div>

                    <div>
                      {license.contractId ? (
                        <span className={styles.refBadge} title={license.contractId}>
                          {license.contractId}
                        </span>
                      ) : (
                        <span className={styles.dateCell}>—</span>
                      )}
                    </div>

                    <span className={styles.dateCell}>{formatDate(license.renewalDate || '')}</span>
                    <span className={dateCls}>{formatDate(license.expiryDate || '')}</span>

                    <div className={styles.actions}>
                      <button
                        className="ghost-btn"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); setEditing(license); }}
                        aria-label="Edit license"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="ghost-btn"
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(license); }}
                        aria-label="Delete license"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New License" size="lg">
        <InitiativeForm
          selectedCategory="Licenses"
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit License" size="lg">
        {editing && (
          <InitiativeForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete License"
        message={`Delete "${pendingDelete?.name ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
