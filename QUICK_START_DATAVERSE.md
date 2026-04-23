# Quick Start: Dataverse Integration

**Status:** ✅ Ready to integrate into app

## What's Been Created

### Core Services (Production-Ready)
1. **DataverseService** (`src/services/DataverseService.ts`)
   - All CRUD operations for Initiatives, Owners, Audit Logs
   - Owner ID generation (OWNID-1001, OWNID-1002, ...)
   - Model mapping between app and Dataverse types

2. **DataverseConnection** (`src/services/DataverseConnection.ts`)
   - Connection lifecycle management
   - Health checks (every 5 minutes)
   - Status monitoring

3. **DataverseErrorHandler** (`src/services/DataverseErrorHandler.ts`)
   - Error parsing and handling
   - Retry logic with exponential backoff
   - User-friendly error messages

4. **React Hooks** (`src/hooks/useDataverseConnection.ts`)
   - `useInitializeDataverse()` - Initialize on app startup
   - `useDataverseConnection()` - Monitor connection status

## 5-Step Integration

### Step 1: Initialize in App.tsx (2 minutes)

```typescript
import { useInitializeDataverse } from './hooks/useDataverseConnection';

function App() {
  const { initialized, initError } = useInitializeDataverse();

  if (initError) {
    return <div>Connection Error: {initError}</div>;
  }

  if (!initialized) {
    return <div>Initializing Dataverse...</div>;
  }

  return (
    <DataProvider>
      {/* Rest of app */}
    </DataProvider>
  );
}
```

### Step 2: Update DataContext (30 minutes)

Replace localStorage calls with DataverseService:

```typescript
import { dataverseService } from '../services/DataverseService';

const load = useCallback(async () => {
  try {
    const [initiatives, auditLogs, owners] = await Promise.all([
      dataverseService.getInitiatives(),
      dataverseService.getAuditLogs(),
      dataverseService.getOwners(),
    ]);
    
    setInitiatives(initiatives);
    setAuditLogs(auditLogs);
    setOwners(owners);
  } catch (error) {
    console.error('Failed to load from Dataverse:', error);
    // Fallback to localStorage if needed
  }
}, []);

const createInitiative = useCallback(
  async (data) => {
    return await dataverseService.createInitiative(data);
  },
  [],
);

// Similarly update: updateInitiative, deleteInitiative, 
// addAuditLog, deleteAuditLog, addOwner, removeOwner
```

### Step 3: Add Owner Email (15 minutes)

Update Owner interface in `src/types/index.ts`:
```typescript
interface Owner {
  id: string
  name: string
  email?: string  // Add this
}
```

Update `ManageOwnersPanel.tsx` to capture email during creation.

### Step 4: Handle Errors (10 minutes)

Use error handler in components:
```typescript
import { DataverseErrorHandler } from '../services/DataverseErrorHandler';

try {
  await dataverseService.createInitiative(data);
  showToast('✅ Created successfully', 'success');
} catch (error) {
  const msg = DataverseErrorHandler.getUserMessage(error);
  showToast(`❌ ${msg}`, 'error');
}
```

### Step 5: Test (15 minutes)

1. Run dev server: `npm run dev`
2. Check browser console for initialization log
3. Create owner → verify ID format (OWNID-1001)
4. Create initiative → verify owner lookup works
5. Refresh page → verify data persists

## File Reference

```
src/
├── services/
│   ├── DataverseService.ts         (CRUD operations)
│   ├── DataverseConnection.ts      (Connection management)
│   └── DataverseErrorHandler.ts    (Error handling)
├── hooks/
│   └── useDataverseConnection.ts   (React hooks)
└── context/
    └── DataContext.tsx             (To be updated)
```

## Common Patterns

### Create with Error Handling
```typescript
try {
  const owner = await DataverseErrorHandler.retry(
    () => dataverseService.createOwner(name),
    3  // max retries
  );
  console.log('✅ Created:', owner);
} catch (error) {
  console.error('❌ Failed:', error);
}
```

### Check Connection Before Operation
```typescript
const { isConnected } = useDataverseConnection();

if (!isConnected) {
  showToast('Dataverse is disconnected');
  return;
}

await dataverseService.deleteInitiative(id);
```

### Handle Dataverse Errors
```typescript
try {
  await operation();
} catch (error) {
  const dvError = DataverseErrorHandler.parseError(error);
  
  if (DataverseErrorHandler.isRecoverable(dvError)) {
    // User can retry
  } else {
    // Show error message
  }
}
```

## Owner ID Generation

Automatic, happens in `createOwner()`:
- First owner: OWNID-1001
- Second owner: OWNID-1002
- And so on...

No manual ID assignment needed!

## Data Persistence

All operations sync to Dataverse:
- Create → Stored in Dataverse
- Update → Updated in Dataverse  
- Delete → Deleted from Dataverse
- Page refresh → Reloads from Dataverse

## Health Checks

Automatic every 5 minutes:
- Tests all three services
- Updates connection status
- Logs warnings if disconnected

Manual check available:
```typescript
const { forceCheck } = useDataverseConnection();
await forceCheck();
```

## What's Left

✅ DataverseService created  
✅ DataverseConnection created  
✅ Error handler created  
✅ React hooks created  
✅ Documentation complete  

⏳ Integrate into App.tsx (5 min)  
⏳ Update DataContext (30 min)  
⏳ Test with dev server (15 min)  

**Total time: ~1 hour**

## Troubleshooting

**"DataverseService is not working"**
- Check initialization completed in App
- Verify Dataverse connection is active
- Check browser console for errors

**"Owner IDs not sequential"**
- Ensure DataContext initializes dataverseService
- Check that initializeOwnerIdCounter() was called
- Verify owner fetch returns existing owners

**"Data not persisting"**
- Check Dataverse service calls are awaited
- Verify no errors in browser console
- Test connection manually

## Next Steps

1. Read `DATAVERSE_CONNECTION_SETUP.md` for detailed integration
2. Read `DATAVERSE_MIGRATION_GUIDE.md` for code examples
3. Implement the 5 steps above
4. Run tests in dev server
5. Deploy when ready!

---

**Need help?** Check the detailed guides:
- `DATAVERSE_IMPLEMENTATION.md` - Architecture & schemas
- `DATAVERSE_CONNECTION_SETUP.md` - Integration guide
- `DATAVERSE_MIGRATION_GUIDE.md` - Code examples
- `DATAVERSE_SETUP_SUMMARY.md` - Overview
