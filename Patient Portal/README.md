# Patient Portal — საწყობი ERP / Clinic

## ფაილები

```
patient-portal/
├── sql/create_patient_portal.sql              # Migration + RPC functions
├── src/
│   ├── types/patientPortal.ts                 # Interfaces + labels
│   ├── hooks/usePatientPortal.ts              # 6 hooks (patient + clinic side)
│   ├── pages/PatientPortal.tsx                # Full patient-facing portal
│   └── components/AppointmentRequestsPanel.tsx # Clinic-side requests manager
```

## 1. Migration

```sql
\i create_patient_portal.sql
```

**ახალი ცხრილები:**
- `portal_access_tokens` — 6-digit OTP, 15min expiry
- `portal_sessions` — 30-day session token (stored in localStorage)
- `appointment_requests` — online booking from portal → clinic reviews
- `patient_documents` — clinic uploads → patient downloads
- `portal_notifications` — clinic sends → patient sees

**RPC Functions:**
- `generate_portal_otp(tenant_id, patient_id, phone)` → OTP string
- `verify_portal_otp(tenant_id, patient_id, otp, name)` → `{ok, session_token}`
- `validate_portal_session(token)` → `{ok, patient_id, patient_name}`

## 2. Environment variables

```env
VITE_TENANT_ID=your-tenant-uuid
VITE_CLINIC_NAME=სტომატოლოგია X
VITE_CLINIC_PHONE=+995 32 222 2222
```

## 3. Router

```tsx
import PatientPortal from '@/pages/PatientPortal'
import AppointmentRequestsPanel from '@/components/AppointmentRequestsPanel'

// Public route — no auth required
<Route path="/portal" element={<PatientPortal />} />

// Clinic dashboard
<Route path="/clinic/requests" element={<AppointmentRequestsPanel />} />
```

## 4. Send OTP via SMS

In production, after `generate_portal_otp()` returns the code,
send it via your SMS provider:

```ts
// supabase/functions/send-portal-otp/index.ts
const otp = await supabase.rpc('generate_portal_otp', {...})
await smsProvider.send(phone, `${clinicName}: თქვენი კოდია ${otp}. ვადა: 15 წუთი.`)
```

## 5. Upload document (clinic-side)

```ts
// After uploading file to Supabase Storage:
await supabase.from('patient_documents').insert({
  tenant_id, patient_id,
  title: 'X-ray 21.03.2026',
  category: 'xray',
  file_url: publicUrl,
  file_name: 'xray_21_03.jpg',
  is_portal_visible: true,
  appointment_id: appt.id,
})

// Notify patient
await supabase.from('portal_notifications').insert({
  tenant_id, patient_id,
  title: 'ახალი დოკუმენტი',
  body: 'X-ray სურათი ატვირთულია თქვენს კაბინეტში.',
  type: 'result',
})
```

## Portal Flow

```
Patient visits /portal
       ↓
Phone number input → lookup in patients table
       ↓
OTP sent (SMS) → 6-cell input
       ↓
verify_portal_otp() → session_token saved in localStorage
       ↓
Portal loads — 5 tabs:
  🏠 მთავარი    — summary, next appt, recent docs
  📅 ვიზიტები  — upcoming + past history
  📄 დოკ.      — download lab results, invoices, X-rays
  ➕ ჯავშანი   — request new appointment
  🔔 შეტყობ.   — read notifications
```

## OTP Security

- One active OTP per patient at a time (previous invalidated)
- 15-minute expiry
- Single-use (marked `used_at` on verify)
- Session: 30-day rolling validity, updated `last_seen_at` per request
- `SECURITY DEFINER` functions — OTPs never exposed to client directly
