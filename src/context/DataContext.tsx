import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuditLog, Category, Initiative, Owner, Severity, Status, Urgency } from '../types';
// Generated services - DIRECT IMPORTS ONLY
import { Office365UsersService } from '../generated/services/Office365UsersService';
import { Sap_initiative_sapsService } from '../generated/services/Sap_initiative_sapsService';
import { Sap_auditlog_sapsService } from '../generated/services/Sap_auditlog_sapsService';
import { Sap_portfolioowner_sapsService } from '../generated/services/Sap_portfolioowner_sapsService';
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

interface DataContextValue {
  initiatives: Initiative[];
  auditLogs: AuditLog[];
  owners: Owner[];
  currentUser: CurrentUser | null;
  favorites: string[];
  createInitiative: (data: Omit<Initiative, 'id' | 'updatedAt'>) => Promise<Initiative | null>;
  updateInitiative: (id: string, data: Partial<Initiative>) => Promise<void>;
  deleteInitiative: (id: string) => Promise<void>;
  addAuditLog: (log: Omit<AuditLog, 'id'>) => Promise<void>;
  deleteAuditLog: (id: string) => Promise<void>;
  addOwner: (name: string, email?: string) => Promise<Owner | null>;
  removeOwner: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 DataContext: Loading from Dataverse...');

      // Load all three tables in parallel — no $select to avoid virtual-field OData errors
      const [initiativesResult, auditLogsResult, ownersResult, profileResult] = await Promise.allSettled([
        Sap_initiative_sapsService.getAll({ filter: 'statecode eq 0' }),
        Sap_auditlog_sapsService.getAll({ filter: 'statecode eq 0' }),
        Sap_portfolioowner_sapsService.getAll({ filter: 'statecode eq 0' }),
        Office365UsersService.MyProfile_V2('displayName,mail,userPrincipalName,jobTitle'),
      ]);

      console.log('🔍 Raw Dataverse results:', {
        initiatives: { status: initiativesResult.status },
        auditLogs: { status: auditLogsResult.status },
        owners: { status: ownersResult.status },
        profile: { status: profileResult.status },
      });

      const initData = initiativesResult.status === 'fulfilled' ? initiativesResult.value : null;
      const logsData = auditLogsResult.status === 'fulfilled' ? auditLogsResult.value : null;
      const ownersData = ownersResult.status === 'fulfilled' ? ownersResult.value : null;
      const profileData = profileResult.status === 'fulfilled' ? profileResult.value : null;

      const profile: GraphUser_V1 | undefined = profileData?.data;
      const nextCurrentUser: CurrentUser | null = profile
        ? {
            displayName: profile.displayName || profile.userPrincipalName || 'User',
            mail: profile.mail || profile.userPrincipalName || '',
            jobTitle: profile.jobTitle || '',
          }
        : null;

      setCurrentUser(nextCurrentUser);

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
      });

      setInitiatives(inits);
      setAuditLogs(logs);
      setOwners(owns);
      setFavorites([]);
    } catch (error) {
      console.error('❌ DataContext: Unexpected error loading from Dataverse:', error);
      setInitiatives([]);
      setAuditLogs([]);
      setOwners([]);
      setCurrentUser(null);
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

        const categoryCode = mapCategoryToCode(data.category) as keyof typeof Sap_initiative_sapssap_category;
        const statusCode = mapStatusToCode(data.status) as keyof typeof Sap_initiative_sapssap_status;
        const urgencyCode = mapUrgencyToCode(data.urgency) as keyof typeof Sap_initiative_sapssap_urgency;

        const record: any = {
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
        };

        // Add owner lookup if provided
        if (data.owner && owners.length > 0) {
          const owner = owners.find((o) => o.name === data.owner);
          if (owner?.id) {
            record['sap_Owner_Name@odata.bind'] = `/sap_portfolioowner_saps(${owner.id})`;
            console.log('✅ Owner lookup resolved:', { name: owner.name, id: owner.id, binding: record['sap_Owner_Name@odata.bind'] });
          } else {
            console.warn('⚠️ Owner found but has no ID:', owner);
          }
        }

        console.log('📤 Sending to Dataverse (full):', JSON.stringify(record));

        const result = await Sap_initiative_sapsService.create(record);

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
        };

        setInitiatives((prev) => [newInitiative, ...prev]);

        console.log('✅ Initiative created successfully');
        return newInitiative;
      } catch (error) {
        console.error('❌ Error creating initiative:', error);
        return null;
      }
    },
    [owners],
  );

  const updateInitiative = useCallback(
    async (id: string, data: Partial<Initiative>) => {
      try {
        console.log('🔄 Updating initiative...', { id });

        if (!id || id.trim() === '') {
          throw new Error('Cannot update initiative: Invalid or empty ID');
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
    [initiatives, owners],
  );

  const deleteInitiative = useCallback(
    async (id: string) => {
      try {
        console.log('🗑️ Deleting initiative...', { id });

        // Delete from Dataverse
        await Sap_initiative_sapsService.delete(id);

        // Delete associated audit logs
        const logsToDelete = auditLogs.filter((l) => l.initiativeId === id);
        for (const log of logsToDelete) {
          await Sap_auditlog_sapsService.delete(log.id);
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
    [initiatives, auditLogs],
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

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

  const refresh = useCallback(async () => {
    console.log('🔄 Refreshing data from Dataverse...');
    await load();
  }, [load]);

  const value = useMemo<DataContextValue>(
    () => ({
      initiatives,
      auditLogs,
      owners,
      currentUser,
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
