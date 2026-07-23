document.addEventListener("DOMContentLoaded", function () {
    // 1. ÉLÉMENTS DE NAVIGATION
    const startBtn = document.getElementById("startBtn");
    const welcomeCard = document.getElementById("welcomeCard");
    const formCard = document.getElementById("formCard");
    
    // NOUVEAUX ÉLÉMENTS (Étape 2)
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

    // 3. SOUMISSION DU FORMULAIRE ET SUCÈS (Étape 2)
    const form = document.getElementById("registrationForm");
    const message = document.getElementById("message");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const phone = document.getElementById("phone");

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            // Longueur du mot de passe (6 car. min)
            if (password.value.length < 6) {
                message.style.color = "#FF6B6B";
                message.textContent = "❌ Le mot de passe doit contenir au moins 6 caractères !";
                return;
            }

            // Mots de passe identiques
            if (password.value !== confirmPassword.value) {
                message.style.color = "#FF6B6B";
                message.textContent = "❌ Les mots de passe ne sont pas identiques !";
                return;
            }

            // Téléphone valide
            const phoneRegex = /^[0-9+\s]{8,}$/;
            if (!phoneRegex.test(phone.value.trim())) {
                message.style.color = "#FF6B6B";
                message.textContent = "❌ Veuillez entrer un numéro de téléphone valide !";
                return;
            }

            // Récupération des infos de l'utilisateur
            const nomUtilisateur = document.getElementById("name").value;
            const formationChoisie = document.getElementById("formation").value;

            // Récupération directe et propre de TOUTES les valeurs
            const utilisateur = {
                nom: document.getElementById("name").value,
                telephone: document.getElementById("phone").value,
                email: document.getElementById("email").value,
                dateNaissance: document.getElementById("birthdate").value,
                formation: document.getElementById("formation").value
            };

            // Sauvegarde dans Local Storage
            localStorage.setItem("utilisateurTTES", JSON.stringify(utilisateur));

            // Sauvegarde dans le navigateur
            localStorage.setItem("utilisateurTTES", JSON.stringify(utilisateur));

            // MASQUAGE DU FORMULAIRE & AFFICHAGE DE LA CARTE DE SUCCÈS
            formCard.style.display = "none";
            successCard.style.display = "block";
            
            // Personnalisation du message de félicitations
            successText.innerHTML = `Bienvenue <strong>${nomUtilisateur}</strong> ! <br><br> Votre inscription pour la formation en <strong>${formationChoisie}</strong> a été enregistrée avec succès chez TTES-ICG Academy.`;

            // Réinitialisation du formulaire
            form.reset();
            message.textContent = "";
        });
    }

    // Bouton "Nouvelle inscription" (Retour à l'accueil)
    if (newRegistrationBtn) {
        newRegistrationBtn.addEventListener("click", function () {
            successCard.style.display = "none";
            welcomeCard.style.display = "block";
        });
    }
});