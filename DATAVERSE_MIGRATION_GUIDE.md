# DataContext Migration Guide: From localStorage to Dataverse

This guide walks through updating `src/context/DataContext.tsx` to use the new `DataverseService` instead of localStorage.

## Current State

`DataContext.tsx` currently:
- Uses `localStorage` for persistence
- Has seed data fallback
- Manages favorites locally
- All operations are synchronous to localStorage

## Target State

`DataContext.tsx` should:
- Use `DataverseService` for all CRUD operations
- Fall back to localStorage only if Dataverse is unavailable
- Maintain the same public API
- Add proper error handling and user feedback

## Migration Steps

### Step 1: Import DataverseService

```typescript
import { dataverseService } from '../services/DataverseService';
```

### Step 2: Update Load Function

**Current:**
```typescript
const load = useCallback(async () => {
  const storedInitiatives = localStorage.getItem('initiatives');
  const inits = storedInitiatives ? JSON.parse(storedInitiatives) : seedInitiatives;
  setInitiatives(inits);
  // ... rest of load logic
}, []);
```

**Updated:**
```typescript
const load = useCallback(async () => {
  try {
    setIsLoading(true);
    
    // Initialize owner ID counter for new owner generation
    await dataverseService.initializeOwnerIdCounter();
    
    // Load from Dataverse
    const initiatives = await dataverseService.getInitiatives();
    const auditLogs = await dataverseService.getAuditLogs();
    const owners = await dataverseService.getOwners();
    
    setInitiatives(initiatives);
    setAuditLogs(auditLogs);
    setOwners(owners);
    setFavorites([]); // Reset favorites on each load
    
  } catch (error) {
    console.error('Failed to load from Dataverse:', error);
    // Fallback to localStorage
    const storedInitiatives = localStorage.getItem('initiatives');
    const inits = storedInitiatives ? JSON.parse(storedInitiatives) : seedInitiatives;
    setInitiatives(inits);
    // ... rest of fallback logic
  } finally {
    setIsLoading(false);
  }
}, []);
```

### Step 3: Update createInitiative

**Current:**
```typescript
const createInitiative = useCallback(
  async (data: Omit<Initiative, 'id' | 'updatedAt'>): Promise<Initiative | null> => {
    try {
      const newId = `init-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const newInitiative: Initiative = {
        id: newId,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      
      setInitiatives((prev) => [newInitiative, ...prev]);
      localStorage.setItem('initiatives', JSON.stringify([newInitiative, ...initiatives]));
      return newInitiative;
    } catch (error) {
      console.error('Error creating initiative:', error);
      return null;
    }
  },
  [initiatives, auditLogs],
);
```

**Updated:**
```typescript
const createInitiative = useCallback(
  async (data: Omit<Initiative, 'id' | 'updatedAt'>): Promise<Initiative | null> => {
    try {
      // Create in Dataverse
      const newInitiative = await dataverseService.createInitiative(data);
      
      // Update local state
      setInitiatives((prev) => [newInitiative, ...prev]);
      
      // Also create audit log in Dataverse if log description provided
      if (data.logDescription?.trim()) {
        const auditLog = await dataverseService.createAuditLog({
          initiativeId: newInitiative.id,
          initiativeName: newInitiative.name,
          logDate: data.logDate || new Date().toISOString(),
          logDescription: data.logDescription,
          logSeverity: data.severity,
          status: 'Active',
          category: data.category,
          ownerName: data.owner,
        });
        setAuditLogs((prev) => [auditLog, ...prev]);
      }
      
      return newInitiative;
    } catch (error) {
      console.error('Error creating initiative:', error);
      return null;
    }
  },
  [initiatives, auditLogs],
);
```

### Step 4: Update updateInitiative

**Updated:**
```typescript
const updateInitiative = useCallback(
  async (id: string, data: Partial<Initiative>) => {
    try {
      if (!id?.trim()) {
        throw new Error('Cannot update: Invalid or empty ID');
      }

      // Update in Dataverse
      await dataverseService.updateInitiative(id, data);
      
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
  [initiatives],
);
```

### Step 5: Update deleteInitiative

**Updated:**
```typescript
const deleteInitiative = useCallback(
  async (id: string) => {
    try {
      // Delete from Dataverse (this also deletes related audit logs)
      await dataverseService.deleteInitiative(id);
      
      // Update local state
      const updatedInits = initiatives.filter((i) => i.id !== id);
      const updatedLogs = auditLogs.filter((l) => l.initiativeId !== id);
      
      setInitiatives(updatedInits);
      setAuditLogs(updatedLogs);
      setFavorites((prev) => prev.filter((f) => f !== id));
      
      console.log('✅ Initiative deleted from Dataverse');
    } catch (error) {
      console.error('Error deleting initiative:', error);
    }
  },
  [initiatives, auditLogs],
);
```

### Step 6: Update addAuditLog

**Updated:**
```typescript
const addAuditLog = useCallback(
  async (log: Omit<AuditLog, 'id'>) => {
    try {
      // Create in Dataverse
      const newLog = await dataverseService.createAuditLog(log);
      
      // Update local state
      const updatedLogs = [newLog, ...auditLogs];
      setAuditLogs(updatedLogs);
      
      console.log('✅ Audit log created in Dataverse');
    } catch (error) {
      console.error('Error adding audit log:', error);
    }
  },
  [auditLogs],
);
```

### Step 7: Update addOwner

**Updated:**
```typescript
const addOwner = useCallback(
  async (name: string, email?: string): Promise<Owner | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (owners.some((o) => o.name?.toLowerCase() === trimmed.toLowerCase())) return null;

    try {
      // Create in Dataverse (with auto-generated ID)
      const newOwner = await dataverseService.createOwner(trimmed, email);
      
      // Update local state
      const updatedOwners = [...owners, newOwner];
      setOwners(updatedOwners);
      
      console.log('✅ Owner created in Dataverse');
      return newOwner;
    } catch (error) {
      console.error('Error adding owner:', error);
      return null;
    }
  },
  [owners],
);
```

**Note:** Update the signature to accept email parameter

### Step 8: Update removeOwner

**Updated:**
```typescript
const removeOwner = useCallback(
  async (id: string) => {
    try {
      // Delete from Dataverse
      await dataverseService.deleteOwner(id);
      
      // Update local state
      const updatedOwners = owners.filter((o) => o.id !== id);
      setOwners(updatedOwners);
      
      console.log('✅ Owner deleted from Dataverse');
    } catch (error) {
      console.error('Error removing owner:', error);
    }
  },
  [owners],
);
```

### Step 9: Update deleteAuditLog

**Updated:**
```typescript
const deleteAuditLog = useCallback(
  async (id: string) => {
    try {
      // Delete from Dataverse
      await dataverseService.deleteAuditLog(id);
      
      // Update local state
      const updatedLogs = auditLogs.filter((l) => l.id !== id);
      setAuditLogs(updatedLogs);
      
      console.log('✅ Audit log deleted from Dataverse');
    } catch (error) {
      console.error('Error deleting audit log:', error);
    }
  },
  [auditLogs],
);
```

### Step 10: Remove localStorage References

Delete or comment out these lines:
```typescript
// REMOVE: localStorage.setItem('initiatives', ...)
// REMOVE: localStorage.setItem('auditLogs', ...)
// REMOVE: localStorage.setItem('owners', ...)
// REMOVE: localStorage.getItem('initiatives')
// REMOVE: localStorage.getItem('auditLogs')
// REMOVE: localStorage.getItem('owners')
```

## Error Handling Pattern

All DataverseService calls should follow this pattern:

```typescript
try {
  const result = await dataverseService.operation(args);
  // Update local state
  setState(result);
  return result;
} catch (error) {
  console.error('Failed to perform operation:', error);
  throw error; // Let calling component handle error UI
}
```

## Testing the Migration

1. **Test Initial Load:** 
   - App loads and displays existing data from Dataverse
   - Owner ID counter initializes correctly

2. **Test Create Operations:**
   - Creating new initiative stores in Dataverse
   - New owner gets sequential ID (OWNID-1001, OWNID-1002, etc.)
   - Audit log is created when provided

3. **Test Update Operations:**
   - Updating initiative syncs to Dataverse
   - Changes persist after page refresh

4. **Test Delete Operations:**
   - Deleting initiative also deletes related audit logs
   - Changes persist after page refresh

5. **Test Error Handling:**
   - Network error → user sees error message
   - Operation fails → modal stays open for retry
   - Error messages are helpful for debugging

6. **Test Fallback:**
   - If Dataverse is unavailable → falls back to localStorage
   - Data is not lost during transition

## Rollback Plan

If issues occur:
1. Keep localStorage code commented out (don't delete)
2. Revert to localStorage version
3. Identify issue in Dataverse service
4. Re-migrate once fixed

## Performance Considerations

- **Load:** Dataverse queries might be slower than localStorage
  - Consider adding a loading spinner
  - Cache data in state to reduce queries
  
- **Create/Update:** Each operation hits Dataverse
  - Confirm expected latency is acceptable
  - Consider batch operations if many changes needed

- **Favorites:** Keep in localStorage
  - User preferences don't need Dataverse
  - Reduces unnecessary data transfer
