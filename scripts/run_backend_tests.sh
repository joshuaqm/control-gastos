#!/bin/bash
cd /home/joshu/projects/control-gastos
docker compose exec -T backend sh -c 'cd /app && pnpm run test:backend 2>&1' > /tmp/vitest_backend.log
grep -n "FAIL\|AssertionError\|expected\| ✓\|×" /tmp/vitest_backend.log | head -60
