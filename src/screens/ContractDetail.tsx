import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Copy,
  FileText,
  Hash,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ContractForm } from '../components/ContractForm';
import { Modal } from '../components/Modal';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import styles from './InitiativeDetail.module.css';

interface ContractDetailProps {
  contractId: string;
  onBack: () => void;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
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

export function ContractDetail({ contractId, onBack }: ContractDetailProps) {
  const { contracts, initiatives, deleteContract } = useData();
  const { showToast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const contract = contracts.find((c) => c.id === contractId);

  const linkedLicense = useMemo(() => {
    if (!contract?.licenseId) return null;
    return initiatives.find((i) => i.id === contract.licenseId) ?? null;
  }, [contract?.licenseId, initiatives]);

  const linkedLicenseName = linkedLicense?.name || contract?.licenseName || 'No license linked';

  if (!contract) {
    return (
      <div className={styles.missing}>
        <p>This contract no longer exists.</p>
        <button className="secondary-btn" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to list
        </button>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteContract(contract.id);
      setDeleteOpen(false);
      showToast('Contract deleted successfully.', 'success');
      onBack();
    } catch (error: any) {
      console.error('❌ Delete failed:', error);
      showToast(`Delete failed: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied.`, 'success');
  };

  const handleCopyAll = () => {
    const payload = `
Contract: ${contract.contractName}
ID: ${contract.contractId}
Linked License: ${linkedLicense?.name || 'No license linked'}
Start Date: ${formatDate(contract.contractStartDate)}
End Date: ${formatDate(contract.contractEndDate)}

Description:
${contract.contractDescription || 'No content provided.'}
    `.trim();
    handleCopy(payload, 'All contract details');
  };

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
          <span>Back to list</span>
        </button>

        <div className={styles.headingWrap}>
          <div className={styles.eyebrow}>
            <Hash size={12} />
            {contract.contractId}
            <span className={styles.dot} />
            {linkedLicenseName}
          </div>
          <h1 className={styles.heading}>{contract.contractName}</h1>
        </div>

        <div className={styles.actions}>
          <button className="secondary-btn" onClick={handleCopyAll} title="Copy all details">
            <Copy size={14} />
            Copy All
          </button>
          <button className="secondary-btn" onClick={() => setEditOpen(true)}>
            <Pencil size={14} />
            Edit Contract
          </button>
          <button className={styles.dangerBtn} onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </header>

      <section className={styles.detailsGrid}>
        <div className={styles.detailsCol}>
          <h2 className={styles.sectionTitle}>Contract Information</h2>
          <dl className={styles.detailList}>
            <DetailItem
              icon={<Hash size={14} />}
              label="Contract ID"
              value={contract.contractId}
              mono
            />
            <DetailItem
              icon={<FileText size={14} />}
              label="Contract Name"
              value={contract.contractName}
            />
            <DetailItem
              icon={<FileText size={14} />}
              label="Description"
              value={contract.contractDescription || '—'}
            />
          </dl>
        </div>

        <div className={styles.detailsCol}>
          <h2 className={styles.sectionTitle}>Lifecycle</h2>
          <dl className={styles.detailList}>
            <DetailItem
              icon={<Calendar size={14} />}
              label="Start Date"
              value={formatDate(contract.contractStartDate)}
              mono
            />
            <DetailItem
              icon={<Calendar size={14} />}
              label="End Date"
              value={formatDate(contract.contractEndDate)}
              mono
            />
            <DetailItem
              icon={<FileText size={14} />}
              label="Linked License"
              value={linkedLicenseName}
            />
          </dl>
        </div>
      </section>

      <section className={styles.cardsStack}>
        <DescCard
          icon={<FileText size={16} />}
          title="Description"
          body={contract.contractDescription}
          tone="default"
          onCopy={() => handleCopy(contract.contractDescription || 'No content provided.', 'Description')}
        />
        <div className={styles.cardsRow}>
          <DescCard
            icon={<FileText size={16} />}
            title="Linked License"
            body={
              linkedLicenseName !== 'No license linked'
                ? `${linkedLicenseName}\n${contract.licenseId ? `License ID: ${contract.licenseId}` : ''}`.trim()
                : 'No license linked.'
            }
            tone="info"
            onCopy={() =>
              handleCopy(
                linkedLicenseName !== 'No license linked'
                  ? `${linkedLicenseName}${contract.licenseId ? `\nLicense ID: ${contract.licenseId}` : ''}`
                  : 'No license linked.',
                'Linked License',
              )
            }
          />
          <DescCard
            icon={<Calendar size={16} />}
            title="Contract Snapshot"
            body={`
Contract ID: ${contract.contractId}
Start Date: ${formatDate(contract.contractStartDate)}
End Date: ${formatDate(contract.contractEndDate)}
            `.trim()}
            tone="accent"
            onCopy={() =>
              handleCopy(
                `
Contract ID: ${contract.contractId}
Start Date: ${formatDate(contract.contractStartDate)}
End Date: ${formatDate(contract.contractEndDate)}
                `.trim(),
                'Contract snapshot',
              )
            }
          />
        </div>
      </section>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Contract"
        size="lg"
      >
        <ContractForm
          initial={contract}
          onSubmit={() => {
            setEditOpen(false);
            showToast('Contract updated successfully.', 'success');
          }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete Contract"
        message={`Are you sure you want to delete the contract "${contract.contractName}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        variant="danger"
      />
    </motion.div>
  );
}
