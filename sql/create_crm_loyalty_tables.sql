-- Phase 3.3: CRM & Loyalty - Database Expansion
-- =============================================

-- 1. გაფართოებული კლიენტების ცხრილი
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'new' CHECK (segment IN ('new', 'regular', 'vip', 'at_risk', 'lost'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_purchase TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_purchase TIMESTAMP WITH TIME ZONE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. ლოიალობის ქულების ისტორია
CREATE TABLE IF NOT EXISTS client_points_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    transaction_id UUID, -- reference to shift_sales or other
    points INTEGER NOT NULL,
    type TEXT CHECK (type IN ('earn', 'redeem', 'adjustment')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. აქციები და პრომო კოდები
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('percentage', 'fixed', 'bogo', 'points_multiplier')),
    value DECIMAL(10,2) NOT NULL,
    target_segment TEXT DEFAULT 'all',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    promo_code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS Policies
ALTER TABLE client_points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to client_points_history" ON client_points_history FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to promotions" ON promotions FOR ALL TO authenticated USING (true);

-- 5. Audit Triggers
DROP TRIGGER IF EXISTS audit_client_points_history ON client_points_history;
CREATE TRIGGER audit_client_points_history
    AFTER INSERT OR UPDATE OR DELETE ON client_points_history
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_promotions ON promotions;
CREATE TRIGGER audit_promotions
    AFTER INSERT OR UPDATE OR DELETE ON promotions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 6. ფუნქცია ქულების ავტომატური გაანგარიშებისთვის (Optional but useful)
-- ამ ეტაპზე აპლიკაციის ლოგიკაში დავტოვებთ, მაგრამ ბაზაშიც შეიძლება ტრიგერით.
