#!/bin/bash

echo "🔍 Recherche du vrai serveur Socket.IO utilisé par SocketProvider..."

# 1. Chercher dans le SocketProvider
echo "📁 Analyse du SocketProvider:"
if [ -f "src/providers/SocketProvider.tsx" ]; then
    echo "Connexions trouvées:"
    grep -n -E "io\(|connect|localhost|3000|8080|4000|5000" src/providers/SocketProvider.tsx
    echo ""
    echo "URLs de serveur:"
    grep -n -E "http://|https://|ws://|wss://" src/providers/SocketProvider.tsx
    echo ""
else
    echo "❌ SocketProvider.tsx non trouvé"
fi

# 2. Chercher dans les variables d'environnement
echo "🌍 Variables d'environnement:"
if [ -f ".env.local" ]; then
    echo "Dans .env.local:"
    grep -i socket .env.local 2>/dev/null || echo "Aucune variable socket trouvée"
fi

if [ -f ".env" ]; then
    echo "Dans .env:"
    grep -i socket .env 2>/dev/null || echo "Aucune variable socket trouvée"
fi

# 3. Chercher tous les serveurs socket dans le projet
echo ""
echo "🔎 Tous les serveurs Socket.IO dans le projet:"
find . -name "*.ts" -o -name "*.js" -o -name "*.tsx" | xargs grep -l "Server.*socket\|socket.*Server\|createServer" | grep -v node_modules

# 4. Chercher les ports utilisés
echo ""
echo "🔌 Ports trouvés dans le code:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -h -E ":3[0-9]{3}|:4[0-9]{3}|:5[0-9]{3}|:8[0-9]{3}" | sort | uniq

# 5. Vérifier les processus en cours
echo ""
echo "⚡ Processus Node.js en cours:"
ps aux | grep node | grep -v grep

# 6. Vérifier les ports ouverts
echo ""
echo "🌐 Ports ouverts:"
netstat -tlnp 2>/dev/null | grep :3 || lsof -i :3000,3000,4000,8080 2>/dev/null || echo "Commandes netstat/lsof non disponibles"