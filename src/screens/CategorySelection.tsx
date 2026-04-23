import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  FolderKanban,
  Key,
  List,
  Package,
  Plus,
  Replace,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useData } from '../context/DataContext';
import type { Category } from '../types';
import { CATEGORIES } from '../types';
import styles from './CategorySelection.module.css';

interface CategorySelectionProps {
  onSelect: (category: Category) => void;
  onViewFavorites?: () => void;
  onViewAllInitiatives?: () => void;
  onManageOwners?: () => void;
  onAddInitiative?: () => void;
}

interface CategoryMeta {
  description: string;
  Icon: ComponentType<{ size?: number | string }>;
  colorHex: string;
  colorName: string;
}

const CATEGORY_META: Record<Category, CategoryMeta> = {
  AIs: {
    description: 'Artificial intelligence experiments and model integrations.',
    Icon: Brain,
    colorHex: '#0d9488',
    colorName: 'teal',
  },
  Enhancements: {
    description: 'Incremental improvements to existing platforms and workflows.',
    Icon: Sparkles,
    colorHex: '#2563eb',
    colorName: 'blue',
  },
  Projects: {
    description: 'Strategic delivery programs and capex initiatives.',
    Icon: FolderKanban,
    colorHex: '#4f46e5',
    colorName: 'indigo',
  },
  Licenses: {
    description: 'License procurement, renewals, and compliance tracking.',
    Icon: Key,
    colorHex: '#7c3aed',
    colorName: 'purple',
  },
  Services: {
    description: 'Managed services, support contracts, and operational engagements.',
    Icon: Wrench,
    colorHex: '#06b6d4',
    colorName: 'cyan',
  },
  Securities: {
    description: 'Security posture, vulnerability remediation, and hardening work.',
    Icon: ShieldCheck,
    colorHex: '#dc2626',
    colorName: 'red',
  },
  'Product Replacements': {
    description: 'Migrations and replacements of legacy products or vendors.',
    Icon: Replace,
    colorHex: '#ea580c',
    colorName: 'orange',
  },
  Infrastructure: {
    description: 'Core infrastructure, networks, storage, and platform capacity.',
    Icon: Server,
    colorHex: '#475569',
    colorName: 'slate',
  },
  Others: {
    description: 'Initiatives that do not fit the standard portfolio categories.',
    Icon: Package,
    colorHex: '#78716c',
    colorName: 'stone',
  },
};

export function CategorySelection({ onSelect, onViewFavorites, onViewAllInitiatives, onManageOwners, onAddInitiative }: CategorySelectionProps) {
  const { initiatives } = useData();
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const c of CATEGORIES) map.set(c, 0);
    for (const i of initiatives) {
      map.set(i.category, (map.get(i.category) ?? 0) + 1);
    }
    return map;
  }, [initiatives]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter(
      (c) =>
        c.toLowerCase().includes(q) ||
        CATEGORY_META[c].description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className={styles.wrap}>
      <div className={styles.backdrop} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobOne}`} />
        <span className={`${styles.blob} ${styles.blobTwo}`} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={styles.headerWrap}
      >
        <PageHeader
          title="Initiatives"
          subtitle="Select a category to view its initiatives."
          breadcrumbs={['SAP Board Portfolio', 'Initiatives']}
        />
        <span className={styles.titleUnderline} aria-hidden="true" />
      </motion.div>

      <motion.div
        className={styles.actionButtons}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          className="secondary-btn"
          onClick={onViewFavorites}
          title="View favorites"
          aria-label="View favorites"
        >
          <Star size={16} />
          <span>Favorites</span>
        </button>
        <button
          className="secondary-btn"
          onClick={onViewAllInitiatives}
          title="View all initiatives"
          aria-label="View all initiatives"
        >
          <List size={16} />
          <span>All Initiatives</span>
        </button>
        <button
          className="secondary-btn"
          onClick={onManageOwners}
          title="Manage owners"
          aria-label="Manage owners"
        >
          <Users size={16} />
          <span>Manage Owners</span>
        </button>
        <button
          className="liquid-btn"
          onClick={onAddInitiative}
          title="Add initiative"
          aria-label="Add initiative"
        >
          <Plus size={16} />
          <span>Add Initiative</span>
        </button>
      </motion.div>

      <motion.div
        className={styles.toolbar}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
        <label className={styles.searchField}>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search categories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search categories"
          />
          {query && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </label>
        <span className={styles.resultCount}>
          {visible.length} of {CATEGORIES.length}
        </span>
      </motion.div>

      <motion.section
        className={styles.grid}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.045, delayChildren: 0.12 } },
        }}
      >
        <AnimatePresence mode="popLayout">
          {visible.map((category) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.Icon;
            const count = counts.get(category) ?? 0;
            return (
              <motion.button
                key={category}
                type="button"
                layout
                className={styles.card}
                onClick={() => onSelect(category)}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0 },
                }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                whileTap={{ scale: 0.97 }}
                style={{
                  '--category-color': meta.colorHex,
                } as React.CSSProperties}
                title={`${category} — ${count} initiative${count === 1 ? '' : 's'}`}
                aria-label={`Open ${category} — ${count} initiative(s)`}
              >
                <span className={styles.iconTile} aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span className={styles.body}>
                  <span className={styles.titleRow}>
                    <h3 className={styles.title}>{category}</h3>
                    <span className={styles.countBadge}>{count}</span>
                  </span>
                  <p className={styles.description}>{meta.description}</p>
                  <span className={styles.divider} aria-hidden="true" />
                </span>
                <span className={styles.arrow} aria-hidden="true">
                  <ArrowRight size={18} />
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {visible.length === 0 && (
          <motion.div
            key="empty"
            className={styles.empty}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Search size={22} />
            <p>No categories match "{query}"</p>
          </motion.div>
        )}
      </motion.section>
    </div>
  );
}
