CREATE TABLE IF NOT EXISTS mutual_funds (
    fund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_name TEXT NOT NULL,
    fund_code TEXT NOT NULL,
    other_details TEXT
);

CREATE TYPE transaction_type AS ENUM ('BUY', 'SELL');

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    fund_id UUID,
    transaction_date DATE NOT NULL,
    units NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    platform VARCHAR,
    transaction_type transaction_type NOT NULL,
    status TEXT
);

ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE transactions ADD CONSTRAINT transactions_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES mutual_funds(fund_id);

CREATE TABLE IF NOT EXISTS nav_data (
    nav_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID,
    nav_date DATE NOT NULL,
    nav_value NUMERIC NOT NULL
);

ALTER TABLE nav_data ADD CONSTRAINT nav_data_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES mutual_funds(fund_id);
ALTER TABLE nav_data ADD CONSTRAINT unique_fund_id_nav_date UNIQUE (fund_id, nav_date);

CREATE OR REPLACE FUNCTION set_buy_transaction_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'BUY' THEN
        NEW.status = 'HOLD';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_buy_transaction_status()
RETURNS TRIGGER AS $$
DECLARE
    sell_units_to_cover NUMERIC;
    buy_transaction RECORD;
BEGIN
    IF NEW.transaction_type = 'SELL' THEN
        sell_units_to_cover := NEW.units;

        FOR buy_transaction IN
            SELECT transaction_id, units
            FROM transactions
            WHERE fund_id = NEW.fund_id
            AND transaction_type = 'BUY'
            AND status = 'HOLD'
            ORDER BY transaction_date ASC
        LOOP
            IF sell_units_to_cover >= buy_transaction.units THEN
                UPDATE transactions SET status = 'SOLD' WHERE transaction_id = buy_transaction.transaction_id;
                sell_units_to_cover := sell_units_to_cover - buy_transaction.units;
            ELSE
                UPDATE transactions SET status = 'SOLD' WHERE transaction_id = buy_transaction.transaction_id;
                sell_units_to_cover := 0;
            END IF;

            EXIT WHEN sell_units_to_cover <= 0;
        END LOOP;

        IF sell_units_to_cover > 0 THEN
            RAISE NOTICE 'SELL transaction % is not fully covered', NEW.transaction_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_buy_status_trigger
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION set_buy_transaction_status();

CREATE TRIGGER update_buy_status_trigger
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_buy_transaction_status();
