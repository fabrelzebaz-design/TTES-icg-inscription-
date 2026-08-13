const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// // 1. Configuration du Pool PostgreSQL ultra-résistant aux déconnexions Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 5000,       // Libère les connexions inactives après 5s
    connectionTimeoutMillis: 10000 // Timeout de connexion 10s
});

// Éviter le crash Node.js lors des fermetures de socket inattendues
pool.on('error', (err) => {
    // On ignore l'erreur d'arrière-plan car le pool rouvrira une connexion automatiquement
    console.log('ℹ️ Reconnexion BDD en arrière-plan...');
});

// Helper de requête sécurisé qui gère les reessais automatique si la connexion était morte
async function queryBDD(text, params, retries = 2) {
    while (retries >= 0) {
        try {
            const res = await pool.query(text, params);
            return res;
        } catch (err) {
            if (err.message.includes('Connection terminated') && retries > 0) {
                console.log('⚠️ Connexion expirée détectée, réessai instantané...');
                retries--;
                await new Promise(r => setTimeout(r, 500)); // Attendre 500ms et réessayer
            } else {
                throw err;
            }
        }
    }
}
// 2. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 3. Initialisation de la Table
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
        console.log("🗄️ Base de données PostgreSQL prête !");
    } catch (err) {
        console.error("❌ Erreur initDB :", err.message);
    }
}
initDB();

// 4. Route de Santé
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: "Serveur actif !" });
});

// 5. Traitement des Inscriptions
const handleInscription = async (req, res) => {
    const { nom, telephone, email, dateNaissance, formation, mode_formation } = req.body;

    if (!nom || !telephone || !email || !formation) {
        return res.status(400).json({ success: false, message: "Veuillez remplir tous les champs obligatoires." });
    }

    const cleanPhone = telephone.toString().replace(/[^0-9+]/g, '');

    try {
        const result = await queryBDD(
            `INSERT INTO utilisateurs (nom, telephone, email, date_naissance, formation, mode_formation) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [nom.trim(), cleanPhone, email.trim(), dateNaissance || null, formation, mode_formation || 'Présentiel']
        );

        const newId = result.rows[0].id;
        return res.status(201).json({ success: true, id: newId, message: "Inscription réussie !" });
    } catch (error) {
        console.error("Erreur Inscription :", error.message);
        return res.status(500).json({ success: false, message: `Erreur BDD: ${error.message}` });
    }
};

app.post('/api/inscription', handleInscription);
app.post('/api/inscriptions', handleInscription);

// 6. Espace Étudiant
app.get('/api/etudiant/:id', async (req, res) => {
    try {
        const result = await queryBDD("SELECT * FROM utilisateurs WHERE id = $1", [req.params.id]);
        if (result.rows.length > 0) {
            res.json({ success: true, etudiant: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: "Étudiant non trouvé." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

app.put('/api/etudiant/:id', async (req, res) => {
    const { nom, telephone, email, formation, mode_formation } = req.body;
    try {
        await queryBDD(
            `UPDATE utilisateurs SET nom=$1, telephone=$2, email=$3, formation=$4, mode_formation=$5 WHERE id=$6`,
            [nom, telephone, email, formation, mode_formation || 'Présentiel', req.params.id]
        );
        res.json({ success: true, message: "Modifications enregistrées !" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur modification." });
    }
});

// 7. Espace Admin
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'fabrel';
    const adminPass = process.env.ADMIN_PASS || '1234567';

    if (username === adminUser && password === adminPass) {
        res.json({ success: true, token: 'session_admin_active_ttes_2026' });
    } else {
        res.status(401).json({ success: false, message: "Identifiants incorrects." });
    }
});

app.get('/api/admin/inscriptions', async (req, res) => {
    try {
        const result = await queryBDD("SELECT * FROM utilisateurs ORDER BY id DESC");
        res.json({ success: true, inscriptions: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

// 8. Export CSV
app.get('/api/admin/export-csv', async (req, res) => {
    try {
        const result = await queryBDD("SELECT * FROM utilisateurs ORDER BY id DESC");
        let csv = "ID;Nom complet;Téléphone;Email;Formation;Mode;Date\n";
        result.rows.forEach(r => {
            const dateInscrip = r.date_inscription ? new Date(r.date_inscription).toLocaleDateString('fr-FR') : '';
            csv += `"${r.id}";"${r.nom}";"${r.telephone}";"${r.email}";"${r.formation}";"${r.mode_formation || 'Présentiel'}";"${dateInscrip}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=Inscriptions_TTES.csv');
        res.status(200).send('\uFEFF' + csv);
    } catch (error) {
        res.status(500).send("Erreur génération CSV");
    }
});

// 9. Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 10. Gestionnaire 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route introuvable." });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});