#!/bin/bash
set -e
BASE="http://localhost:8000/api/v1"
TS=$(date +%s)
echo "== register =="
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test$TS\",\"email\":\"test$TS@x.com\",\"password\":\"123456\",\"monthly_income\":15000}"
echo "== login =="
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test$TS@x.com\",\"password\":\"123456\"}"
echo "== health =="
curl -s -w "\nHTTP %{http_code}\n" http://localhost:8000/health