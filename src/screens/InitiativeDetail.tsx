import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  Flag,
  Hash,
  History,
  Info,
  Pencil,
  Plus,
  Target,
  Trash2,
  TriangleAlert,
  User,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InitiativeForm } from '../components/InitiativeForm';
import { Modal } from '../components/Modal';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { exportSingleInitiativeToXlsx, todayStamp } from '../lib/export';
import type { AuditLog, Initiative, Severity } from '../types';
import { SEVERITIES } from '../types';
import styles from './InitiativeDetail.module.css';

interface InitiativeDetailProps {
  initiativeId: string;
  onBack: () => void;
}

function severityMeta(s: Severity): { variant: BadgeVariant; icon: React.ReactNode } {
  switch (s) {
    case 'High': return { variant: 'danger', icon: <AlertCircle size={12} /> };
    case 'Medium': return { variant: 'warning', icon: <TriangleAlert size={12} /> };
    case 'Low': return { variant: 'success', icon: <CheckCircle2 size={12} /> };
    default: return { variant: 'neutral', icon: <Info size={12} /> };
  }
}

function severityColor(s: Severity): string {
  switch (s) {
    case 'High': return '#d64545';
    case 'Medium': return '#d4940a';
    case 'Low': return '#2d9d78';
    default: return '#a8a69f';
  }
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function InitiativeDetail({ initiativeId, onBack }: InitiativeDetailProps) {
  const {
    initiatives,
    auditLogs,
    updateInitiative,
    deleteInitiative,
    addAuditLog,
  } = useData();
  const { showToast } = useToast();
  const { canEdit, canDelete } = usePermissions();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const initiative = initiatives.find((i) => i.id === initiativeId);

  const logs = useMemo(() => {
    return auditLogs
      .filter((l) => l.initiativeId === initiativeId)
      .sort((a, b) => +new Date(b.logDate) - +new Date(a.logDate));
  }, [auditLogs, initiativeId]);

  if (!initiative) {
    return (
      <div className={styles.missing}>
        <p>This initiative no longer exists.</p>
        <button className="secondary-btn" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to list
        </button>
      </div>
    );
  }

  const handleUpdate = async (values: Omit<Initiative, 'id' | 'updatedAt'>) => {
    try {
      console.log('🔄 InitiativeDetail.handleUpdate - START', values);
      await updateInitiative(initiative.id, values);
      setEditOpen(false);
      showToast('Initiative updated successfully.', 'success');
      console.log('✅ Initiative update completed');
    } catch (error: any) {
      console.error('❌ Update failed:', error);
      showToast(
        `Update failed: ${error?.message || 'Unknown error'}`,
        'error'
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteInitiative(initiative.id);
      setDeleteOpen(false);
      showToast('Initiative deleted successfully.', 'success');
      onBack();
    } catch (error: any) {
      console.error('❌ Delete failed:', error);
      showToast(
        `Delete failed: ${error?.message || 'Unknown error'}`,
        'error'
      );
    }
  };

  const handleExport = () => {
    const fname = `${(initiative.demandNumber || initiative.id).toLowerCase()}_${todayStamp()}.xlsx`;
    exportSingleInitiativeToXlsx(initiative, logs, fname);
    showToast('Initiative exported.', 'success');
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${fieldName} copied.`, 'success');
  };

  const handleCopyAll = () => {
    const allText = `
Initiative: ${initiative.name}
ID: ${idLabel}
Category: ${initiative.category}
Status: ${initiative.status}
Urgency: ${initiative.urgency}
Severity: ${initiative.severity}

Owner: ${initiative.owner || 'Unassigned'}
Implementer: ${initiative.implementer || '—'}
Budget: ${initiative.budget || '—'}
Demand Number: ${initiative.demandNumber || '—'}

Log Date: ${formatDate(initiative.logDate)}

Description:
${initiative.description || 'No content provided.'}

Current Process (As-Is):
${initiative.currentProcess || 'No content provided.'}

Enhanced Process (To-Be):
${initiative.enhancedProcess || 'No content provided.'}

Comments:
${initiative.comments || 'No content provided.'}
    `.trim();
    navigator.clipboard.writeText(allText);
    showToast('All details copied.', 'success');
  };

  const idLabel = initiative.demandNumber || initiative.id;

  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Cancel</span>
        </button>

        <div className={styles.headingWrap}>
          <div className={styles.eyebrow}>
            <Hash size={12} />
            {idLabel}
            <span className={styles.dot} />
            {initiative.category}
          </div>
          <h1 className={styles.heading}>{initiative.name}</h1>
          <div className={styles.headingMeta}>
            <Badge type={initiative.status}>{initiative.status}</Badge>
            <Badge type={initiative.urgency}>{initiative.urgency} urgency</Badge>
            <span className={styles.updatedAt}>
              <Clock size={12} />
              Updated {formatDate(initiative.updatedAt)}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className="secondary-btn" onClick={handleCopyAll} title="Copy all details">
            <Copy size={14} />
            Copy All
          </button>
          {canEdit(initiative) && (
            <button className="secondary-btn" onClick={() => setEditOpen(true)}>
              <Pencil size={14} />
              Edit Initiative
            </button>
          )}
          {canDelete(initiative) && (
            <button className={styles.dangerBtn} onClick={() => setDeleteOpen(true)}>
              <Trash2 size={14} />
              Delete
            </button>
          )}
          <button className="liquid-btn" onClick={handleExport}>
            <Download size={14} />
            Export Excel
          </button>
        </div>
      </header>

      <section className={styles.detailsGrid}>
        <div className={styles.detailsCol}>
          <h2 className={styles.sectionTitle}>Ownership &amp; Resourcing</h2>
          <dl className={styles.detailList}>
            <DetailItem icon={<User size={14} />} label="Owner" value={initiative.owner || 'Unassigned'} />
            <DetailItem icon={<Wrench size={14} />} label="Implementer" value={initiative.implementer || '—'} />
            <DetailItem icon={<Wallet size={14} />} label="Budget" value={initiative.budget || '—'} mono />
            <DetailItem icon={<Briefcase size={14} />} label="Demand Number" value={initiative.demandNumber || '—'} mono />
          </dl>
        </div>

        <div className={styles.detailsCol}>
          <h2 className={styles.sectionTitle}>Status &amp; Timeline</h2>
          <dl className={styles.detailList}>
            <DetailItem
              icon={<Target size={14} />}
              label="Status"
              value={<Badge type={initiative.status}>{initiative.status}</Badge>}
            />
            <DetailItem
              icon={<Flag size={14} />}
              label="Urgency"
              value={<Badge type={initiative.urgency}>{initiative.urgency}</Badge>}
            />
            <DetailItem
              icon={<AlertCircle size={14} />}
              label="Severity"
              value={<Badge {...severityMeta(initiative.severity)}>{initiative.severity}</Badge>}
            />
            <DetailItem
              icon={<Calendar size={14} />}
              label="Log Date"
              value={formatDate(initiative.logDate)}
              mono
            />
          </dl>
        </div>
      </section>

      <section className={styles.cardsStack}>
        <DescCard
          icon={<FileText size={16} />}
          title="Description"
          body={initiative.description}
          tone="default"
          onCopy={() => handleCopy(initiative.description || 'No content provided.', 'Description')}
        />
        <div className={styles.cardsRow}>
          <DescCard
            icon={<Clock size={16} />}
            title="Current Process (As-Is)"
            body={initiative.currentProcess}
            tone="info"
            onCopy={() => handleCopy(initiative.currentProcess || 'No content provided.', 'Current Process')}
          />
          <DescCard
            icon={<Target size={16} />}
            title="Enhanced Process (To-Be)"
            body={initiative.enhancedProcess}
            tone="accent"
            onCopy={() => handleCopy(initiative.enhancedProcess || 'No content provided.', 'Enhanced Process')}
          />
        </div>
        <DescCard
          icon={<Users size={16} />}
          title="Comments"
          body={initiative.comments}
          tone="default"
          onCopy={() => handleCopy(initiative.comments || 'No content provided.', 'Comments')}
        />
      </section>

      <section className={styles.timelineSection}>
        <div className={styles.timelineHead}>
          <div>
            <span className={styles.sectionEyebrow}>Audit Trail</span>
            <h2 className={styles.timelineTitle}>
              <History size={18} />
              Log Timeline
              <span className={styles.count}>{logs.length}</span>
            </h2>
          </div>
          <button className="secondary-btn" onClick={() => setLogOpen(true)}>
            <Plus size={14} />
            Add Update
          </button>
        </div>

        {logs.length === 0 ? (
          <div className={styles.timelineEmpty}>
            <History size={22} />
            <span>No audit entries yet. Add the first update to begin the trail.</span>
          </div>
        ) : (
          <ol className={styles.timeline}>
            {logs.map((log, idx) => (
              <motion.li
                key={log.id}
                className={`${styles.node} ${idx === 0 ? styles.nodeLatest : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  className={styles.nodeDot}
                  style={{ borderColor: severityColor(log.logSeverity) }}
                >
                  <span
                    className={styles.nodeDotInner}
                    style={{ background: severityColor(log.logSeverity) }}
                  />
                </span>
                <article className={styles.nodeCard}>
                  <header className={styles.nodeHeader}>
                    <div className={styles.nodeDateWrap}>
                      <Calendar size={12} />
                      <span className={styles.nodeDate}>{formatDate(log.logDate)}</span>
                      <span className={styles.nodeTime}>{formatDateTime(log.logDate)}</span>
                    </div>
                    <div className={styles.nodeBadges}>
                      <Badge type={log.status}>{log.status}</Badge>
                      <Badge {...severityMeta(log.logSeverity)}>{log.logSeverity}</Badge>
                    </div>
                  </header>
                  <p className={styles.nodeDesc}>{log.logDescription}</p>
                </article>
              </motion.li>
            ))}
          </ol>
        )}
      </section>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Initiative"
        size="lg"
      >
        <InitiativeForm
          initial={initiative}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        title="Add Update"
        size="md"
      >
        <AddLogForm
          initiative={initiative}
          onSave={(log) => {
            addAuditLog(log);
            setLogOpen(false);
            showToast('Update saved.', 'success');
          }}
          onCancel={() => setLogOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete initiative?"
        message={`Delete ${initiative.name} from this workspace? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </motion.div>
  );
}

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function DetailItem({ icon, label, value, mono }: DetailItemProps) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailIcon}>{icon}</span>
      <dt>{label}</dt>
      <dd className={mono ? styles.mono : ''}>{value}</dd>
    </div>
  );
}

interface DescCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: 'default' | 'info' | 'accent';
  onCopy?: () => void;
}

function DescCard({ icon, title, body, tone, onCopy }: DescCardProps) {
  return (
    <motion.section
      className={`${styles.descCard} ${styles[`tone_${tone}`]}`}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18 }}
    >
      <header className={styles.descHead}>
        <span className={styles.descIcon}>{icon}</span>
        <h3>{title}</h3>
        {onCopy && (
          <button
            className={styles.descCopyBtn}
            onClick={onCopy}
            type="button"
            aria-label={`Copy ${title}`}
            title={`Copy ${title}`}
          >
            <Copy size={14} strokeWidth={2.2} />
          </button>
        )}
      </header>
      {body?.trim() ? (
        <p className={styles.descBody}>{body}</p>
      ) : (
        <p className={styles.descEmpty}>No content provided.</p>
      )}
    </motion.section>
  );
}

interface AddLogFormProps {
  initiative: Initiative;
  onSave: (log: Omit<AuditLog, 'id'>) => void;
  onCancel: () => void;
}

function AddLogForm({ initiative, onSave, onCancel }: AddLogFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState<Severity>('Low');

  const handleSave = () => {
    if (!desc.trim()) return;
    onSave({
      initiativeId: initiative.id,
      initiativeName: initiative.name,
      logDate: new Date(date).toISOString(),
      logDescription: desc.trim(),
      logSeverity: severity,
      status: initiative.status,
      category: initiative.category,
    });
  };

  return (
    <div className={styles.logForm}>
      <div className={styles.logGrid}>
        <label>
          <span>Log Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.logInput}
          />
        </label>
        <label>
          <span>Severity</span>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            className={styles.logInput}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>Description</span>
        <textarea
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className={styles.logInput}
          placeholder="What happened?"
        />
      </label>
      <div className={styles.logActions}>
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="liquid-btn"
          onClick={handleSave}
          disabled={!desc.trim()}
        >
          Save Update
        </button>
      </div>
    </div>
  );
}
