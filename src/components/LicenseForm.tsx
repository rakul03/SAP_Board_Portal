import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Initiative } from '../types';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import styles from './Form.module.css';

interface LicenseFormProps {
  contractCategory?: string;
  onSaved: (initiative: Initiative) => void;
  onCancel: () => void;
}

interface LicenseValues {
  name: string;
  description: string;
  renewalDate: string;
  expiryDate: string;
  contractId: string;
}

export function LicenseForm({ onSaved, onCancel }: LicenseFormProps) {
  const { createInitiative } = useData();
  const { showToast } = useToast();

  const [values, setValues] = useState<LicenseValues>({
    name: '',
    description: '',
    renewalDate: '',
    expiryDate: '',
    contractId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof LicenseValues>(key: K, value: LicenseValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      showToast('License Name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newInitiative = await createInitiative({
        category: 'Licenses',
        name: values.name.trim(),
        description: values.description,
        owner: '',
        currentProcess: '',
        enhancedProcess: '',
        budget: '',
        demandNumber: '',
        status: 'Active',
        urgency: 'Medium',
        comments: '',
        implementer: '',
        logDate: new Date().toISOString(),
        logDescription: '',
        severity: 'Low',
        renewalDate: values.renewalDate ? new Date(values.renewalDate).toISOString() : '',
        expiryDate: values.expiryDate ? new Date(values.expiryDate).toISOString() : '',
        contractId: values.contractId,
      });

      if (newInitiative) {
        showToast('License created successfully', 'success');
        onSaved(newInitiative);
      } else {
        showToast('Failed to create license', 'error');
      }
    } catch (error: any) {
      console.error('❌ Error creating license:', error);
      showToast(`Error: ${error?.message || 'Failed to create license'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onFormSubmit}>
      <div className={styles.section}>
        <button type="button" className="ghost-btn" onClick={onCancel} style={{ justifySelf: 'start', gap: '8px' }}>
          <ArrowLeft size={14} />
          Back to Contract
        </button>
      </div>

      <section className={styles.section}>
        <div className={`${styles.field} ${styles.full}`}>
          <label className={styles.label}>
            License Name<span className={styles.required}>*</span>
          </label>
          <input
            className={styles.input}
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Microsoft Office 365"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className={`${styles.field} ${styles.full}`}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Brief description of the license"
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Renewal Date</label>
          <input
            type="date"
            className={styles.input}
            value={values.renewalDate}
            onChange={(e) => update('renewalDate', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Expiry Date</label>
          <input
            type="date"
            className={styles.input}
            value={values.expiryDate}
            onChange={(e) => update('expiryDate', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className={`${styles.field} ${styles.full}`}>
          <label className={styles.label}>License ID (Reference)</label>
          <input
            className={styles.input}
            value={values.contractId}
            onChange={(e) => update('contractId', e.target.value)}
            placeholder="e.g. LIC-001"
            disabled={isSubmitting}
          />
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className="secondary-btn" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="liquid-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save License'}
        </button>
      </div>
    </form>
  );
}
