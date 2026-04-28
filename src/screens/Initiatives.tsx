import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarDays,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InitiativeForm } from '../components/InitiativeForm';
import { ManageOwnersPanel } from '../components/ManageOwnersPanel';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import type { Category, Initiative, Status } from '../types';
import { exportInitiativesToXlsx, todayStamp } from '../lib/export';
import styles from './Initiatives.module.css';

interface InitiativesProps {
  onOpenDetail: (id: string) => void;
  selectedCategory: Category;
  onBack: () => void;
}

function formatDisplayDate(value: string): string {
  if (!value) return 'No log';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function toDateKey(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function Initiatives({ onOpenDetail, selectedCategory, onBack }: InitiativesProps) {
  const {
    initiatives,
    auditLogs,
    owners,
    favorites,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    toggleFavorite,
    refresh,
  } = useData();
  const { showToast } = useToast();
  const { canEdit, canDelete } = usePermissions();

  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | ''>('');
  const [activeCardFilter, setActiveCardFilter] = useState<Status | 'total' | ''>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Initiative | null>(null);
  const [ownersOpen, setOwnersOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Initiative | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const close = (e: MouseEvent) => {
      if (exportBtnRef.current && !exportBtnRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [exportOpen]);

  const categoryInitiatives = useMemo(
    () => initiatives.filter((i) => i.category === selectedCategory),
    [initiatives, selectedCategory],
  );

  const filtered = useMemo(() => {
    let out = [...categoryInitiatives];

    if (ownerFilter) out = out.filter((i) => i.owner === ownerFilter);
    if (logDateFilter) out = out.filter((i) => toDateKey(i.logDate) === logDateFilter);
    if (statusFilter) out = out.filter((i) => i.status === statusFilter);

    const query = search.trim().toLowerCase();
    if (query) out = out.filter((i) => i.name.toLowerCase().includes(query));

    return out.sort((a, b) => {
      const aTime = new Date(a.logDate || a.updatedAt).getTime();
      const bTime = new Date(b.logDate || b.updatedAt).getTime();
      return bTime - aTime;
    });
  }, [categoryInitiatives, ownerFilter, logDateFilter, statusFilter, search]);

  const activeCount = useMemo(
    () => filtered.filter((initiative) => initiative.status === 'Active').length,
    [filtered],
  );

  const hasFilters = Boolean(search || ownerFilter || logDateFilter || statusFilter);

  const handleCreate = async (values: Omit<Initiative, 'id' | 'updatedAt'>) => {
    const created = await createInitiative(values);
    if (created) {
      setCreateOpen(false);
      showToast(`Initiative "${created.name}" created.`, 'success');
    } else {
      showToast('Failed to create initiative.', 'error');
    }
  };

  const handleUpdate = async (values: Omit<Initiative, 'id' | 'updatedAt'>) => {
    if (!editing) return;
    try {
      await updateInitiative(editing.id, values);
      setEditing(null);
      showToast('Initiative updated.', 'success');
    } catch (error: any) {
      showToast(
        `Update failed: ${error?.message || 'Unknown error'}`,
        'error'
      );
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteInitiative(pendingDelete.id);
      setPendingDelete(null);
      showToast('Initiative deleted.', 'success');
    } catch (error: any) {
      showToast(
        `Delete failed: ${error?.message || 'Unknown error'}`,
        'error'
      );
    }
  };

  const handleExport = (scope: 'all' | 'view') => {
    const set = scope === 'all' ? categoryInitiatives : filtered;
    const fname =
      scope === 'all'
        ? `${selectedCategory.toLowerCase().replace(/\s+/g, '_')}_initiatives_${todayStamp()}.xlsx`
        : `filtered_initiatives_${todayStamp()}.xlsx`;
    exportInitiativesToXlsx(set, fname, auditLogs);
    setExportOpen(false);
    showToast(`Exported ${set.length} record(s).`, 'success');
  };

  const clearFilters = () => {
    setSearch('');
    setOwnerFilter('');
    setLogDateFilter('');
    setStatusFilter('');
    setActiveCardFilter('');
  };

  const handleCardClick = (cardType: Status | 'total') => {
    if (activeCardFilter === cardType) {
      // Toggle off
      setStatusFilter('');
      setActiveCardFilter('');
    } else {
      // Apply filter
      if (cardType === 'total') {
        setStatusFilter('');
        setActiveCardFilter('total');
      } else {
        setStatusFilter(cardType);
        setActiveCardFilter(cardType);
      }
    }
  };

  const completedCount = useMemo(
    () => filtered.filter((initiative) => initiative.status === 'Completed').length,
    [filtered],
  );

  const pendingCount = useMemo(
    () => filtered.filter((initiative) => initiative.status === 'Pending').length,
    [filtered],
  );

  const delayedCount = useMemo(
    () => filtered.filter((initiative) => initiative.status === 'Delayed').length,
    [filtered],
  );

  return (
    <div className={styles.wrap}>
      <PageHeader
        title={selectedCategory}
        subtitle={`Initiatives in the ${selectedCategory} category.`}
        breadcrumbs={['SAP Board Portfolio', 'Initiatives', selectedCategory]}
        actions={
          <>
            <button className="secondary-btn" onClick={onBack}>
              <ArrowLeft size={14} />
              Categories
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                refresh();
                showToast('Workspace refreshed.', 'info');
              }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button className="secondary-btn" onClick={() => setOwnersOpen(true)}>
              <UserPlus size={14} />
              Owners
            </button>
            <div className={styles.exportWrap} ref={exportBtnRef}>
              <button className="secondary-btn" onClick={() => setExportOpen((v) => !v)}>
                <Download size={14} />
                Export
              </button>
              <AnimatePresence>
                {exportOpen && (
                  <motion.div
                    className={styles.exportMenu}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button onClick={() => handleExport('all')}>
                      <span>All in {selectedCategory}</span>
                      <span className={styles.exportCount}>
                        {categoryInitiatives.length} records
                      </span>
                    </button>
                    <button onClick={() => handleExport('view')}>
                      <span>Current View</span>
                      <span className={styles.exportCount}>{filtered.length} records</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button className="liquid-btn" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              New Initiative
            </button>
          </>
        }
      />

      <section className={styles.summaryGrid}>
        <button
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${activeCardFilter === 'total' ? styles.summaryCardActive : ''}`}
          onClick={() => handleCardClick('total')}
          type="button"
          aria-label="Show total initiatives"
        >
          <span className={styles.summaryLabel}>Total Initiatives</span>
          <strong className={styles.summaryValue}>{filtered.length}</strong>
          <span className={styles.summaryMeta}>Click to clear filters</span>
        </button>
        <button
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${styles.summaryCardActive_} ${activeCardFilter === 'Active' ? styles.summaryCardActive : ''}`}
          onClick={() => handleCardClick('Active')}
          type="button"
          aria-label="Filter by Active status"
        >
          <span className={styles.summaryLabel}>Active</span>
          <strong className={styles.summaryValue}>{activeCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>
        <button
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${styles.summaryCardCompleted} ${activeCardFilter === 'Completed' ? styles.summaryCardActive : ''}`}
          onClick={() => handleCardClick('Completed')}
          type="button"
          aria-label="Filter by Completed status"
        >
          <span className={styles.summaryLabel}>Completed</span>
          <strong className={styles.summaryValue}>{completedCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>
        <button
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${styles.summaryCardPending} ${activeCardFilter === 'Pending' ? styles.summaryCardActive : ''}`}
          onClick={() => handleCardClick('Pending')}
          type="button"
          aria-label="Filter by Pending status"
        >
          <span className={styles.summaryLabel}>Pending</span>
          <strong className={styles.summaryValue}>{pendingCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>
        <button
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${styles.summaryCardDelayed} ${activeCardFilter === 'Delayed' ? styles.summaryCardActive : ''}`}
          onClick={() => handleCardClick('Delayed')}
          type="button"
          aria-label="Filter by Delayed status"
        >
          <span className={styles.summaryLabel}>Delayed</span>
          <strong className={styles.summaryValue}>{delayedCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>
      </section>

      <section className={styles.workspace}>
        <div className={styles.filterBar}>
          <div className={styles.filterTop}>
            <div className={styles.filterHeading}>
              <div className={styles.filterIcon}>
                <SlidersHorizontal size={16} strokeWidth={2.2} />
              </div>
              <div>
                <span className={styles.filterEyebrow}>Filter Workspace</span>
                <h2 className={styles.filterTitle}>Search & Refine</h2>
              </div>
            </div>
            <div className={styles.filterMeta}>
              <span className={styles.filterMetaCount}>{categoryInitiatives.length}</span>
              <span className={styles.filterMetaLabel}>in {selectedCategory}</span>
            </div>
          </div>

          <div className={styles.filterDivider} />

          <div className={styles.filterGrid}>
            <label className={`${styles.field} ${styles.searchField}`}>
              <span className={styles.fieldLabel}><Search size={10} />Initiative Name</span>
              <div className={styles.inputWrap}>
                <Search size={14} className={styles.inputIcon} />
                <input
                  className={styles.textInput}
                  placeholder="Search by initiative name…"
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
              <span className={styles.fieldLabel}><User size={10} />Owner</span>
              <div className={styles.inputWrap}>
                <User size={14} className={styles.inputIcon} />
                <select
                  className={styles.selectInput}
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                >
                  <option value="">All Owners</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.name}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}><CalendarDays size={10} />Log Date</span>
              <div className={styles.inputWrap}>
                <CalendarDays size={14} className={styles.inputIcon} />
                <input
                  type="date"
                  className={styles.textInput}
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                />
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}><ArrowUpDown size={10} />Status</span>
              <div className={styles.inputWrap}>
                <ArrowUpDown size={14} className={styles.inputIcon} />
                <select
                  className={styles.selectInput}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as Status | '')}
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </label>
          </div>

          <div className={styles.filterFooter}>
            <div className={styles.activeFilters}>
              <span className={styles.resultsPill}>
                <span className={styles.resultsDot} />
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
              {hasFilters && <span className={styles.filteredBadge}>Filtered</span>}
              <span className={styles.resultsHint}>Sorted by latest log date</span>
            </div>
            {hasFilters && (
              <button className="secondary-btn" onClick={clearFilters}>
                <X size={13} />
                Clear All
              </button>
            )}
          </div>
        </div>

        <section className={styles.dataPanel}>
          <div className={styles.tableHeader}>
            <span>Initiative Name</span>
            <span>Owner</span>
            <span>Status</span>
            <span>Latest Log Date</span>
            <span className={styles.headerActions}>Actions</span>
          </div>

          <div className={styles.list}>
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Search size={24} />
                </div>
                <h3>No initiatives match the current filters</h3>
                <p>Adjust the search criteria or use View All to restore the full list.</p>
              </div>
            ) : (
              filtered.map((initiative) => {
                const isFav = favorites.includes(initiative.id);
                return (
                  <motion.div
                    key={initiative.id}
                    layout
                    className={styles.row}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -2, scale: 1.005 }}
                    whileTap={{ scale: 0.992 }}
                    onClick={() => onOpenDetail(initiative.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenDetail(initiative.id);
                      }
                    }}
                  >
                    <div className={styles.nameCell}>
                      <span>{initiative.name}</span>
                    </div>
                    <span className={styles.ownerCell}>{initiative.owner || 'Unassigned'}</span>
                    <span className={styles.statusCell}>
                      <Badge type={initiative.status}>{initiative.status}</Badge>
                    </span>
                    <span className={styles.dateCell}>
                      {formatDisplayDate(initiative.logDate || initiative.updatedAt)}
                    </span>
                    <span className={styles.meta}>
                      <button
                        className={`${styles.star} ${isFav ? styles.starActive : ''}`}
                        aria-label={isFav ? 'Unfavorite' : 'Favorite'}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await toggleFavorite(initiative.id);
                        }}
                      >
                        <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      {canEdit(initiative) && (
                        <button
                          className="ghost-btn"
                          aria-label="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(initiative);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {canDelete(initiative) && (
                        <button
                          className={`ghost-btn ${styles.delete}`}
                          aria-label="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDelete(initiative);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>
      </section>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Initiative"
        size="lg"
      >
        <InitiativeForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          selectedCategory={selectedCategory}
        />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Initiative" size="lg">
        {editing && (
          <InitiativeForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={ownersOpen}
        onClose={() => setOwnersOpen(false)}
        title="Manage Owners"
        size="sm"
      >
        <ManageOwnersPanel />
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete initiative?"
        message={`Delete ${pendingDelete?.name ?? ''} from this workspace?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
