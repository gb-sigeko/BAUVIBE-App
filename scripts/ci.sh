#!/usr/bin/env bash
# CI-Pipeline (lokal oder GitHub Actions). Keine Secrets im Repo – .env muss vorher gesetzt sein.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> prisma generate"
npx prisma generate

echo "==> lint"
npm run lint

echo "==> build"
npm run build

echo "==> automated tests (benötigt DATABASE_URL / TEST_DATABASE_URL)"
export EMAIL_MOCK="${EMAIL_MOCK:-1}"
npm run test:automated

echo "==> CI OK"
