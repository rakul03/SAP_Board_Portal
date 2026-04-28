import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Contract, Initiative } from '../types';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Modal } from './Modal';
import { InitiativeForm } from './InitiativeForm';
import styles from './Form.module.css';

interface ContractFormProps {
  initial?: Contract;
  onSubmit: () => void;
  onCancel: () => void;
}

interface ContractValues {
  contractId: string;
  contractName: string;
  contractDescription: string;
  contractStartDate: string;
  contractEndDate: string;
  selectedLicenseId: string;
}

function toDateInput(iso: string): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function ContractForm({ initial, onSubmit, onCancel }: ContractFormProps) {
  const { initiatives, createInitiative, createContract, updateContract } = useData();
  const { showToast } = useToast();

  const [values, setValues] = useState<ContractValues>({
    contractId: initial?.contractId ?? '',
    contractName: initial?.contractName ?? '',
    contractDescription: initial?.contractDescription ?? '',
    contractStartDate: toDateInput(initial?.contractStartDate ?? ''),
    contractEndDate: toDateInput(initial?.contractEndDate ?? ''),
    selectedLicenseId: initial?.licenseId ?? '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);

  function update<K extends keyof ContractValues>(key: K, value: ContractValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const availableLicenses = initiatives.filter((i) => i.category === 'Licenses');
  const selectedLicense = availableLicenses.find((l) => l.id === values.selectedLicenseId);

  async function handleNewLicense(formValues: Omit<Initiative, 'id' | 'updatedAt'>) {
    const created = await createInitiative({ ...formValues, category: 'Licenses' });
    if (created) {
      // Auto-select the newly created license in the dropdown
      update('selectedLicenseId', created.id);
      setLicenseModalOpen(false);
      showToast(`License "${created.name}" created and selected.`, 'success');
    } else {
      showToast('Failed to create license.', 'error');
    }
  }

  async function onFormSubmit(e: FormEvent) {
    e.preventDefault();

    if (!values.contractId.trim()) {
      showToast('Contract ID is required', 'error');
      return;
    }
    if (!values.contractName.trim()) {
      showToast('Contract Name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        contractId: values.contractId,
        contractName: values.contractName.trim(),
        contractDescription: values.contractDescription,
        contractStartDate: values.contractStartDate ? new Date(values.contractStartDate).toISOString() : '',
        contractEndDate: values.contractEndDate ? new Date(values.contractEndDate).toISOString() : '',
        licenseId: values.selectedLicenseId,
        licenseName: selectedLicense?.name,
      };

      if (initial) {
        await updateContract(initial.id, payload);
        showToast('Contract updated successfully', 'success');
      } else {
        const newContract = await createContract(payload);
        if (!newContract) {
          showToast('Failed to create contract', 'error');
          return;
        }
        showToast('Contract created successfully', 'success');
      }
      onSubmit();
    } catch (error: any) {
      console.error('❌ Error saving contract:', error);
      showToast(`Error: ${error?.message || 'Failed to save contract'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className={styles.form} onSubmit={onFormSubmit}>
        <section className={styles.section}>
          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>
              Contract ID<span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              value={values.contractId}
              onChange={(e) => update('contractId', e.target.value)}
              placeholder="e.g. CT-001, MS-365-2024, or any unique identifier"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>
              Contract Name<span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              value={values.contractName}
              onChange={(e) => update('contractName', e.target.value)}
              placeholder="e.g. Microsoft Office 365 License Agreement"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              rows={2}
              value={values.contractDescription}
              onChange={(e) => update('contractDescription', e.target.value)}
              placeholder="Brief description of the contract"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Start Date</label>
            <input
              type="date"
              className={styles.input}
              value={values.contractStartDate}
              onChange={(e) => update('contractStartDate', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>End Date</label>
            <input
              type="date"
              className={styles.input}
              value={values.contractEndDate}
              onChange={(e) => update('contractEndDate', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.divider}>
            <span className={styles.dividerLabel}>License Selection</span>
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Select License</label>
            <select
              className={styles.select}
              value={values.selectedLicenseId}
              onChange={(e) => update('selectedLicenseId', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">
                {availableLicenses.length === 0 ? 'No licenses — add one below' : 'Select a license...'}
              </option>
              {availableLicenses.map((license) => (
                <option key={license.id} value={license.id}>
                  {license.name}
                </option>
              ))}
            </select>
          </div>

          {selectedLicense && (
            <div className={`${styles.field} ${styles.full}`}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Selected:
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    backgroundColor: 'var(--accent-50)',
                    color: 'var(--accent-700)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {selectedLicense.name}
                  <button
                    type="button"
                    onClick={() => update('selectedLicenseId', '')}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0', lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </span>
              </div>
            </div>
          )}

          <div className={`${styles.field} ${styles.full}`}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setLicenseModalOpen(true)}
              disabled={isSubmitting}
              style={{ justifySelf: 'start' }}
            >
              <Plus size={14} />
              Add New License
            </button>
          </div>
        </section>

        <div className={styles.actions}>
          <button type="button" className="secondary-btn" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="liquid-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initial ? 'Save Changes' : 'Save Contract'}
          </button>
        </div>
      </form>

      {/* License creation modal — opens on top of the contract modal */}
      <Modal
        isOpen={licenseModalOpen}
        onClose={() => setLicenseModalOpen(false)}
        title="Add New License"
        size="lg"
      >
        <InitiativeForm
          selectedCategory="Licenses"
          onSubmit={handleNewLicense}
          onCancel={() => setLicenseModalOpen(false)}
        />
      </Modal>
    </>
  );
}
