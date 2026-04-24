import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Initiative } from '../types';
import { CATEGORIES, STATUSES, URGENCIES } from '../types';
import { useData } from '../context/DataContext';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './Form.module.css';

type FormValues = Omit<Initiative, 'id' | 'updatedAt'>;

interface InitiativeFormProps {
  initial?: Initiative | null;
  onSubmit: (values: FormValues) => void | Promise<void>;
  onCancel: () => void;
  selectedCategory?: string;
}

function emptyValues(defaultCategory: string = 'Projects'): FormValues {
  return {
    category: defaultCategory as any,
    name: '',
    description: '',
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
    renewalDate: '',
    expiryDate: '',
    contractId: '',
  };
}

function toDateInput(iso: string): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function InitiativeForm({ initial, onSubmit, onCancel, selectedCategory }: InitiativeFormProps) {
  const { owners } = useData();
  const isEdit = !!initial;

  const [values, setValues] = useState<FormValues>(() => {
    if (!initial) return emptyValues(selectedCategory || 'Projects');
    return {
      category: initial.category,
      name: initial.name,
      description: initial.description,
      owner: initial.owner,
      currentProcess: initial.currentProcess,
      enhancedProcess: initial.enhancedProcess,
      budget: initial.budget,
      demandNumber: initial.demandNumber,
      status: initial.status,
      urgency: initial.urgency,
      comments: initial.comments,
      implementer: initial.implementer,
      logDate: toDateInput(initial.logDate),
      logDescription: initial.logDescription,
      severity: initial.severity,
      renewalDate: initial.renewalDate ? toDateInput(initial.renewalDate) : '',
      expiryDate: initial.expiryDate ? toDateInput(initial.expiryDate) : '',
      contractId: initial.contractId || '',
    };
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) return;
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    const payload: FormValues = {
      ...values,
      name: values.name.trim(),
      logDate: new Date(values.logDate).toISOString(),
    };
    await onSubmit(payload);
    setConfirmOpen(false);
  }

  return (
    <>
      <form className={styles.form} onSubmit={onFormSubmit}>
        <section className={styles.section}>
          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>
              Initiative Name<span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Predictive Grid Demand Engine"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select
              className={styles.select}
              value={values.category}
              onChange={(e) => update('category', e.target.value as FormValues['category'])}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Initiative ID / Demand Number</label>
            <input
              className={styles.input}
              value={values.demandNumber}
              onChange={(e) => update('demandNumber', e.target.value)}
              placeholder="e.g. DEM-900"
            />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={values.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Brief summary of the initiative's strategic purpose and scope."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Budget</label>
            <input
              className={styles.input}
              value={values.budget}
              onChange={(e) => update('budget', e.target.value)}
              placeholder="e.g. $1.2M"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Principal Owner</label>
            <select
              className={styles.select}
              value={values.owner}
              onChange={(e) => update('owner', e.target.value)}
            >
              <option value="">Unassigned</option>
              {owners.map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Implementer</label>
            <input
              className={styles.input}
              value={values.implementer}
              onChange={(e) => update('implementer', e.target.value)}
              placeholder="e.g. Accenture, IBM..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Status</label>
            <select
              className={styles.select}
              value={values.status}
              onChange={(e) => update('status', e.target.value as FormValues['status'])}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Urgency</label>
            <select
              className={styles.select}
              value={values.urgency}
              onChange={(e) => update('urgency', e.target.value as FormValues['urgency'])}
            >
              {URGENCIES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {values.category === 'Licenses' && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Contract ID</label>
                <input
                  className={styles.input}
                  value={values.contractId || ''}
                  onChange={(e) => update('contractId', e.target.value)}
                  placeholder="e.g. CNT-2024-001"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Renewal Date</label>
                <input
                  className={styles.input}
                  type="date"
                  value={values.renewalDate || ''}
                  onChange={(e) => update('renewalDate', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Expiry Date</label>
                <input
                  className={styles.input}
                  type="date"
                  value={values.expiryDate || ''}
                  onChange={(e) => update('expiryDate', e.target.value)}
                />
              </div>
            </>
          )}

        </section>

        <div className={styles.divider}>
          <span className={styles.dividerLabel}>Process</span>
        </div>

        <section className={styles.section}>
          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Current Process (As-Is)</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={values.currentProcess}
              onChange={(e) => update('currentProcess', e.target.value)}
              placeholder="How the process works today."
            />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Enhanced / Proposed Process (To-Be)</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={values.enhancedProcess}
              onChange={(e) => update('enhancedProcess', e.target.value)}
              placeholder="How it will work post-initiative."
            />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Comments</label>
            <textarea
              className={styles.textarea}
              rows={2}
              value={values.comments}
              onChange={(e) => update('comments', e.target.value)}
              placeholder="Additional notes, stakeholders, or context."
            />
          </div>
        </section>


        <div className={styles.actions}>
          <button type="button" className="secondary-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="liquid-btn" disabled={!values.name.trim()}>
            {isEdit ? 'Update Initiative' : 'Create Initiative'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={isEdit ? 'Save changes?' : 'Create new initiative?'}
        message={
          isEdit
            ? `Save changes to ${values.name.trim() || 'this initiative'}?`
            : `Create a new initiative named ${values.name.trim() || 'Untitled'}?`
        }
        confirmLabel={isEdit ? 'Save Changes' : 'Create'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
