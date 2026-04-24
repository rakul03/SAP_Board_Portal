import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { Sap_appuser_sapsService } from '../generated/services/Sap_appuser_sapsService';
import { Office365UsersService } from '../generated/services/Office365UsersService';
import type { User } from '../generated/models/Office365UsersModel';
import type { Role } from '../types';
import styles from './UserManagement.module.css';

interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

interface DirectoryUser {
  id: string;
  email: string;
  displayName: string;
}

const ROLE_CODE: Record<Role, number> = {
  User: 100000000,
  Manager: 100000001,
  Admin: 100000002,
};

const CODE_ROLE: Record<number, Role> = {
  100000000: 'User',
  100000001: 'Manager',
  100000002: 'Admin',
};

const ROLE_COLORS: Record<Role, string> = {
  User: styles.roleUser,
  Manager: styles.roleManager,
  Admin: styles.roleAdmin,
};

const normalizeUser = (u365: User): DirectoryUser => {
  const email = (u365.Mail || u365.UserPrincipalName || '').toLowerCase();
  const displayName = u365.DisplayName || u365.GivenName || u365.Surname || u365.UserPrincipalName || 'Unknown user';

  return {
    id: u365.Id,
    email,
    displayName,
  };
};

export function UserManagement() {
  const { showToast } = useToast();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>('User');
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');

  // M365 user search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DirectoryUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);
  const [newRole, setNewRole] = useState<Role>('User');

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced M365 search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim() || selectedUser) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const result = await Office365UsersService.SearchUser(searchQuery.trim(), 8);
        if (result?.success && Array.isArray(result.data)) {
          const users = (result.data as User[]).map(normalizeUser);
          setSearchResults(users);
          setShowDropdown(result.data.length > 0);
        }
      } catch (error) {
        console.error('❌ Failed to search Office 365 users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, selectedUser]);

  const handleSelectUser = (u365: DirectoryUser) => {
    setSelectedUser(u365);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
  };

  const resetAddForm = () => {
    clearSelection();
    setNewRole('User');
    setShowAddForm(false);
  };

  const load = async () => {
    try {
      setIsLoading(true);
      const result = await Sap_appuser_sapsService.getAll({ filter: 'statecode eq 0' });
      if (result?.success && Array.isArray(result.data)) {
        setUsers(
          (result.data as any[]).map((u) => ({
            id: u.sap_appuser_sapid,
            email: u.sap_sap_useremail || '',
            displayName: u.sap_sap_displayname || '',
            role: CODE_ROLE[u.sap_sap_role] ?? 'User',
          }))
        );
      }
    } catch {
      showToast('Failed to load users.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    try {
      const query = searchQuery.trim();
      const normalizedQuery = query.toLowerCase();
      const selectedFromSearch =
        selectedUser ??
        searchResults.find(
          (user) =>
            user.displayName.toLowerCase() === normalizedQuery ||
            user.email.toLowerCase() === normalizedQuery,
        ) ??
        null;

      let userToAdd = selectedFromSearch;

      if (!userToAdd && query) {
        const result = await Office365UsersService.SearchUser(query, 8);
        const users = (result.data ?? []).map(normalizeUser);
        userToAdd =
          users.find(
            (user) =>
              user.displayName.toLowerCase() === normalizedQuery ||
              user.email.toLowerCase() === normalizedQuery,
          ) ?? users[0] ?? null;
      }

      if (!userToAdd?.email) {
        showToast('Select a user from Office 365 first.', 'error');
        return;
      }

      const record: any = {
        sap_sap_useremail: userToAdd.email,
        sap_sap_displayname: userToAdd.displayName || undefined,
        sap_sap_role: ROLE_CODE[newRole],
        statecode: 0,
        statuscode: 1,
      };
      const result = await Sap_appuser_sapsService.create(record);
      if (result?.success) {
        showToast(`${userToAdd.displayName || userToAdd.email} added.`, 'success');
        resetAddForm();
        await load();
      } else {
        showToast('Failed to add user.', 'error');
      }
    } catch {
      showToast('Failed to add user.', 'error');
    }
  };

  const handleSaveRole = async (user: AppUser) => {
    try {
      await Sap_appuser_sapsService.update(user.id, { sap_sap_role: ROLE_CODE[editRole] as any });
      showToast('Role updated.', 'success');
      setEditingId(null);
      await load();
    } catch {
      showToast('Failed to update role.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await Sap_appuser_sapsService.delete(pendingDelete.id);
      showToast('User removed.', 'success');
      setPendingDelete(null);
      await load();
    } catch {
      showToast('Failed to remove user.', 'error');
    }
  };

  const filtered = roleFilter ? users.filter((u) => u.role === roleFilter) : users;
  const userCount = users.filter((u) => u.role === 'User').length;
  const managerCount = users.filter((u) => u.role === 'Manager').length;
  const adminCount = users.filter((u) => u.role === 'Admin').length;

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="User Management"
        subtitle="Manage app access and role assignments"
        breadcrumbs={['SAP Board Portfolio', 'User Management']}
        actions={
          <>
            <button className="secondary-btn" onClick={() => { load(); showToast('Refreshed.', 'info'); }}>
              <RefreshCw size={14} />
              Refresh
            </button>
            <button className="primary-btn" onClick={() => setShowAddForm((v) => !v)}>
              <UserPlus size={14} />
              Add User
            </button>
          </>
        }
      />

      <section className={styles.summaryGrid}>
        <button
          className={`${styles.summaryCard} ${roleFilter === '' ? styles.summaryCardActive : ''}`}
          onClick={() => setRoleFilter('')}
        >
          <span className={styles.summaryLabel}>Total Users</span>
          <strong className={styles.summaryValue}>{users.length}</strong>
          <span className={styles.summaryMeta}>Click to show all</span>
        </button>
        <button
          className={`${styles.summaryCard} ${styles.summaryCardUser} ${roleFilter === 'User' ? styles.summaryCardActive : ''}`}
          onClick={() => setRoleFilter(roleFilter === 'User' ? '' : 'User')}
        >
          <span className={styles.summaryLabel}>Users</span>
          <strong className={styles.summaryValue}>{userCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>
        <button
          className={`${styles.summaryCard} ${styles.summaryCardManager} ${roleFilter === 'Manager' ? styles.summaryCardActive : ''}`}
          onClick={() => setRoleFilter(roleFilter === 'Manager' ? '' : 'Manager')}
        >
          <span className={styles.summaryLabel}>Managers</span>
          <strong className={styles.summaryValue}>{managerCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>
        <button
          className={`${styles.summaryCard} ${styles.summaryCardAdmin} ${roleFilter === 'Admin' ? styles.summaryCardActive : ''}`}
          onClick={() => setRoleFilter(roleFilter === 'Admin' ? '' : 'Admin')}
        >
          <span className={styles.summaryLabel}>Admins</span>
          <strong className={styles.summaryValue}>{adminCount}</strong>
          <span className={styles.summaryMeta}>Click to filter</span>
        </button>
      </section>

      <AnimatePresence>
        {showAddForm && (
          <motion.section
            className={styles.addForm}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className={styles.addFormHeader}>
              <div className={styles.addFormTitle}>
                <Plus size={16} />
                <span>Add New User</span>
              </div>
              <button className="ghost-btn" onClick={resetAddForm}>
                <X size={14} />
              </button>
            </div>

            <div className={styles.addFormFields}>
              {/* M365 user search */}
              <div className={styles.field} ref={searchRef} style={{ position: 'relative' }}>
                <span className={styles.fieldLabel}>Search M365 User *</span>

                {selectedUser ? (
                  <div className={styles.selectedUserPill}>
                    <div className={styles.selectedUserInfo}>
                      <span className={styles.selectedUserName}>{selectedUser.displayName}</span>
                      <span className={styles.selectedUserEmail}>{selectedUser.email}</span>
                    </div>
                    <button className="ghost-btn" onClick={clearSelection} aria-label="Clear selection">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.searchInputWrap}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                      className={styles.textInput}
                      placeholder="Type a name or email…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                      autoFocus
                    />
                    {isSearching && <Loader2 size={14} className={styles.searchSpinner} />}
                  </div>
                )}

                <AnimatePresence>
                  {showDropdown && searchResults.length > 0 && (
                    <motion.div
                      className={styles.searchDropdown}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                    >
                      {searchResults.map((u, i) => {
                        const email = u.email;
                        const name = u.displayName || email;
                        return (
                          <button
                            key={u.id || i}
                            className={styles.searchResult}
                            onClick={() => handleSelectUser(u)}
                            type="button"
                          >
                            <span className={styles.resultAvatar}>
                              {name.charAt(0).toUpperCase()}
                            </span>
                            <span className={styles.resultInfo}>
                              <span className={styles.resultName}>{name}</span>
                              <span className={styles.resultEmail}>{email}</span>
                            </span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Role selector */}
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Role</span>
                <select
                  className={styles.selectInput}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                >
                  <option value="User">User</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>

              <button
                className="primary-btn"
                onClick={handleAdd}
                disabled={!selectedUser && !searchQuery.trim()}
              >
                <UserPlus size={14} />
                Add User
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className={styles.dataPanel}>
        <div className={styles.tableHeader}>
          <span>Email</span>
          <span>Display Name</span>
          <span>Role</span>
          <span className={styles.headerActions}>Actions</span>
        </div>

        <div className={styles.list}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <p>Loading users…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><ShieldCheck size={24} /></div>
              <h3>No users found</h3>
              <p>Add users to grant app access.</p>
            </div>
          ) : (
            filtered.map((user) => (
              <motion.div
                key={user.id}
                layout
                className={styles.row}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className={styles.emailCell}>{user.email}</span>
                <span className={styles.nameCell}>{user.displayName || '—'}</span>
                <span className={styles.roleCell}>
                  {editingId === user.id ? (
                    <select
                      className={styles.selectInput}
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as Role)}
                      autoFocus
                    >
                      <option value="User">User</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`${styles.roleBadge} ${ROLE_COLORS[user.role]}`}>
                      {user.role}
                    </span>
                  )}
                </span>
                <span className={styles.meta}>
                  {editingId === user.id ? (
                    <>
                      <button className="ghost-btn" aria-label="Save" onClick={() => handleSaveRole(user)}>
                        <Save size={15} />
                      </button>
                      <button className="ghost-btn" aria-label="Cancel" onClick={() => setEditingId(null)}>
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="ghost-btn"
                        aria-label="Edit role"
                        onClick={() => { setEditingId(user.id); setEditRole(user.role); }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className={`ghost-btn ${styles.delete}`}
                        aria-label="Remove user"
                        onClick={() => setPendingDelete(user)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Remove user?"
        message={`Remove ${pendingDelete?.email ?? ''} from the app? They will lose all access.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
