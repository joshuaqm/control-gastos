SELECT table_data.table_name, table_data.column_name
FROM information_schema.columns AS table_data
WHERE table_data.column_name IN ('account_id','cutoff_day','payment_due_day','paid_amount','collected_amount')
ORDER BY table_data.table_name, table_data.column_name;