// Script de diagnostic email - Flow Dating
// Usage: node scripts/diagnose-email.js

require('dotenv').config({ path: '.env.local' });

const nodemailer = require('nodemailer');
const Redis = require('ioredis');
const crypto = require('crypto');
const dns = require('dns');

// Custom DNS lookup that forces IPv4
const ipv4Lookup = (hostname, options, callback) => {
  const opts = typeof options === 'object' ? { ...options, family: 4 } : { family: 4 };
  return dns.lookup(hostname, opts, callback);
};

console.log('============================================================');
console.log(' DIAGNOSTIC EMAIL - Flow Dating');
console.log('============================================================\n');

async function diagnose() {
  const results = {
    env: { status: 'pending' },
    redis: { status: 'pending' },
    smtp: { status: 'pending' },
    fullTest: { status: 'pending' }
  };

  // 1. Vérifier les variables d'environnement
  console.log('1️⃣  VARIABLES D\'ENVIRONNEMENT\n');

  const envVars = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : undefined,
    SMTP_FROM: process.env.SMTP_FROM,
    REDIS_URL: process.env.REDIS_URL ? 'redis://***' + process.env.REDIS_URL.slice(-20) : undefined,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL
  };

  let envOk = true;
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      console.log(`   ❌ ${key}: MANQUANT`);
      envOk = false;
    } else {
      console.log(`   ✅ ${key}: ${value}`);
    }
  }
  results.env.status = envOk ? '✅ OK' : '❌ ERREUR';
  console.log();

  // 2. Tester Redis
  console.log('2️⃣  CONNEXION REDIS\n');

  let redis;
  try {
    redis = new Redis(process.env.REDIS_URL, {
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3
    });

    console.log('   Status initial:', redis.status);

    // Test ping
    const pong = await redis.ping();
    console.log('   PING:', pong);

    // Test write/read
    const testKey = 'diag-test:' + Date.now();
    await redis.setex(testKey, 10, 'test-value');
    const testValue = await redis.get(testKey);
    await redis.del(testKey);

    if (testValue === 'test-value') {
      console.log('   ✅ Lecture/écriture OK');
      results.redis.status = '✅ OK';
    } else {
      console.log('   ❌ Erreur lecture/écriture');
      results.redis.status = '❌ ERREUR';
    }
  } catch (error) {
    console.log('   ❌ ERREUR Redis:', error.message);
    results.redis.status = '❌ ERREUR: ' + error.message;
  }
  console.log();

  // 3. Tester SMTP
  console.log('3️⃣  CONNEXION SMTP\n');

  try {
    const port = parseInt(process.env.SMTP_PORT || '587');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      family: 4, // Force IPv4
      dnsLookup: ipv4Lookup, // Custom DNS lookup to ensure IPv4
    });

    await transporter.verify();
    console.log('   ✅ Connexion SMTP réussie');
    console.log('   Host:', process.env.SMTP_HOST);
    console.log('   Port:', port);
    results.smtp.status = '✅ OK';
  } catch (error) {
    console.log('   ❌ ERREUR SMTP:', error.message);
    results.smtp.status = '❌ ERREUR: ' + error.message;
  }
  console.log();

  // 4. Test complet (simulation de sendEmailVerification)
  console.log('4️⃣  TEST COMPLET (simulation sendEmailVerification)\n');

  try {
    // Générer token comme dans email.ts
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const email = 'test@example.com';

    console.log('   Token généré:', token.substring(0, 16) + '...');
    console.log('   Hash:', hashedToken.substring(0, 16) + '...');

    // Stocker dans Redis
    await redis.setex(
      `email-verify:${hashedToken}`,
      24 * 60 * 60,
      JSON.stringify({
        email: email,
        createdAt: Date.now()
      })
    );
    console.log('   ✅ Token stocké dans Redis');

    // Vérifier le stockage
    const stored = await redis.get(`email-verify:${hashedToken}`);
    if (stored) {
      console.log('   ✅ Token récupéré de Redis');
    }

    // Cleanup
    await redis.del(`email-verify:${hashedToken}`);

    // Créer transporter
    const port = parseInt(process.env.SMTP_PORT || '587');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
    });

    console.log('   ✅ Transporter SMTP créé');

    // Le test d'envoi réel est optionnel
    console.log('   ℹ️  Pour tester l\'envoi réel: node scripts/diagnose-email.js votreemail@example.com');

    results.fullTest.status = '✅ OK';
  } catch (error) {
    console.log('   ❌ ERREUR:', error.message);
    console.log('   Stack:', error.stack);
    results.fullTest.status = '❌ ERREUR: ' + error.message;
  }
  console.log();

  // Envoi réel si email fourni
  if (process.argv[2]) {
    const testEmail = process.argv[2];
    console.log('5️⃣  ENVOI EMAIL RÉEL à', testEmail, '\n');

    try {
      const port = parseInt(process.env.SMTP_PORT || '587');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
      });

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: testEmail,
        subject: '[DIAGNOSTIC] Flow Dating - Test Email',
        html: `
          <h1>✅ Test de diagnostic réussi!</h1>
          <p>Si vous recevez cet email, la configuration SMTP fonctionne.</p>
          <p>Envoyé le ${new Date().toLocaleString('fr-FR')}</p>
        `,
      });

      console.log('   ✅ Email envoyé!');
      console.log('   Message ID:', info.messageId);
      console.log('   Réponse:', info.response);
    } catch (error) {
      console.log('   ❌ ERREUR envoi:', error.message);
    }
    console.log();
  }

  // Résumé
  console.log('============================================================');
  console.log(' RÉSUMÉ');
  console.log('============================================================\n');
  console.log('   Variables env:', results.env.status);
  console.log('   Redis:        ', results.redis.status);
  console.log('   SMTP:         ', results.smtp.status);
  console.log('   Test complet: ', results.fullTest.status);
  console.log();

  // Fermer Redis
  if (redis) {
    await redis.quit();
  }
}

diagnose().catch(console.error);
