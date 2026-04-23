import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Copy,
  Filter,
  Hash,
  History,
  Info,
  Layers,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  User,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AuditLog } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { BadgeVariant } from '../components/Badge';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import type { Severity } from '../types';
import styles from './AuditLogs.module.css';

type SortField = 'date' | 'severity';
type SortOrder = 'asc' | 'desc';
type EnrichedLog = AuditLog & { ownerName: string };

const SEVERITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Severity' },
  { value: 'High', label: 'High Priority' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

function severityMeta(s: Severity): { variant: BadgeVariant; icon: React.ReactNode } {
  switch (s) {
    case 'High':   return { variant: 'danger',  icon: <AlertCircle size={12} /> };
    case 'Medium': return { variant: 'warning', icon: <TriangleAlert size={12} /> };
    case 'Low':    return { variant: 'success', icon: <CheckCircle2 size={12} /> };
    default:       return { variant: 'neutral', icon: <Info size={12} /> };
  }
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' };
  return {
    date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

const STAT_ICONS: Record<string, React.ReactNode> = {
  today: <Clock size={15} />,
  total: <Hash size={15} />,
  High:   <AlertCircle size={15} />,
  Medium: <TriangleAlert size={15} />,
  Low:    <CheckCircle2 size={15} />,
};

export function AuditLogs() {
  const { auditLogs, deleteAuditLog, initiatives, owners } = useData();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<EnrichedLog | null>(null);
  const [copied, setCopied] = useState(false);

  const enrichedLogs = useMemo(() =>
    auditLogs.map((log) => {
      const initiative = initiatives.find((i) => i.id === log.initiativeId);
      return {
        ...log,
        initiativeName: log.initiativeName && log.initiativeName !== 'Unknown'
          ? log.initiativeName
          : (initiative?.name ?? 'Unknown'),
        category: initiative?.category ?? log.category,
        status: initiative?.status ?? log.status,
        ownerName: initiative?.owner && initiative.owner !== 'Unassigned'
          ? initiative.owner
          : (log.ownerName || 'Unassigned'),
      };
    }),
    [auditLogs, initiatives],
  );

  const filtered = useMemo(() => {
    let result = [...enrichedLogs];
    if (severityFilter) result = result.filter((l) => l.logSeverity === severityFilter);
    if (ownerFilter)    result = result.filter((l) => (l.ownerName ?? 'Unassigned') === ownerFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((l) =>
        l.initiativeName.toLowerCase().includes(q) ||
        l.logDescription.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        (l.ownerName?.toLowerCase().includes(q) ?? false)
      );
    }
    result.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      if (sortField === 'date') {
        aVal = new Date(a.logDate).getTime();
        bVal = new Date(b.logDate).getTime();
      } else {
        const order: Record<string, number> = { High: 3, Medium: 2, Low: 1, Information: 0 };
        aVal = order[a.logSeverity] ?? 0;
        bVal = order[b.logSeverity] ?? 0;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [auditLogs, search, severityFilter, ownerFilter, sortField, sortOrder]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const stats = {
    today:  enrichedLogs.filter((l) => l.logDate.slice(0, 10) === todayKey).length,
    total:  enrichedLogs.length,
    high:   enrichedLogs.filter((l) => l.logSeverity === 'High').length,
    medium: enrichedLogs.filter((l) => l.logSeverity === 'Medium').length,
    low:    enrichedLogs.filter((l) => l.logSeverity === 'Low').length,
  };

  const statCards = [
    { label: "Today's Logs",    value: stats.today,  severity: '',       iconKey: 'today',  tone: 'teal'  as const },
    { label: 'Total Logs',      value: stats.total,  severity: '',       iconKey: 'total',  tone: 'blue'  as const },
    { label: 'High Severity',   value: stats.high,   severity: 'High',   iconKey: 'High',   tone: 'red'   as const },
    { label: 'Medium Severity', value: stats.medium, severity: 'Medium', iconKey: 'Medium', tone: 'amber' as const },
    { label: 'Low Severity',    value: stats.low,    severity: 'Low',    iconKey: 'Low',    tone: 'green' as const },
  ];

  const handleCardClick = (severity: string) => {
    setSeverityFilter((prev) => (prev === severity ? '' : severity));
  };

  const handleDelete = async () => {
    if (pendingDelete) {
      await deleteAuditLog(pendingDelete);
      setPendingDelete(null);
      showToast('Log entry deleted.', 'success');
    }
  };

  const hasFilters = Boolean(search || severityFilter || ownerFilter);
  const clearFilters = () => { setSearch(''); setSeverityFilter(''); setOwnerFilter(''); };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Audit Logs"
        subtitle="Transparent system-wide tracking and compliance enforcement monitoring."
        breadcrumbs={['Portfolio', 'Compliance', 'Logs']}
      />

      <div className={styles.storageBanner}>
        <ShieldAlert size={13} />
        {enrichedLogs.length} compliance events stored in workspace history
      </div>

      <div className={styles.statGrid}>
        {statCards.map((c) => (
          <motion.button
            key={c.label}
            className={`${styles.statCard} ${styles[`statCard_${c.tone}`]} ${severityFilter === c.severity && c.severity ? styles.statCardActive : ''}`}
            onClick={() => handleCardClick(c.severity)}
            type="button"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className={`${styles.statIconWrap} ${styles[c.tone]}`}>
              {STAT_ICONS[c.iconKey]}
            </div>
            <div className={styles.statText}>
              <span className={styles.statValue}>{c.value}</span>
              <span className={styles.statLabel}>{c.label}</span>
            </div>
            {severityFilter === c.severity && c.severity && (
              <span className={styles.statActiveDot} />
            )}
          </motion.button>
        ))}
      </div>

      <div className={styles.workspace}>
        <div className={styles.filterBar}>
          <div className={styles.filterTop}>
            <div className={styles.filterHeading}>
              <div className={styles.filterBadgeIcon}>
                <SlidersHorizontal size={16} strokeWidth={2.2} />
              </div>
              <div>
                <span className={styles.filterEyebrow}>Filter Workspace</span>
                <h3 className={styles.filterTitle}>Search & Refine</h3>
              </div>
            </div>
            <div className={styles.filterMeta}>
              <span className={styles.filterMetaCount}>{enrichedLogs.length}</span>
              <span className={styles.filterMetaLabel}>total logs</span>
            </div>
          </div>

          <div className={styles.filterDivider} />

          <div className={styles.filterGrid}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}><Search size={10} />Search Logs</label>
              <div className={styles.filterInputWrap}>
                <Search size={14} className={styles.inputFieldIcon} />
                <input
                  className={styles.filterInput}
                  placeholder="Search by name, description, category or owner…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className={styles.clearBtn} onClick={() => setSearch('')} type="button" aria-label="Clear search">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}><Filter size={10} />Severity Level</label>
              <div className={styles.filterInputWrap}>
                <Filter size={14} className={styles.inputFieldIcon} />
                <select className={styles.filterSelect} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                  {SEVERITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}><User size={10} />Owner</label>
              <div className={styles.filterInputWrap}>
                <User size={14} className={styles.inputFieldIcon} />
                <select className={styles.filterSelect} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                  <option value="">All Owners</option>
                  <option value="Unassigned">Unassigned</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}><ArrowUpDown size={10} />Sort By</label>
              <div className={styles.filterInputWrap}>
                <ArrowUpDown size={14} className={styles.inputFieldIcon} />
                <select
                  className={styles.filterSelect}
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortField(field as SortField);
                    setSortOrder(order as SortOrder);
                  }}
                >
                  <option value="date-desc">Date (Newest)</option>
                  <option value="date-asc">Date (Oldest)</option>
                  <option value="severity-desc">Severity (High → Low)</option>
                  <option value="severity-asc">Severity (Low → High)</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.filterFooter}>
            <div className={styles.filterFooterLeft}>
              <span className={styles.resultsPill}>
                <span className={styles.resultsDot} />
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
              {hasFilters && <span className={styles.filteredBadge}>Filtered</span>}
              <span className={styles.resultsHint}>Sorted by {sortField}</span>
            </div>
            {hasFilters && (
              <button className="secondary-btn" onClick={clearFilters} type="button">
                <X size={13} />
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className={styles.tableWrap}>
          <div className={styles.tableHeader}>
            <span>Initiative</span>
            <span>Category / Status</span>
            <span>Log Date</span>
            <span>Description</span>
            <span>Owner</span>
            <span>Severity</span>
            <span className={styles.headerActions}>Action</span>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><History size={24} /></div>
              <h3>No records found</h3>
              <p>Refine your search or broaden the severity filter.</p>
            </div>
          ) : (
            <ul className={styles.tableBody}>
              <AnimatePresence mode="popLayout">
                {filtered.map((l, idx) => {
                  const { date, time } = formatDateTime(l.logDate);
                  const meta = severityMeta(l.logSeverity);
                  return (
                    <motion.li
                      key={l.id}
                      layout
                      className={`${styles.tableRow} ${styles[`row_${l.logSeverity?.toLowerCase()}`] ?? ''}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                      onClick={() => { setCopied(false); setSelectedLog(l); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCopied(false); setSelectedLog(l); } }}
                    >
                      <span className={styles.initiative}>
                        <span className={styles.initName}>{l.initiativeName}</span>
                      </span>
                      <span className={styles.categoryStatus}>
                        <span className={styles.category}>{l.category}</span>
                        <Badge type={l.status}>{l.status}</Badge>
                      </span>
                      <span className={styles.timestamp}>
                        <span className={styles.date}>{date}</span>
                        <span className={styles.time}>{time}</span>
                      </span>
                      <span className={styles.desc}>{l.logDescription}</span>
                      <span className={styles.ownerCell}>
                        <span className={styles.ownerAvatar}>{(l.ownerName || 'U')[0].toUpperCase()}</span>
                        <span className={styles.ownerName}>{l.ownerName || 'Unassigned'}</span>
                      </span>
                      <span>
                        <Badge variant={meta.variant} icon={meta.icon}>{l.logSeverity}</Badge>
                      </span>
                      <span className={styles.actions}>
                        <button
                          className={styles.deleteBtn}
                          onClick={(e) => { e.stopPropagation(); setPendingDelete(l.id); }}
                          aria-label="Delete log"
                          title="Delete log entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>

      {/* ── Audit Log Detail Modal ── */}
      <AnimatePresence>
        {selectedLog && (() => {
          const { date, time } = formatDateTime(selectedLog.logDate);
          const sev = selectedLog.logSeverity?.toLowerCase() ?? 'low';
          return (
            <>
              {/* Backdrop */}
              <motion.div
                className={styles.dlgBackdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setSelectedLog(null)}
                aria-hidden="true"
              />

              {/* Dialog */}
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="dlg-title"
                className={styles.dlgWrap}
                initial={{ x: 480 }}
                animate={{ x: 0 }}
                exit={{ x: 480 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── Header ── */}
                <div className={styles.dlgHeader}>
                  <div className={styles.dlgHeaderLeft}>
                    <span className={`${styles.dlgPulse} ${styles[`pulse_${sev}`]}`} aria-hidden="true" />
                    <div>
                      <p className={styles.dlgEyebrow}>Audit Log Detail</p>
                      <h2 id="dlg-title" className={styles.dlgTitle}>{selectedLog.initiativeName}</h2>
                    </div>
                  </div>
                  <button
                    className={styles.dlgClose}
                    onClick={() => setSelectedLog(null)}
                    aria-label="Close dialog"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>

                {/* ── Badge strip ── */}
                <div className={styles.dlgBadgeStrip}>
                  <span className={`${styles.dlgPill} ${styles[`pill_${sev}`]}`}>
                    {sev === 'low'    && <CheckCircle2  size={12} strokeWidth={2.5} />}
                    {sev === 'medium' && <TriangleAlert size={12} strokeWidth={2.5} />}
                    {sev === 'high'   && <AlertCircle   size={12} strokeWidth={2.5} />}
                    {selectedLog.logSeverity}
                  </span>
                  <span className={styles.dlgStatusPill}>{selectedLog.status}</span>
                </div>

                {/* ── Scrollable body ── */}
                <div className={styles.dlgBody}>

                  {/* Metadata 2-col grid */}
                  <div className={styles.dlgGrid}>

                    <div className={styles.dlgField}>
                      <span className={styles.dlgLabel}><User size={10} />Owner</span>
                      <div className={styles.dlgOwnerRow}>
                        <span className={styles.dlgAvatar}>
                          {(selectedLog.ownerName || 'U')[0].toUpperCase()}
                        </span>
                        <span className={styles.dlgFieldVal}>{selectedLog.ownerName || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className={styles.dlgField}>
                      <span className={styles.dlgLabel}><Layers size={10} />Category</span>
                      <span className={styles.dlgFieldVal}>{selectedLog.category}</span>
                    </div>

                    <div className={styles.dlgField}>
                      <span className={styles.dlgLabel}><Clock size={10} />Log Date</span>
                      <span className={styles.dlgFieldVal}>{date}</span>
                      {time && <span className={styles.dlgMono}>{time}</span>}
                    </div>

                    <div className={styles.dlgField}>
                      <span className={styles.dlgLabel}><ShieldAlert size={10} />Severity</span>
                      <div className={styles.dlgSevRow}>
                        <span className={`${styles.dlgSevDot} ${styles[`sevDot_${sev}`]}`} />
                        <span className={styles.dlgFieldVal}>{selectedLog.logSeverity}</span>
                      </div>
                    </div>

                  </div>

                  {/* Description */}
                  <div className={styles.dlgDescSection}>
                    <div className={styles.dlgDescHeader}>
                      <span className={styles.dlgLabel}><History size={10} />Log Description</span>
                      <button
                        className={`${styles.dlgCopyBtn} ${copied ? styles.dlgCopyBtnOk : ''}`}
                        onClick={() => handleCopy(selectedLog.logDescription)}
                        type="button"
                        aria-label="Copy description"
                      >
                        {copied
                          ? <><ClipboardCheck size={12} strokeWidth={2.5} />Copied!</>
                          : <><Copy size={12} strokeWidth={2.5} />Copy</>}
                      </button>
                    </div>
                    <div className={styles.dlgDescCard}>
                      {selectedLog.logDescription
                        ? selectedLog.logDescription
                        : <em className={styles.dlgEmpty}>No description provided.</em>}
                    </div>
                  </div>

                </div>

                {/* ── Footer ── */}
                <div className={styles.dlgFooter}>
                  <button
                    className={styles.dlgCloseBtn}
                    onClick={() => setSelectedLog(null)}
                  >
                    <X size={14} strokeWidth={2.5} />
                    Close
                  </button>
                  <button
                    className={styles.dlgDeleteBtn}
                    onClick={() => { setSelectedLog(null); setPendingDelete(selectedLog.id); }}
                  >
                    <Trash2 size={14} strokeWidth={2.5} />
                    Delete Log
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete log entry?"
        message="Are you sure you want to delete this audit log entry? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
