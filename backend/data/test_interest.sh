#!/bin/bash
cd "$HOME/projects/control-gastos"
echo "== reset Nu last_interest_at to 2026-07-05 (5 weeks ago) =="
docker compose exec -T postgres psql -U finance_user -d finance_db -c "DELETE FROM transactions WHERE category='Intereses' AND user_id=1;"
docker compose exec -T postgres psql -U finance_user -d finance_db -c "UPDATE accounts SET last_interest_at='2026-07-05', initial_balance=5000 WHERE id=2 AND user_id=1;"
docker compose exec -T postgres psql -U finance_user -d finance_db -tAc "SELECT id,name,initial_balance,last_interest_at FROM accounts WHERE id=2;"

echo "== restart backend -> runs accrual on startup =="
docker compose restart backend
sleep 12

echo "== Nu after cron accrual =="
docker compose exec -T postgres psql -U finance_user -d finance_db -tAc "SELECT id,name,initial_balance,last_interest_at FROM accounts WHERE id=2;"

echo "== theoretical txn created? =="
docker compose exec -T postgres psql -U finance_user -d finance_db -tAc "SELECT id,date,amount,notes FROM transactions WHERE category='Intereses' ORDER BY id;"

BASE=http://localhost:8000/api/v1
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"test@finance.com","password":"TestPass123!"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
AUTH="Authorization: Bearer $TOKEN"

echo "== adjust real interest =60 for current month (replaces theoretical) =="
curl -s -X POST "$BASE/accounts/2/adjust-interest" -H "$AUTH" -H 'Content-Type: application/json' -d '{"amount":60}' | python3 -c 'import sys,json;r=json.load(sys.stdin);print("theo removed:",r["theoreticalRemoved"],"delta:",r["balanceDelta"],"balance:",r["account"]["initial_balance"],"real amount:",r["transaction"]["amount"])'

echo "== Intereses txns after adjust (only the real one should remain) =="
docker compose exec -T postgres psql -U finance_user -d finance_db -tAc "SELECT id,date,amount,notes FROM transactions WHERE category='Intereses' AND user_id=1 ORDER BY id;"