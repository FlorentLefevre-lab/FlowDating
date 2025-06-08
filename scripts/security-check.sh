#!/bin/bash
# security-check.sh - Vérification sécurité pour Dating App

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 Vérification sécurité Dating App"
echo "==================================="

# Fonction de log
log_error() { echo -e "${RED}❌ [ERREUR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠️  [ATTENTION]${NC} $1"; }
log_success() { echo -e "${GREEN}✅ [OK]${NC} $1"; }
log_info() { echo -e "${BLUE}ℹ️  [INFO]${NC} $1"; }

violations=0

echo ""
echo "1️⃣  Vérification des fichiers trackés..."

# Vérifier les fichiers .env trackés
env_files=$(git ls-files | grep -E "\.env" | grep -v "\.env\.template\|\.env\.example" || true)
if [ -n "$env_files" ]; then
    log_error "Fichiers .env trackés détectés !"
    echo "$env_files"
    echo ""
    log_info "💡 Solution :"
    echo "git rm --cached .env.local"
    echo "git commit -m '🔒 Remove sensitive .env files'"
    violations=$((violations + 1))
else
    log_success "Aucun fichier .env sensible tracké"
fi

# Vérifier les clés et certificats
key_files=$(git ls-files | grep -E "\.(key|pem|p12|pfx|crt|cer)$" || true)
if [ -n "$key_files" ]; then
    log_error "Clés/certificats trackés détectés !"
    echo "$key_files"
    violations=$((violations + 1))
else
    log_success "Aucune clé/certificat tracké"
fi

# Vérifier les fichiers de configuration sensibles
config_files=$(git ls-files | grep -E "(secrets|credentials|config.*\.json|service-account.*\.json)" || true)
if [ -n "$config_files" ]; then
    log_warning "Fichiers de config potentiellement sensibles :"
    echo "$config_files"
    violations=$((violations + 1))
fi

# Vérifier les backups
backup_files=$(git ls-files | grep -E "\.(sql|dump|backup|bak)$" || true)
if [ -n "$backup_files" ]; then
    log_error "Fichiers de backup trackés (peuvent contenir données utilisateurs) !"
    echo "$backup_files"
    violations=$((violations + 1))
else
    log_success "Aucun backup tracké"
fi

echo ""
echo "2️⃣  Vérification du contenu des fichiers..."

# Scanner les patterns secrets dans les fichiers trackés
secret_patterns=(
    "password.*=.*[a-zA-Z0-9]"
    "secret.*=.*[a-zA-Z0-9]"
    "api[_-]?key.*=.*[a-zA-Z0-9]"
    "private[_-]?key.*=.*[a-zA-Z0-9]"
    "token.*=.*[a-zA-Z0-9]"
    "AKIA[0-9A-Z]{16}"           # AWS Access Key
    "sk_live_[a-zA-Z0-9]+"       # Stripe Live Secret
    "pk_live_[a-zA-Z0-9]+"       # Stripe Live Public
    "[a-zA-Z0-9]{32,}"           # Clés longues génériques
)

echo "Scan des patterns secrets dans le code..."
found_secrets=0

for pattern in "${secret_patterns[@]}"; do
    files_with_secrets=$(git grep -l "$pattern" -- "*.ts" "*.tsx" "*.js" "*.jsx" "*.json" 2>/dev/null || true)
    if [ -n "$files_with_secrets" ]; then
        log_warning "Pattern potentiellement secret trouvé : $pattern"
        echo "Fichiers : $files_with_secrets"
        found_secrets=$((found_secrets + 1))
    fi
done

if [ $found_secrets -eq 0 ]; then
    log_success "Aucun pattern secret détecté dans le code"
fi

echo ""
echo "3️⃣  Vérification de l'historique Git..."

# Vérifier l'historique pour des commits suspects
suspicious_commits=$(git log --oneline | grep -iE "(password|secret|key|token|api)" | head -5 || true)
if [ -n "$suspicious_commits" ]; then
    log_warning "Commits avec mots-clés suspects dans l'historique :"
    echo "$suspicious_commits"
    log_info "💡 Vérifiez ces commits pour des secrets accidentels"
fi

echo ""
echo "4️⃣  Vérification de la configuration..."

# Vérifier .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
        log_success ".gitignore protège les fichiers .env"
    else
        log_error ".gitignore ne protège pas les fichiers .env !"
        violations=$((violations + 1))
    fi
else
    log_error ".gitignore manquant !"
    violations=$((violations + 1))
fi

# Vérifier les hooks Git
if [ -f ".git/hooks/pre-commit" ]; then
    log_success "Hook pre-commit installé"
else
    log_warning "Hook pre-commit manquant (recommandé)"
fi

# Vérifier la présence d'un template
if [ -f ".env.template" ] || [ -f ".env.example" ]; then
    log_success "Template d'environnement présent"
else
    log_warning "Aucun template .env pour l'équipe"
    log_info "💡 Créez un .env.template pour faciliter l'onboarding"
fi

echo ""
echo "5️⃣  Vérification spécifique Dating App..."

# Vérifier les dossiers sensibles spécifiques
sensitive_dirs=("uploads" "backups" "secrets" "user-photos" "storage")
for dir in "${sensitive_dirs[@]}"; do
    if [ -d "$dir" ] && git ls-files | grep -q "^$dir/"; then
        log_warning "Dossier $dir/ contient des fichiers trackés"
        log_info "💡 Ajoutez $dir/ à .gitignore si contenu sensible"
    fi
done

# Vérifier les fichiers de config Next.js
if [ -f "next.config.js" ]; then
    if grep -q "env:" next.config.js; then
        log_warning "next.config.js expose des variables d'environnement"
        log_info "💡 Vérifiez qu'aucun secret n'est exposé côté client"
    fi
fi

# Vérifier prisma/schema.prisma pour des URLs en dur
if [ -f "prisma/schema.prisma" ]; then
    if grep -q "postgresql://.*password" prisma/schema.prisma; then
        log_error "URL de base avec mot de passe en dur dans schema.prisma !"
        violations=$((violations + 1))
    fi
fi

echo ""
echo "📊 RÉSUMÉ"
echo "========="

if [ $violations -eq 0 ]; then
    log_success "🎉 Aucune violation critique détectée !"
    echo ""
    echo "✅ Votre repo semble sécurisé pour les secrets"
    echo "✅ Bon travail sur la protection des données utilisateurs"
else
    log_error "🚨 $violations violation(s) critique(s) détectée(s) !"
    echo ""
    echo "🔧 Actions recommandées :"
    echo "1. Corriger les violations listées ci-dessus"
    echo "2. Faire tourner ce script après corrections"
    echo "3. Installer les hooks de sécurité Git"
    echo "4. Configurer git-secret ou un gestionnaire cloud"
fi

echo ""
echo "📋 Prochaines étapes recommandées :"
echo "1. 🔧 Installer hooks Git : ./setup-git-hooks.sh"
echo "2. 🔐 Configurer git-secret : git secret init"
echo "3. ☁️  Configurer gestionnaire cloud pour production"
echo "4. 📝 Créer .env.template pour l'équipe"
echo "5. 🧪 Tester régulièrement : ./security-check.sh"

echo ""
if [ $violations -gt 0 ]; then
    echo "⚠️  Pour un site de rencontre, la sécurité des données utilisateurs est CRITIQUE !"
    exit 1
else
    echo "🔒 Sécurité conforme pour votre Dating App !"
    exit 0
fi