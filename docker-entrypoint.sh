#!/bin/sh
# docker-entrypoint.sh - Script d'entrée simplifié

echo "🚀 Démarrage de l'instance $INSTANCE_ID..."

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."
until nc -z postgres 5432 2>/dev/null; do
  echo "PostgreSQL n'est pas encore prêt..."
  sleep 2
done
echo "✅ PostgreSQL est prêt!"

# Attendre que Redis soit prêt
echo "⏳ Attente de Redis..."
until nc -z redis 6379 2>/dev/null; do
  echo "Redis n'est pas encore prêt..."
  sleep 2
done
echo "✅ Redis est prêt!"

# Générer le client Prisma
echo "🔧 Génération du client Prisma..."
npx prisma generate

# Démarrer l'application
echo "🎯 Démarrage de Next.js..."
exec "$@"
