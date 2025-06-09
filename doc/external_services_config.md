# Configuration des Services Externes

## 🔐 Google OAuth

### 1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)

### 2. Créer un projet (si nécessaire)

```
Nom: Dating App
```

### 3. Activer l'API Google+

```
APIs & Services > Enable APIs > Google+ API
```

### 4. Créer les identifiants OAuth

```
APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID

Application type: Web application
Name: Dating App
Authorized JavaScript origins:
- http://localhost:3000 (dev)
- https://votre-domaine.com (prod)

Authorized redirect URIs:
- http://localhost:3000/api/auth/callback/google (dev)
- https://votre-domaine.com/api/auth/callback/google (prod)
```

### 5. Copier dans .env

```env
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre-secret
```

---

## 📘 Facebook OAuth

### 1. Aller sur [Facebook Developers](https://developers.facebook.com/)

### 2. Créer une app

```
App Type: Consumer
App Name: Dating App
```

### 3. Configurer Facebook Login

```
Products > Facebook Login > Settings

Valid OAuth Redirect URIs:
- http://localhost:3000/api/auth/callback/facebook (dev)
- https://votre-domaine.com/api/auth/callback/facebook (prod)
```

### 4. Copier dans .env

```env
FACEBOOK_CLIENT_ID=1234567890123456
FACEBOOK_CLIENT_SECRET=abcdef123456789
```

---

## ☁️ Cloudinary

### 1. S'inscrire sur [Cloudinary](https://cloudinary.com/)

### 2. Aller dans Dashboard

```
Account Details > Copy:
- Cloud Name
- API Key
- API Secret
```

### 3. Créer un Upload Preset

```
Settings > Upload > Add upload preset
Upload preset name: dating_app_photos
Signing Mode: Unsigned
Folder: dating-app/profiles
```

### 4. Copier dans .env

```dans env.local
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=votre-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=dating_app_photos
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnop
```

---

## 💬 Stream.io (Chat & Vidéo)

### 1. S'inscrire sur [Stream.io](https://getstream.io/)

### 2. Créer une app

```
App Name: Dating App
Environment: Development (puis Production)
```

### 3. Copier les clés

```dans env.local
STREAM_API_KEY=votre-api-key
STREAM_API_SECRET=votre-secret
```

---

## 🔥 Firebase (Notifications Push)

### 1. Aller sur [Firebase Console](https://console.firebase.google.com/)

### 2. Créer un projet

```
Project Name: Dating App
```

### 3. Ajouter une app Web

```
App Name: Dating App Web
```

### 4. Génerer une clé privée

```
Project Settings > Service Accounts > Generate new private key
```

### 5. Copier dans .env

```dans env.local
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nvotre-clé\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@votre-project.iam.gserviceaccount.com
```

---

## 📧 Email (Gmail)

### 1. Activer l'authentification à 2 facteurs

Sur votre compte Gmail

### 2. Générer un mot de passe d'application

```
Account Settings > Security > 2-Step Verification > App passwords
Name: Dating App
```

### 3. Copier dans .env

```dans env.local
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=votre-email@gmail.com
EMAIL_FROM=votre-email@gmail.com
EMAIL_SERVER_PASSWORD=abcd-efgh-ijkl-mnop
```

---

## 🔧 Script de Vérification

### Créer verify-config.js

```javascript
// scripts/verify-config.js
const https = require("https");

async function verifyGoogle() {
  // Vérifier la configuration Google OAuth
  console.log("🔍 Vérification Google OAuth...");
  // Code de vérification
}

async function verifyFacebook() {
  // Vérifier la configuration Facebook
  console.log("🔍 Vérification Facebook OAuth...");
  // Code de vérification
}

async function verifyCloudinary() {
  // Vérifier Cloudinary
  console.log("🔍 Vérification Cloudinary...");
  // Code de vérification
}

async function verifyEmail() {
  // Vérifier la configuration email
  console.log("🔍 Vérification Email...");
  // Code de vérification
}

async function main() {
  console.log("🚀 Vérification de la configuration...\n");

  await verifyGoogle();
  await verifyFacebook();
  await verifyCloudinary();
  await verifyEmail();

  console.log("\n✅ Configuration vérifiée!");
}

main().catch(console.error);
```

### Exécuter la vérification

```bash
node scripts/verify-config.js
```

---

## 📋 Checklist de Production

### Avant le déploiement

- [ ] Variables d'environnement configurées
- [ ] OAuth callbacks mis à jour avec le vrai domaine
- [ ] Cloudinary configuré pour la production
- [ ] Certificat SSL configuré
- [ ] Domaine configuré
- [ ] Backups automatiques activés
- [ ] Monitoring configuré

### URLs de callback à mettre à jour

Remplacer `localhost:3000` par votre vrai domaine dans :

- [ ] Google OAuth redirect URIs
- [ ] Facebook OAuth redirect URIs
- [ ] NEXTAUTH_URL dans .env.production

### Test de production

```bash
# Tester toutes les fonctionnalités
./deploy.sh deploy production

# Vérifier les logs
./deploy.sh logs dating-app

# Tester l'inscription/connexion
# Tester l'upload de photos
# Tester le chat
# Tester les notifications
```

---

## 🆘 Support et Dépannage

### Erreurs communes

**OAuth Error: redirect_uri_mismatch**

```
Solution: Vérifier les URLs de callback dans Google/Facebook
```

**Cloudinary Upload Failed**

```
Solution: Vérifier le upload preset et les permissions
```

**Email not sending**

```
Solution: Vérifier le mot de passe d'application Gmail
```

**NextAuth Error**

```
Solution: Vérifier NEXTAUTH_URL et NEXTAUTH_SECRET
```

### Logs utiles

```bash
# Logs de l'application
./scripts/deploy.sh logs dating-app

# Logs de la base de données
./scripts/deploy.sh logs database

# Logs en temps réel
./scripts/deploy.sh logs dating-app -f
```
