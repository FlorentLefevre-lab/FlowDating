// scripts/check-user-by-id.js
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function main() {
  const userId = 'cmlama2lk0000s5posneezm3z';
  const prisma = new PrismaClient();

  try {
    console.log('Recherche utilisateur avec ID:', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        accountStatus: true,
        createdAt: true,
        onboardingCompletedAt: true
      }
    });

    if (user) {
      console.log('\n✅ Utilisateur TROUVÉ:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('\n❌ Utilisateur NON TROUVÉ avec ID:', userId);

      // Chercher tous les utilisateurs pour debug
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
        take: 10
      });
      console.log('\n📋 Utilisateurs existants (max 10):');
      allUsers.forEach(u => console.log(`  - ${u.id} | ${u.email} | ${u.name}`));
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
