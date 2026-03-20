-- Multi-currency & Exchange Rates persistence logic

-- Ensure the exchange_rates table has the necessary structure (already exists in public schema)
-- We might want to add a unique constraint to avoid duplicate rates for the same day
ALTER TABLE public.exchange_rates ADD CONSTRAINT unique_currency_date UNIQUE (currency_code, date, tenant_id);

-- Function to update rates from the Edge Function
CREATE OR REPLACE FUNCTION update_global_exchange_rates(p_rates jsonb)
RETURNS void AS $$
DECLARE
    rate_record record;
    v_tenant_id uuid;
BEGIN
    -- For now, we update rates for all tenants or a specific global set.
    -- If multi-tenancy is active, we might loop through tenants or have a global reference.
    -- This basic version assumes we are updating the current rates.
    
    FOR rate_record IN SELECT * FROM jsonb_to_recordset(p_rates) AS x(code text, name text, rate numeric, date date)
    LOOP
        INSERT INTO public.exchange_rates (currency_code, rate, date)
        VALUES (rate_record.code, rate_record.rate, rate_record.date)
        ON CONFLICT (currency_code, date, tenant_id) 
        DO UPDATE SET rate = EXCLUDED.rate;
        
        -- Also update the currencies table if needed for the UI
        UPDATE public.currencies 
        SET rate = rate_record.rate, 
            name = rate_record.name 
        WHERE code = rate_record.code;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
