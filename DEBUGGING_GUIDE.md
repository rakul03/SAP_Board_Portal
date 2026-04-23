# Debugging Guide - Dataverse Integration Issues

## Overview

This guide helps you identify and resolve errors when creating/updating initiatives or working with Dataverse data.

---

## 🔍 How to Debug Dataverse Errors

### Step 1: Enable Browser Developer Tools

1. **Open DevTools** - Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. **Go to Console Tab** - Click "Console" to see all logs
3. **Keep it open** while testing

---

### Step 2: Check the Console Logs

The DataverseService now logs every operation in detail. Look for these patterns:

#### ✅ Successful Create Initiative
```
🔧 DataverseService::createInitiative - START { name: 'Project Alpha' }
✅ Enum conversions successful {
  category: "Projects → 100000002"
  status: "Active → 100000000"
  urgency: "Medium → 100000001"
}
📤 Creating initiative in Dataverse with payload: {
  fields: ["sap_initiativename", "sap_category", "sap_description", ...]
  payload: { sap_initiativename: "Project Alpha", ... }
}
✅ Initiative created successfully { id: "guid-123-456..." }
```

#### ❌ Failed Create Initiative
```
🔧 DataverseService::createInitiative - START { name: 'Project Alpha' }
❌ DataverseService::createInitiative - FAILED {
  name: "Project Alpha"
  error: "Failed to create initiative in Dataverse"
  fullError: [Error object with details]
}
```

---

### Step 3: Check the Network Tab

1. **Open DevTools → Network Tab**
2. **Reload page** and perform action
3. **Look for POST requests** to Dataverse (usually `/api/data/v9.x/`)
4. **Click the failed request** and check:

#### Response Body (Check for Errors)
```json
{
  "error": {
    "code": "0x80046001",
    "message": "Field 'sap_category' value is out of range",
    "innererror": {
      "message": "The value of the 'OptionSetValue' on the 'sap_category' attribute is outside the valid range."
    }
  }
}
```

#### Common Response Errors:

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `0x80046001` | Field value out of range | Check enum codes (wrong number) |
| `0x80040217` | Required field missing | Verify all required fields filled |
| `0x80041d2c` | Invalid entity reference | Check lookup binding format |
| `0x80072560` | Invalid attribute | Field name typo (sap_initiativename vs sap_initiative_name) |
| `403 Forbidden` | Permission denied | User lacks Create privilege |
| `401 Unauthorized` | Authentication failed | Check token/credentials |

---

## 🛠️ Common Issues & Solutions

### Issue 1: "Failed to create initiative in Dataverse"

**Diagnosis:**
```
Console shows: ❌ DataverseService::createInitiative - FAILED
Network shows: 400 Bad Request
```

**Debug Steps:**

1. **Check the payload in console**
   ```
   Look for: 📤 Creating initiative in Dataverse with payload:
   Verify all fields have correct values
   Verify enum codes are numeric (100000002, not "Projects")
   ```

2. **Check Network Response**
   - Open Network Tab
   - Find POST request to sap_initiative_saps
   - Read the error message in Response body
   - Look for which field failed

3. **Common Causes:**

   **a) Wrong Enum Code**
   ```
   ❌ sap_category: "Projects" (string)
   ✅ sap_category: 100000002 (numeric)
   
   Check console output:
   ✅ Enum conversions successful {
     category: "Projects → 100000002"  ← Should show numeric code
   }
   ```

   **b) Missing Required Field**
   ```
   Network response:
   "message": "Required field 'sap_initiativename' is missing"
   
   Console should show:
   sap_initiativename: "Project Alpha" (not empty)
   ```

   **c) Invalid Owner Lookup**
   ```
   Network response:
   "message": "Invalid entity reference for 'sap_Owner_Name'"
   
   Console should show:
   sap_Owner_Name@odata.bind: "/sap_portfolioowner_saps(guid-123)" ✅
   ```

---

### Issue 2: Owner Not Assigned

**Console Output:**
```
🔍 Resolving owner lookup { ownerName: "John Smith" }
⚠️ Owner not found, skipping owner assignment { ownerName: "John Smith" }
```

**Solutions:**

1. **Verify Owner Exists**
   - Open "Dataverse Data" tab in sidebar
   - Click "Portfolio Owners" tab
   - Look for owner name in sap_ownername column
   - If not there, use "Manage Owners" to add

2. **Check Spelling**
   - Owner names are **case-sensitive**
   - "John Smith" ≠ "john smith"
   - Copy exact name from owners list

3. **Debug Code:**
   ```typescript
   // In DataverseService.ts, getOwnerByName() method
   // Logs what it's searching for
   console.log('Looking for owner:', ownerName);
   // Should find exact match in owners list
   ```

---

### Issue 3: Audit Log Not Created After Update

**Console Output:**
```
🔧 DataverseService::updateInitiative - START { id: "guid-123" }
📤 Updating initiative in Dataverse { id: "guid-123", fields: [...] }
✅ Initiative updated successfully: guid-123
(No audit log creation shown)
```

**Solutions:**

1. **Check if Log Description was Provided**
   ```
   In updateInitiative() in DataContext.tsx:
   if (data.logDescription?.trim()) {
     // Only creates audit log if this is true
   }
   ```
   - Form must include logDescription
   - It must not be empty

2. **Verify Form Submission**
   - Console should show: "✅ Audit log created for update"
   - If not, logDescription was empty/null

3. **Check Audit Log Fields**
   - In "Dataverse Data" tab → "Audit Logs"
   - Look for newest entry
   - Verify sap_InitiativeName value matches initiative ID

---

### Issue 4: Lookup Relationship Not Working

**Symptom:** Owner shows as "(null)" or "Unknown" in display

**Console Check:**
```
✅ Owner lookup resolved {
  ownerName: "John Smith"
  ownerId: "guid-789"
  binding: "/sap_portfolioowner_saps(guid-789)"
}
```

**Dataverse Check:**
1. Open "Dataverse Data" tab
2. Click "Initiatives" tab
3. Look at `sap_owner_namename` column
4. Should show actual owner name, not "Unknown"

**Solutions:**

1. **Verify Owner ID Format**
   ```
   Binding format must be: /sap_portfolioowner_saps(exact-id)
   Not: sap_portfolioowner_saps(exact-id) ← Missing /
   Not: /sap_owner_saps(exact-id) ← Wrong table name
   ```

2. **Check Owner Exists in Target Table**
   - Owner ID in binding must exist in Sap_portfolioowner_saps table
   - Use "Dataverse Data" → "Owners" tab to verify

3. **Force Refresh**
   - Click Refresh in Dataverse Viewer
   - Sometimes lookup takes time to resolve

---

## 📊 Understanding Enum Codes

When debugging enum values, remember these conversions:

### Status Codes
```
Form displays: "Active"
Dataverse stores: 100000000

Console should log:
✅ Enum conversions successful {
  status: "Active → 100000000"  ✅ Correct
  status: "Active → 100000001"  ❌ Wrong (that's Pending)
}
```

### Category Codes
```
"Projects" → 100000002 ✅
"AIs" → 100000000 ✅
"Infrastructure" → 100000007 ✅
"Projects" → 100000007 ❌ Wrong
```

### Quick Reference
```
Status:
  Active → 100000000
  Pending → 100000001
  Completed → 100000002
  Delayed → 100000003

Category:
  AIs → 100000000
  Enhancements → 100000001
  Projects → 100000002
  Licenses → 100000003
  Services → 100000004
  Securities → 100000005
  Infrastructure → 100000007
  Others → 100000008

Urgency/Severity:
  High → 100000000
  Medium → 100000002
  Low → 100000001
```

---

## 🔧 Step-by-Step Debugging Workflow

### For Create Initiative Error:

```
1. ✅ Check Console for logs
   └─ Look for: 🔧 DataverseService::createInitiative - START
   └─ Look for: ❌ DataverseService::createInitiative - FAILED

2. ✅ Check Enum Conversions
   └─ Look for: ✅ Enum conversions successful
   └─ Verify: category → numeric code (not string)
   └─ Verify: status → numeric code

3. ✅ Check Owner Assignment
   └─ Look for: 🔍 Resolving owner lookup
   └─ Or: ⚠️ Owner not found (acceptable)

4. ✅ Check Payload
   └─ Look for: 📤 Creating initiative in Dataverse with payload
   └─ Copy payload from console
   └─ Verify all fields are correct
   └─ Check no empty required fields

5. ✅ Check Network Response
   └─ Open Network tab
   └─ Find POST to sap_initiative_saps
   └─ Check Response body for error details
   └─ Look for which field failed

6. ✅ Check Dataverse Viewer
   └─ If created despite error, might be in Dataverse anyway
   └─ Click "Dataverse Data" → "Initiatives" tab
   └─ Click Refresh
   └─ Look for your initiative
```

---

## 🎯 Logging Location Reference

### In Browser Console (F12)

| Log Message | Meaning |
|------------|---------|
| `🔧 DataverseService::createInitiative - START` | Create operation started |
| `✅ Enum conversions successful` | Enum codes converted correctly |
| `🔍 Resolving owner lookup` | Looking for owner |
| `✅ Owner lookup resolved` | Owner found and linked |
| `⚠️ Owner not found` | Owner not in database (OK if not assigned) |
| `📤 Creating initiative in Dataverse` | Sending data to Dataverse |
| `✅ Initiative created successfully` | Success! Record created |
| `❌ DataverseService::createInitiative - FAILED` | Failed, check error details |

---

## 💾 What Gets Logged

### Full Payload Example
```
📤 Creating initiative in Dataverse with payload: {
  fields: [
    "sap_initiativename",
    "sap_category",
    "sap_description",
    "sap_budgetaed",
    "sap_demandnumber",
    "sap_status",
    "sap_urgency",
    "sap_currentprocessasis",
    "sap_enhancedprocesstobe",
    "sap_comments",
    "sap_implementer",
    "sap_Owner_Name@odata.bind",
    "ownerid",
    "owneridtype",
    "statecode",
    "statuscode"
  ],
  payload: {
    sap_initiativename: "Project Alpha",
    sap_category: 100000002,
    sap_description: "Initiative description",
    sap_budgetaed: "1000000",
    sap_demandnumber: "DEM-900",
    sap_status: 100000000,
    sap_urgency: 100000001,
    sap_currentprocessasis: "Current process",
    sap_enhancedprocesstobe: "Enhanced process",
    sap_comments: "Comments",
    sap_implementer: "IBM",
    sap_Owner_Name@odata.bind: "/sap_portfolioowner_saps(guid-789)",
    ownerid: "system",
    owneridtype: "systemuser",
    statecode: 0,
    statuscode: 1
  }
}
```

---

## 🚨 Red Flags

Look for these in console and fix immediately:

```
⚠️ Owner not found, skipping owner assignment
  └─ If you intended to assign owner, check spelling

❌ Failed to create initiative in Dataverse
  └─ Check Network tab for specific error

ℹ️ No changes to update
  └─ You didn't actually change anything

Missing log:
"✅ Enum conversions successful"
  └─ Enum mapping might be broken
```

---

## 📞 Getting Help

### Provide This Information:

1. **Browser Console Output** (copy entire logs)
2. **Network Tab Response** (for failed request)
3. **What You Tried** (form values entered)
4. **Error Message** (from console or Network)

### Share In This Format:

```
Problem: Failed to create initiative
Form Values: name="Test", category="Projects", owner="John"

Console Log:
[paste console output]

Network Response:
[paste response body from Network tab]

Expected: Initiative created
Actual: Error shown
```

---

## 🔗 Related Documentation

- **DATAVERSE_FIELD_MAPPING.md** - Field reference
- **QUICK_REFERENCE.md** - Enum codes at a glance
- **DATAVERSE_VIEWER_GUIDE.md** - How to inspect data

---

## ✅ Verification Checklist

After fixing an issue, verify:

- [ ] Console shows no error logs
- [ ] Network shows 200/201 response
- [ ] Data appears in Dataverse Viewer
- [ ] Fields show correct values
- [ ] Enum codes are numeric
- [ ] Owner lookup resolved
- [ ] Timestamps are valid
- [ ] Status codes are 0/1

---

**Last Updated:** 2026-04-20
**Status:** Comprehensive Debugging Guide Ready
