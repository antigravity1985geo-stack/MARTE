-- Create Enum for Target Triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_trigger') THEN
        CREATE TYPE automation_trigger AS ENUM ('birthday', 'days_inactive', 'tier_upgrade');
    END IF;
END$$;

-- Table for Automation Configuration
CREATE TABLE IF NOT EXISTS automated_campaign_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    trigger_type automation_trigger NOT NULL,
    trigger_value integer, -- e.g. 60 for 'days_inactive'. Null for 'birthday' or 'tier_upgrade'
    channel text DEFAULT 'sms',
    message_template text NOT NULL,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Pre-seed rules based on plan
-- Only insert if table is empty to avoid polluting on subsequent runs
INSERT INTO automated_campaign_rules (name, trigger_type, message_template, trigger_value, is_active)
SELECT 'Birthday Discount', 'birthday', 'გილოცავთ დაბადების დღეს! გაჩუქებთ 20% ფასდაკლებას დღეს ჩვენთან სტუმრობისას.', null, false
WHERE NOT EXISTS (SELECT 1 FROM automated_campaign_rules WHERE trigger_type = 'birthday');

INSERT INTO automated_campaign_rules (name, trigger_type, message_template, trigger_value, is_active)
SELECT 'We Miss You (60 Days)', 'days_inactive', 'მოგვენატრეთ! გვეწვიეთ და მიიღეთ საჩუქარი.', 60, false
WHERE NOT EXISTS (SELECT 1 FROM automated_campaign_rules WHERE trigger_type = 'days_inactive' AND trigger_value = 60);

INSERT INTO automated_campaign_rules (name, trigger_type, message_template, trigger_value, is_active)
SELECT 'Lost Client (180 Days)', 'days_inactive', 'დაბრუნდი ჩვენთან და ისარგებლე ექსკლუზიური შემოთავაზებით.', 180, false
WHERE NOT EXISTS (SELECT 1 FROM automated_campaign_rules WHERE trigger_type = 'days_inactive' AND trigger_value = 180);

INSERT INTO automated_campaign_rules (name, trigger_type, message_template, trigger_value, is_active)
SELECT 'VIP Welcome', 'tier_upgrade', 'გილოცავ! შენ გახდი VIP მომხმარებელი.', null, false
WHERE NOT EXISTS (SELECT 1 FROM automated_campaign_rules WHERE trigger_type = 'tier_upgrade');

-- Table to log automations so we avoid double sending
CREATE TABLE IF NOT EXISTS automated_campaign_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id uuid REFERENCES automated_campaign_rules(id) ON DELETE CASCADE,
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    sent_at timestamp with time zone DEFAULT now()
);

-- Create the processing function
CREATE OR REPLACE FUNCTION process_automated_campaigns()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rule RECORD;
    client_rec RECORD;
    messages_sent integer := 0;
BEGIN
    FOR rule IN SELECT * FROM automated_campaign_rules WHERE is_active = true
    LOOP
        IF rule.trigger_type = 'birthday' THEN
            -- Find clients whose birthday is today (comparing month and day)
            FOR client_rec IN 
                SELECT id, name FROM clients 
                WHERE birth_date IS NOT NULL
                  AND EXTRACT(MONTH FROM birth_date::date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(DAY FROM birth_date::date) = EXTRACT(DAY FROM CURRENT_DATE)
                  -- Must not have been sent this rule in the last 300 days
                  AND NOT EXISTS (
                      SELECT 1 FROM automated_campaign_logs 
                      WHERE rule_id = rule.id AND client_id = clients.id 
                      AND sent_at > CURRENT_DATE - interval '300 days'
                  )
            LOOP
                -- Insert into manual campaigns table as "sent" to trigger the SMS queue / view on UI
                INSERT INTO loyalty_campaigns (name, type, status, target_segment, content)
                VALUES ('Auto: ' || rule.name, rule.channel, 'sent', 'auto_birthday', rule.message_template);
                
                -- Log it
                INSERT INTO automated_campaign_logs (rule_id, client_id) VALUES (rule.id, client_rec.id);
                messages_sent := messages_sent + 1;
            END LOOP;
            
        ELSIF rule.trigger_type = 'days_inactive' THEN
            -- Find clients whose last purchase was strictly exactly X days ago, 
            -- or we can just send it once when they cross the threshold.
            -- Easiest is to check if last_purchase < CURRENT_DATE - trigger_value days
            -- and NOT EXISTS in logs for this rule.
            FOR client_rec IN 
                SELECT id FROM clients 
                WHERE last_purchase < CURRENT_DATE - (rule.trigger_value || ' days')::interval
                  AND NOT EXISTS (
                      SELECT 1 FROM automated_campaign_logs 
                      WHERE rule_id = rule.id AND client_id = clients.id
                  )
            LOOP
                INSERT INTO loyalty_campaigns (name, type, status, target_segment, content)
                VALUES ('Auto: ' || rule.name, rule.channel, 'sent', 'auto_inactive', rule.message_template);
                
                INSERT INTO automated_campaign_logs (rule_id, client_id) VALUES (rule.id, client_rec.id);
                messages_sent := messages_sent + 1;
            END LOOP;
            
        ELSIF rule.trigger_type = 'tier_upgrade' THEN
            -- Not fully implemented in SQL alone since logic of "tier upgrade" moment is complex,
            -- unless we track it or trigger from `recordPurchase`.
            -- For now we leave it simple.
            NULL;
        END IF;
    END LOOP;
    
    RETURN json_build_object('success', true, 'messages_sent', messages_sent);
END;
$$;
