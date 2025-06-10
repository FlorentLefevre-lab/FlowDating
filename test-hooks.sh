#!/bin/bash
# test-hooks.sh - Tester les hooks de sécurité

echo "🧪 Test des hooks de sécurité..."

# Test 1: Tenter de créer un fichier .env temporaire
echo "TEST_SECRET=secret123" > .env.test
git add .env.test

echo "Test 1: Tentative de commit d'un fichier .env..."
if git commit -m "Test commit with .env file" 2>/dev/null; then
    echo "❌ ÉCHEC: Le hook n'a pas bloqué le commit!"
else
    echo "✅ SUCCÈS: Le hook a bloqué le commit"
fi

# Nettoyer
git reset HEAD .env.test 2>/dev/null
rm -f .env.test

echo ""
echo "✅ Test terminé"
