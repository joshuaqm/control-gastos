#!/bin/bash
cd /home/joshu/projects/control-gastos
docker compose exec -T backend sh -c 'cd /app && npx vitest run 2>&1' > /tmp/vitest_backend.log
grep -n "FAIL\|AssertionError\|expected\|AssertionError\| ✓\|×" /tmp/vitest_backend.log | head -60