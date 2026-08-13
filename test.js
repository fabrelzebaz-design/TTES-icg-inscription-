require('dotenv').config();
const nodemailer = require('nodemailer');

console.log("--> Test d'envoi depuis :", process.env.EMAIL_USER);

// Configuration Nodemailer optimisée (Port 587 + STARTTLS)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // false pour le port 587, true pour le port 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Évite les blocages de certificats en local/réseau
    }
});

transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // Tu t'envoies un mail à toi-même
    subject: "Test TTES Direct",
    text: "Si tu reçois ce message, Nodemailer fonctionne !"
}, (err, info) => {
    if (err) {
        console.error("❌ ERREUR EXACTE :", err);
    } else {
        console.log("✅ SUCCÈS ! Message envoyé :", info.response);
    }
});