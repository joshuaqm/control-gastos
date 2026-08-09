#!/bin/bash
cd "$HOME/projects/control-gastos"
docker compose exec -T postgres psql -U finance_user -d finance_db -c "UPDATE accounts SET interest_rate=4.5 WHERE name='Nu México' AND user_id=1;"
docker compose exec -T postgres psql -U finance_user -d finance_db -c "UPDATE accounts SET last_interest_at='2026-07-20' WHERE name='Nu México' AND user_id=1;"
docker compose exec -T postgres psql -U finance_user -d finance_db -tAc "SELECT id,name,type,initial_balance,interest_rate,last_interest_at FROM accounts WHERE user_id=1 ORDER BY id;"