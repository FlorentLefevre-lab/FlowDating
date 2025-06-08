# Guide Pratique de Déploiement Dating App

## 🚀 Première Installation

### 1. Configuration initiale

```bash
# Cloner votre projet
git clone https://github.com/votre-username/dating-app.git
cd dating-app

# Rendre le script exécutable
chmod +x deploy.sh

# Configurer l'environnement de développement
./deploy.sh setup docker
```

### 2. Remplir vos variables d'environnement

Le script a créé `.env.docker`. Éditez-le avec vos vraies valeurs :

```bash
nano .env.docker
```

**Variables essentielles à remplir :**

```env
# OAuth Google (console.developers.google.com)
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre-secret

# OAuth Facebook (developers.facebook.com)
FACEBOOK_CLIENT_ID=1234567890123456
FACEBOOK_CLIENT_SECRET=abcdef123456789

# Email Gmail
EMAIL_SERVER_USER=votre-app@gmail.com
EMAIL_SERVER_PASSWORD=votre-mot-de-passe-app

# Cloudinary (cloudinary.com)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnop

# Stream.io (getstream.io)
STREAM_API_KEY=votre-api-key
STREAM_API_SECRET=votre-secret
```

### 3. Premier déploiement

```bash
# Déployer en développement Docker
./deploy.sh deploy docker
```

✅ **Votre app est maintenant disponible sur http://localhost:3000**

---

## 🔄 Workflow de Développement Quotidien

### Développement local (sans Docker)
```bash
npm run dev
```

### Développement avec Docker
```bash
./deploy.sh deploy docker
```

### Voir les logs
```bash
./deploy.sh logs dating-app
```

### Accéder à la base de données
```bash
# Via Adminer : http://localhost:8080
# Serveur: database
# Utilisateur: postgres
# Mot de passe: datingapp2024
# Base: dating_app
```

### Migrations Prisma
```bash
./deploy.sh shell dating-app
npx prisma migrate dev
npx prisma db seed
```

---

## 🌐 Déploiement en Production

### 1. Configuration de production

```bash
./deploy.sh setup production
```

### 2. Variables de production

Éditez `.env.production` avec vos vraies valeurs :

```env
# URL de production
NEXTAUTH_URL=https://votre-domaine.com
DATABASE_URL=postgresql://user:password@votre-db-host:5432/dating_app

# OAuth avec URLs de production
GOOGLE_CLIENT_ID=votre-prod-google-id
FACEBOOK_CLIENT_ID=votre-prod-facebook-id

# Email de production
EMAIL_FROM=noreply@votre-domaine.com

# Cloudinary de production
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=votre-prod-cloud
```

### 3. Déploiement automatique

```bash
./deploy.sh deploy production
```

---

## 📊 Exemples Concrets par Hébergeur

### DigitalOcean Droplet

```bash
# 1. Créer un droplet Ubuntu
# 2. Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Cloner et déployer
git clone https://github.com/votre-username/dating-app.git
cd dating-app
chmod +x deploy.sh
./deploy.sh setup production

# 4. Configurer le domaine dans .env.production
NEXTAUTH_URL=https://votre-domaine.com

# 5. Déployer
./deploy.sh deploy production
```

### Railway

```bash
# 1. Installer Railway CLI
npm install -g @railway/cli

# 2. Login et créer projet
railway login
railway init

# 3. Configurer les variables d'environnement
railway variables set NEXTAUTH_URL=https://votre-app.railway.app
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
# ... autres variables

# 4. Déployer
railway up
```

### Render

1. Connecter votre repo GitHub à Render
2. Configurer les variables d'environnement dans le dashboard
3. Déploiement automatique sur chaque push

### AWS/VPS quelconque

```bash
# Script d'installation automatique
curl -o install.sh https://raw.githubusercontent.com/votre-username/dating-app/main/scripts/install.sh
chmod +x install.sh
./install.sh
```

---

## 🔧 Commandes Utiles

### Gestion des services
```bash
./deploy.sh status          # Voir l'état des services
./deploy.sh logs dating-app  # Logs de l'app
./deploy.sh logs database    # Logs de la base
./deploy.sh shell dating-app # Accéder au container
./deploy.sh stop             # Arrêter tout
```

### Gestion des données
```bash
./deploy.sh backup                    # Créer une sauvegarde
./deploy.sh restore backups/backup.sql # Restaurer
```

### Maintenance
```bash
./deploy.sh clean  # Nettoyer les containers/volumes
```

---

## 🚨 Dépannage

### L'application ne démarre pas
```bash
./deploy.sh logs dating-app
# Vérifier les variables d'environnement
# Vérifier que la base de données est accessible
```

### Erreur de connexion base de données
```bash
# Vérifier que PostgreSQL est démarré
./deploy.sh logs database

# Tester la connexion
./deploy.sh shell dating-app
npx prisma db pull
```

### Variables d'environnement manquantes
```bash
# Le script valide automatiquement les variables requises
./deploy.sh setup docker
```

---

## 📈 Monitoring (Production)

### Activer le monitoring
```bash
# Démarrer avec monitoring
docker-compose --profile monitoring up -d

# Accéder aux dashboards
# Prometheus: http://votre-ip:9090
# Grafana: http://votre-ip:3001
```

### Métriques surveillées
- Temps de réponse API
- Utilisation mémoire/CPU
- Connexions base de données
- Erreurs applicatives
- Taux de matches/messages

---

## 🔄 Migration d'Hébergeur

### Export complet
```bash
# 1. Créer sauvegarde
./deploy.sh backup

# 2. Exporter l'image Docker
docker save dating-app > dating-app-image.tar

# 3. Copier sur nouveau serveur
scp dating-app-image.tar user@nouveau-serveur:/tmp/
scp .env.production user@nouveau-serveur:/tmp/
scp docker-compose.production.yml user@nouveau-serveur:/tmp/
```

### Import sur nouveau serveur
```bash
# 1. Charger l'image
docker load < /tmp/dating-app-image.tar

# 2. Configurer
cp /tmp/.env.production .env.production
cp /tmp/docker-compose.production.yml .

# 3. Déployer
./deploy.sh deploy production

# 4. Restaurer les données
./deploy.sh restore /tmp/backup.sql
```

**⚡ Migration complète en moins de 30 minutes !**