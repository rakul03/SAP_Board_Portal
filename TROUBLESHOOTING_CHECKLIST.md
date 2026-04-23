# Troubleshooting Checklist - Quick Reference

## 🚀 Quick Fix Guide

### Error: "Failed to create initiative in Dataverse"

**Do This (in order):**

```
□ Step 1: Open DevTools (F12)
  └─ Go to Console tab
  └─ Look for: 🔧 DataverseService::createInitiative - START
  └─ Look for: ✅ Enum conversions successful (should exist)

□ Step 2: Check Enum Codes
  └─ Console shows enum conversions?
  └─ Look for numbers like 100000002, not strings like "Projects"
  └─ If string, enum mapping is broken

□ Step 3: Open Network Tab
  └─ Find POST request to sap_initiative_saps
  └─ Check Response body
  └─ Look for specific error message
  └─ Common: "Field 'sap_category' value out of range"

□ Step 4: Copy Payload from Console
  └─ Find: 📤 Creating initiative in Dataverse with payload
  └─ Verify sap_initiativename is not empty
  └─ Verify sap_category is numeric (100000000-100000008)
  └─ Verify sap_status is numeric (100000000-100000003)
  └─ Verify owner binding format: /sap_portfolioowner_saps(id)

□ Step 5: Check Owner Exists
  └─ Click "Dataverse Data" in sidebar
  └─ Click "Owners" tab
  └─ Search for owner name
  └─ If not found, click "Owners" button and add owner

□ Step 6: Verify Fields
  └─ All required fields filled? (name, category, status)
  └─ No invalid characters in text fields?
  └─ No negative numbers?
  └─ Dates in ISO format?

□ Step 7: Check Permissions
  └─ User has Create privilege on sap_initiative_saps?
  └─ Network shows 403? → Permission denied
  └─ Network shows 401? → Authentication failed
```

**If Still Failing:**
→ Copy console output + Network response + form values
→ Contact support with all three pieces

---

## 🔢 Enum Code Quick Reference

**Keep this open while debugging:**

### Status Codes
```
Active    = 100000000 ✅
Pending   = 100000001 ✅
Completed = 100000002 ✅
Delayed   = 100000003 ✅
```

### Category Codes
```
AIs                  = 100000000 ✅
Enhancements         = 100000001 ✅
Projects             = 100000002 ✅
Licenses             = 100000003 ✅
Services             = 100000004 ✅
Securities           = 100000005 ✅
ProductReplacements  = 100000006 ✅
Infrastructure       = 100000007 ✅
Others               = 100000008 ✅
```

### Urgency/Severity Codes
```
High   = 100000000 ✅
Medium = 100000002 ✅
Low    = 100000001 ✅
```

---

## 🔍 Console Log Pattern Recognition

### ✅ Success Pattern
```
🔧 DataverseService::createInitiative - START
  ↓
✅ Enum conversions successful
  ↓
🔍 Resolving owner lookup (if applicable)
  ↓
✅ Owner lookup resolved (if applicable)
  ↓
📤 Creating initiative in Dataverse with payload
  ↓
✅ Initiative created successfully
```

### ❌ Failure Pattern
```
🔧 DataverseService::createInitiative - START
  ↓
❌ (Missing Enum conversions) OR (Has error)
  ↓
❌ DataverseService::createInitiative - FAILED
  ↓
Go to Network tab for details
```

---

## 🎯 Most Common Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Wrong Enum Code** | Network error: "out of range" | Check console: should show 100000002, not "Projects" |
| **Missing Owner** | Creates but no owner assigned | Owner not in database → Use "Manage Owners" |
| **Wrong Owner Name** | Owner lookup shows "Unknown" | Owner name is case-sensitive → Check spelling exactly |
| **Empty Field** | Network error: "required field" | Check form: fill all fields before submit |
| **Permission** | Network 403 or 401 | User needs Create privilege on table |
| **No Audit Log** | Update succeeds but no log | Log description was empty → Fill it in form |

---

## 🛠️ Enum Code Verification Checklist

Before submitting form, console should show:

```
✅ Enum conversions successful {
  category: "Projects → 100000002"     ← Check format: string → number
  status: "Active → 100000000"         ← Check it matches lookup table
  urgency: "Medium → 100000002"        ← Check number is in valid range
}
```

If you see ANY of these, it's WRONG:
```
❌ category: "Projects" (string, not converted)
❌ category: 100000001 (wrong number for Projects)
❌ status: "Active" (string, not converted)
❌ status: 100000001 (wrong number for Active)
```

---

## 📊 Network Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200-201 | Success ✅ | Check Dataverse Viewer to confirm |
| 400 | Bad Request ❌ | Check enum codes, field names, required fields |
| 403 | Forbidden ❌ | User lacks Create privilege |
| 401 | Unauthorized ❌ | Token invalid, re-login |
| 404 | Not Found ❌ | Table doesn't exist, check service |
| 500 | Server Error ❌ | Dataverse issue, retry after delay |

---

## 🔗 Lookup Format Verification

**Owner Lookup Should Look Like:**
```
✅ /sap_portfolioowner_saps(550e8400-e29b-41d4-a716-446655440000)
✅ /sap_portfolioowner_saps(GUID-WITH-HYPHENS)

❌ sap_portfolioowner_saps(missing-slash)
❌ /sap_owner_saps(wrong-table-name)
❌ /sap_portfolioowner_saps(no-hyphens)
```

**Audit Log Lookup Should Look Like:**
```
✅ /sap_initiative_saps(550e8400-e29b-41d4-a716-446655440000)
✅ /sap_initiative_saps(GUID-WITH-HYPHENS)

❌ sap_initiative_saps(missing-slash)
❌ /sap_initiatives_saps(wrong-name)
```

---

## ✅ Pre-Submit Checklist

**Before clicking "Create Initiative":**

```
□ Name field: Not empty
□ Category: Selected from dropdown
□ Status: Selected (default: Active)
□ Urgency: Selected (default: Medium)
□ Owner: Selected or left blank (optional)
□ Description: Optional but can fill
□ Budget: Optional format
□ No special characters in fields
```

**Before clicking "Update Initiative":**

```
□ All above fields correct
□ Audit Log Description: FILLED (required for audit creation)
□ Log Date: Set to today or valid date
□ Severity: Selected
```

---

## 📱 Developer Mode Console Tips

**To see more detail:**

```javascript
// Copy-paste in console to see full error object
// Find the error in console, right-click, select "Store as global variable"
// Then in console type: console.log(temp1)
```

**To clear console (cleanup):**
```javascript
console.clear()
```

**To filter logs:**
```
Filter box in Console tab: Type "DataverseService" to see only service logs
```

---

## 🔄 Test Workflow

**To verify everything works:**

```
1. Open DevTools (F12) → Console
2. Clear console (console.clear())
3. Fill form:
   - Name: "Test Initiative"
   - Category: "Projects"
   - Status: "Active"
   - Owner: (select any or leave blank)
4. Click "Create"
5. Check console for: ✅ Initiative created successfully
6. Check Network for: 201 response
7. Open "Dataverse Data" tab
8. Click "Initiatives" tab
9. Click "Refresh"
10. Look for "Test Initiative" in table
```

**If all 10 pass:**
✅ Schema is working correctly!

---

## 🚨 Emergency Debug Steps

**If completely stuck:**

```
1. Take screenshot of console error
2. Take screenshot of Network response
3. Copy console full output:
   - Right-click console → Save as... → Copy to file
4. Copy Network response:
   - Right-click request → Copy response → Paste to file
5. Open DEBUGGING_GUIDE.md
6. Find your error code
7. Follow the solution steps
```

---

## 📞 Information to Collect Before Asking for Help

```
Error occurs when: [describe action]
Error message shown: [copy from console]
Network response: [copy from Network tab]
Form values entered: [name, category, owner, etc.]
Browser: [Chrome/Firefox/Edge]
OS: [Windows/Mac/Linux]
Screenshots: [console + Network tab]
```

---

## ⏱️ Quick Fixes by Frequency

**Try These in Order (solve 90% of issues):**

```
1. Check enum codes are numeric (not strings)
   └─ Look in console for "Enum conversions successful"

2. Verify all required fields filled
   └─ Name, Category, Status must have values

3. Check owner exists
   └─ Open Dataverse Data → Owners → Look for owner name

4. Clear browser cache & reload
   └─ Ctrl+Shift+Delete → Clear all → Reload page

5. Check Network tab for actual error
   └─ Open Network → Find POST request → Read Response

6. Verify user permissions
   └─ Contact admin: does user have Create on sap_initiative_saps?

7. Check Dataverse service status
   └─ Is Dataverse service online? Try again after 5 min
```

---

**Print This Page or Bookmark It!**
**Last Updated:** 2026-04-20
