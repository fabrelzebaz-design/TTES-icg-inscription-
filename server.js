const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT =  process.env.PORT || 3000;

// Connexion à PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialisation de la table BDD
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS utilisateurs (
                id SERIAL PRIMARY KEY,
                nom VARCHAR(255) NOT NULL,
                telephone VARCHAR(20) NOT NULL,
                email VARCHAR(255) NOT NULL,
                date_naissance VARCHAR(50),
                formation VARCHAR(255) NOT NULL,
                date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🗄️ Base de données PostgreSQL prête !");
    } catch (err) {
        console.error("❌ Erreur BDD :", err);
    }
}
initDB();

// 1. Route de Santé (Healthcheck)
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: "Serveur TTES-ICG et PostgreSQL opérationnels !" });
});

// 2. Traitement des Inscriptions
const handleInscription = async (req, res) => {
    const { nom, telephone, email, dateNaissance, formation } = req.body;

    // Validation des champs obligatoires
    if (!nom || !telephone || !email || !formation) {
        return res.status(400).json({ success: false, message: "Veuillez remplir tous les champs obligatoires." });
    }

    // CORRECTION MAJEURE : Nettoyage et assouplissement du téléphone (acceptation des numéros internationaux)
    const cleanPhone = telephone.toString().replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        return res.status(400).json({ success: false, message: "Numéro de téléphone invalide (entre 8 et 15 chiffres attendus)." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO utilisateurs (nom, telephone, email, date_naissance, formation) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [nom.trim(), cleanPhone, email.trim(), dateNaissance || null, formation]
        );

        const newId = result.rows[0].id;
        return res.status(201).json({ success: true, id: newId, message: "Inscription réussie !" });
    } catch (error) {
        console.error("Erreur Inscription :", error);
        return res.status(500).json({ success: false, message: "Erreur serveur BDD." });
    }
};

// Routes d'inscriptions (Singulier + Pluriel)
app.post('/api/inscription', handleInscription);
app.post('/api/inscriptions', handleInscription);

// 3. Espace Étudiant
app.get('/api/etudiant/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM utilisateurs WHERE id = $1", [req.params.id]);
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
    const { nom, telephone, email, formation } = req.body;
    try {
        await pool.query(
            `UPDATE utilisateurs SET nom=$1, telephone=$2, email=$3, formation=$4 WHERE id=$5`,
            [nom, telephone, email, formation, req.params.id]
        );
        res.json({ success: true, message: "Modifications enregistrées !" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur modification." });
    }
});

// 4. Espace Admin
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
        const result = await pool.query("SELECT * FROM utilisateurs ORDER BY id DESC");
        res.json({ success: true, inscriptions: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

// 5. Export CSV
app.get('/api/admin/export-csv', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM utilisateurs ORDER BY id DESC");
        let csv = "ID;Nom complet;Téléphone;Email;Formation;Date\n";
        result.rows.forEach(r => {
            const dateInscrip = r.date_inscription ? new Date(r.date_inscription).toLocaleDateString('fr-FR') : '';
            csv += `"${r.id}";"${r.nom}";"${r.telephone}";"${r.email}";"${r.formation}";"${dateInscrip}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=Inscriptions_TTES.csv');
        res.status(200).send('\uFEFF' + csv);
    } catch (error) {
        res.status(500).send("Erreur génération CSV");
    }
});

// Servir la page d'accueil par défaut
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Gestion propre des routes non trouvées (404) au lieu du Catch-all destructeur
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route introuvable sur le serveur." });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});