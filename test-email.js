const nodemailer = require('nodemailer')

const config = {
  EMAIL_SERVER_HOST: 'smtp.gmail.com',
  EMAIL_SERVER_PORT: 587,
  EMAIL_SERVER_USER: 'lefevre.florent@gmail.com',
  EMAIL_SERVER_PASSWORD: 'ptexazwshvxfneti',  // Sans espaces
  EMAIL_FROM: 'lefevre.florent@gmail.com'     // Même email que USER
}

console.log('🧪 Test direct Gmail (version corrigée)')
console.log('Host:', config.EMAIL_SERVER_HOST)
console.log('User:', config.EMAIL_SERVER_USER)
console.log('From:', config.EMAIL_FROM)

const transporter = nodemailer.createTransport({
  host: config.EMAIL_SERVER_HOST,
  port: config.EMAIL_SERVER_PORT,
  secure: false,
  auth: {
    user: config.EMAIL_SERVER_USER,
    pass: config.EMAIL_SERVER_PASSWORD,
  },
})

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: 'florent.lefevre3@free.fr',
      subject: '🧪 Test Gmail corrigé - LoveApp',
      html: '<h1>Test version corrigée</h1><p>Email envoyé depuis lefevre.florent@gmail.com</p>',
    })

    console.log('✅ Email envoyé:', info.messageId)
    console.log('📧 Response:', info.response)
  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error('Code d\'erreur:', error.code)
  }
}

testEmail()