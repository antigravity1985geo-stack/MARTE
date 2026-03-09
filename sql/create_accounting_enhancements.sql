-- =============================================
-- Phase 2.3: Accounting Enhancements
-- 1. Budgets (ბიუჯეტირება)
-- 2. Fixed Assets (ძირითადი საშუალებები)
-- 3. Exchange Rates (ვალუტის კურსები)
-- =============================================

-- 1. ბიუჯეტირება (Budgets)
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- e.g. "Q1 2026 Marketing"
  department text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage budgets" ON budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. ბიუჯეტის ხაზები (Budget Lines)
CREATE TABLE IF NOT EXISTS budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid REFERENCES budgets(id) ON DELETE CASCADE,
  category text NOT NULL, -- e.g. "Advertising", "Office Supplies"
  allocated_amount numeric(15,2) NOT NULL DEFAULT 0,
  spent_amount numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage budget lines" ON budget_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. ძირითადი საშუალებები (Fixed Assets)
CREATE TABLE IF NOT EXISTS fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_code text UNIQUE,
  purchase_date date NOT NULL,
  purchase_cost numeric(15,2) NOT NULL,
  salvage_value numeric(15,2) DEFAULT 0,
  useful_life_years integer NOT NULL,
  depreciation_method text DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line', 'double_declining')),
  accumulated_depreciation numeric(15,2) DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'sold', 'maintenance')),
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage fixed assets" ON fixed_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. ვალუტის კურსები (Exchange Rates) - Cached from NBG API
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL, -- e.g. 'USD', 'EUR'
  rate numeric(10,4) NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(currency_code, date)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read, auth logic" ON exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ინდექსები
CREATE INDEX IF NOT EXISTS idx_budgets_dates ON budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date);
