document.addEventListener("DOMContentLoaded", function () {
    // 1. ÉLÉMENTS DE NAVIGATION
    const startBtn = document.getElementById("startBtn");
    const welcomeCard = document.getElementById("welcomeCard");
    const formCard = document.getElementById("formCard");
    
    // NOUVEAUX ÉLÉMENTS
    const successCard = document.getElementById("successCard");
    const successText = document.getElementById("successText");
    const newRegistrationBtn = document.getElementById("newRegistrationBtn");

    // Bouton : Commencer l'inscription
    if (startBtn && welcomeCard && formCard) {
        startBtn.addEventListener("click", function () {
            welcomeCard.style.display = "none";
            formCard.style.display = "block";
        });
    }

    // 2. GESTION DE L'ŒIL POUR LE MOT DE PASSE
    function setupPasswordToggle(inputId, toggleBtnId) {
        const input = document.getElementById(inputId);
        const toggleBtn = document.getElementById(toggleBtnId);

        if (input && toggleBtn) {
            toggleBtn.addEventListener("click", function () {
                if (input.type === "password") {
                    input.type = "text";
                    toggleBtn.textContent = "🙈";
                } else {
                    input.type = "password";
                    toggleBtn.textContent = "👁️";
                }
            });
        }
    }

    setupPasswordToggle("password", "togglePassword");
    setupPasswordToggle("confirmPassword", "toggleConfirmPassword");

    // 3. SOUMISSION DU FORMULAIRE ET SUCCÈS
    const form = document.getElementById("registrationForm");
    const message = document.getElementById("message");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const phone = document.getElementById("phone");

    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            // Longueur du mot de passe (6 car. min)
            if (password && password.value.length < 6) {
                message.style.color = "#FF6B6B";
                message.textContent = "❌ Le mot de passe doit contenir au moins 6 caractères !";
                return;
            }

            // Mots de passe identiques
            if (password && confirmPassword && password.value !== confirmPassword.value) {
                message.style.color = "#FF6B6B";
                message.textContent = "❌ Les mots de passe ne sont pas identiques !";
                return;
            }

            // Téléphone valide (exactement 9 chiffres pour le Cameroun)
            const phoneRegex = /^[0-9]{9}$/;
            if (!phoneRegex.test(phone.value.trim())) {
                message.style.color = "#FF6B6B";
                message.textContent = "❌ Veuillez entrer un numéro de téléphone valide à 9 chiffres (ex: 699123456) !";
                return;
            }

            // Récupération des infos de l'utilisateur
            const nomUtilisateur = document.getElementById("name").value;
            const formationChoisie = document.getElementById("formation").value;

            const utilisateur = {
                nom: nomUtilisateur,
                telephone: phone.value.trim(),
                email: document.getElementById("email").value,
                dateNaissance: document.getElementById("birthdate") ? document.getElementById("birthdate").value : "",
                formation: formationChoisie
            };

            // Message de chargement
            message.style.color = "#007bff";
            message.textContent = "⏳ Traitement de votre inscription par le serveur...";

            try {
                // 🚀 ENVOI DES DONNÉES AU SERVEUR (URL RELATIVE POUR L'HÉBERGEMENT)
                const response = await fetch("/api/inscription", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(utilisateur)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // Sauvegarde de secours dans le Local Storage
                    localStorage.setItem("utilisateurTTES", JSON.stringify(utilisateur));

                    // 🎯 SI LE SERVEUR RENVOIE UN ID, ON REDIRIGE VERS SON DASHBOARD ÉTUDIANT
                    if (result.id) {
                        window.location.href = `/espace-etudiant.html?id=${result.id}`;
                        return;
                    }

                    // SINON MASQUAGE DU FORMULAIRE & AFFICHAGE DE LA CARTE DE SUCCÈS
                    formCard.style.display = "none";
                    if (successCard) successCard.style.display = "block";
                    
                    if (successText) {
                        successText.innerHTML = `Bienvenue <strong>${nomUtilisateur}</strong> ! <br><br> Votre inscription pour la formation en <strong>${formationChoisie}</strong> a été enregistrée avec succès chez TTES-ICG Academy.`;
                    }

                    form.reset();
                    message.textContent = "";
                } else {
                    message.style.color = "#FF6B6B";
                    message.textContent = "❌ Erreur: " + (result.message || "Échec de l'enregistrement.");
                }
            } catch (error) {
                console.error("Erreur d'envoi vers le serveur :", error);
                message.style.color = "#FF6B6B";
                message.textContent = "❌ Erreur de connexion au serveur. Réessayez dans un instant.";
            }
        });
    }

    // Bouton "Nouvelle inscription" (Retour à l'accueil)
    if (newRegistrationBtn) {
        newRegistrationBtn.addEventListener("click", function () {
            if (successCard) successCard.style.display = "none";
            if (welcomeCard) welcomeCard.style.display = "block";
        });
    }
});