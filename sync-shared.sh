#!/usr/bin/env bash
# Run from repo root after editing packages/shared/src/ to propagate changes to all apps.
set -e
cp packages/shared/src/enums.ts apps/backend/src/shared/enums.ts
cp packages/shared/src/enums.ts apps/mobile/src/shared/enums.ts
cp packages/shared/src/types.ts apps/mobile/src/shared/types.ts
cp packages/shared/src/index.ts apps/mobile/src/shared/index.ts
echo "Shared types synced."
