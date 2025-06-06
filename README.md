This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

dotenv -e .env.local -- npx prisma studio

quentin.gerard1@test.com
zoe.lee0@example.com

# GUIDE COMPLET DES COMMANDES PRISMA

# ==================================

# 1. INSTALLATION & INITIALISATION

# ==================================

# Installer Prisma (si pas déjà fait)

npm install prisma --save-dev
npm install @prisma/client

# Initialiser Prisma dans votre projet

npx prisma init

# Initialiser avec une base de données spécifique

npx prisma init --datasource-provider postgresql
npx prisma init --datasource-provider mysql
npx prisma init --datasource-provider sqlite
npx prisma init --datasource-provider mongodb

# ==================================

# 2. SCHEMA & MIGRATIONS

# ==================================

# Valider votre schema.prisma (vérifier les erreurs)

npx prisma validate

# Formater votre schema.prisma

npx prisma format

# Créer une nouvelle migration

npx prisma migrate dev --name init
npx prisma migrate dev --name add-user-table
npx prisma migrate dev --name add-block-model

# Appliquer les migrations en production

npx prisma migrate deploy

# Réinitialiser la base de données (ATTENTION: supprime toutes les données!)

npx prisma migrate reset

# Voir l'état des migrations

npx prisma migrate status

# Créer une migration sans l'appliquer

npx prisma migrate dev --create-only

# Résoudre les problèmes de migration

npx prisma migrate resolve --applied "20231206123456_migration_name"
npx prisma migrate resolve --rolled-back "20231206123456_migration_name"

# ==================================

# 3. GÉNÉRATION DU CLIENT PRISMA

# ==================================

# Générer le client Prisma (après chaque modification du schema)

npx prisma generate

# Générer avec un output personnalisé

npx prisma generate --generator client

# ==================================

# 4. BASE DE DONNÉES

# ==================================

# Pousser le schema vers la base de données (sans migration)

# Utile pour le prototypage rapide

npx prisma db push

# Extraire le schema depuis une base existante (introspection)

npx prisma db pull

# Seed la base de données

npx prisma db seed

# Exécuter une commande SQL directe

npx prisma db execute --file ./script.sql
npx prisma db execute --stdin < ./script.sql

# ==================================

# 5. PRISMA STUDIO (Interface graphique)

# ==================================

# Ouvrir Prisma Studio pour visualiser/éditer les données

npx prisma studio

# Ouvrir sur un port spécifique

npx prisma studio --port 5555

# Ouvrir avec un schema spécifique

npx prisma studio --schema ./prisma/schema.prisma

# ==================================

# 6. COMMANDES UTILES POUR LE DÉVELOPPEMENT

# ==================================

# Voir la version de Prisma

npx prisma version

# Voir toutes les commandes disponibles

npx prisma --help

# Aide pour une commande spécifique

npx prisma migrate --help
npx prisma generate --help

# ==================================

# 7. WORKFLOW TYPIQUE

# ==================================

# Après avoir modifié schema.prisma:

# 1. Formater le schema

npx prisma format

# 2. Valider le schema

npx prisma validate

# 3. Créer une migration

npx prisma migrate dev --name description-of-changes

# 4. Le client est automatiquement généré, sinon:

npx prisma generate
