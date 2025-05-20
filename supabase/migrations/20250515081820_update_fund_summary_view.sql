CREATE OR REPLACE VIEW public.fund_summary
 AS
 SELECT mf.fund_id,
    mf.fund_name,
    mf.fund_code,
    sum(
        CASE
            WHEN (t.transaction_type = 'BUY'::transaction_type) THEN t.units
            ELSE (- t.units)
        END) AS net_units,
    sum(
        CASE
            WHEN (t.transaction_type = 'BUY'::transaction_type) THEN (t.price * t.units)
            ELSE ((- t.price) * t.units)
        END) AS invested,
    ((sum(
        CASE
            WHEN (t.transaction_type = 'BUY'::transaction_type) THEN t.units
            ELSE (- t.units)
        END) * latest_nav.nav_value) - sum(
        CASE
            WHEN (t.transaction_type = 'BUY'::transaction_type) THEN (t.price * t.units)
            ELSE ((- t.price) * t.units)
        END)) AS profit
   FROM transactions t
     JOIN mutual_funds mf ON t.fund_id = mf.fund_id
     LEFT JOIN LATERAL (
         SELECT nav_data.nav_value
           FROM nav_data
          WHERE nav_data.fund_id = mf.fund_id
          ORDER BY nav_data.nav_date DESC
         LIMIT 1
       ) latest_nav ON true
       WHERE t.status = 'HOLD'
  GROUP BY mf.fund_id, mf.fund_name, mf.fund_code, latest_nav.nav_value;
