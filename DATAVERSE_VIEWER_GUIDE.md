# Dataverse Data Viewer - User Guide

## Overview

The **Dataverse Data Viewer** is a debugging and inspection screen that displays all raw data from the three Dataverse tables in a tabular format. Use this screen to verify data is being stored correctly and to inspect the actual Dataverse field names and values.

## Access

1. Click the **Dataverse Data** icon in the sidebar (database icon)
2. Alternatively, navigate to the "Dataverse Data" tab in the main navigation

## What It Shows

### 3 Main Tables

The viewer displays data from all three Dataverse tables used by the SAP Portal:

#### 1. **Sap_initiative_saps** (Initiatives Table)
**Shows:** All initiative records with their complete field data

**Key Fields Displayed:**
- `sap_initiative_sapid` - Unique record ID
- `sap_initiativename` - Initiative name (maps to form "name" field)
- `sap_category` - Category (enum value like 100000002 for Projects)
- `sap_description` - Initiative description
- `sap_budgetaed` - Budget amount
- `sap_demandnumber` - Demand/Initiative ID
- `sap_status` - Status (numeric enum)
- `sap_urgency` - Urgency (numeric enum)
- `sap_owner_namename` - Owner name (lookup resolution)
- `sap_currentprocessasis` - Current process description
- `sap_enhancedprocesstobe` - Enhanced process description
- `sap_comments` - Additional comments
- `sap_implementer` - Implementing partner
- `statecode` - Lifecycle state (0=Active, 1=Inactive)
- `statuscode` - Operational status (1=Active, 2=Inactive)
- `createdby`, `createdon` - Creation audit fields
- `modifiedby`, `modifiedon` - Modification audit fields

#### 2. **Sap_auditlog_saps** (Audit Logs Table)
**Shows:** All audit log entries created when initiatives are updated

**Key Fields Displayed:**
- `sap_auditlog_sapid` - Unique audit log ID
- `sap_eventname` - Action that occurred (e.g., "Updated")
- `sap_log_date` - When the update happened
- `sap_log_description` - What was changed and why
- `sap_log_severity` - Severity level (numeric: High, Medium, Low)
- `sap_initiativenamename` - Initiative name (lookup resolution)
- `_sap_initiativename_value` - Initiative record ID (lookup key)
- `statecode` - Lifecycle state
- `statuscode` - Operational status
- `createdby`, `createdon` - Creation timestamp
- `modifiedby`, `modifiedon` - Modification timestamp

#### 3. **Sap_portfolioowner_saps** (Portfolio Owners Table)
**Shows:** All owner/user records that can be assigned to initiatives

**Key Fields Displayed:**
- `sap_portfolioowner_sapid` - Unique owner record ID
- `sap_ownername` - Owner name
- `sap_email` - Owner email address
- `sap_owner_id` - Generated owner ID (like OWNID-1001)
- `statecode` - Lifecycle state
- `statuscode` - Operational status
- `createdby`, `createdon` - Creation audit
- `modifiedby`, `modifiedon` - Modification audit

---

## How to Use

### View a Specific Table

1. **Click a tab** at the top to switch between the three tables:
   - "Initiatives (Sap_initiative_saps)"
   - "Audit Logs (Sap_auditlog_saps)"
   - "Portfolio Owners (Sap_portfolioowner_saps)"

2. **View the data** in the table below the tab

### Refresh Data

1. **Click the "Refresh" button** in the top-right to reload data from Dataverse
2. The button shows "Loading..." while data is being fetched

### Table Features

- **Column Headers** - Show exact Dataverse field names
- **Data Display** - Shows the actual value stored in Dataverse
- **Truncation** - Long values are truncated (100+ chars) with "..." and full value shown on hover
- **Sorting** - Click on any cell to see the complete value in a tooltip
- **Scrolling** - Horizontal scroll for tables with many columns

### Summary Statistics

At the bottom of the screen:
- **Initiatives Count** - Number of initiative records
- **Audit Logs Count** - Number of audit log entries
- **Owners Count** - Number of owner records

---

## Understanding the Data

### Example: Creating an Initiative

When you create an initiative named "Project Alpha" with category "Projects" and owner "John Smith":

**In Sap_initiative_saps table:**
```
sap_initiativename: "Project Alpha"
sap_category: 100000002        ← Numeric code for "Projects"
sap_status: 100000000          ← Numeric code for "Active"
sap_owner_namename: "John Smith" ← Resolved owner name
sap_initiative_sapid: "guid-123-456..." ← Auto-generated unique ID
```

**NO record created in Sap_auditlog_saps** ← This is correct per schema

### Example: Updating an Initiative

When you update the same initiative and add an audit log entry:

**In Sap_initiative_saps table:**
```
sap_status: 100000001          ← Changed to "Pending"
sap_owner_namename: "Jane Doe" ← Owner reassigned
modifiedon: "2026-04-20T10:30:00Z" ← Updated timestamp
```

**In Sap_auditlog_saps table (NEW RECORD):**
```
sap_eventname: "Updated"
sap_log_date: "2026-04-20T10:30:00Z"
sap_log_description: "Status changed to Pending, owner reassigned"
sap_log_severity: 100000002    ← Numeric code for "Medium"
sap_initiativenamename: "Project Alpha" ← Links to initiative
_sap_initiativename_value: "guid-123-456..." ← Initiative record ID
```

---

## Debugging Tips

### I don't see my new initiative

1. **Verify creation succeeded** - Check if there are any error messages in the console
2. **Click Refresh** - Data might not be immediately loaded
3. **Check the app state** - The initiative might be in the local list but not yet synced to Dataverse
4. **Check statecode** - Only records with `statecode: 0` (Active) are displayed

### My audit log isn't showing

1. **Verify update submission** - Make sure you filled in the log description
2. **Check the initiative exists** - Verify the initiative record is in the table
3. **Click Refresh** - Wait a moment then refresh the data
4. **Look at _sap_initiativename_value** - Should match the initiative's sap_initiative_sapid

### Owner lookup shows strange value

1. **Check sap_owner_namename** - Should show the owner's actual name
2. **Verify owner exists** - Check the Portfolio Owners table
3. **Check spelling** - Owner names are case-sensitive
4. **Refresh** - Data might be cached

---

## Data Validation Checklist

Use this screen to verify your data integrity:

- [ ] All initiatives have a `sap_initiativename` (required)
- [ ] All initiatives have a `sap_category` as numeric code (100000000-100000008)
- [ ] All initiatives have a `sap_status` as numeric code
- [ ] Owner names in initiatives match actual owner records (sap_ownername)
- [ ] All initiatives have `statecode: 0` and `statuscode: 1`
- [ ] All audit logs have `sap_eventname: "Updated"`
- [ ] All audit logs have `_sap_initiativename_value` matching an initiative ID
- [ ] All owners have unique `sap_ownername` values
- [ ] All owners have `statecode: 0` and `statuscode: 1`
- [ ] Timestamps (`createdon`, `modifiedon`) are properly formatted

---

## Common Issues & Solutions

### Issue: Tables Show Empty
**Solution:**
1. Click the Refresh button
2. Check if data was actually created in the app
3. Verify Dataverse connection is active
4. Check browser console for errors

### Issue: Column Values Look Wrong
**Solution:**
1. Hover over the cell to see the full value
2. Remember enum codes are numeric (100000000 = "Active")
3. Use the DATAVERSE_FIELD_MAPPING.md to understand the mappings

### Issue: Owner Names Show as "(null)"
**Solution:**
1. The owner lookup might not have been set during creation
2. Create the initiative again with an owner selected
3. Or edit the initiative and assign an owner, then update

### Issue: Audit Logs Not Linked to Initiative
**Solution:**
1. Check `_sap_initiativename_value` field
2. It should contain the exact initiative record ID
3. The initiative must exist in Sap_initiative_saps table
4. The audit log won't appear if the link is broken

---

## Field Name Reference

### Initiative Fields (Sap_initiative_saps)
```
Frontend Form Field → Dataverse Column Name → Display Column
name → sap_initiativename → sap_initiativename
category → sap_category → sap_category
description → sap_description → sap_description
budget → sap_budgetaed → sap_budgetaed
demandNumber → sap_demandnumber → sap_demandnumber
status → sap_status → sap_status
urgency → sap_urgency → sap_urgency
owner → sap_Owner_Name@odata.bind → sap_owner_namename (resolved)
implementer → sap_implementer → sap_implementer
currentProcess → sap_currentprocessasis → sap_currentprocessasis
enhancedProcess → sap_enhancedprocesstobe → sap_enhancedprocesstobe
comments → sap_comments → sap_comments
```

### Audit Log Fields (Sap_auditlog_saps)
```
Frontend Form Field → Dataverse Column Name → Display Column
logDate → sap_log_date → sap_log_date
logDescription → sap_log_description → sap_log_description
severity → sap_log_severity → sap_log_severity
(auto-set) → sap_eventname → sap_eventname
(auto-set) → sap_InitiativeName@odata.bind → sap_initiativenamename (resolved)
```

### Owner Fields (Sap_portfolioowner_saps)
```
Frontend Form Field → Dataverse Column Name → Display Column
name → sap_ownername → sap_ownername
email → sap_email → sap_email
(auto-generated) → sap_owner_id → sap_owner_id
```

---

## Performance Notes

- The viewer loads **all records** from each table
- For large datasets (1000+ records), scrolling might be slow
- Use browser dev tools (F12) to inspect the actual data
- Column widths are fixed; use horizontal scroll to see all columns

---

## Technical Details

**Built with:**
- React hooks (useState, useEffect)
- Dataverse generated services (Sap_initiative_sapsService, etc.)
- CSS Grid for table layout
- Responsive design for mobile

**Data Source:**
- Direct queries to Dataverse using the auto-generated service classes
- No caching - always fetches fresh data on refresh

**Limitations:**
- Read-only (cannot edit data from this viewer)
- No pagination (shows all records)
- No advanced filtering (shows active records only)

---

## Next Steps

After viewing the data:

1. **Go back to the app** and create/update initiatives to see changes here
2. **Compare with app state** - Verify app data matches Dataverse
3. **Check audit trail** - See what updates were logged
4. **Verify lookups** - Confirm owner and initiative links work

---

**Last Updated:** 2026-04-20
**Status:** Fully Functional
**For Questions:** Check SCHEMA_VERIFICATION.md and DATAVERSE_FIELD_MAPPING.md
