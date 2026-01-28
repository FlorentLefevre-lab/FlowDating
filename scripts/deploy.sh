#!/bin/bash
# deploy.sh - Script de déploiement automatisé

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    command -v docker >/dev/null 2>&1 || { log_error "Docker n'est pas installé"; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { log_error "Docker Compose n'est pas installé"; exit 1; }
    
    log_success "Prérequis OK"
}

# Fonction pour générer les secrets
generate_secrets() {
    local env_file=$1
    log_info "Génération des secrets pour $env_file..."
    
    # Générer NEXTAUTH_SECRET si vide
    if ! grep -q "NEXTAUTH_SECRET=.\+" "$env_file" 2>/dev/null; then
        local nextauth_secret=$(openssl rand -base64 32)
        echo "NEXTAUTH_SECRET=$nextauth_secret" >> "$env_file"
        log_success "NEXTAUTH_SECRET généré"
    fi
    
    # Générer mot de passe PostgreSQL si nécessaire
    if ! grep -q "POSTGRES_PASSWORD=.\+" "$env_file" 2>/dev/null; then
        local postgres_password=$(openssl rand -base64 16)
        echo "POSTGRES_PASSWORD=$postgres_password" >> "$env_file"
        log_success "POSTGRES_PASSWORD généré"
    fi
}

# Fonction pour valider les variables d'environnement
validate_env() {
    local env_file=$1
    log_info "Validation des variables d'environnement..."
    
    # Variables obligatoires
    local required_vars=(
        "DATABASE_URL"
        "NEXTAUTH_URL"
        "NEXTAUTH_SECRET"
        "EMAIL_SERVER_HOST"
        "EMAIL_SERVER_USER"
        "EMAIL_SERVER_PASSWORD"
        "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
        "CLOUDINARY_API_KEY"
        "CLOUDINARY_API_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=.\+" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Variables manquantes dans $env_file:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi
    
    log_success "Variables d'environnement validées"
}

# Fonction pour configurer l'environnement
setup_environment() {
    local environment=$1
    log_info "Configuration de l'environnement: $environment"
    
    case $environment in
        "dev")
            ENV_FILE=".env.local"
            COMPOSE_FILE="docker-compose.yml"
            ;;
        "docker")
            ENV_FILE=".env.docker"
            COMPOSE_FILE="docker-compose.yml"
            ;;
        "staging")
            ENV_FILE=".env.staging"
            COMPOSE_FILE="docker-compose.staging.yml"
            ;;
        "production")
            ENV_FILE=".env.production"
            COMPOSE_FILE="docker-compose.production.yml"
            ;;
        *)
            log_error "Environnement non supporté: $environment"
            exit 1
            ;;
    esac
    
    # Créer le fichier d'environnement s'il n'existe pas
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "$ENV_FILE n'existe pas, création à partir du template..."
        cp .env.example "$ENV_FILE"
        
        # Adapter les variables pour Docker si nécessaire
        if [ "$environment" = "docker" ]; then
            sed -i 's/localhost:5432/database:5432/g' "$ENV_FILE"
        fi
    fi
    
    # Générer les secrets manquants
    generate_secrets "$ENV_FILE"
    
    # Valider les variables
    validate_env "$ENV_FILE"
    
    log_success "Environnement $environment configuré"
}

# Fonction pour construire et déployer
deploy() {
    local environment=$1
    log_info "Déploiement en cours pour: $environment"
    
    # Charger les variables d'environnement
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    # Construire l'image Docker
    log_info "Construction de l'image Docker..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Arrêter les anciens containers
    log_info "Arrêt des anciens containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Démarrer les services de base
    log_info "Démarrage des services de base..."
    docker-compose -f "$COMPOSE_FILE" up -d database
    
    # Attendre que PostgreSQL soit prêt
    log_info "Attente de PostgreSQL..."
    timeout 60 bash -c 'until docker-compose -f "$COMPOSE_FILE" exec database pg_isready -U postgres; do sleep 2; done'
    
    # Exécuter les migrations
    log_info "Exécution des migrations Prisma..."
    docker-compose -f "$COMPOSE_FILE" run --rm dating-app npx prisma migrate deploy
    
    # Démarrer l'application
    log_info "Démarrage de l'application..."
    docker-compose -f "$COMPOSE_FILE" up -d dating-app
    
    # Vérifier le statut
    sleep 10
    if docker-compose -f "$COMPOSE_FILE" ps dating-app | grep -q "Up"; then
        log_success "Déploiement réussi!"
        log_info "Application disponible sur: $(grep NEXTAUTH_URL "$ENV_FILE" | cut -d'=' -f2)"
    else
        log_error "Échec du déploiement"
        docker-compose -f "$COMPOSE_FILE" logs dating-app
        exit 1
    fi
}

# Fonction pour créer une sauvegarde
backup() {
    log_info "Création d'une sauvegarde..."
    
    mkdir -p backups
    local backup_file="backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    docker-compose -f "$COMPOSE_FILE" exec database pg_dump -U postgres dating_app > "$backup_file"
    
    log_success "Sauvegarde créée: $backup_file"
}

# Fonction pour restaurer une sauvegarde
restore() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Fichier de sauvegarde introuvable: $backup_file"
        exit 1
    fi
    
    log_warning "Restauration de la sauvegarde: $backup_file"
    read -p "Êtes-vous sûr? Cela supprimera toutes les données actuelles (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f "$COMPOSE_FILE" exec database psql -U postgres -d dating_app -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        cat "$backup_file" | docker-compose -f "$COMPOSE_FILE" exec -T database psql -U postgres -d dating_app
        log_success "Sauvegarde restaurée"
    else
        log_info "Restauration annulée"
    fi
}

# Fonction pour afficher l'aide
show_help() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  setup <env>     - Configurer l'environnement (dev|docker|staging|production)"
    echo "  deploy <env>    - Déployer l'application"
    echo "  backup          - Créer une sauvegarde de la base de données"
    echo "  restore <file>  - Restaurer une sauvegarde"
    echo "  logs [service]  - Afficher les logs"
    echo "  shell [service] - Accéder au shell d'un service"
    echo "  status          - Afficher le statut des services"
    echo "  stop            - Arrêter tous les services"
    echo "  clean           - Nettoyer les containers et volumes"
    echo ""
    echo "Examples:"
    echo "  $0 setup docker"
    echo "  $0 deploy production"
    echo "  $0 backup"
    echo "  $0 logs dating-app"
}

# Script principal
main() {
    case $1 in
        "setup")
            check_prerequisites
            setup_environment "$2"
            ;;
        "deploy")
            check_prerequisites
            setup_environment "$2"
            backup
            deploy "$2"
            ;;
        "backup")
            backup
            ;;
        "restore")
            restore "$2"
            ;;
        "logs")
            docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
            ;;
        "shell")
            docker-compose -f "$COMPOSE_FILE" exec "${2:-dating-app}" sh
            ;;
        "status")
            docker-compose -f "$COMPOSE_FILE" ps
            ;;
        "stop")
            docker-compose -f "$COMPOSE_FILE" down
            ;;
        "clean")
            docker-compose -f "$COMPOSE_FILE" down -v
            docker system prune -f
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            log_error "Commande inconnue: $1"
            show_help
            exit 1
            ;;
    esac
}

# Exécuter le script
main "$@"