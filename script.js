// ======================================================
// 1. SÉLECTION AUTOMATIQUE DE LA FORMATION DEPUIS L'URL
// ======================================================
window.addEventListener('DOMContentLoaded', () => {
    // Récupère les paramètres dans l'URL (ex: inscription.html?formation=IA)
    const urlParams = new URLSearchParams(window.location.search);
    const formation = urlParams.get('formation');
    
    if (formation) {
        const select = document.getElementById("formation");
        if (select) {
            select.value = formation;
        }
    }
});

// ======================================================
// 2. GESTION DE LA SOUMISSION DU FORMULAIRE
// ======================================================
const form = document.getElementById("inscriptionForm"); // Assure-toi que ton <form> a cet id ou écoute le submit

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const message = document.getElementById("message");
        if (message) {
            message.style.color = "#2563EB";
            message.textContent = "⏳ Traitement de votre inscription en cours...";
        }

        // Récupération et nettoyage des valeurs du formulaire
        const nameInput = document.getElementById("name") || document.getElementById("nom");
        const emailInput = document.getElementById("email");
        const phoneInput = document.getElementById("phone") || document.getElementById("telephone");
        const formationInput = document.getElementById("formation");

        const phoneRaw = phoneInput ? phoneInput.value.trim() : "";
        
        // Nettoyage du téléphone : conserve uniquement les chiffres
        const cleanPhone = phoneRaw.replace(/[^0-9]/g, '');

        if (cleanPhone.length < 8 || cleanPhone.length > 15) {
            if (message) {
                message.style.color = "#FF6B6B";
                message.textContent = "❌ Veuillez entrer un numéro de téléphone valide (ex: 671447813).";
            }
            return;
        }

        const utilisateur = {
            nom: nameInput ? nameInput.value.trim() : "",
            email: emailInput ? emailInput.value.trim() : "",
            telephone: cleanPhone,
            formation: formationInput ? formationInput.value : ""
        };

        try {
            const response = await fetch("https://ttes-icg-inscription.onrender.com/api/inscription", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(utilisateur)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                if (message) {
                    message.style.color = "#16A34A";
                    message.textContent = "✅ Votre inscription a été enregistrée avec succès !";
                }
                form.reset();
            } else {
                if (message) {
                    message.style.color = "#FF6B6B";
                    message.textContent = "❌ " + (result.message || "Une erreur est survenue, veuillez réessayer.");
                }
            }
        } catch (error) {
            console.error("Erreur réseau :", error);
            if (message) {
                message.style.color = "#FF6B6B";
                message.textContent = "❌ Impossible de contacter le serveur. Veuillez vérifier votre connexion.";
            }
        }
    });
}