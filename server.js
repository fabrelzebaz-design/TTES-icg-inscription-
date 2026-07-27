const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.sqlite');

let db;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Fonction de sauvegarde de la BDD
function saveDatabase() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
}

// Initialisation de la BDD SQLite
async function initDB() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_FILE)) {
        const filebuffer = fs.readFileSync(DB_FILE);
        db = new SQL.Database(filebuffer);
    } else {
        db = new SQL.Database();
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS utilisateurs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            telephone TEXT NOT NULL,
            email TEXT NOT NULL,
            dateNaissance TEXT,
            formation TEXT NOT NULL,
            date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    saveDatabase();
    console.log("🗄️ Base de données SQLite prête et connectée !");
}

initDB().catch(console.error);

// 1. ROUTE DE TEST
app.get('/api/status', (req, res) => {
    res.json({ message: "Serveur TTES-ICG et Base de Données opérationnels !" });
});

// 2. ROUTE D'INSCRIPTION (POST)
app.post('/api/inscription', (req, res) => {
    const { nom, telephone, email, dateNaissance, formation } = req.body;

    // A. Vérification des champs obligatoires
    if (!nom || !telephone || !email || !formation) {
        return res.status(400).json({ 
            success: false, 
            message: "Veuillez remplir tous les champs obligatoires." 
        });
    }

    // B. ÉTAPE 1 : Validation du téléphone (exactement 9 chiffres)
    const regexTel = /^[0-9]{9}$/;
    if (!regexTel.test(telephone)) {
        return res.status(400).json({ 
            success: false, 
            message: "Le numéro de téléphone doit contenir exactement 9 chiffres (ex: 699123456)." 
        });
    }

    try {
        db.run(
            `INSERT INTO utilisateurs (nom, telephone, email, dateNaissance, formation) VALUES (?, ?, ?, ?, ?)`,
            [nom, telephone, email, dateNaissance, formation]
        );

        saveDatabase();
        console.log(`💾 Inscription enregistrée en BDD pour : ${nom}`);

        res.status(201).json({
            success: true,
            message: "Inscription enregistrée avec succès !"
        });
    } catch (error) {
        console.error("Erreur BDD :", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'enregistrement dans la base de données."
        });
    }
});

// 🔑 ROUTE DE CONNEXION ADMIN
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'TTES2026!';

    if (username === adminUser && password === adminPass) {
        res.json({ success: true, token: 'session_admin_active_ttes_2026' });
    } else {
        res.status(401).json({ success: false, message: "Identifiants incorrects" });
    }
});

// 3. ROUTE POUR L'ESPACE ADMIN (GET)
app.get('/api/admin/inscriptions', (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, message: "Base de données non initialisée" });
        }

        const stmt = db.prepare("SELECT * FROM utilisateurs ORDER BY id DESC");
        const utilisateurs = [];

        while (stmt.step()) {
            utilisateurs.push(stmt.getAsObject());
        }
        stmt.free();

        res.json({
            success: true,
            inscriptions: utilisateurs
        });
    } catch (error) {
        console.error("Erreur lors de la récupération :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// 4. ROUTE EXPORT EXCEL CSV (GET)
app.get('/api/admin/export-csv', (req, res) => {
    try {
        if (!db) return res.status(500).send("Base de données indisponible");

        const stmt = db.prepare("SELECT * FROM utilisateurs ORDER BY id DESC");
        let csv = "ID,Nom,Telephone,Email,Date Naissance,Formation,Date Inscription\n";

        while (stmt.step()) {
            const row = stmt.getAsObject();
            csv += `"${row.id}","${row.nom}","${row.telephone}","${row.email}","${row.dateNaissance || ''}","${row.formation}","${row.date_inscription}"\n`;
        }
        stmt.free();

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=inscriptions_ttes_icg.csv');
        res.status(200).send('\uFEFF' + csv);
    } catch (error) {
        console.error("Erreur d'exportation :", error);
        res.status(500).send("Erreur lors de la génération du fichier CSV");
    }
});
// --- CONFIGURATION DES FICHIERS STATIQUES ET ROUTE PRINCIPALE ---
const path = require('path');

// Permet à Express de servir tes fichiers HTML, CSS, images et JS client
app.use(express.static(__dirname));

// Redirige la racine (/) vers index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur TTES-ICG démarré sur http://localhost:${PORT}`);
});