#!/bin/bash
BASE=http://localhost:8000/api/v1
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"test@finance.com","password":"TestPass123!"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "delete leftover tx:"
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE $BASE/transactions/22 -H "Authorization: Bearer $TOKEN"
rm -f backend/data/test_rec.sh
rmdir backend/data 2>/dev/null
echo CLEANED