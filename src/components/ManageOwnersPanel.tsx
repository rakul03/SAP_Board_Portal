import { Check, Search, UserPlus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { Office365UsersService } from '../generated/services/Office365UsersService';
import type { User } from '../generated/models/Office365UsersModel';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './ManageOwnersPanel.module.css';

function normalizeUser(user: User) {
  return {
    id: user.Id,
    displayName: user.DisplayName || user.GivenName || user.Surname || user.UserPrincipalName || 'Unknown user',
    mail: user.Mail || user.UserPrincipalName || '',
    jobTitle: user.JobTitle || '',
  };
}

export function ManageOwnersPanel() {
  const { owners, addOwner, removeOwner } = useData();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [selectedUser, setSelectedUser] = useState<ReturnType<typeof normalizeUser> | null>(null);
  const [searchResults, setSearchResults] = useState<ReturnType<typeof normalizeUser>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  useEffect(() => {
    const query = name.trim();
    setSelectedUser(null);

    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const result = await Office365UsersService.SearchUser(query, 8);
        const users = (result.data ?? []).map(normalizeUser);
        if (!cancelled) {
          setSearchResults(users);
        }
      } catch (error) {
        console.error('❌ Failed to search Office 365 users:', error);
        if (!cancelled) {
          setSearchResults([]);
          showToast('Could not search Office 365 users.', 'error');
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, showToast]);

  const suggestionLabel = useMemo(() => {
    if (isSearching) return 'Searching Office 365 users...';
    if (name.trim().length < 2) return 'Type at least 2 characters to search the directory.';
    if (searchResults.length === 0) return 'No matching Office 365 users found.';
    return `${searchResults.length} directory match${searchResults.length === 1 ? '' : 'es'} found.`;
  }, [isSearching, name, searchResults.length]);

  const handleAdd = async () => {
    const query = name.trim();
    if (!query) return;

    const exactMatch = searchResults.find((user) => user.displayName.toLowerCase() === query.toLowerCase());
    const selected = selectedUser ?? exactMatch ?? searchResults[0];

    if (!selected) {
      showToast('No matching Office 365 user found.', 'warning');
      return;
    }

    const owner = await addOwner(selected.displayName, selected.mail || undefined);
    if (!owner) {
      showToast('Owner already exists.', 'warning');
      return;
    }
    setName('');
    setSelectedUser(null);
    setSearchResults([]);
    showToast(`Owner "${owner.name}" added.`, 'success');
  };

  const targetOwner = owners.find((o) => o.id === pendingRemove);

  return (
    <div className={styles.wrap}>
      <div className={styles.searchWrap}>
        <div className={styles.addRow}>
          <div className={styles.inputShell}>
            <Search size={14} className={styles.searchIcon} aria-hidden="true" />
            <input
              className={styles.input}
              placeholder="Search Office 365 users..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
          </div>
          <button className="liquid-btn" onClick={handleAdd} disabled={!name.trim()}>
            <UserPlus size={14} />
            Add
          </button>
        </div>

        <div className={styles.helper}>{suggestionLabel}</div>

        {searchResults.length > 0 && (
          <div className={styles.suggestions} role="listbox" aria-label="Office 365 user suggestions">
            {searchResults.map((user) => (
              <button
                type="button"
                key={user.id}
                className={styles.suggestion}
                onClick={() => {
                  setSelectedUser(user);
                  setName(user.displayName);
                }}
              >
                <div className={styles.suggestionMain}>
                  <span className={styles.suggestionName}>{user.displayName}</span>
                  <span className={styles.suggestionMeta}>{user.mail || 'No email found'}</span>
                </div>
                <span className={styles.suggestionAction}>
                  {selectedUser?.id === user.id ? <Check size={14} /> : 'Select'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {searchResults.length === 0 && name.trim().length >= 2 && !isSearching && (
        <div className={styles.empty}>No Office 365 users matched your search.</div>
      )}

      {owners.length === 0 ? (
        <div className={styles.empty}>No owners added yet.</div>
      ) : (
        <ul className={styles.list}>
          {owners.map((o) => (
            <li key={o.id} className={styles.row}>
              <div className={styles.avatar}>{o.name?.charAt(0)?.toUpperCase() || '?'}</div>
              <span className={styles.name}>{o.name}</span>
              <button
                className="ghost-btn"
                aria-label={`Remove ${o.name}`}
                onClick={() => setPendingRemove(o.id)}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={!!pendingRemove}
        title="Remove owner?"
        message={`Remove ${targetOwner?.name ?? ''}? Assigned initiatives will become unassigned.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={async () => {
          if (pendingRemove) {
            await removeOwner(pendingRemove);
            showToast('Owner removed.', 'success');
            setPendingRemove(null);
          }
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
