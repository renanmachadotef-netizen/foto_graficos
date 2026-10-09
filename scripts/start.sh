#!/bin/sh
# Aplica as migrations pendentes e inicia o app.
# Banco criado antes das migrations (erro P3005): alinha ao schema atual uma unica vez,
# marca a migration inicial como aplicada e segue. Qualquer outro erro derruba o start.
out=$(npx prisma migrate deploy 2>&1)
code=$?
echo "$out"
if [ $code -ne 0 ]; then
  if echo "$out" | grep -q "P3005"; then
    echo "[start] Banco sem historico de migrations: baseline unico..."
    npx prisma db push --accept-data-loss || exit 1
    npx prisma migrate resolve --applied 0_init || exit 1
    npx prisma migrate deploy || exit 1
  else
    echo "[start] migrate deploy falhou"
    exit 1
  fi
fi
exec npx next start
