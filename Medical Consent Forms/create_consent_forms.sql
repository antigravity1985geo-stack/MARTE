-- ============================================================
-- MEDICAL CONSENT FORMS — საწყობი ERP / Clinic
-- ============================================================

-- ─── 1. Form templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_form_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,            -- "ამოღების თანხმობა"
  slug            TEXT NOT NULL,            -- 'extraction', 'implant', 'general'
  category        TEXT NOT NULL CHECK (category IN (
                    'general','extraction','implant','root_canal',
                    'surgery','anesthesia','orthodontic',
                    'whitening','veneer','pediatric','other'
                  )),
  body_ka         TEXT NOT NULL,            -- Full Georgian text with {{variables}}
  variables       JSONB NOT NULL DEFAULT '[]',
  -- [{key:'patient_name', label:'პაციენტის სახელი', required:true}]
  requires_witness BOOLEAN NOT NULL DEFAULT FALSE,
  version          TEXT NOT NULL DEFAULT '1.0',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Signed consent instances ─────────────────────────────
CREATE TABLE IF NOT EXISTS consent_forms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id       UUID NOT NULL REFERENCES consent_form_templates(id),
  template_version  TEXT NOT NULL,

  -- Links
  patient_id        UUID NOT NULL,
  patient_name      TEXT NOT NULL,
  appointment_id    UUID,
  doctor_id         UUID REFERENCES auth.users(id),
  doctor_name       TEXT,

  -- Filled variables snapshot
  variables_data    JSONB NOT NULL DEFAULT '{}',
  -- Rendered body at time of signing (immutable)
  rendered_body     TEXT NOT NULL,

  -- Signatures (base64 SVG paths from canvas)
  patient_signature TEXT,                   -- base64 data
  witness_signature TEXT,
  doctor_signature  TEXT,

  -- Who signed and when
  patient_signed_at   TIMESTAMPTZ,
  witness_signed_at   TIMESTAMPTZ,
  doctor_signed_at    TIMESTAMPTZ,
  witness_name        TEXT,

  -- Device / IP for audit
  signed_ip           TEXT,
  signed_user_agent   TEXT,

  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending',    -- form sent / shown, not signed yet
                        'signed',     -- patient signed
                        'witnessed',  -- witness added
                        'completed',  -- all required signatures done
                        'revoked'     -- patient revoked consent
                      )),

  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cf_updated ON consent_forms;
CREATE TRIGGER trg_cf_updated BEFORE UPDATE ON consent_forms
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_cft_updated ON consent_form_templates;
CREATE TRIGGER trg_cft_updated BEFORE UPDATE ON consent_form_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cf_patient    ON consent_forms(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cf_appt       ON consent_forms(appointment_id);
CREATE INDEX IF NOT EXISTS idx_cf_status     ON consent_forms(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cft_category  ON consent_form_templates(tenant_id, category);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE consent_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "t_cft" ON consent_form_templates
  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_cf"  ON consent_forms
  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE consent_forms;

-- ─── Seed: Georgian dental consent templates ──────────────────

-- A. General consent
INSERT INTO consent_form_templates (
  id, tenant_id, name, slug, category, body_ka, variables, requires_witness, version
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- replace with your tenant_id
  'ზოგადი სამედიცინო თანხმობა',
  'general',
  'general',
$$მე, {{patient_name}}, პირადი ნომერი {{patient_id_number}},

ვადასტურებ, რომ:

1. გავეცანი ჩემი სამედიცინო მდგომარეობის შესახებ ინფორმაციას.

2. ვიღებ ნებაყოფლობით სამედიცინო მომსახურებას {{clinic_name}}-ში, ექიმ {{doctor_name}}-ის მეთვალყურეობით.

3. ვარ ინფორმირებული დაგეგმილი მკურნალობის სახეობის, პოტენციური რისკებისა და ალტერნატიული მეთოდების შესახებ.

4. ვეთანხმები პერსონალური მონაცემების სამედიცინო მიზნებისთვის გამოყენებას.

5. ვადასტურებ, რომ მომეცა საშუალება შეკითხვების დასმისა და ამომწურავი პასუხების მიღებისა.

ეს თანხმობა გაცემულია ნებაყოფლობით, სრული გაცნობიერებით.$$,
  '[
    {"key":"patient_name","label":"პაციენტის სახელი / გვარი","required":true},
    {"key":"patient_id_number","label":"პირადი ნომერი","required":true},
    {"key":"clinic_name","label":"კლინიკის სახელი","required":true},
    {"key":"doctor_name","label":"ექიმის სახელი / გვარი","required":true}
  ]'::jsonb,
  FALSE, '1.0'
)
ON CONFLICT DO NOTHING;

-- B. Tooth extraction
INSERT INTO consent_form_templates (
  id, tenant_id, name, slug, category, body_ka, variables, requires_witness, version
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'კბილის ამოღების თანხმობა',
  'extraction',
  'extraction',
$$მე, {{patient_name}}, ვეთანხმები კბილ(ებ)ის (FDI: {{tooth_numbers}}) ამოღების პროცედურას.

■ პროცედურის აღწერა
კბილის ამოღება (ექსტრაქცია) — ადგილობრივი ანესთეზიის ქვეშ კბილის ბუდიდან ამოღება.

■ გაფრთხილება შესაძლო რისკებზე
• სისხლდენა — ჩვეულებრივ 30–60 წუთის განმავლობაში წყდება
• შეშუპება და ტკივილი — 2–4 დღე, კონტროლდება მედიკამენტებით
• ინფექცია — ანტიბიოტიკებით მართვადი; იშვიათი
• dry socket — ამოღების ადგილის ნელი შეხორცება; 5–10 დღეში სამკურნალო
• მეზობელი კბილების ან ნერვის გაღიზიანება — დროებითი; იშვიათად მუდმივი

■ მოვლის ინსტრუქცია
• 24 სთ-ის განმავლობაში მოერიდეთ: ცხელ საჭმელს, ყვავილობას, ინტენსიურ სავარჯიშოებს
• საღამოს ანტიბიოტიკი / ტკივილგამაყუჩებელი — ექიმის დანიშნულებით
• შეშუპებაზე ყინული პირველი 20 წუთი, შესვენება

■ ალტერნატივები
ენდოდონტიური მკურნალობა (root canal), კბილის გვირგვინი — სადაც ანატომიურად შესაძლებელია.

ვადასტურებ, რომ ვარ ინფორმირებული ყველა ზემოაღნიშნული პუნქტის შესახებ და ნებაყოფლობით ვეთანხმები პროცედურას.$$,
  '[
    {"key":"patient_name","label":"პაციენტის სახელი / გვარი","required":true},
    {"key":"tooth_numbers","label":"კბილ(ებ)ის ნომ(ებ)ი (FDI)","required":true},
    {"key":"doctor_name","label":"ექიმის სახელი / გვარი","required":false}
  ]'::jsonb,
  FALSE, '1.0'
)
ON CONFLICT DO NOTHING;

-- C. Implant
INSERT INTO consent_form_templates (
  id, tenant_id, name, slug, category, body_ka, variables, requires_witness, version
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'დენტალური იმპლანტის თანხმობა',
  'implant',
  'implant',
$$მე, {{patient_name}}, ვეთანხმები დენტალური იმპლანტის ჩასმის პროცედურას.

■ პლანირებული პოზიცია: {{tooth_position}}
■ გამოყენებული სისტემა: {{implant_system}}
■ სავარაუდო ხანგრძლივობა: {{duration}}

■ ეტაპები
1. ქირურგიული ეტაპი — იმპლანტის ჩასმა ყბის ძვალში (ადგილობრ. ანესთ.)
2. ოსეოინტეგრაცია — 3–6 თვე (ძვლის შეხორცება)
3. პროსთეზირება — გვირგვინის დამაგრება

■ შესაძლო გართულებები
• ინფექცია (1–5%) — ანტიბიოტიკებით მართვადი
• ოსეოინტეგრაციის წარუმატებლობა (2–5%) — განმეორებითი ოპერაცია
• ნერვის სიახლოვე — პარესთეზია (0.5%); ჩვეულებ. გარდამავალი
• სინუსის პერფორაცია (ზედა ყბა) — ცალკე სამართავი
• მოწევა / დიაბეტი — წარუმატებლობის რისკი ×3

■ მოსამზადებელი მოთხოვნები
• CBCT სკანი — ჩატარებულია / {{cbct_date}}
• ძვლის სიმკვრივე: {{bone_quality}}

{{additional_notes}}

ვადასტურებ სრულ ინფორმირებულობას და ვეთანხმები ნებაყოფლობით.$$,
  '[
    {"key":"patient_name","label":"პაციენტის სახელი / გვარი","required":true},
    {"key":"tooth_position","label":"პოზიცია (FDI)","required":true},
    {"key":"implant_system","label":"იმპლანტის სისტემა","required":false},
    {"key":"duration","label":"სავარ. ხანგრძლივობა","required":false},
    {"key":"cbct_date","label":"CBCT თარიღი","required":false},
    {"key":"bone_quality","label":"ძვლის ხარისხი","required":false},
    {"key":"additional_notes","label":"დამატებითი შენიშვნები","required":false}
  ]'::jsonb,
  TRUE, '1.0'
)
ON CONFLICT DO NOTHING;

-- D. Anesthesia
INSERT INTO consent_form_templates (
  id, tenant_id, name, slug, category, body_ka, variables, requires_witness, version
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'ანესთეზიის თანხმობა',
  'anesthesia',
  'anesthesia',
$$მე, {{patient_name}}, ვეთანხმები ადგილობრივი ანესთეზიის გამოყენებას.

■ პრეპარატი: {{anesthesia_type}}
■ ალერგიის ისტ.: {{allergy_history}}
■ გულ-სისხლ. სისტ. პათ.: {{cardiac_history}}

■ შესაძლო გვერდითი ეფექტები
• გულის ცემის სიხშირის გაზრდა (ეპინეფრინი) — ნორმ. 5–10 წუთი
• ნიჩბის სიმშრალე / მიძინება — 2–4 სთ
• ალერგიული რეაქცია — 0.01%; კლინიკაში სათანადო პრეპარატები არის
• ტოქსიკური რეაქცია — სათანადო დოზის გადაჭარბებისას; ძალიან იშვიათი

ვადასტურებ, რომ ვაცხადე ყველა ალერგია, ამჟამინდელი მედიკამენტები და ქრონ. დაავადება.$$,
  '[
    {"key":"patient_name","label":"პაციენტის სახელი / გვარი","required":true},
    {"key":"anesthesia_type","label":"ანესთეზიის ტიპი","required":true},
    {"key":"allergy_history","label":"ალერგიები","required":true},
    {"key":"cardiac_history","label":"გულ-სისხლ. ისტ.","required":true}
  ]'::jsonb,
  FALSE, '1.0'
)
ON CONFLICT DO NOTHING;
