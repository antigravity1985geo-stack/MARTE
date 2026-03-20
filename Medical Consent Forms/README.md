# Medical Consent Forms — საწყობი ERP / Clinic

## ფაილები

```
consent-forms/
├── sql/create_consent_forms.sql         # Migration + Georgian templates
├── src/
│   ├── types/consentForms.ts            # Interfaces + renderTemplate()
│   ├── hooks/useConsentForms.ts         # 5 hooks + useSignaturePad
│   └── components/ConsentFormsPage.tsx  # Full UI
```

## 1. Migration

```sql
-- Replace tenant UUID first:
sed -i 's/00000000-0000-0000-0000-000000000000/YOUR_TENANT_ID/g' create_consent_forms.sql
\i create_consent_forms.sql
```

**ახალი ცხრილები:**
- `consent_form_templates` — შაბლონები `{{variable}}` placeholders-ებით
- `consent_forms` — ხელმოწერილი ეგზემპლარები (immutable rendered_body snapshot)

## 2. Router + Usage

```tsx
import ConsentFormsPage from '@/components/ConsentFormsPage'

// Standalone page:
<Route path="/clinic/consent" element={<ConsentFormsPage />} />

// Inside patient record:
<ConsentFormsPage
  patientId={patient.id}
  patientName={patient.full_name}
  appointmentId={appointment?.id}
  doctorName={doctor?.name}
/>

// Inside appointment detail:
<ConsentFormsPage
  patientId={appointment.patient_id}
  patientName={appointment.patient_name}
  appointmentId={appointment.id}
  doctorName={appointment.doctor_name}
/>
```

## Seed Templates (included)

| Slug | სახელი | მოწმე |
|---|---|---|
| `general` | ზოგადი სამედიცინო თანხმობა | არა |
| `extraction` | კბილის ამოღების თანხმობა | არა |
| `implant` | დენტალური იმპლანტის თანხმობა | **კი** |
| `anesthesia` | ანესთეზიის თანხმობა | არა |

## Signing Flow

```
1. TemplatePicker  — კატეგ. ფილტრი, ძებნა
2. VariablesForm   — {{key}} fields + live preview
3. Create form     — rendered_body snapshot saved (immutable)
4. SigningScreen    — 4 steps:
   read → sign (patient) → [witness?] → doctor → done
5. Signatures saved as base64 PNG per signer
```

## `useSignaturePad` hook

Attaches mouse + touch listeners to `<canvas>`. Returns:
- `isEmpty` — boolean for button enable/disable
- `clear()` — wipe canvas
- `getDataURL()` — returns base64 PNG or null if empty

```tsx
const canvasRef = useRef<HTMLCanvasElement>(null)
const { clear, getDataURL, isEmpty } = useSignaturePad(canvasRef)

<canvas ref={canvasRef} width={560} height={140} className="touch-none cursor-crosshair" />
<button disabled={isEmpty} onClick={() => { const sig = getDataURL(); if(sig) save(sig) }}>
  შენახვა
</button>
```

## Template variables syntax

In `body_ka`, use `{{variable_key}}`. Variables defined in `variables` JSONB:

```json
[
  {"key": "patient_name", "label": "სახელი / გვარი", "required": true},
  {"key": "tooth_numbers", "label": "კბილ(ებ)ის ნომ.", "required": true, "type": "text"},
  {"key": "notes", "label": "შენიშვნა", "required": false, "type": "textarea"}
]
```

Rendered at form creation with `renderTemplate(body, vars)` — snapshot is immutable.

## Add new template via SQL

```sql
INSERT INTO consent_form_templates
  (tenant_id, name, slug, category, body_ka, variables, requires_witness)
VALUES (
  'YOUR_TENANT_ID',
  'Root Canal-ის თანხმობა',
  'root_canal',
  'root_canal',
  'მე, {{patient_name}}, ვეთანხმები root canal-ის მკურნალობას კბილ {{tooth_number}}-ზე...',
  '[{"key":"patient_name","label":"სახელი","required":true},
    {"key":"tooth_number","label":"კბილის ნომ.","required":true}]',
  false
);
```
