# Dataverse Schema - Quick Reference Guide

## 📋 3 Tables, 1 Purpose

```
┌─────────────────────────────────────────────────────────┐
│           Sap_portfolioowner_saps (Owners)              │
│  • sap_ownername (owner name)                           │
│  • sap_email (email)                                    │
│  • sap_owner_id (generated ID like OWNID-1001)          │
└──────────────────────┬──────────────────────────────────┘
                       │ ↓ Referenced via lookup
┌──────────────────────────────────────────────────────────┐
│         Sap_initiative_saps (Projects)                   │
│  • sap_initiativename (project name)                     │
│  • sap_category (AIs, Projects, etc.)                    │
│  • sap_status (Active, Pending, etc.)                    │
│  • sap_urgency (High, Medium, Low)                       │
│  • sap_Owner_Name@odata.bind → Owner lookup              │
│  • sap_budgetaed, sap_demandnumber, etc.                 │
└──────────────────────┬──────────────────────────────────┘
                       │ ↓ Referenced via lookup
┌──────────────────────────────────────────────────────────┐
│        Sap_auditlog_saps (Update History)                │
│  • sap_log_date (when updated)                           │
│  • sap_log_description (what changed)                    │
│  • sap_log_severity (High, Medium, Low)                  │
│  • sap_eventname = "Updated"                             │
│  • sap_InitiativeName@odata.bind → Initiative lookup     │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow

### **CREATE Initiative**
```
User fills form (NO audit fields shown)
    ↓
Submit → createInitiative()
    ↓
CREATES: Sap_initiative_saps record
DOES NOT CREATE: Audit log
```

### **UPDATE Initiative**
```
User fills form (audit fields shown in edit mode)
    ↓
Submit → updateInitiative()
    ↓
UPDATES: Sap_initiative_saps record
CREATES: Sap_auditlog_saps record (if logDescription provided)
```

---

## 🔢 Enum Conversion Codes

### Status
```
"Active" ↔ 100000000
"Pending" ↔ 100000001
"Delayed" ↔ 100000003
"Completed" ↔ 100000002
```

### Category
```
"AIs" ↔ 100000000
"Enhancements" ↔ 100000001
"Projects" ↔ 100000002
"Licenses" ↔ 100000003
"Services" ↔ 100000004
"Securities" ↔ 100000005
"Product Replacements" ↔ 100000006
"Infrastructure" ↔ 100000007
"Others" ↔ 100000008
```

### Urgency / Severity
```
"High" ↔ 100000000
"Medium" ↔ 100000002
"Low" ↔ 100000001
```

---

## 🔗 OData Binding Format

When linking records, use this format:

```typescript
// Owner lookup in initiative
'sap_Owner_Name@odata.bind': `/sap_portfolioowner_saps(${owner.id})`

// Initiative lookup in audit log
'sap_InitiativeName@odata.bind': `/sap_initiative_saps(${initiative.id})`
```

---

## 📝 Form Behavior

| Section | CREATE | EDIT |
|---------|--------|------|
| Initiative Fields | ✅ Visible | ✅ Visible |
| Audit Log Fields | ❌ Hidden | ✅ Visible |
| Owner Dropdown | ✅ Available | ✅ Available |

---

## 🎯 Key Implementation Points

1. **No Audit Logs on Create** ← This is intentional per schema
2. **Audit Logs on Update** ← Only if user fills log description
3. **Owner Binding** ← Automatically resolved from owner name
4. **Enum Conversion** ← Automatic in DataverseService methods
5. **Lookup Binding** ← Automatic format `/table(id)`

---

## 💾 Data Context Functions

```typescript
// Create initiative (no audit log)
await createInitiative({
  name, category, status, urgency, owner,
  description, budget, demandNumber,
  currentProcess, enhancedProcess, comments, implementer,
  logDate, logDescription, severity  // ← Ignored on create
})

// Update initiative (creates audit log if logDescription)
await updateInitiative(id, {
  name, category, status, urgency, owner,
  // ... other fields ...
  logDate, logDescription, severity  // ← Used for audit log
})

// Manage owners
await addOwner(name, email)
await removeOwner(id)
```

---

## ⚠️ Common Mistakes to Avoid

❌ **DON'T:** Set `sap_eventname` to anything other than "Updated"
✅ **DO:** Leave it hardcoded as `sap_eventname: "Updated"`

❌ **DON'T:** Create audit logs on initiative creation
✅ **DO:** Only create on explicit update with log description

❌ **DON'T:** Use string enum values in Dataverse records
✅ **DO:** Convert to numeric codes: "Active" → 100000000

❌ **DON'T:** Forget the `@odata.bind` suffix in lookup fields
✅ **DO:** Use exact format: `sap_Owner_Name@odata.bind`

❌ **DON'T:** Link audit logs without initiative reference
✅ **DO:** Always include `sap_InitiativeName@odata.bind`

---

## 🧪 Quick Test Cases

**Test 1: Create Initiative**
```
1. Fill form (name, category, status, owner, etc.)
2. Leave audit fields empty
3. Submit
4. Verify: Initiative appears in list
5. Verify: Owner lookup resolved
6. Verify: NO audit log created
```

**Test 2: Update Initiative**
```
1. Click Edit on existing initiative
2. Change status + fill audit log description
3. Submit
4. Verify: Status updated
5. Verify: Audit log created with "Updated" event
6. Verify: Audit log linked to initiative
```

**Test 3: Owner Management**
```
1. Click Owners button
2. Add new owner with name + email
3. Create initiative with new owner
4. Verify: Owner lookup resolves correctly
```

---

## 📞 Schema Rules

**Golden Rule:** 
- **CREATE** = Initiative only, NO audit
- **UPDATE** = Initiative + Audit log (if description provided)
- **DELETE** = Initiative + Related audit logs (cascade)

**Owner Rule:**
- All initiatives CAN have owner lookup
- Owner lookup is OPTIONAL
- Owner must exist in portfolio owner table

**Audit Rule:**
- All updates CAN generate audit logs
- Audit logs are OPTIONAL per update
- Audit logs link back to initiative

---

## 🚀 Files Modified

1. **DataverseService.ts** - Core Dataverse operations
   - createInitiative() - Owner binding
   - updateInitiative() - Owner binding
   - createAuditLog() - Initiative linking
   - getOwnerByName() - Helper method

2. **DataContext.tsx** - State management
   - createInitiative() - Removed auto-audit
   - updateInitiative() - Added audit creation

3. **InitiativeForm.tsx** - No changes needed (already correct)

---

## 📚 Full Documentation

For detailed information, see:
- `DATAVERSE_FIELD_MAPPING.md` - Complete field mappings
- `IMPLEMENTATION_SUMMARY.md` - Change details
- `SCHEMA_VERIFICATION.md` - Verification checklist
