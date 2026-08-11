#!/bin/bash
cd "$(dirname "$0")/.."
ls node_modules/@types/ 2>/dev/null
echo "---"
node -e "console.log('winston', require('winston/package.json').version)"
node -e "console.log('express', require('express/package.json').version)"
node -e "console.log('@types/express', require('@types/express/package.json').version)"
echo "---"
node -e "const t=require('winston/lib/winston/transports').Console; console.log('win Console ok')" 2>&1
echo "--- ts compile api ---"
node_modules/.bin/tsc -p api/tsconfig.json --noEmit 2>&1 | head -40
echo "EXIT: $?"