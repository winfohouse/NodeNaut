# scan in WorkflowEditor.svelte or Sequence Designer


The job of Scan inside WorkflowEditor should be much bigger than just:

“find inputs”

It should be the automatic workflow understanding engine. and add workflow to make life easyer.

Think of it as:

“Understand this page and prepare automation for me.”

For non-technical users, Scan is probably the most important button in the whole product. Because humans hate configuration and love buttons that magically reduce suffering.

Here is what Scan should actually do:

1. Detect Form Structure

When user clicks:

[ Scan Page ]

FlowPilot analyzes:

Inputs
<input>
<textarea>

Example output:

{
  "label": "First Name",
  "type": "text",
  "selector": "#firstName"
}
Dropdowns
<select>

Extract:

{
  "label": "Country",
  "type": "dropdown",
  "values": [
    "Bangladesh",
    "India",
    "USA"
  ]
}
Checkbox Groups

Example:

Skills
☑ HTML
☑ CSS
☑ JS

Store:

{
  "type": "checkbox-group",
  "options": [
    "HTML",
    "CSS",
    "JS"
  ]
}
Radio Groups

Example:

Gender
○ Male
○ Female
Custom UI Components

React/Vue UI hell:

<div role="combobox">

Must support:

Material UI
Ant Design
Bootstrap
Tailwind UI
Headless UI
2. Create Editable Field Table

After scan:

Auto-generate:

Detected Fields
--------------------------------

First Name      [Map Column]
Last Name       [Map Column]
Country         [Dropdown]
Gender          [Radio]
Resume Upload   [File]

Instead of user manually adding fields.

This is huge for UX.

3. Auto Suggest Field Mapping

If CSV already uploaded:

Example:

CSV:

firstname,lastname,email

Auto-match:

First Name → {firstname}
Last Name → {lastname}
Email → {email}

Confidence:

95%

User just confirms.

This makes FlowPilot feel smart.

4. Detect Workflow Opportunities

This is underrated.

Scan should detect:

Continue buttons

Example:

Continue
Next
Submit
Proceed
Save

Suggest:

Possible Workflow Step Found:
[Continue Button]

User clicks:

Add to Workflow
Multi-page hints

Detect:

Step 1 of 5

or:

pagination wizard

Suggest:

This appears to be a multi-page workflow
5. Detect Validation Rules

Example:

required
min
max
pattern

Store:

{
  "required": true,
  "maxLength": 30
}

Useful for:

Smart fill safety

Example:

truncate too-long values.

6. Detect Dynamic Fields

Some fields appear only after:

checkbox checked

Example:

☑ Married

then:

Spouse Name

appears.

Scan should detect:

conditional fields

Huge feature.

7. Build Selector Confidence

Every field:

confidence score

Example:

#email → 97%

Low confidence:

XPath-only

Warn user.

8. DOM Snapshot Capture

Store lightweight snapshot:

For future healing.

Example:

{
  "selector": "#submit",
  "text": "Continue",
  "class": "btn-primary"
}

This helps when site changes later.

9. Scan Result Output

After scan:

WorkflowEditor receives:

ScanResult {
  fields: [],
  buttons: [],
  validations: [],
  dynamicSections: [],
  workflowSuggestions: []
}
10. Suggested UI

Inside WorkflowEditor:

┌─────────────────────┐
│ Scan Current Page   │
└─────────────────────┘

Detected:

✓ 12 Fields
✓ 3 Dropdowns
✓ 2 Buttons
✓ Multi-step Form

Suggestions:
[ + Continue Button ]
[ + OTP Wait ]
[ + Submit Step ]
Architecture-wise

Scan job =

DOM understanding
+
field extraction
+
workflow suggestion
+
mapping preparation
+
selector generation
+
future recovery data

Not just:

querySelectorAll("input")

That would be version 0.0001, the sort of thing developers build at 2 AM and regret by lunch.












# Table of a WorkflowEditor.svelte 


The **job of `Table` inside `WorkflowEditor.svelte`** is much more important than just:

> “show CSV rows”

It should be the **data orchestration center** for the workflow.

Think:

> **“Where workflow data becomes automation.”**

For normal users, this is where they connect:

```txt id="6r5wul"
their spreadsheet
↓
website fields
↓
automation logic
```

without writing code.

Here’s what `Table` should actually do.

---

# Main Responsibility

`WorkflowEditor/Table`

controls:

```txt id="vjlwmm"
data
mapping
preview
execution rows
computed values
validation
```

Basically:

> **“How data enters the workflow.”**

---

# 1. Data Source Management

Table owns:

### CSV Upload

Example:

```txt id="u1b8pc"
Upload CSV
```

Input:

```csv id="sxl9lv"
firstname,lastname,email
John,Doe,john@gmail.com
```

---

### Manual Table Entry

For normal users.

Spreadsheet UI.

Example:

```txt id="jlwm2q"
+ Add Row
```

and 

```txt id="jlwm2q"
+ Add Columns
```

when add it it should as for defult values.

Like Excel-lite.

---

### DB Source (Advanced)

Developer mode:

```txt id="jlwm3q"
SELECT * FROM users
```

---

### Variable Source

Workflow variables:

```txt id="jlwm4q"
$currentUser
$invoiceNumber
```

---

# 2. Column Management

Table owns schema.

Example:

```txt id="jlwm5q"
firstname
lastname
email
country
resume
```

User can:

### Rename

```txt id="jlwm6q"
fname → firstname
```

---

### Reorder

Drag/drop.

---

### Hide

Sensitive fields.

Example:

```txt id="jlwm7q"
password
apiKey
```

---

### Mark Sensitive

Example:

```txt id="jlwm8q"
SSN
```

Auto:

```txt id="jlwm9q"
masked
encrypted
auto-delete
```

---

# 3. Field Mapping Center (Huge Responsibility)

This is the biggest job.

Map:

Website field

↓

table columns.

and if placeholder is available then when mouce on that column show the placeholder (like title="" Attribute) or smartly deside 

Example:

```txt id="jlwm10"
First Name
```

maps to:

```txt id="jlwm11"
{firstname}
```

---

Combined values:

```txt id="jlwm12"
{firstname} {lastname}
```

Example:

```txt id="jlwm13"
John Doe
```

---

Expression mode:

```txt id="jlwm14"
{city}, {country}
```

---

### Smart Auto Match

After scan:

Auto suggest:

```txt id="jlwm15"
Email → {email}
```

Confidence:

```txt id="jlwm16"
98%
```

User confirms.

---

# 4. Row Preview Engine

User clicks row:

Preview:

```txt id="jlwm17"
Current Row:
John Doe

Workflow Preview:

First Name → John
Last Name → Doe
Country → Bangladesh
```

Massively useful.

Prevents mistakes.

---

# 5. Formula / Computed Columns

Table should support:

### Computed Column

Example:

```txt id="jlwm18"
fullname
```

formula:

```js id="jlwm19"
row.firstname + " " + row.lastname
```

Result:

```txt id="jlwm20"
John Doe
```

---

### Auto Increment

Example:

```txt id="jlwm21"
invoice_no
```

formula:

```txt id="jlwm22"
INV-{AUTO+1}
```

---

### JS Mode

Advanced:

```js id="jlwm23"
return row.salary * 0.15
```

---

# 6. Validation System

Table validates rows.

Example:

Missing email:

```txt id="jlwm24"
❌ Invalid
```

Bad value:

```txt id="jlwm25"
country = null
```

Highlight row.

Prevent workflow failure.

---

Validation types:

```txt id="jlwm26"
required
regex
min/max
custom JS validator
```

---

# 7. Execution Queue Management

This is important.

Table controls:

### Current Row

Example:

```txt id="jlwm27"
Running Row 3/100
```

---

### Status

Each row:

```txt id="jlwm28"
Pending
Running
Success
Failed
Skipped
Retry
```

Example UI:

```txt id="jlwm29"
✓ Row 1
✓ Row 2
❌ Row 3
⏳ Row 4
```

---

### Retry Failed

One click.

Huge UX improvement.

---

# 8. Dry Run Preview

Before execution:

Preview:

```txt id="jlwm30"
Would Fill:

Name → John Doe
Email → john@gmail.com

Would Click:
Continue
```

No execution.

Very useful.

---

# 9. File Mapping

Example:

CSV:

```csv id="jlwm31"
resume
resume.pdf
```

Map:

```txt id="jlwm32"
Resume Upload
```

↓

```txt id="jlwm33"
{resume}
```

Table manages:

```txt id="jlwm34"
file existence
cache
upload path
```

---

# 10. Filtering & Search

For large datasets.

Example:

```txt id="jlwm35"
status = failed
```

or:

```txt id="jlwm36"
country = Bangladesh
```

Search:

```txt id="jlwm37"
john
```

---

# 11. Export System

Export:

### Failed Rows

```csv id="jlwm38"
failed.csv
```

---

### Logs

```json id="jlwm39"
logs.json
```

---

### Completed Rows

Useful for auditing.

---

# 12. Table State

`Table` should manage:

```ts id="jlwm40"
TableState {
  rows,
  columns,
  selectedRow,
  mappings,
  validation,
  executionStatus,
  filters,
  computedColumns
}
```

---

# Suggested Layout

```txt id="jlwm41"
┌─────────────────────────────┐
│ Upload CSV   Add Row        │
├─────────────────────────────┤
│ firstname | lastname | ...  │
│ John      | Doe      | ...  │
│ Hasan     | Ali      | ...  │
├─────────────────────────────┤
│ Mapping Panel               │
│ Name → {firstname}          │
│ Email → {email}             │
├─────────────────────────────┤
│ Queue Status                │
│ Running 3/100               │
└─────────────────────────────┘
```

---

### Architecture-wise

`WorkflowEditor.svelte`

```txt id="jlwm42"
orchestrates workflow
```

`Table.svelte`

```txt id="jlwm43"
orchestrates workflow data
```

`Scan`

```txt id="jlwm44"
understands website
```

`Table`

```txt id="jlwm45"
understands user data
```

Together:

```txt id="jlwm46"
Website Structure
+
User Data
=
Automation
```

Which is annoyingly elegant for something that started as “I fill forms every day and I’m tired.”
