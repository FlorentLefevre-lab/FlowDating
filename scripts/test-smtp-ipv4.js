// Test SMTP avec IP directe
require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function test() {
  console.log('Test connexion SMTP avec IPv4 direct...\n');

  const transporter = nodemailer.createTransport({
    host: '83.166.143.45', // IPv4 direct instead of hostname
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      servername: 'mail.infomaniak.com', // Pour la validation TLS
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
  });

  try {
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie avec IPv4 !');

    // Test envoi si email fourni
    const testEmail = process.argv[2];
    if (testEmail) {
      console.log(`\nEnvoi email de test à ${testEmail}...`);
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: testEmail,
        subject: 'Test Flow Dating - IPv4',
        text: 'Connexion SMTP IPv4 fonctionnelle !',
        html: '<h1>Test réussi !</h1><p>Connexion SMTP IPv4 fonctionnelle !</p>',
      });
      console.log('✅ Email envoyé !');
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }

  process.exit(0);
}

test();
