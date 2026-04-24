import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuditLog, Category, Initiative, Owner, Role, Severity, Status, Urgency } from '../types';
// Generated services - DIRECT IMPORTS ONLY
import { Office365UsersService } from '../generated/services/Office365UsersService';
import { Sap_initiative_sapsService } from '../generated/services/Sap_initiative_sapsService';
import { Sap_auditlog_sapsService } from '../generated/services/Sap_auditlog_sapsService';
import { Sap_portfolioowner_sapsService } from '../generated/services/Sap_portfolioowner_sapsService';
import { Sap_favorite_sapsService } from '../generated/services/Sap_favorite_sapsService';
import { Sap_appuser_sapsService } from '../generated/services/Sap_appuser_sapsService';
import type { GraphUser_V1 } from '../generated/models/Office365UsersModel';
import {
  Sap_initiative_sapssap_category,
  Sap_initiative_sapssap_status,
  Sap_initiative_sapssap_urgency,
} from '../generated/models/Sap_initiative_sapsModel';

interface CurrentUser {
  displayName: string;
  mail: string;
  jobTitle: string;
}

const normalizeEmail = (value?: string | null): string =>
  (value || '').trim().toLowerCase();

interface DataContextValue {
  initiatives: Initiative[];
  auditLogs: AuditLog[];
  owners: Owner[];
  currentUser: CurrentUser | null;
  userRole: Role;
  hasAppAccess: boolean;
  accessMessage: string | null;
  favorites: string[];
  createInitiative: (data: Omit<Initiative, 'id' | 'updatedAt'>) => Promise<Initiative | null>;
  updateInitiative: (id: string, data: Partial<Initiative>) => Promise<void>;
  deleteInitiative: (id: string) => Promise<void>;
  addAuditLog: (log: Omit<AuditLog, 'id'>) => Promise<void>;
  deleteAuditLog: (id: string) => Promise<void>;
  addOwner: (name: string, email?: string) => Promise<Owner | null>;
  removeOwner: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

// Enum mapping functions - for converting form values to Dataverse codes
const mapCategoryToCode = (category: string): number => {
  const map: Record<string, number> = {
    'AIs': 100000000,
    'Enhancements': 100000001,
    'Projects': 100000002,
    'Licenses': 100000003,
    'Services': 100000004,
    'Securities': 100000005,
    'Product Replacements': 100000006,
    'Infrastructure': 100000007,
    'Others': 100000008,
  };
  return map[category] || 100000008;
};

const mapStatusToCode = (status: string): number => {
  const map: Record<string, number> = {
    'Active': 100000000,
    'Pending': 100000001,
    'Delayed': 100000003,
    'Completed': 100000002,
  };
  return map[status] || 100000000;
};

const mapUrgencyToCode = (urgency: string): number => {
  const map: Record<string, number> = {
    'Low': 100000000,
    'Medium': 100000001,
    'High': 100000002,
  };
  return map[urgency] || 100000000;
};

const mapSeverityToCode = (severity: string): number => {
  const map: Record<string, number> = {
    'High': 100000000,
    'Low': 100000001,
    'Medium': 100000002,
  };
  return map[severity] || 100000001;
};

const mapCodeToCategory = (code?: number): Category => {
  const map: Record<number, Category> = {
    100000000: 'AIs',
    100000001: 'Enhancements',
    100000002: 'Projects',
    100000003: 'Licenses',
    100000004: 'Services',
    100000005: 'Securities',
    100000006: 'Product Replacements',
    100000007: 'Infrastructure',
    100000008: 'Others',
  };
  return map[code || 100000008] || 'Others';
};

const mapCodeToStatus = (code?: number): Status => {
  const map: Record<number, Status> = {
    100000000: 'Active',
    100000001: 'Pending',
    100000003: 'Delayed',
    100000002: 'Completed',
  };
  return map[code || 100000000] || 'Active';
};

const mapCodeToUrgency = (code?: number): Urgency => {
  const map: Record<number, Urgency> = {
    100000000: 'Low',
    100000001: 'Medium',
    100000002: 'High',
  };
  return map[code || 100000000] || 'Low';
};

const mapCodeToSeverity = (code?: number): Severity => {
  const map: Record<number, Severity> = {
    100000000: 'High',
    100000001: 'Low',
    100000002: 'Medium',
  };
  return map[code || 100000001] || 'Low';
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userRole, setUserRole] = useState<Role>('User');
  const [hasAppAccess, setHasAppAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlight = useRef(false);

  const currentUserEmail = normalizeEmail(currentUser?.mail);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 DataContext: Loading from Dataverse...');

      // Load all tables in parallel — no $select to avoid virtual-field OData errors
      const [initiativesResult, auditLogsResult, ownersResult, profileResult, favoritesResult, appUsersResult] = await Promise.allSettled([
        Sap_initiative_sapsService.getAll({ filter: 'statecode eq 0' }),
        Sap_auditlog_sapsService.getAll({ filter: 'statecode eq 0' }),
        Sap_portfolioowner_sapsService.getAll({ filter: 'statecode eq 0' }),
        Office365UsersService.MyProfile_V2('displayName,mail,userPrincipalName,jobTitle'),
        Sap_favorite_sapsService.getAll({ filter: 'statecode eq 0' }),
        Sap_appuser_sapsService.getAll({ filter: 'statecode eq 0' }),
      ]);

      console.log('🔍 Raw Dataverse results:', {
        initiatives: { status: initiativesResult.status },
        auditLogs: { status: auditLogsResult.status },
        owners: { status: ownersResult.status },
        profile: { status: profileResult.status },
        favorites: { status: favoritesResult.status },
        appUsers: { status: appUsersResult.status },
      });

      const initData = initiativesResult.status === 'fulfilled' ? initiativesResult.value : null;
      const logsData = auditLogsResult.status === 'fulfilled' ? auditLogsResult.value : null;
      const ownersData = ownersResult.status === 'fulfilled' ? ownersResult.value : null;
      const profileData = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const favoritesData = favoritesResult.status === 'fulfilled' ? favoritesResult.value : null;
      const appUsersData = appUsersResult.status === 'fulfilled' ? appUsersResult.value : null;

      const profile: GraphUser_V1 | undefined = profileData?.data;
      const profileEmail = normalizeEmail(profile?.mail || profile?.userPrincipalName);
      const nextCurrentUser: CurrentUser | null = profile
        ? {
            displayName: profile.displayName || profile.userPrincipalName || 'User',
            mail: profile.mail || profile.userPrincipalName || '',
            jobTitle: profile.jobTitle || '',
          }
        : null;

      setCurrentUser(nextCurrentUser);
      setHasAppAccess(false);
      setAccessMessage(null);

      // Resolve role for current user
      const roleCodeMap: Record<number, Role> = {
        100000000: 'User',
        100000001: 'Manager',
        100000002: 'Admin',
      };
      let nextRole: Role = 'User';
      let matchedAppUser = false;
      if (appUsersData?.success && Array.isArray(appUsersData.data) && profileEmail) {
        const match = (appUsersData.data as any[]).find(
          (u) => normalizeEmail(u.sap_sap_useremail) === profileEmail
        );
        if (match?.sap_sap_role !== undefined) {
          nextRole = roleCodeMap[match.sap_sap_role] ?? 'User';
        }
        matchedAppUser = !!match;
        console.log('🔐 Loaded role for user:', { email: profileEmail, role: nextRole });
      }
      setUserRole(nextRole);
      setHasAppAccess(matchedAppUser);
      if (!matchedAppUser) {
        setAccessMessage(
          'Your account is not registered for this SAP Portal. Please contact the portal administrator to request access.'
        );
      }

      // Load favorites for current user
      const nextFavorites: string[] = [];
      if (favoritesData?.success && Array.isArray(favoritesData.data) && profileEmail) {
        const userFavorites = (favoritesData.data as any[]).filter(
          (fav) => normalizeEmail(fav.sap_useremail) === profileEmail
        );
        nextFavorites.push(...userFavorites.map((fav: any) => fav._sap_sap_initiative_value || '').filter(Boolean));
        console.log('⭐ Loaded favorites for user:', { email: profileEmail, count: nextFavorites.length });
      } else if (!favoritesData?.success) {
        console.warn('⚠️ Failed to load favorites:', favoritesData?.error);
      }

      // Build owner lookup map: GUID → display name, resolved BEFORE mapping initiatives
      const ownerMap = new Map<string, string>();
      if (ownersData?.success && Array.isArray(ownersData.data)) {
        for (const o of ownersData.data as any[]) {
          if (o.sap_portfolioowner_sapid && o.sap_ownername) {
            ownerMap.set(o.sap_portfolioowner_sapid, o.sap_ownername);
          }
        }
      }

      const inits: Initiative[] = [];
      if (initData?.success && Array.isArray(initData.data)) {
        inits.push(...initData.data.map((item: any) => {
          // Resolve owner: prefer lookup from owners table via GUID, fall back to computed name
          const ownerGuid: string = item._sap_owner_name_value || '';
          const ownerName =
            (ownerGuid && ownerMap.get(ownerGuid)) ||
            item.sap_owner_namename ||
            'Unassigned';

          return {
            id: item.sap_initiative_sapid,
            name: item.sap_initiativename || '',
            category: mapCodeToCategory(item.sap_category),
            description: item.sap_description || '',
            owner: ownerName,
            budget: item.sap_budgetaed || '',
            demandNumber: item.sap_demandnumber || '',
            status: mapCodeToStatus(item.sap_status),
            urgency: mapCodeToUrgency(item.sap_urgency),
            currentProcess: item.sap_currentprocessasis || '',
            enhancedProcess: item.sap_enhancedprocesstobe || '',
            comments: item.sap_comments || '',
            implementer: item.sap_implementer || '',
            logDate: item.modifiedon || new Date().toISOString(),
            logDescription: '',
            severity: 'Low' as Severity,
            updatedAt: item.modifiedon || new Date().toISOString(),
            createdByEmail: item.sap_sap_createdemail || item.sap_createdemail || '',
            renewalDate: item.sap_sap_renewaldate || '',
            expiryDate: item.sap_sap_expirydate || '',
            contractId: item.sap_sap_contractid || '',
          };
        }));
      } else if (!initData?.success) {
        console.error('❌ Failed to load initiatives:', initData?.error);
      }

      const logs: AuditLog[] = [];
      if (logsData?.success && Array.isArray(logsData.data)) {
        logs.push(...logsData.data.map((item: any) => ({
          id: item.sap_auditlog_sapid,
          initiativeId: item._sap_initiativename_value || '',
          initiativeName: item.sap_initiativenamename || 'Unknown',
          logDate: item.sap_log_date || new Date().toISOString(),
          logDescription: item.sap_log_description || '',
          logSeverity: mapCodeToSeverity(item.sap_log_severity),
          status: 'Active' as Status,
          category: 'Others' as Category,
          ownerName: item.sap_eventname || '',
        })));
      } else if (!logsData?.success) {
        console.error('❌ Failed to load audit logs:', logsData?.error);
      }

      const owns: Owner[] = [];
      if (ownersData?.success && Array.isArray(ownersData.data)) {
        owns.push(...ownersData.data.map((item: any) => ({
          id: item.sap_portfolioowner_sapid,
          name: item.sap_ownername,
        })));
      } else if (!ownersData?.success) {
        console.error('❌ Failed to load owners:', ownersData?.error);
      }

      console.log('✅ DataContext: Data loaded from Dataverse', {
        initiatives: inits.length,
        auditLogs: logs.length,
        owners: owns.length,
        favorites: nextFavorites.length,
      });

      setInitiatives(inits);
      setAuditLogs(logs);
      setOwners(owns);
      setFavorites(nextFavorites);
    } catch (error) {
      console.error('❌ DataContext: Unexpected error loading from Dataverse:', error);
      setInitiatives([]);
      setAuditLogs([]);
      setOwners([]);
      setCurrentUser(null);
      setUserRole('User');
      setHasAppAccess(false);
      setAccessMessage('Could not load your user profile. Please contact the portal administrator.');
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createInitiative = useCallback(
    async (data: Omit<Initiative, 'id' | 'updatedAt'>): Promise<Initiative | null> => {
      try {
        console.log('💾 Creating initiative in Dataverse...');

        if (!currentUserEmail) {
          throw new Error('Unable to determine the current user email.');
        }

        const categoryCode = mapCategoryToCode(data.category) as keyof typeof Sap_initiative_sapssap_category;
        const statusCode = mapStatusToCode(data.status) as keyof typeof Sap_initiative_sapssap_status;
        const urgencyCode = mapUrgencyToCode(data.urgency) as keyof typeof Sap_initiative_sapssap_urgency;

        const baseRecord: any = {
          sap_initiativename: data.name,
          sap_category: categoryCode,
          sap_description: data.description || undefined,
          sap_budgetaed: data.budget || undefined,
          sap_demandnumber: data.demandNumber || undefined,
          sap_status: statusCode,
          sap_urgency: urgencyCode,
          sap_currentprocessasis: data.currentProcess || undefined,
          sap_enhancedprocesstobe: data.enhancedProcess || undefined,
          sap_comments: data.comments || undefined,
          sap_implementer: data.implementer || undefined,
          sap_sap_contractid: data.contractId || undefined,
          sap_sap_renewaldate: data.renewalDate || undefined,
          sap_sap_expirydate: data.expiryDate || undefined,
        };

        const createRecord = (includeCreatedEmail: boolean) => ({
          ...baseRecord,
          ...(includeCreatedEmail ? { sap_sap_createdemail: currentUserEmail } : {}),
        });

        // Add owner lookup if provided
        const ownerBinding = (() => {
          if (!data.owner || owners.length === 0) return undefined;
          const owner = owners.find((o) => o.name === data.owner);
          if (owner?.id) {
            console.log('✅ Owner lookup resolved:', {
              name: owner.name,
              id: owner.id,
              binding: `/sap_portfolioowner_saps(${owner.id})`,
            });
            return `/sap_portfolioowner_saps(${owner.id})`;
          }
          console.warn('⚠️ Owner found but has no ID:', owner);
          return undefined;
        })();

        const recordWithEmail: any = createRecord(true);
        const recordWithoutEmail: any = createRecord(false);

        if (data.owner && owners.length > 0) {
          if (ownerBinding) {
            recordWithEmail['sap_Owner_Name@odata.bind'] = ownerBinding;
            recordWithoutEmail['sap_Owner_Name@odata.bind'] = ownerBinding;
          }
        }

        console.log('📤 Sending to Dataverse (full):', JSON.stringify(recordWithEmail));

        let result = await Sap_initiative_sapsService.create(recordWithEmail);

        const errorMessage =
          (result?.error as any)?.message ||
          (result?.error as any)?.toString?.() ||
          '';

        if (
          !result?.success &&
          typeof errorMessage === 'string' &&
          errorMessage.includes("Invalid property 'sap_sap_createdemail'")
        ) {
          console.warn('⚠️ Dataverse does not expose sap_sap_createdemail yet. Retrying without that field.');
          result = await Sap_initiative_sapsService.create(recordWithoutEmail);
        }

        if (!result?.success) {
          const serverMsg = (result?.error as any)?.message || JSON.stringify(result?.error) || 'Unknown Dataverse error';
          console.error('❌ Dataverse create failed. Server response:', result?.error);
          throw new Error(`Dataverse rejected the create: ${serverMsg}`);
        }

        const newInitiative: Initiative = {
          id: (result.data as any)?.sap_initiative_sapid,
          name: data.name,
          category: data.category,
          description: data.description,
          owner: data.owner,
          budget: data.budget,
          demandNumber: data.demandNumber,
          status: data.status,
          urgency: data.urgency,
          currentProcess: data.currentProcess,
          enhancedProcess: data.enhancedProcess,
          comments: data.comments,
          implementer: data.implementer,
          logDate: new Date().toISOString(),
          logDescription: '',
          severity: 'Low',
          updatedAt: new Date().toISOString(),
          createdByEmail: currentUserEmail,
          renewalDate: data.renewalDate,
          expiryDate: data.expiryDate,
          contractId: data.contractId,
        };

        setInitiatives((prev) => [newInitiative, ...prev]);

        console.log('✅ Initiative created successfully');
        return newInitiative;
      } catch (error) {
        console.error('❌ Error creating initiative:', error);
        return null;
      }
    },
    [owners, currentUserEmail],
  );

  const updateInitiative = useCallback(
    async (id: string, data: Partial<Initiative>) => {
      try {
        console.log('🔄 Updating initiative...', { id });

        if (!id || id.trim() === '') {
          throw new Error('Cannot update initiative: Invalid or empty ID');
        }

        const initiative = initiatives.find((item) => item.id === id);
        if (!initiative) {
          throw new Error('Initiative not found');
        }
        if (userRole === 'User' && normalizeEmail(initiative.createdByEmail) !== currentUserEmail) {
          throw new Error('Permission denied');
        }

        const update: any = {};

        if (data.name) update.sap_initiativename = data.name;
        if (data.category) update.sap_category = mapCategoryToCode(data.category);
        if (data.description) update.sap_description = data.description;
        if (data.budget) update.sap_budgetaed = data.budget;
        if (data.demandNumber) update.sap_demandnumber = data.demandNumber;
        if (data.status) update.sap_status = mapStatusToCode(data.status);
        if (data.urgency) update.sap_urgency = mapUrgencyToCode(data.urgency);
        if (data.currentProcess) update.sap_currentprocessasis = data.currentProcess;
        if (data.enhancedProcess) update.sap_enhancedprocesstobe = data.enhancedProcess;
        if (data.comments) update.sap_comments = data.comments;
        if (data.implementer) update.sap_implementer = data.implementer;
        if (data.contractId) update.sap_sap_contractid = data.contractId;
        if (data.renewalDate) update.sap_sap_renewaldate = data.renewalDate;
        if (data.expiryDate) update.sap_sap_expirydate = data.expiryDate;

        // Handle owner lookup
        if (data.owner && owners.length > 0) {
          const owner = owners.find((o) => o.name === data.owner);
          if (owner?.id) {
            update['sap_Owner_Name@odata.bind'] = `/sap_portfolioowner_saps(${owner.id})`;
            console.log('✅ Owner lookup for update:', { name: owner.name, id: owner.id, binding: update['sap_Owner_Name@odata.bind'] });
          } else {
            console.warn('⚠️ Owner found but has no ID:', owner);
          }
        }

        if (Object.keys(update).length === 0) {
          console.log('ℹ️ No changes to update');
          return;
        }

        console.log('📤 Sending update to Dataverse:', update);

        await Sap_initiative_sapsService.update(id, update);

        // Create audit log if description provided
        if (data.logDescription?.trim()) {
          const currentInitiative = initiatives.find((i) => i.id === id);
          const auditRecord: any = {
            sap_eventname: 'Updated',
            sap_log_date: new Date(data.logDate || new Date()).toISOString(),
            sap_log_description: data.logDescription,
            sap_log_severity: mapSeverityToCode(data.severity || 'Low'),
            'sap_InitiativeName@odata.bind': `/sap_initiative_saps(${id})`,
          };

          console.log('📤 Creating audit log (full):', JSON.stringify(auditRecord));

          const auditResult = await Sap_auditlog_sapsService.create(auditRecord);

          if (auditResult?.success) {
            const newLog: AuditLog = {
              id: (auditResult.data as any)?.sap_auditlog_sapid,
              initiativeId: id,
              initiativeName: currentInitiative?.name || 'Unknown',
              logDate: data.logDate || new Date().toISOString(),
              logDescription: data.logDescription,
              logSeverity: data.severity as any || 'Low',
              status: 'Active',
              category: currentInitiative?.category || 'Others',
              ownerName: currentInitiative?.owner,
            };

            setAuditLogs((prev) => [newLog, ...prev]);
            console.log('✅ Audit log created');
          }
        }

        // Update local state
        const updatedInits = initiatives.map((i) =>
          i.id === id ? { ...i, ...data, updatedAt: new Date().toISOString() } : i
        );
        setInitiatives(updatedInits);

        console.log('✅ Initiative updated successfully');
      } catch (error: any) {
        console.error('❌ Error updating initiative:', error);
        throw error;
      }
    },
    [initiatives, owners, currentUserEmail, userRole],
  );

  const deleteInitiative = useCallback(
    async (id: string) => {
      try {
        console.log('🗑️ Deleting initiative...', { id });

        const initiative = initiatives.find((item) => item.id === id);
        if (!initiative) {
          throw new Error('Initiative not found');
        }
        if (userRole === 'User' && normalizeEmail(initiative.createdByEmail) !== currentUserEmail) {
          throw new Error('Permission denied');
        }

        // Delete from Dataverse
        await Sap_initiative_sapsService.delete(id);

        // Delete associated audit logs
        const logsToDelete = auditLogs.filter((l) => l.initiativeId === id);
        for (const log of logsToDelete) {
          await Sap_auditlog_sapsService.delete(log.id);
        }

        // Delete associated favorites
        const favsToDelete = await Sap_favorite_sapsService.getAll({
          filter: `_sap_sap_initiative_value eq '${id}'`,
        });
        if (favsToDelete?.success && Array.isArray(favsToDelete.data)) {
          for (const fav of favsToDelete.data as any[]) {
            if (fav.sap_favorite_sapid) {
              await Sap_favorite_sapsService.delete(fav.sap_favorite_sapid);
            }
          }
        }

        // Update local state
        const updatedInits = initiatives.filter((i) => i.id !== id);
        const updatedLogs = auditLogs.filter((l) => l.initiativeId !== id);

        setInitiatives(updatedInits);
        setAuditLogs(updatedLogs);
        setFavorites((prev) => prev.filter((f) => f !== id));

        console.log('✅ Initiative deleted');
      } catch (error) {
        console.error('❌ Error deleting initiative:', error);
      }
    },
    [initiatives, auditLogs, currentUserEmail, userRole],
  );

  const addAuditLog = useCallback(
    async (log: Omit<AuditLog, 'id'>) => {
      try {
        console.log('📝 Adding audit log...');

        const record: any = {
          sap_eventname: 'Updated',
          sap_log_date: new Date(log.logDate).toISOString(),
          sap_log_description: log.logDescription,
          sap_log_severity: mapSeverityToCode(log.logSeverity),
          'sap_InitiativeName@odata.bind': `/sap_initiative_saps(${log.initiativeId})`,
        };

        const result = await Sap_auditlog_sapsService.create(record);

        if (result?.success) {
          const newLog: AuditLog = {
            id: (result.data as any)?.sap_auditlog_sapid,
            initiativeId: log.initiativeId,
            initiativeName: log.initiativeName,
            logDate: log.logDate,
            logDescription: log.logDescription,
            logSeverity: log.logSeverity,
            status: 'Active',
            category: log.category,
            ownerName: log.ownerName,
          };

          setAuditLogs((prev) => [newLog, ...prev]);
          console.log('✅ Audit log created');
        }
      } catch (error) {
        console.error('❌ Error adding audit log:', error);
      }
    },
    [],
  );

  const deleteAuditLog = useCallback(
    async (id: string) => {
      try {
        console.log('🗑️ Deleting audit log...', { id });

        await Sap_auditlog_sapsService.delete(id);

        const updatedLogs = auditLogs.filter((l) => l.id !== id);
        setAuditLogs(updatedLogs);

        console.log('✅ Audit log deleted');
      } catch (error) {
        console.error('❌ Error deleting audit log:', error);
      }
    },
    [auditLogs],
  );

  const addOwner = useCallback(
    async (name: string, email?: string): Promise<Owner | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      if (owners.some((o) => o.name?.toLowerCase() === trimmed.toLowerCase())) return null;

      try {
        console.log('👤 Adding owner...');

        // Generate owner ID
        const maxId = owners.reduce((max: number) => max + 1, 1000);

        const record: any = {
          sap_ownername: trimmed,
          sap_owner_id: `OWNID-${maxId + 1}`,
          sap_email: email || undefined,
        };

        const result = await Sap_portfolioowner_sapsService.create(record);

        if (result?.success) {
          const newOwner: Owner = {
            id: (result.data as any)?.sap_portfolioowner_sapid,
            name: trimmed,
          };

          setOwners((prev) => [...prev, newOwner]);
          console.log('✅ Owner created');
          return newOwner;
        }

        return null;
      } catch (error) {
        console.error('❌ Error adding owner:', error);
        return null;
      }
    },
    [owners],
  );

  const removeOwner = useCallback(
    async (id: string) => {
      try {
        console.log('🗑️ Deleting owner...', { id });

        await Sap_portfolioowner_sapsService.delete(id);

        const updatedOwners = owners.filter((o) => o.id !== id);
        setOwners(updatedOwners);

        console.log('✅ Owner deleted');
      } catch (error) {
        console.error('❌ Error removing owner:', error);
      }
    },
    [owners],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      try {
        const isFavorited = favorites.includes(id);

        if (isFavorited) {
          // Remove favorite from Dataverse
          const favRecord = await Sap_favorite_sapsService.getAll({
            filter: `_sap_sap_initiative_value eq '${id}' and sap_useremail eq '${currentUser?.mail}'`,
          });

          if (favRecord?.success && Array.isArray(favRecord.data) && favRecord.data.length > 0) {
            const favId = (favRecord.data[0] as any).sap_favorite_sapid;
            if (favId) {
              await Sap_favorite_sapsService.delete(favId);
              console.log('✅ Favorite removed from Dataverse:', { initiativeId: id });
            }
          }

          setFavorites((prev) => prev.filter((f) => f !== id));
        } else {
          // Add favorite to Dataverse
          if (!currentUser?.mail) {
            console.warn('⚠️ Cannot add favorite: No user email');
            return;
          }

          const favRecord: any = {
            sap_useremail: currentUser.mail,
            'sap_sap_initiative@odata.bind': `/sap_initiative_saps(${id})`,
            statecode: 0,
            statuscode: 1,
          };

          console.log('📤 Creating favorite record:', favRecord);
          const result = await Sap_favorite_sapsService.create(favRecord);

          if (result?.success) {
            console.log('✅ Favorite added to Dataverse:', { initiativeId: id });
            setFavorites((prev) => [...prev, id]);
          } else {
            console.error('❌ Failed to add favorite:', result?.error);
          }
        }
      } catch (error) {
        console.error('❌ Error toggling favorite:', error);
      }
    },
    [favorites, currentUser?.mail],
  );

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    console.log('🔄 Refreshing data from Dataverse...');
    try {
      await load();
    } finally {
      refreshInFlight.current = false;
    }
  }, [load]);

  useEffect(() => {
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    const refreshOnFocus = () => {
      void refresh();
    };

    const poll = window.setInterval(() => {
      if (!document.hidden) {
        void refresh();
      }
    }, 30000);

    document.addEventListener('visibilitychange', refreshOnVisibility);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [refresh]);

  const value = useMemo<DataContextValue>(
    () => ({
      initiatives,
      auditLogs,
      owners,
      currentUser,
      userRole,
      hasAppAccess,
      accessMessage,
      favorites,
      createInitiative,
      updateInitiative,
      deleteInitiative,
      addAuditLog,
      deleteAuditLog,
      addOwner,
      removeOwner,
      toggleFavorite,
      refresh,
      isLoading,
    }),
    [
      initiatives,
      auditLogs,
      owners,
      currentUser,
      userRole,
      hasAppAccess,
      accessMessage,
      favorites,
      createInitiative,
      updateInitiative,
      deleteInitiative,
      addAuditLog,
      deleteAuditLog,
      addOwner,
      removeOwner,
      toggleFavorite,
      refresh,
      isLoading,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
