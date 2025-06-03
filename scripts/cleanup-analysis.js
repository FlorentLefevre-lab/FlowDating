const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Analyse du code mort...\n');

// 1. Knip - Analyse complète
console.log('📊 Knip - Analyse complète:');
try {
  execSync('npx knip', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Erreurs détectées par Knip\n');
}

// 2. Dépendances inutilisées
console.log('📦 Dépendances inutilisées:');
try {
  execSync('npx depcheck', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Dépendances inutilisées détectées\n');
}

// 3. Imports inutilisés (ESLint)
console.log('🔗 Imports inutilisés:');
try {
  execSync('npx eslint . --ext .js,.jsx,.ts,.tsx --rule "unused-imports/no-unused-imports: error"', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Imports inutilisés détectés\n');
}

console.log('✅ Analyse terminée!');