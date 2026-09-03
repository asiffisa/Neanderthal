#!/usr/bin/env bash
# Generates a long random alphanumeric string and seeds diverse scientific questions.

set -euo pipefail

SEED=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom 2>/dev/null | head -c 64 || python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(64)))")

echo "Generated Random Alphanumeric Seed:"
echo "$SEED"
