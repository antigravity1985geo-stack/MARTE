-- =============================================
-- ბუღალტერია: ანგარიშთა გეგმა + ჟურნალი + დღგ
-- გაუშვით Supabase Dashboard → SQL Editor
-- =============================================

-- 1. ანგარიშთა გეგმა (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_code text,
  is_system boolean DEFAULT false,
  balance numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, code)
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own accounts" ON accounts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. ჟურნალის ჩანაწერები (Journal Entries)
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  entry_number text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  total_debit numeric(12,2) DEFAULT 0,
  total_credit numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  reference text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal_entries" ON journal_entries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. ჟურნალის ხაზები (Journal Lines)
CREATE TABLE IF NOT EXISTS journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT NOT NULL,
  account_code text NOT NULL,
  account_name text NOT NULL,
  debit numeric(12,2) DEFAULT 0,
  credit numeric(12,2) DEFAULT 0,
  description text
);

ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage journal_lines via entry" ON journal_lines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_lines.journal_entry_id AND je.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_lines.journal_entry_id AND je.user_id = auth.uid()));

-- 4. დღგ რეესტრი (VAT Records)
CREATE TABLE IF NOT EXISTS vat_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL CHECK (type IN ('purchase', 'sale')),
  document_number text,
  counterparty_tin text,
  counterparty_name text,
  taxable_amount numeric(12,2) DEFAULT 0,
  vat_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vat_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own vat_records" ON vat_records
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. ინდექსები
CREATE INDEX IF NOT EXISTS idx_accounts_user_code ON accounts(user_id, code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_vat_records_user_date ON vat_records(user_id, date DESC);

-- 6. ქართული ანგარიშთა გეგმა — Seed Data
-- ეს ჩაემატება მხოლოდ თუ მომხმარებელს ჯერ არ აქვს ანგარიშები.
-- აპლიკაცია ავტომატურად ჩასვამს seed data-ს პირველ ჩატვირთვაზე.
