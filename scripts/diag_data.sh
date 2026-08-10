#!/bin/bash
set -e
T=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@finance.com","password":"TestPass123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== CUENTAS credit ==="
curl -s http://localhost:8000/api/v1/accounts -H "Authorization: Bearer $T" \
  | python3 -c "import sys,json; [print(a['id'], a['name'], a['type'], 'cutoff', a.get('cutoff_day'), 'pago', a.get('payment_due_day'), 'active', a.get('is_active')) for a in json.load(sys.stdin) if a['type']=='credit']"

echo "=== DEUDAS ==="
curl -s http://localhost:8000/api/v1/debts -H "Authorization: Bearer $T" \
  | python3 -c "import sys,json; [print(d['id'], d['name'], d['type'], d['due_date'], d['status'], d['original_amount'], d['paid_amount']) for d in json.load(sys.stdin)]"

echo "=== RECURRENTES ==="
curl -s http://localhost:8000/api/v1/recurring -H "Authorization: Bearer $T" \
  | python3 -c "import sys,json; [print(r['id'], r['name'], r['next_date'], r['amount'], r['is_active']) for r in json.load(sys.stdin)]"