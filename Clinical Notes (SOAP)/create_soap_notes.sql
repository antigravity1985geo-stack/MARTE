-- ============================================================
-- CLINICAL NOTES (SOAP) — საწყობი ERP / Clinic Module
-- ============================================================

-- ─── 1. SOAP note templates ───────────────────────────────────
CREATE TABLE IF NOT EXISTS soap_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,           -- "სტანდარტული სტომ.", "კონსულტ."
  category        TEXT NOT NULL DEFAULT 'general'
                  CHECK (category IN (
                    'general','extraction','implant','root_canal',
                    'orthodontic','pediatric','checkup','emergency','other'
                  )),
  -- Default text per section (can include {{placeholders}})
  subjective_tpl  TEXT NOT NULL DEFAULT '',
  objective_tpl   TEXT NOT NULL DEFAULT '',
  assessment_tpl  TEXT NOT NULL DEFAULT '',
  plan_tpl        TEXT NOT NULL DEFAULT '',

  -- Quick-pick phrases per section (JSON array of strings)
  subjective_phrases  JSONB NOT NULL DEFAULT '[]',
  objective_phrases   JSONB NOT NULL DEFAULT '[]',
  assessment_phrases  JSONB NOT NULL DEFAULT '[]',
  plan_phrases        JSONB NOT NULL DEFAULT '[]',

  -- ICD-10 codes to pre-suggest for this template
  suggested_icd10  JSONB NOT NULL DEFAULT '[]',  -- [{code,label}]

  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. SOAP notes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soap_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Context
  patient_id      UUID NOT NULL,
  patient_name    TEXT NOT NULL,
  doctor_id       UUID NOT NULL REFERENCES auth.users(id),
  doctor_name     TEXT,
  appointment_id  UUID,
  template_id     UUID REFERENCES soap_templates(id),
  template_name   TEXT,

  -- The four sections
  subjective      TEXT NOT NULL DEFAULT '',  -- S: Chief complaint, HPI
  objective       TEXT NOT NULL DEFAULT '',  -- O: Exam findings, vitals
  assessment      TEXT NOT NULL DEFAULT '',  -- A: Diagnosis
  plan            TEXT NOT NULL DEFAULT '',  -- P: Treatment plan

  -- Structured diagnosis fields
  icd10_codes     JSONB NOT NULL DEFAULT '[]',  -- [{code, label, is_primary}]
  teeth_involved  TEXT[],                        -- FDI notation

  -- Vitals (optional structured capture)
  vitals          JSONB,
  -- {bp_systolic, bp_diastolic, pulse, temp, weight, pain_score (0-10)}

  -- Follow-up
  follow_up_date    DATE,
  follow_up_notes   TEXT,

  -- Attachments (photos, X-rays taken at this visit)
  attachments     JSONB NOT NULL DEFAULT '[]',  -- [{name,url,type}]

  -- Signing
  is_signed       BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at       TIMESTAMPTZ,
  signed_by       UUID REFERENCES auth.users(id),

  -- Status
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','signed','amended')),
  amended_from    UUID REFERENCES soap_notes(id),  -- if this is an amendment

  notes           TEXT,                             -- internal memo

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Auto updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION soap_touch_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_soap_updated ON soap_notes;
CREATE TRIGGER trg_soap_updated BEFORE UPDATE ON soap_notes
  FOR EACH ROW EXECUTE FUNCTION soap_touch_updated();

DROP TRIGGER IF EXISTS trg_soaptpl_updated ON soap_templates;
CREATE TRIGGER trg_soaptpl_updated BEFORE UPDATE ON soap_templates
  FOR EACH ROW EXECUTE FUNCTION soap_touch_updated();

-- ─── Patient note history view ────────────────────────────────
CREATE OR REPLACE VIEW patient_note_history AS
SELECT
  sn.id,
  sn.patient_id,
  sn.patient_name,
  sn.doctor_id,
  sn.doctor_name,
  sn.appointment_id,
  sn.template_name,
  LEFT(sn.subjective, 120)   AS subjective_preview,
  LEFT(sn.assessment, 120)   AS assessment_preview,
  sn.icd10_codes,
  sn.teeth_involved,
  sn.follow_up_date,
  sn.status,
  sn.is_signed,
  sn.signed_at,
  sn.created_at,
  sn.updated_at
FROM soap_notes sn
ORDER BY sn.created_at DESC;

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_soap_patient   ON soap_notes(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soap_doctor    ON soap_notes(doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soap_appt      ON soap_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_soap_status    ON soap_notes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_soaptpl_cat    ON soap_templates(tenant_id, category);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE soap_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_notes     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "t_soap_tpl"  ON soap_templates
  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_soap_note" ON soap_notes
  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE soap_notes;

-- ─── Seed: Georgian dental SOAP templates ─────────────────────

INSERT INTO soap_templates (
  tenant_id, name, category,
  subjective_tpl, objective_tpl, assessment_tpl, plan_tpl,
  subjective_phrases, objective_phrases, assessment_phrases, plan_phrases,
  suggested_icd10
) VALUES

-- 1. General checkup
(
  '00000000-0000-0000-0000-000000000000',
  'სტანდარტული გამოკვლევა', 'checkup',
  'პაციენტი ჩამოვიდა გეგმური გამოკვლევისთვის. ჩივილები: ',
  'კბილები: სისუფთავე  /10. ღრძილები: ვარდისფერი, მჭიდრო / სისხლდინება. OHI-S: . BOP: %. პათოლოგიური ჯიბეები: ',
  'ჰიგიენური მდგომარეობა: კარგი / დამაკმაყოფილებელი / ცუდი. კარიესი: . პაროდონტული სტატუსი: ',
  '1. პროფესიონალური ჰიგიენა.\n2. ფტორიზაცია.\n3. მომდ. ვიზიტი: 6 თვეში.\n4. ინსტრუქცია: ',
  '["ჩივილები არ aqvs","ძვლის ტკივილი ქვედა ყბაში","სისხლდინება ჭამის დროს","სუნი პირიდან","კბილის მგრძნობელობა ცხელ/ცივზე"]',
  '["კბილების სისუფთავე კარგი","ბლუდი ჯვარედინი კბილები","ბევრი ნადება","ქვაა ყველა კბილზე"]',
  '["K02.9 კარიესი, დაუზუსტ.","K05.1 ქრ. ჯინჯივიტი","K05.3 ქრ. პაროდონტიტი","Z01.2 სტომ. გამოკვლევა"]',
  '["ინდ. ჰიგიენის ინსტრ.","სახლის ჰიგიენა","ექიმი 6 თვეში","ორთოპანტ. გადასაღები"]',
  '[{"code":"Z01.2","label":"სტომ. გამოკვლევა"},{"code":"K05.1","label":"ქრ. ჯინჯივიტი"}]'
),

-- 2. Emergency / pain
(
  '00000000-0000-0000-0000-000000000000',
  'სასწრაფო ვიზიტი — ტკივილი', 'emergency',
  'პაციენტს აქვს მწვავე ტკივილი კბილ(ებ)ზე. ტკივილის ხასიათი: მუდმივი / სამდი / გამოწვეული. ვლოკალიზება: . ტკივ. ინტენს. (NRS): /10. ხანგრძლივობა: ',
  'კბილი N: . პერკუსია: +/−. პალპ.: +/−. ვიტ. ტესტი: +/−/− სიცხეზე. ჩ/ბ: . ძვ. ლ-ს ამოსვლა: ',
  '',
  'გადაუდებელი: \n1. ანესთეზია: \n2. პროცედურა: \n3. Rx: \n4. ნაკ. ვიზიტი: ',
  '["მუდმივი სპონტ. ტკივილი","ტკივილი ღეჭვაზე","ღამის ტკივილი","სიცხის გამომწ. ტკივილი","სახის შეშუპება"]',
  '["ღრმა კარიესი","გახსნილი პულპა","პათ. ჯიბე","ძვ. ლ. ამოსვლა","კბილის მობილ."]',
  '["K04.0 პულპიტი","K04.4 პერ. ფოლოქი","K04.7 პ/ა periapical abscess","K08.89 კბ. ტკ."]',
  '["Rx ანტ./ტკ/გ","Root canal","კბილის ამოღება","სასწრ. ანესთ.","ინდ. გეგმა შ/მ"]',
  '[{"code":"K04.0","label":"პულპიტი"},{"code":"K04.4","label":"პ/ა ფოლოქი"}]'
),

-- 3. Root canal
(
  '00000000-0000-0000-0000-000000000000',
  'Root Canal (ენდოდ.)', 'root_canal',
  'პაციენტი ჩამოვიდა ენდოდ. მკურნ. გასაგრძელებლად. ვიზიტი: /. ჩივ.: ',
  'კბილი N: . წ/ს სიღ.: . IAF: . MAF: . გამრ. სიგრ. (WL): . Irrigation: ',
  '',
  'კბილი N: \n1. Irrigation: NaOCl  % + EDTA.\n2. WL გ/ლ (CBCT/X-ray).\n3. შეფ-ჩ.: \n4. Sealer: \n5. Core: \n6. გვ.: ',
  '["მტკ. არ ქვს","მსუბ. სიმგრძნობ.","ჩ/ბ ასიმპ.","ვიზ. ბოლო/შუა"]',
  '["IAF: #15/20/25","MAF: #40/45","WL: 20.5mm","Canal dry","Sinus tract +/-"]',
  '["K04.1 ნეკრ. პ.","K04.4 პ/ა ფოლოქი","K04.5 ქრ. ა/პ","K04.6 Periapical abscess"]',
  '["ობტ. GuP","ობტ. cold lat.","Core BU composit","Ref. კ/გ 3 თვეში","Rx: Endofil+Guta"]',
  '[{"code":"K04.1","label":"პ. ნეკროზი"},{"code":"K04.4","label":"ა/პ"}]'
);
