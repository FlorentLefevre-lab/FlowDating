#!/bin/bash
# setup-git-hooks.sh - Installation des hooks de sécurité Git pour Dating App

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_error() { echo -e "${RED}❌ [ERREUR]${NC} $1"; }
log_success() { echo -e "${GREEN}✅ [SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠️  [WARNING]${NC} $1"; }
log_info() { echo -e "${BLUE}ℹ️  [INFO]${NC} $1"; }

echo "🔐 Installation des hooks de sécurité Git - Dating App"
echo "==================================================="

# Vérifier qu'on est dans un repo Git
if [ ! -d ".git" ]; then
    log_error "Pas dans un repository Git!"
    exit 1
fi

# Créer le hook pre-commit
log_info "Installation du hook pre-commit..."
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook pour empêcher le commit de secrets

# Couleurs
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🔍 Vérification des secrets avant commit..."

# Fichiers sensibles à ne jamais commit
SENSITIVE_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    ".env.staging"
    ".env.docker"
    "*.env"
    "*.key"
    "*.pem"
    "*.p12"
    "*firebase-adminsdk*.json"
    "*service-account*.json"
    "secrets/*"
    "backups/*.sql"
    "uploads/*"
)

# Patterns de secrets à détecter
SECRET_PATTERNS=(
    "password.*=.*[a-zA-Z0-9]"
    "secret.*=.*[a-zA-Z0-9]"
    "key.*=.*[a-zA-Z0-9]"
    "token.*=.*[a-zA-Z0-9]"
    "api[_-]?key.*=.*[a-zA-Z0-9]"
    "private[_-]?key.*=.*"
    "AKIA[0-9A-Z]{16}"      # Clés AWS
    "sk_live_[a-zA-Z0-9]+"  # Clés Stripe live
    "pk_live_[a-zA-Z0-9]+"  # Clés Stripe live publiques
    "[a-zA-Z0-9]{32,}"      # Clés de 32+ caractères
    "postgresql://.*:.*@"   # URLs de base avec password
    "mongodb://.*:.*@"      # URLs MongoDB avec password
)

# Vérifier les fichiers staged
staged_files=$(git diff --cached --name-only)
violations=0

for file in $staged_files; do
    # Vérifier si le fichier est dans la liste sensible
    for sensitive in "${SENSITIVE_FILES[@]}"; do
        if [[ $file == $sensitive ]]; then
            echo -e "${RED}❌ BLOQUÉ: Fichier sensible détecté: $file${NC}"
            violations=$((violations + 1))
        fi
    done
    
    # Vérifier le contenu pour des patterns secrets (seulement pour les fichiers texte)
    if [ -f "$file" ] && file "$file" | grep -q text; then
        for pattern in "${SECRET_PATTERNS[@]}"; do
            if grep -qiE "$pattern" "$file" 2>/dev/null; then
                echo -e "${RED}❌ BLOQUÉ: Pattern secret détecté dans $file${NC}"
                echo -e "${YELLOW}   Pattern suspect: $pattern${NC}"
                violations=$((violations + 1))
                break  # Un seul pattern par fichier suffit
            fi
        done
    fi
done

# Vérifier les gros fichiers (potentiels dumps)
for file in $staged_files; do
    if [ -f "$file" ]; then
        # Compatible Linux et macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            size=$(stat -f%z "$file" 2>/dev/null)
        else
            size=$(stat -c%s "$file" 2>/dev/null)
        fi
        
        if [ "$size" -gt 10485760 ]; then  # 10MB
            echo -e "${YELLOW}⚠️  ATTENTION: Gros fichier détecté: $file ($(($size / 1024 / 1024))MB)${NC}"
            echo -e "${YELLOW}   Cela pourrait être un dump de base de données avec données utilisateurs!${NC}"
            read -p "Continuer quand même? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                violations=$((violations + 1))
            fi
        fi
    fi
done

if [ $violations -gt 0 ]; then
    echo ""
    echo -e "${RED}🚫 COMMIT BLOQUÉ: $violations violation(s) détectée(s)${NC}"
    echo ""
    echo -e "${GREEN}💡 Solutions:${NC}"
    echo "  1. Ajoutez les fichiers sensibles à .gitignore"
    echo "  2. Supprimez les secrets du code: git reset HEAD <file>"
    echo "  3. Utilisez des variables d'environnement: process.env.YOUR_SECRET"
    echo "  4. Pour un nouveau dev: copiez .env.template vers .env.local"
    echo ""
    echo -e "${YELLOW}⚠️  Pour forcer le commit (DANGEREUX): git commit --no-verify${NC}"
    echo ""
    echo -e "${RED}🚨 RAPPEL: Votre Dating App contient des données sensibles d'utilisateurs!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Aucun secret détecté, commit autorisé${NC}"
exit 0
EOF

chmod +x .git/hooks/pre-commit
log_success "Hook pre-commit installé"

# Créer le hook pre-push
log_info "Installation du hook pre-push..."
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
# Pre-push hook pour vérification finale

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🔍 Vérification finale avant push..."

# Vérifier qu'aucun fichier .env n'est tracké
tracked_env_files=$(git ls-files | grep -E '\.(env|key|pem)$' | grep -v '\.env\.template\|\.env\.example' || true)

if [ -n "$tracked_env_files" ]; then
    echo -e "${RED}❌ BLOQUÉ: Fichiers sensibles trackés détectés:${NC}"
    echo "$tracked_env_files"
    echo ""
    echo -e "${GREEN}💡 Pour les supprimer du tracking:${NC}"
    echo "  git rm --cached <file>"
    echo "  git commit -m '🔒 Remove sensitive files from tracking'"
    exit 1
fi

# Vérifier la présence de .env.template
if [ ! -f ".env.template" ] && [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  Considérez créer un .env.template pour l'équipe${NC}"
fi

echo -e "${GREEN}✅ Push autorisé${NC}"
exit 0
EOF

chmod +x .git/hooks/pre-push
log_success "Hook pre-push installé"

# Créer le hook commit-msg
log_info "Installation du hook commit-msg..."
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# Commit-msg hook pour détecter les messages suspects

YELLOW='\033[1;33m'
NC='\033[0m'

commit_msg=$(cat "$1")

# Messages suspects qui pourraient indiquer un commit de secrets
if echo "$commit_msg" | grep -qi "secret\|password\|key\|token\|credential\|api"; then
    echo -e "${YELLOW}⚠️  Message de commit suspect détecté:${NC}"
    echo "\"$commit_msg\""
    echo ""
    read -p "Ce commit contient-il des secrets? Continuer quand même? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Commit annulé par l'utilisateur"
        exit 1
    fi
fi

exit 0
EOF

chmod +x .git/hooks/commit-msg
log_success "Hook commit-msg installé"

# Créer un script de test
log_info "Création du script de test..."
cat > test-hooks.sh << 'EOF'
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
EOF

chmod +x test-hooks.sh
log_success "Script de test créé"

# Afficher le résumé
echo ""
log_success "🎉 Hooks de sécurité installés avec succès!"
echo ""
echo "📋 Hooks installés:"
echo "  ✅ Pre-commit: Bloque les commits avec secrets"
echo "  ✅ Pre-push: Vérification finale avant push"  
echo "  ✅ Commit-msg: Détecte les messages suspects"
echo ""
echo "🧪 Tester les hooks:"
echo "  ./test-hooks.sh"
echo ""
echo "⚠️  Pour bypasser temporairement (DANGEREUX):"
echo "  git commit --no-verify"
echo ""
echo "🔒 Votre Dating App est maintenant protégée contre les commits accidentels de secrets!"