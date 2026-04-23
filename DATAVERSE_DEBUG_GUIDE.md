# Dataverse Connection - Debug Guide

**Status:** 🔍 **Debugging Dataverse Service Calls**  
**Issue:** Services returning errors instead of data  
**Date:** 2026-04-20

---

## 🔴 Current Issue

Services are failing to fetch data from Dataverse. Error messages show "Failed to fetch initiatives" with generic error objects.

### Error Pattern
```
❌ [DataverseService::getInitiatives] Failed to fetch initiatives 
Object {
  code: "UNKNOWN_ERROR"
  statusCode: undefined
}
```

---

## 📋 Debugging Checklist

### Step 1: Check Browser Console
Open DevTools (F12) and look for messages in this order:

```
✅ ALL DATAVERSE SERVICES CONNECTED         ← Should see this
✅ Dataverse connection initialized        ← Should see this
📍 DataverseService::getInitiatives - Calling service...
📍 DataverseService::getInitiatives - Result: {...}
```

**What to look for:**
- Is "Dataverse connection initialized" message present?
- What does the Result object contain?
- Does it have a `value` property?

---

### Step 2: Check Dataverse Configuration

**File:** `.power/schemas/appschemas/dataSourcesInfo.ts`

```typescript
export const dataSourcesInfo = {
  "sap_initiative_saps": {
    "tableId": "",           // ⚠️ Empty - might be issue
    "version": "",           // ⚠️ Empty - might be issue
    "primaryKey": "sap_initiative_sapid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  // ... similar for other tables
};
```

**Issue:** `tableId` and `version` are empty strings. This might cause service lookup to fail.

---

### Step 3: Verify Dataverse Environment

Check that:
1. ✅ Dataverse environment is accessible
2. ✅ Tables exist in Dataverse:
   - `sap_initiative_saps`
   - `sap_portfolioowner_saps`
   - `sap_auditlog_saps`
3. ✅ Tables have correct columns matching schema
4. ✅ User has permission to read tables
5. ✅ Environment URL is correct in Power Platform config

---

### Step 4: Check Generated Services

**Files:** `src/generated/services/*.ts`

These are auto-generated and should NOT be edited. They use:
```typescript
const client = getClient(dataSourcesInfo);
```

**If these are empty or incomplete:**
- Regenerate using Power Platform CLI
- Or check if generation was successful

---

## 🔧 Solutions to Try

### Solution 1: Update dataSourcesInfo.ts

The `tableId` and `version` fields might need to be populated:

**Get Table IDs from Dataverse:**
1. Go to Power Automate or Power Apps
2. Open Dataverse connection
3. Look for table metadata
4. Find the actual table IDs

**Then update:**
```typescript
export const dataSourcesInfo = {
  "sap_initiative_saps": {
    "tableId": "{actual-guid-here}",     // Replace with real GUID
    "version": "1.0",                     // Or actual version
    "primaryKey": "sap_initiative_sapid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  // ... do for all tables
};
```

---

### Solution 2: Regenerate Services

If dataSourcesInfo was incorrect, regenerate the services:

```bash
# Using Power Platform CLI
pac auth create --url <your-dataverse-url>
pac auth list
pac auth select --index <selected-index>

# Regenerate services
pac code generate --out src/generated
```

Then rebuild:
```bash
npm run build
```

---

### Solution 3: Check Dataverse Connection

Verify the Dataverse connection in your Power Platform environment:

1. Go to Power Automate
2. Click "Connections"
3. Find "Dataverse" connection
4. Test connection
5. Verify environment is online

---

### Solution 4: Check Table Permissions

Verify your user account has permissions:

1. Go to Dataverse admin center
2. Check table permissions for:
   - sap_initiative_saps
   - sap_portfolioowner_saps
   - sap_auditlog_saps
3. Ensure "Read" permission is granted
4. Ensure user's security role includes these privileges

---

## 🐛 Detailed Debugging Steps

### In Browser Console, Run:

```javascript
// Check if services are loaded
console.log(window);
// Look for: Sap_initiative_sapsService, etc.

// Check dataSourcesInfo
import { dataSourcesInfo } from './src/.power/schemas/appschemas/dataSourcesInfo';
console.log('dataSourcesInfo:', dataSourcesInfo);

// Try calling service directly
import { Sap_portfolioowner_sapsService } from './src/generated/services/Sap_portfolioowner_sapsService';
const result = await Sap_portfolioowner_sapsService.getAll();
console.log('Service result:', result);

// Check for error details
if (result.error) {
  console.log('Error details:', result.error);
}
```

---

## 📊 What Should Happen

### On Success
```
✅ Connection initialized
📍 getInitiatives calling...
📍 getInitiatives Result: {
  value: [
    {
      sap_initiative_sapid: "...",
      sap_initiativename: "...",
      ...
    }
  ]
}
✅ Data loaded
```

### On Failure (Current)
```
❌ Failed to fetch initiatives
Object {
  code: "UNKNOWN_ERROR",
  statusCode: undefined
}
```

---

## 🔍 Possible Root Causes

1. **dataSourcesInfo is incomplete**
   - tableId and version are empty
   - Solution: Populate with actual values from Dataverse

2. **Services not regenerated after schema changes**
   - Generated services don't match Dataverse schema
   - Solution: Regenerate using Power Platform CLI

3. **Dataverse environment is offline**
   - Environment not accessible
   - Solution: Check environment status

4. **User doesn't have permissions**
   - User account missing read permissions on tables
   - Solution: Grant permissions in Dataverse admin

5. **Incorrect table names**
   - Table names in code don't match Dataverse
   - Solution: Verify exact table names

6. **Network/authentication issue**
   - Client can't authenticate with Dataverse
   - Solution: Check auth config and network connectivity

---

## 📝 Console Output Reference

### Good Signs
```
✓ All Dataverse services connected
✓ Owner ID counter initialized
✓ Data loaded from Dataverse
📍 DataverseService::getOwners - Result: {value: [...]}
```

### Bad Signs
```
❌ Error loading from Dataverse
⚠️ Result is null/undefined
⚠️ Invalid result structure
❌ Exception: ...
```

---

## 🛠️ Next Steps

1. **Open DevTools** (F12) and check console
2. **Look for** the detailed result from service calls
3. **Verify** dataSourcesInfo has correct tableIds
4. **Check** Dataverse tables exist and have data
5. **Regenerate** services if schema changed
6. **Rebuild** with `npm run build`
7. **Restart** dev server with `npm run dev`

---

## 📞 When Stuck

1. **Check console logs** - Look at what Result object contains
2. **Verify dataSourcesInfo.ts** - Make sure tableIds are populated
3. **Test Dataverse connection** - Try accessing in Power Automate
4. **Regenerate services** - Use Power Platform CLI if available
5. **Check permissions** - Ensure user can read tables

---

## Current App Behavior

With the error handling improvements:
- ✅ Services return empty arrays instead of throwing
- ✅ App shows empty lists instead of crashing
- ✅ Detailed console logs show what's happening
- ✅ Can still create/edit data even if read fails
- ⚠️ But no existing data will load

**This is temporary** - once Dataverse connection is fixed, data will load automatically.

---

**Last Updated:** 2026-04-20  
**Status:** Debugging in progress  
**Key Issue:** Service calls failing - need to verify Dataverse config
