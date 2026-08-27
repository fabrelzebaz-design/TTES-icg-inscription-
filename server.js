require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Stockage temporaire des codes de vérification (en mémoire)
const verificationCodes = new Map();

// Configuration PostgreSQL (Hybride Render / Local)
const isProduction = process.env.DATABASE_URL ? true : false;
const poolConfig = isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        database: process.env.DB_NAME || 'ttes_db',
        password: process.env.DB_PASSWORD || '1234567',
        port: parseInt(process.env.DB_PORT) || 5432,
        ssl: false
      };

const pool = new Pool(poolConfig);

async function queryBDD(text, params = []) {
    return await pool.query(text, params);
}

// Configuration Nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,            // Port SSL obligatoire pour éviter les timeouts sur Render
    secure: true,          // Doit être à true pour le port 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialisation de la BDD
async function initDB() {
    try {
        await queryBDD(`
            CREATE TABLE IF NOT EXISTS utilisateurs (
                id SERIAL PRIMARY KEY,
                nom VARCHAR(255) NOT NULL,
                telephone VARCHAR(50) NOT NULL,
                email VARCHAR(255) NOT NULL,
                date_naissance VARCHAR(50),
                formation VARCHAR(255) NOT NULL,
                mode_formation VARCHAR(100) DEFAULT 'Présentiel',
                date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🗄️ Base de données PostgreSQL connectée !");
    } catch (err) {
        console.error("❌ Erreur BDD :", err.message);
    }
}

// -------------------------------------------------------------
// 1. Envoi du Code de Vérification (Étape 1 Inscription)
// -------------------------------------------------------------
app.post('/api/demander-code', async (req, res) => {
    const { email, nom } = req.body;

    if (!email || !nom) {
        return res.status(400).json({ success: false, message: "L'adresse e-mail et le nom sont requis." });
    }

    // Génération d'un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Sauvegarde temporaire du code (expire après 10 min)
    verificationCodes.set(email.toLowerCase().trim(), {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000
    });

    try {
        await transporter.sendMail({
            from: `"TTES-ICG ACADEMY" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Votre code de vérification d'inscription - TTES-ICG ACADEMY",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #cbd5e1; border-radius: 8px;">
                    <h2 style="color: #0F172A;">Bonjour ${nom},</h2>
                    <p>Voici votre code de confirmation pour valider votre pré-inscription :</p>
                    <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #2563EB;">
                        ${code}
                    </div>
                    <p style="margin-top: 15px; font-size: 13px; color: #64748B;">Ce code est valable pendant 10 minutes.</p>
                </div>
            `
        });

        console.log(`🔑 Code (${code}) envoyé à ${email}`);
        res.json({ success: true, message: "Code envoyé sur votre adresse e-mail !" });
    } catch (error) {
        console.error("❌ Erreur envoi code :", error.message);
        res.status(500).json({ success: false, message: "Impossible d'envoyer l'e-mail. Vérifiez votre adresse." });
    }
});

// -------------------------------------------------------------
// 2. Validation du Code & Inscription Finale (Étape 2 Inscription)
// -------------------------------------------------------------
app.post('/api/valider-inscription', async (req, res) => {
    const { nom, telephone, email, dateNaissance, date_naissance, formation, mode_formation, code } = req.body;
    const emailClean = email ? email.toLowerCase().trim() : '';

    const record = verificationCodes.get(emailClean);

    if (!record) {
        return res.status(400).json({ success: false, message: "Aucun code demandé pour cet e-mail." });
    }

    if (Date.now() > record.expiresAt) {
        verificationCodes.delete(emailClean);
        return res.status(400).json({ success: false, message: "Code expiré. Demandez-en un nouveau." });
    }

    if (record.code !== code.trim()) {
        return res.status(400).json({ success: false, message: "Code incorrect. Veuillez réespayer." });
    }

    // Le code est correct : Supprimer le code temporaire
    verificationCodes.delete(emailClean);

    try {
        const dateExacte = dateNaissance || date_naissance || null;
        const result = await queryBDD(
            `INSERT INTO utilisateurs (nom, telephone, email, date_naissance, formation, mode_formation) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [nom.trim(), telephone.trim(), emailClean, dateExacte, formation, mode_formation || 'Présentiel']
        );

        const etudiantInscrit = result.rows[0];

        // E-mail de confirmation finale + Alerte Admin
        envoyerEmailsConfirmation(etudiantInscrit);

        res.status(201).json({ 
            success: true, 
            id: etudiantInscrit.id, 
            etudiant: etudiantInscrit,
            message: "Inscription confirmée avec succès !" 
        });
    } catch (error) {
        console.error("Erreur Inscription BDD :", error);
        res.status(500).json({ success: false, message: "Erreur lors de l'enregistrement." });
    }
});

async function envoyerEmailsConfirmation(etudiant) {
    try {
        // Confirmation étudiant
        await transporter.sendMail({
            from: `"TTES-ICG ACADEMY" <${process.env.EMAIL_USER}>`,
            to: etudiant.email,
            subject: "Inscription Confirmée - TTES-ICG ACADEMY",
            html: `<h3>Félicitations ${etudiant.nom} !</h3><p>Votre pré-inscription à la formation <strong>${etudiant.formation}</strong> est validée.</p>`
        });

        // Alerte Admin
        await transporter.sendMail({
            from: `"Système TTES" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: "🔔 Nouvelle Inscription Confirmée !",
            html: `<p>L'étudiant <strong>${etudiant.nom}</strong> (${etudiant.email}) a validé son inscription pour la formation <strong>${etudiant.formation}</strong>.</p>`
        });
    } catch (err) {
        console.error("Erreur notifications finales :", err.message);
    }
}

// Admin & Profils
app.get('/api/etudiant/:id', async (req, res) => {
    try {
        const result = await queryBDD("SELECT * FROM utilisateurs WHERE id = $1", [req.params.id]);
        if (result.rows.length > 0) res.json({ success: true, etudiant: result.rows[0] });
        else res.status(404).json({ success: false, message: "Étudiant introuvable." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === (process.env.ADMIN_USER || 'fabrel') && password === (process.env.ADMIN_PASS || '1234567')) {
        res.json({ success: true, token: 'session_admin_active_ttes_2026' });
    } else {
        res.status(401).json({ success: false, message: "Identifiants invalides." });
    }
});

app.get('/api/admin/inscriptions', async (req, res) => {
    try {
        const result = await queryBDD("SELECT * FROM utilisateurs ORDER BY id DESC");
        res.json({ success: true, inscriptions: result.rows });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/etudiant/:id', async (req, res) => {
    try {
        await queryBDD("DELETE FROM utilisateurs WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
    console.log(`🚀 Serveur en ligne sur http://localhost:${PORT}`);
    initDB();
});