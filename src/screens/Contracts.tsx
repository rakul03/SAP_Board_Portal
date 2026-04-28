import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarDays,
  FileSignature,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ContractForm } from '../components/ContractForm';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import type { Contract } from '../types';
import styles from './Initiatives.module.css';

// Grid shared between tableHeader and each row
const GRID = 'minmax(100px, 0.75fr) minmax(180px, 2fr) minmax(150px, 1.2fr) 118px 118px 96px';

interface ContractsProps {
  onOpenDetail: (contractId: string) => void;
  onBack: () => void;
}

type ContractFilter = 'total' | 'licensed' | 'expiring' | 'expired' | '';

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function toDateKey(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function contractExpiry(endDate: string): 'expired' | 'expiring' | 'active' | 'none' {
  if (!endDate) return 'none';
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return 'none';
  const now = Date.now();
  const ms = d.getTime() - now;
  if (ms < 0) return 'expired';
  if (ms < 60 * 24 * 60 * 60 * 1000) return 'expiring'; // within 60 days
  return 'active';
}

export function Contracts({ onOpenDetail, onBack }: ContractsProps) {
  const { contracts, initiatives, deleteContract, refresh } = useData();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [licenseFilter, setLicenseFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [cardFilter, setCardFilter] = useState<ContractFilter>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Contract | null>(null);

  const licenses = useMemo(
    () => initiatives.filter((i) => i.category === 'Licenses'),
    [initiatives],
  );

  const getLicenseName = (licenseId?: string) =>
    licenses.find((l) => l.id === licenseId)?.name ?? null;

  // Summary counts — over ALL contracts (not filtered)
  const licensedCount = useMemo(() => contracts.filter((c) => !!c.licenseId).length, [contracts]);
  const expiringCount = useMemo(
    () => contracts.filter((c) => contractExpiry(c.contractEndDate) === 'expiring').length,
    [contracts],
  );
  const expiredCount = useMemo(
    () => contracts.filter((c) => contractExpiry(c.contractEndDate) === 'expired').length,
    [contracts],
  );

  const filtered = useMemo(() => {
    let out = [...contracts];

    // Card filter
    if (cardFilter === 'licensed') out = out.filter((c) => !!c.licenseId);
    if (cardFilter === 'expiring') out = out.filter((c) => contractExpiry(c.contractEndDate) === 'expiring');
    if (cardFilter === 'expired') out = out.filter((c) => contractExpiry(c.contractEndDate) === 'expired');

    // Dropdown license filter
    if (licenseFilter === '__none__') out = out.filter((c) => !c.licenseId);
    else if (licenseFilter) out = out.filter((c) => c.licenseId === licenseFilter);

    // Date filters
    if (startDateFilter) out = out.filter((c) => toDateKey(c.contractStartDate) >= startDateFilter);
    if (endDateFilter) out = out.filter((c) => toDateKey(c.contractEndDate) <= endDateFilter);

    // Text search
    const q = search.trim().toLowerCase();
    if (q) out = out.filter(
      (c) => c.contractName.toLowerCase().includes(q) || c.contractId.toLowerCase().includes(q),
    );

    return out.sort((a, b) => {
      const ta = new Date(a.contractStartDate || 0).getTime();
      const tb = new Date(b.contractStartDate || 0).getTime();
      return tb - ta;
    });
  }, [contracts, cardFilter, licenseFilter, startDateFilter, endDateFilter, search]);

  const hasFilters = Boolean(search || licenseFilter || startDateFilter || endDateFilter);

  const clearFilters = () => {
    setSearch('');
    setLicenseFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setCardFilter('');
  };

  const handleCardClick = (card: ContractFilter) => {
    if (cardFilter === card || card === 'total') {
      setCardFilter('');
    } else {
      setCardFilter(card);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteContract(pendingDelete.id);
      setPendingDelete(null);
      showToast('Contract deleted.', 'success');
    } catch (err: any) {
      showToast(`Delete failed: ${err?.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <PageHeader
        title="Contracts"
        subtitle="Manage contracts and linked licenses."
        breadcrumbs={['SAP Board Portfolio', 'Contracts']}
        actions={
          <>
            <button className="secondary-btn" onClick={onBack}>
              <ArrowLeft size={14} />
              Categories
            </button>
            <button className="secondary-btn" onClick={() => { refresh(); showToast('Workspace refreshed.', 'info'); }}>
              <RefreshCw size={14} />
              Refresh
            </button>
            <button className="liquid-btn" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              New Contract
            </button>
          </>
        }
      />

      {/* Summary cards — same pattern as Initiatives */}
      <section className={styles.summaryGrid}>
        <button
          type="button"
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${cardFilter === 'total' ? styles.summaryCardActive : ''}`}
          onClick={() => handleCardClick('total')}
          aria-label="Show all contracts"
        >
          <span className={styles.summaryLabel}>Total Contracts</span>
          <strong className={styles.summaryValue}>{contracts.length}</strong>
          <span className={styles.summaryMeta}>Click to clear filters</span>
        </button>

        <button
          type="button"
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${styles.summaryCardActive_} ${cardFilter === 'licensed' ? styles.summaryCardActive : ''}`}
          onClick={() => handleCardClick('licensed')}
          aria-label="Filter: linked to a license"
        >
          <span className={styles.summaryLabel}>With License</span>
          <strong className={styles.summaryValue}>{licensedCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>

        <button
          type="button"
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${styles.summaryCardCompleted} ${cardFilter === 'expiring' ? styles.summaryCardActive : ''}`}
          onClick={() => handleCardClick('expiring')}
          aria-label="Filter: expiring within 60 days"
        >
          <span className={styles.summaryLabel}>Expiring Soon</span>
          <strong className={styles.summaryValue}>{expiringCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>

        <button
          type="button"
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${styles.summaryCardPending} ${cardFilter === 'expired' ? styles.summaryCardActive : ''}`}
          onClick={() => handleCardClick('expired')}
          aria-label="Filter: expired contracts"
        >
          <span className={styles.summaryLabel}>Expired</span>
          <strong className={styles.summaryValue}>{expiredCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>

        <button
          type="button"
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${styles.summaryCardDelayed}`}
          onClick={() => {}}
          aria-label="No license"
        >
          <span className={styles.summaryLabel}>No License</span>
          <strong className={styles.summaryValue}>{contracts.length - licensedCount}</strong>
          <span className={styles.summaryMeta}>&nbsp;</span>
        </button>
      </section>

      {/* Filter workspace — identical structure to Initiatives */}
      <section className={styles.workspace}>
        <div className={styles.filterBar}>
          <div className={styles.filterTop}>
            <div className={styles.filterHeading}>
              <div className={styles.filterIcon}>
                <SlidersHorizontal size={16} strokeWidth={2.2} />
              </div>
              <div>
                <span className={styles.filterEyebrow}>Filter Workspace</span>
                <h2 className={styles.filterTitle}>Search &amp; Refine</h2>
              </div>
            </div>
            <div className={styles.filterMeta}>
              <span className={styles.filterMetaCount}>{contracts.length}</span>
              <span className={styles.filterMetaLabel}>Contracts</span>
            </div>
          </div>

          <div className={styles.filterDivider} />

          <div className={styles.filterGrid}>
            <label className={`${styles.field} ${styles.searchField}`}>
              <span className={styles.fieldLabel}><Search size={10} />Contract Name</span>
              <div className={styles.inputWrap}>
                <Search size={14} className={styles.inputIcon} />
                <input
                  className={styles.textInput}
                  placeholder="Search by contract name or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className={styles.inputClear} onClick={() => setSearch('')} tabIndex={-1} type="button">
                    <X size={12} />
                  </button>
                )}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}><FileSignature size={10} />Linked License</span>
              <div className={styles.inputWrap}>
                <FileSignature size={14} className={styles.inputIcon} />
                <select
                  className={styles.selectInput}
                  value={licenseFilter}
                  onChange={(e) => setLicenseFilter(e.target.value)}
                >
                  <option value="">All Licenses</option>
                  <option value="__none__">No License</option>
                  {licenses.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}><CalendarDays size={10} />Start Date</span>
              <div className={styles.inputWrap}>
                <CalendarDays size={14} className={styles.inputIcon} />
                <input
                  type="date"
                  className={styles.textInput}
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}><ArrowUpDown size={10} />End Date</span>
              <div className={styles.inputWrap}>
                <CalendarDays size={14} className={styles.inputIcon} />
                <input
                  type="date"
                  className={styles.textInput}
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>
            </label>
          </div>

          <div className={styles.filterFooter}>
            <div className={styles.activeFilters}>
              <span className={styles.resultsPill}>
                <span className={styles.resultsDot} />
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
              {(hasFilters || cardFilter) && <span className={styles.filteredBadge}>Filtered</span>}
              <span className={styles.resultsHint}>Sorted by start date</span>
            </div>
            {(hasFilters || cardFilter) && (
              <button className="secondary-btn" onClick={clearFilters}>
                <X size={13} />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Data table */}
        <section className={styles.dataPanel}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: GRID }}>
            <span>Contract ID</span>
            <span>Contract Name</span>
            <span>Linked License</span>
            <span>Start Date</span>
            <span>End Date</span>
            <span className={styles.headerActions}>Actions</span>
          </div>

          <div className={styles.list}>
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FileSignature size={24} />
                </div>
                <h3>{hasFilters || cardFilter ? 'No contracts match the current filters' : 'No contracts yet'}</h3>
                <p>
                  {hasFilters || cardFilter
                    ? 'Adjust the search criteria or clear all filters.'
                    : 'Click "New Contract" to create the first one.'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filtered.map((contract) => {
                  const licenseName = getLicenseName(contract.licenseId);
                  const expiry = contractExpiry(contract.contractEndDate);
                  const endDateClass =
                    expiry === 'expired'
                      ? { color: 'var(--color-danger)', fontWeight: 600 }
                      : expiry === 'expiring'
                        ? { color: '#d97706', fontWeight: 600 }
                        : {};
                  return (
                    <motion.div
                      key={contract.id}
                      layout
                      className={styles.row}
                      style={{ gridTemplateColumns: GRID }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -2, scale: 1.005 }}
                      whileTap={{ scale: 0.992 }}
                      onClick={() => onOpenDetail(contract.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(contract.id); }
                      }}
                    >
                      {/* Contract ID — monospace badge */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '22px',
                          padding: '0 8px',
                          background: 'color-mix(in srgb, var(--accent-600) 8%, var(--bg-primary))',
                          border: '1px solid color-mix(in srgb, var(--accent-600) 20%, var(--border-light))',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--accent-600)',
                          fontFamily: 'var(--font-mono, monospace)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                        title={contract.contractId}
                      >
                        {contract.contractId}
                      </span>

                      {/* Contract Name */}
                      <div className={styles.nameCell}>
                        <span>{contract.contractName}</span>
                      </div>

                      {/* Linked License */}
                      <span className={styles.ownerCell}>
                        {licenseName ?? <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </span>

                      {/* Start Date */}
                      <span className={styles.dateCell}>{formatDate(contract.contractStartDate)}</span>

                      {/* End Date — color-coded */}
                      <span className={styles.dateCell} style={endDateClass}>
                        {formatDate(contract.contractEndDate)}
                      </span>

                      {/* Actions */}
                      <span className={styles.meta}>
                        <button
                          className="ghost-btn"
                          title="Edit"
                          onClick={(e) => { e.stopPropagation(); setEditing(contract); }}
                          aria-label="Edit contract"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className={`ghost-btn ${styles.delete}`}
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); setPendingDelete(contract); }}
                          aria-label="Delete contract"
                        >
                          <Trash2 size={15} />
                        </button>
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>
      </section>

      {/* Create */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Contract" size="lg">
        <ContractForm
          onSubmit={() => { setCreateOpen(false); showToast('Contract created.', 'success'); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Edit */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Contract" size="lg">
        {editing && (
          <ContractForm
            initial={editing}
            onSubmit={() => { setEditing(null); showToast('Contract updated.', 'success'); }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete Contract"
        message={`Delete "${pendingDelete?.contractName ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
