# Dataverse Field Mapping - SAP Portal

## Overview
This document maps all form fields in the application to their corresponding Dataverse table columns.

---

## Initiative Form Fields → Sap_initiative_saps Table

| Form Field | UI Label | Dataverse Column | Type | Required | Notes |
|---|---|---|---|---|---|
| `name` | Initiative Name | `sap_initiativename` | String | ✅ Yes | 
| `category` | Category | `sap_category` | Enum (Sap_initiative_sapssap_category) | ✅ Yes | Values: AIs, Enhancements, Projects, Licenses, Services, Securities, ProductReplacements, Infrastructure, Others |
| `demandNumber` | Initiative ID / Demand Number | `sap_demandnumber` | String | ❌ No | 
| `description` | Description | `sap_description` | Text | ❌ No | 
| `budget` | Budget | `sap_budgetaed` | String | ❌ No | 
| `owner` | Principal Owner | `sap_Owner_Name@odata.bind` | Lookup (Sap_portfolioowner_saps) | ❌ No | 
| `implementer` | Implementer | `sap_implementer` | String | ❌ No | 
| `status` | Status | `sap_status` | Enum (Sap_initiative_sapssap_status) | ✅ Yes | Values: Active, Pending, Delayed, Completed |
| `urgency` | Urgency | `sap_urgency` | Enum (Sap_initiative_sapssap_urgency) | ❌ No | Values: Low, Medium, High |
| `currentProcess` | Current Process (As-Is) | `sap_currentprocessasis` | Text | ❌ No | 
| `enhancedProcess` | Enhanced / Proposed Process (To-Be) | `sap_enhancedprocesstobe` | Text | ❌ No | 
| `comments` | Comments | `sap_comments` | Text | ❌ No | 
| — | — | `ownerid` | String (System) | ✅ Yes | Set automatically by Dataverse |
| — | — | `statecode` | Enum (Sap_initiative_sapsstatecode) | ✅ Yes | Values: 0=Active, 1=Inactive |
| — | — | `statuscode` | Enum (Sap_initiative_sapsstatuscode) | ✅ Yes | Values: 1=Active, 2=Inactive |

---

## Audit Log Fields → Sap_auditlog_saps Table

| Form Field | UI Label | Dataverse Column | Type | Required | Context |
|---|---|---|---|---|---|
| `logDate` | Log Date | `sap_log_date` | DateTime | ❌ No | Only shown in "Update Log Entry" section when editing |
| `logDescription` | Log Description | `sap_log_description` | Text | ❌ No | Only shown in "Update Log Entry" section when editing |
| `severity` | Severity | `sap_log_severity` | Enum (Sap_auditlog_sapssap_log_severity) | ❌ No | Values: 100000000=High, 100000001=Low, 100000002=Medium |
| — | — | `sap_auditlog_sapid` | String | ✅ Yes | Primary ID (auto-generated) |
| — | — | `sap_eventname` | String | ✅ Yes | Should capture what action occurred (Create, Update, Delete, etc.) |
| — | — | `sap_InitiativeName@odata.bind` | Lookup (Sap_initiative_saps) | ❌ No | Links audit log to initiative |
| — | — | `ownerid` | String (System) | ✅ Yes | Set automatically by Dataverse |
| — | — | `statecode` | Enum (Sap_auditlog_sapsstatecode) | ✅ Yes | Values: 0=Active, 1=Inactive |
| — | — | `statuscode` | Enum (Sap_auditlog_sapsstatuscode) | ✅ Yes | Values: 1=Active, 2=Inactive |

---

## Portfolio Owner Fields → Sap_portfolioowner_saps Table

| Form Field | UI Label | Dataverse Column | Type | Required | Notes |
|---|---|---|---|---|---|
| `name` | Owner Name | `sap_ownername` | String | ✅ Yes | Displayed in Principal Owner dropdown |
| `email` | Owner Email | `sap_email` | Email | ❌ No | 
| `ownerId` | Owner ID | `sap_owner_id` | String | ❌ No | 
| — | — | `sap_portfolioowner_sapid` | String | ✅ Yes | Primary ID (auto-generated) |
| — | — | `ownerid` | String (System) | ✅ Yes | Set automatically by Dataverse |
| — | — | `statecode` | Enum (Sap_portfolioowner_sapsstatecode) | ✅ Yes | Values: 0=Active, 1=Inactive |
| — | — | `statuscode` | Enum (Sap_portfolioowner_sapsstatuscode) | ✅ Yes | Values: 1=Active, 2=Inactive |

---

## Filtering & Display Fields

### Initiative List View (Initiatives.tsx & AllInitiatives.tsx)
| Display Field | Mapped From | Source |
|---|---|---|
| Initiative Name | `initiative.name` | Sap_initiative_saps.sap_initiativename |
| Category | `initiative.category` | Sap_initiative_saps.sap_category |
| Owner | `initiative.owner` | Sap_initiative_saps.sap_Owner_Name |
| Status | `initiative.status` | Sap_initiative_saps.sap_status |
| Latest Log Date | `initiative.logDate` | Sap_auditlog_saps.sap_log_date |
| Demand Number | `initiative.demandNumber` | Sap_initiative_saps.sap_demandnumber |

### Filter Criteria
| Filter Name | Dataverse Column | Enum Options |
|---|---|---|
| Category Filter | `sap_category` | AIs, Enhancements, Projects, Licenses, Services, Securities, ProductReplacements, Infrastructure, Others |
| Owner Filter | `sap_Owner_Name` | (Dynamic from portfolio owners) |
| Status Filter | `sap_status` | Active, Pending, Delayed, Completed |
| Log Date Filter | `sap_log_date` | (Date range) |

---

## Enum Value Mappings

### Initiative Status (sap_status)
- `Active` → 100000000
- `Pending` → 100000001
- `Delayed` → 100000003
- `Completed` → 100000002

### Initiative Category (sap_category)
- `AIs` → 100000000
- `Enhancements` → 100000001
- `Projects` → 100000002
- `Licenses` → 100000003
- `Services` → 100000004
- `Securities` → 100000005
- `ProductReplacements` → 100000006
- `Infrastructure` → 100000007
- `Others` → 100000008

### Initiative Urgency (sap_urgency)
- `Low` → 100000000
- `Medium` → 100000001
- `High` → 100000002

### Audit Log Severity (sap_log_severity)
- `High` → 100000000
- `Low` → 100000001
- `Medium` → 100000002

### State Code (statecode) - All tables
- `Active` → 0
- `Inactive` → 1

### Status Code (statuscode) - All tables
- `Active` → 1
- `Inactive` → 2

---

## Data Flow Architecture

### 1. Portfolio Owner Management Flow
```
User: Click "Owners" button → ManageOwnersPanel
    ↓
Add/Patch Owner in Sap_portfolioowner_saps table
    └→ sap_ownername, sap_email, sap_owner_id
```

### 2. Initiative Creation Flow
```
User: Click "Create Initiative" → InitiativeForm
    ↓
Fill form fields:
    ├ name, category, description, budget, demandNumber
    ├ status, urgency, implementer
    ├ currentProcess, enhancedProcess, comments
    └ owner (LOOKUP to Sap_portfolioowner_saps)
    ↓
Click "Create Initiative"
    ↓
createInitiative() → Sap_initiative_sapsService.create()
    ↓
Store in Sap_initiative_saps table
    └→ ⚠️ NO AUDIT LOG CREATED HERE
```

### 3. Initiative Update + Audit Log Creation Flow
```
User: Click "Edit" on Initiative → InitiativeForm (EDIT mode)
    ↓
"Update Log Entry" section APPEARS with:
    ├ Log Date (sap_log_date)
    ├ Severity (sap_log_severity)
    └ Log Description (sap_log_description)
    ↓
Fill update form + log entry details
    ↓
Click "Update Initiative"
    ↓
updateInitiative() performs:
    ├→ UPDATE Sap_initiative_saps (initiative fields)
    └→ CREATE Sap_auditlog_saps (new audit log record)
        ├ sap_log_date
        ├ sap_log_description
        ├ sap_log_severity
        ├ sap_eventname = "Updated"
        └ sap_InitiativeName@odata.bind → Links to initiative
```

### 4. Audit Log Display Flow
```
Initiative List Screen
    ↓
For each initiative, display "Latest Log Date"
    ├→ Query Sap_auditlog_saps filtered by:
    │   └ sap_InitiativeName = current initiative ID
    └→ Show most recent sap_log_date

AuditLogs Screen (if exists)
    ↓
Display all audit logs grouped by initiative
    ├ Show: initiative name, log date, severity, description
    └ Filter by initiative lookup
```

### 5. Table Relationships
```
Sap_portfolioowner_saps (Master)
    ↑ (Lookup)
    │
Sap_initiative_saps ←──────────── sap_Owner_Name@odata.bind
    ↑ (Lookup from audit logs)
    │
Sap_auditlog_saps ─────────────→ sap_InitiativeName@odata.bind
```

---

## Key Observations

### ✅ What's Correctly Mapped
- All required fields from InitiativeForm have corresponding Dataverse columns
- Owner lookup correctly references Sap_portfolioowner_saps
- Audit logs are SEPARATE records linked via sap_InitiativeName@odata.bind
- Audit logs only created on UPDATE, not CREATE
- Status and State codes follow Dataverse conventions
- Enum values are properly defined in generated models

### ✅ Correct Business Logic
1. **Portfolio Owners** - Managed separately, cached in memory, referenced as lookup
2. **Initiative Creation** - No audit trail generated
3. **Initiative Updates** - Audit log entry created with update details
4. **Log Retrieval** - Audit logs filtered by initiative lookup to show history per initiative
5. **Owner Assignment** - Users select from managed owners list via lookup field

### ⚠️ Implementation Considerations
1. **Enum Conversion** - Form uses string values (e.g., "Active") but Dataverse expects numeric codes (e.g., 100000000) - need converters
2. **Date Format** - Ensure ISO date strings are properly converted to Dataverse DateTime
3. **sap_eventname** - Should be set to "Updated" for audit log entries (consider "Created" if logs added on creation in future)
4. **Owner Binding** - The sap_Owner_Name@odata.bind must correctly format the lookup reference

---

## Dataverse Column Details Reference

### Required System Fields (Auto-set by Dataverse)
All tables require:
- `ownerid` - Set by Dataverse based on user context
- `OwningBusinessUnit@odata.bind` - Optional, set during create
- `statecode` - Lifecycle state (0=Active, 1=Inactive)
- `statuscode` - Operational status (1=Active, 2=Inactive)

### Audit Fields (Auto-set by Dataverse)
- `createdby` / `createdbyname`
- `createdon`
- `modifiedby` / `modifiedbyname`
- `modifiedon`
- `versionnumber`

---

## Implementation Requirements

### Enum Conversion Helper
Need to convert form string values to Dataverse numeric codes:
```typescript
// Example mapping function needed
const statusToCode = {
  'Active': 100000000,
  'Pending': 100000001,
  'Delayed': 100000003,
  'Completed': 100000002
}

const categoryToCode = {
  'AIs': 100000000,
  'Enhancements': 100000001,
  'Projects': 100000002,
  'Licenses': 100000003,
  'Services': 100000004,
  'Securities': 100000005,
  'ProductReplacements': 100000006,
  'Infrastructure': 100000007,
  'Others': 100000008
}

const severityToCode = {
  'High': 100000000,
  'Low': 100000001,
  'Medium': 100000002
}
```

### Service Layer Updates
1. **Sap_initiative_sapsService.create()**
   - Input: Initiative form values (with string enums)
   - Output: Create record in Sap_initiative_saps
   - Required conversions:
     - sap_status: string → numeric code
     - sap_category: string → numeric code
     - sap_urgency: string → numeric code
     - owner: owner name → sap_Owner_Name@odata.bind format

2. **Sap_initiative_sapsService.update()**
   - Input: Initiative updates + audit log data
   - Process:
     - a) UPDATE Sap_initiative_saps with changed fields
     - b) CREATE new Sap_auditlog_saps record with:
       - sap_log_date (ISO string → DateTime)
       - sap_log_description
       - sap_log_severity (numeric code)
       - sap_eventname = "Updated"
       - sap_InitiativeName@odata.bind = initiative ID
       - ownerid (current user)

3. **Sap_auditlog_sapsService.getAll()**
   - Query with filter: sap_InitiativeName equals [initiative ID]
   - Sort by sap_log_date descending
   - Return latest log date for display

### Component Updates

**InitiativeForm.tsx:**
- Keep audit log fields visible ONLY in edit mode (already done ✅)
- Add enum conversion before submission
- Validate owner selection matches available portfolio owners

**Initiatives.tsx & AllInitiatives.tsx:**
- When displaying logDate: fetch latest from audit logs via filter
- Handle case where initiative has no audit logs (show empty state)
- Format dates consistently using formatDisplayDate()

**ManageOwnersPanel.tsx:**
- PATCH operations to Sap_portfolioowner_saps
- Maintain local cache of owners for lookups
- Refresh after add/edit/delete

### Data Binding Examples

**Create Initiative:**
```typescript
{
  sap_initiativename: "Project Name",
  sap_category: 100000002,  // Projects numeric code
  sap_status: 100000000,    // Active numeric code
  sap_urgency: 100000001,   // Medium numeric code
  sap_Owner_Name@odata.bind: "/sap_portfolioowner_saps(owner-record-id)",
  sap_demandnumber: "DEM-900",
  sap_description: "...",
  sap_budgetaed: "1200000",
  // ... other fields
  ownerid: "system-user-id",  // Auto-set by Dataverse
  statecode: 0,               // Active
  statuscode: 1               // Active
}
```

**Create Audit Log (on update):**
```typescript
{
  sap_log_date: new Date().toISOString(),
  sap_log_description: "User update notes",
  sap_log_severity: 100000000,  // High numeric code
  sap_eventname: "Updated",
  sap_InitiativeName@odata.bind: "/sap_initiative_saps(initiative-id)",
  ownerid: "current-user-id",   // Auto-set by Dataverse
  statecode: 0,                 // Active
  statuscode: 1                 // Active
}
```

---

## Migration Checklist
- [ ] Create enum conversion utilities (string ↔ numeric codes)
- [ ] Update Sap_initiative_sapsService.create() to include enum conversions
- [ ] Update Sap_initiative_sapsService.update() to:
  - [ ] Update initiative record
  - [ ] Create audit log record with sap_InitiativeName lookup
  - [ ] Include sap_eventname = "Updated"
- [ ] Update Sap_auditlog_sapsService.getAll() to accept initiative filter
- [ ] Update list screens to fetch latest log date from audit logs
- [ ] Test owner lookup binding format: `/sap_portfolioowner_saps(id)`
- [ ] Test enum conversions match Dataverse instance values
- [ ] Handle null/empty cases (initiatives with no logs, unassigned owners)
- [ ] Verify date formatting (ISO strings vs Dataverse DateTime)
