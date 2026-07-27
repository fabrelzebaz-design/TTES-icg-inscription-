const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connexion à la base de données PostgreSQL (Neon / Render)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialisation automatique de la table PostgreSQL
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
        console.log("🗄️ Base de données PostgreSQL prête et connectée !");
    } catch (err) {
        console.error("❌ Erreur lors de l'initialisation de PostgreSQL :", err);
    }
}

initDB();

// ==========================================
// 1. ROUTE DE TEST DE SANTÉ
// ==========================================
app.get('/api/status', (req, res) => {
    res.json({ message: "Serveur TTES-ICG et PostgreSQL opérationnels !" });
});

// ==========================================
// 2. ROUTE D'INSCRIPTION (POST)
// ==========================================
app.post('/api/inscription', async (req, res) => {
    const { nom, telephone, email, dateNaissance, formation } = req.body;

    if (!nom || !telephone || !email || !formation) {
        return res.status(400).json({ 
            success: false, 
            message: "Veuillez remplir tous les champs obligatoires." 
        });
    }

    const regexTel = /^[0-9]{9}$/;
    if (!regexTel.test(telephone)) {
        return res.status(400).json({ 
            success: false, 
            message: "Le numéro de téléphone doit contenir exactement 9 chiffres." 
        });
    }

    try {
        // "RETURNING id" renvoie directement l'ID généré par PostgreSQL
        const result = await pool.query(
            `INSERT INTO utilisateurs (nom, telephone, email, date_naissance, formation) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [nom, telephone, email, dateNaissance, formation]
        );

        const newId = result.rows[0].id;
        console.log(`💾 Inscription réussie ID #${newId} : ${nom}`);

        return res.status(201).json({
            success: true,
            id: newId,
            message: "Inscription enregistrée avec succès !"
        });

    } catch (error) {
        console.error("Erreur PostgreSQL :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de l'enregistrement en BDD."
        });
    }
});

// ==========================================
// 3. ESPACE ÉTUDIANT (GET & PUT)
// ==========================================
app.get('/api/etudiant/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM utilisateurs WHERE id = $1", [req.params.id]);
        
        if (result.rows.length > 0) {
            return res.json({ success: true, etudiant: result.rows[0] });
        } else {
            return res.status(404).json({ success: false, message: "Étudiant non trouvé." });
        }
    } catch (error) {
        console.error("Erreur serveur :", error);
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

app.put('/api/etudiant/:id', async (req, res) => {
    const { nom, telephone, email, formation } = req.body;
    const { id } = req.params;

    try {
        await pool.query(
            `UPDATE utilisateurs SET nom=$1, telephone=$2, email=$3, formation=$4 WHERE id=$5`,
            [nom, telephone, email, formation, id]
        );
        res.json({ success: true, message: "Modifications enregistrées !" });
    } catch (error) {
        console.error("Erreur mise à jour :", error);
        res.status(500).json({ success: false, message: "Erreur lors de la modification." });
    }
});

// ==========================================
// 4. ESPACE ADMIN
// ==========================================
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'TTES2026!';

    if (username === adminUser && password === adminPass) {
        res.json({ success: true, token: 'session_admin_active' });
    } else {
        res.status(401).json({ success: false, message: "Identifiants incorrects" });
    }
});

app.get('/api/admin/inscriptions', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM utilisateurs ORDER BY id DESC");
        res.json({ success: true, inscriptions: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// Export CSV / Excel
app.get('/api/admin/export-csv', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM utilisateurs ORDER BY id DESC");
        let csv = "ID,Nom,Telephone,Email,Date Naissance,Formation,Date Inscription\n";

        result.rows.forEach(row => {
            csv += `"${row.id}","${row.nom}","${row.telephone}","${row.email}","${row.date_naissance || ''}","${row.formation}","${row.date_inscription}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=inscriptions_ttes_icg.csv');
        res.status(200).send('\uFEFF' + csv);
    } catch (error) {
        console.error("Erreur d'exportation :", error);
        res.status(500).send("Erreur lors de la génération du CSV");
    }
});

// ROUTE RACINE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});