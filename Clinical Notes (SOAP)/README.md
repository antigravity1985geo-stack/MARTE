# Clinical Notes (SOAP) — საწყობი ERP / Clinic

## ფაილები

```
soap-notes/
├── sql/create_soap_notes.sql          # Migration + Georgian dental templates
├── src/
│   ├── types/soapNotes.ts             # Interfaces + section metadata
│   ├── hooks/useSoapNotes.ts          # 7 hooks + useVoiceInput
│   └── components/SOAPNotesPage.tsx   # Full editor UI
```

## 1. Migration

```sql
sed -i 's/00000000-0000-0000-0000-000000000000/YOUR_TENANT_ID/g' create_soap_notes.sql
\i create_soap_notes.sql
```

**Seed templates included (Georgian dental):**
- სტანდარტული გამოკვლევა (checkup)
- სასწრაფო ვიზიტი — ტკივილი (emergency)
- Root Canal (root_canal)

## 2. Router + Usage

```tsx
import SOAPNotesPage from '@/components/SOAPNotesPage'

// Standalone
<Route path="/clinic/notes" element={
  <SOAPNotesPage patientId={...} patientName={...} />
} />

// Inside appointment view
<SOAPNotesPage
  patientId={appointment.patient_id}
  patientName={appointment.patient_name}
  appointmentId={appointment.id}
  doctorName={currentUser.full_name}
/>
```

## SOAP Structure

| Section | Label | Georgian | Content |
|---|---|---|---|
| **S** | Subjective | პაციენტის ჩივილები | Chief complaint, HPI |
| **O** | Objective | გამოკვლ. მონ. | Exam findings, vitals |
| **A** | Assessment | შეფ. / დიაგ. | Diagnosis, ICD-10 |
| **P** | Plan | მკ. გეგმა | Treatment, Rx, follow-up |

## Auto-save

`useAutoSaveNote` debounces 1.5s after each keystroke.
Explicit save button flushes immediately.
`saving` state shown in toolbar. `lastSaved` timestamp updated.

## Voice-to-text

`useVoiceInput` wraps `SpeechRecognition` / `webkitSpeechRecognition`:

- Language: `ka-GE` (Georgian)
- Continuous mode — appends as you speak
- Works in Chrome/Edge (not Firefox)
- Each section has its own mic button
- Interim results NOT inserted — only final confirmed text

```ts
const { start, stop, listening, supported } = useVoiceInput()
start(
  (text) => setSection(prev => prev + text + ' '),
  () => console.log('stopped'),
  'ka-GE'
)
```

## Template System

Templates pre-fill all 4 sections with `{{placeholder}}` text.
Each section has `phrases` — click-to-insert chips below the textarea.
`suggested_icd10` pre-populates the ICD-10 picker.

### Add template via SQL:
```sql
INSERT INTO soap_templates (tenant_id, name, category,
  subjective_tpl, objective_tpl, assessment_tpl, plan_tpl,
  subjective_phrases, objective_phrases, assessment_phrases, plan_phrases,
  suggested_icd10)
VALUES (
  'YOUR_TENANT_ID', 'ამოღება', 'extraction',
  'პაციენტი ჩამოვიდა კბილ N: -ის ამოღ. გამო.',
  'კბილი N: . მობ.: . Periapical: .',
  '', 'კბ. ამოღება. Rx: .',
  '["ტკ. ამოღ. ადგ.","ყლაპვის გაძნ."]',
  '["კბ. ფხვიერი","ძ/ლ ამოსვლა","ინფ. ნიშ."]',
  '["K08.1 კბ. დაკარგ.","K04.7 ა/პ"]',
  '["Rx ანტ.","Rx ანალ.","ყინ. 20წ","კ/გ 7 დ-ში"]',
  '[{"code":"K08.1","label":"კბ. ამოღ."}]'
);
```

## Sign + Amend workflow

```
draft → [sign] → signed
                    ↓
               [amend] → new draft (amended_from = original_id)
                            original → status = 'amended'
```

Signed notes are **read-only** in the UI.
Amendment creates a new editable copy linked to the original.

## ICD-10 Picker

- Primary diagnosis: first added, or click another to set as primary (★)
- Search by code or label
- 14 pre-loaded common dental codes
- Template-specific suggested codes shown first
