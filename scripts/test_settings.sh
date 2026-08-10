#!/bin/bash
set -e
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@finance.com","password":"TestPass123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "TOKEN len: ${#TOKEN}"

echo "--- GET /settings ---"
curl -s http://localhost:8000/api/v1/settings -H "Authorization: Bearer $TOKEN"
echo
echo "--- PUT /settings (currency + notif) ---"
curl -s -X PUT http://localhost:8000/api/v1/settings -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"currency":"USD","notifications_enabled":false}'
echo
echo "--- PUT /settings/password wrong current ---"
curl -s -X PUT http://localhost:8000/api/v1/settings/password -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"currentPassword":"wrongpass","newPassword":"NewPass123!"}'
echo
echo "--- PUT /settings duplicate email (test@finance.com) ---"
curl -s -X PUT http://localhost:8000/api/v1/settings -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"test@finance.com"}'
echo
echo "--- restore ---"
curl -s -X PUT http://localhost:8000/api/v1/settings -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"currency":"MXN","notifications_enabled":true}'
echo

echo "--- 409: email de otro usuario ---"
curl -s -w '\nHTTP %{http_code}\n' -X PUT http://localhost:8000/api/v1/settings -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"yoshiqm8@gmail.com"}'

echo "--- 422: ingreso negativo (expect 400) ---"
curl -s -w '\nHTTP %{http_code}\n' -X PUT http://localhost:8000/api/v1/settings -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"monthly_income":-5}'

echo "--- cambio de contraseña correcto y revert ---"
PASS_TMP="TempPass123!"
curl -s -w '\nHTTP %{http_code}\n' -X PUT http://localhost:8000/api/v1/settings/password -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d "{\"currentPassword\":\"TestPass123!\",\"newPassword\":\"$PASS_TMP\"}"
TOKEN2=$(curl -s -X POST http://localhost:8000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"test@finance.com\",\"password\":\"$PASS_TMP\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "login con nueva pass OK, token len: ${#TOKEN2}"
curl -s -X PUT http://localhost:8000/api/v1/settings/password -H "Authorization: Bearer $TOKEN2" \
  -H 'Content-Type: application/json' -d '{"currentPassword":"TempPass123!","newPassword":"TestPass123!"}'
echo
echo "done"