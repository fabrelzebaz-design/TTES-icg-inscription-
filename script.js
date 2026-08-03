document.addEventListener("DOMContentLoaded", function () {
    // 1. ÉLÉMENTS DE NAVIGATION
    const startBtn = document.getElementById("startBtn");
    const welcomeCard = document.getElementById("welcomeCard");
    const formCard = document.getElementById("formCard");

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

    // 3. SOUMISSION DU FORMULAIRE ET REDIRECTION
    const form = document.getElementById("registrationForm");
    const message = document.getElementById("message");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const phone = document.getElementById("phone") || document.getElementById("telephone");

    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            // Longueur du mot de passe (si présent)
            if (password && password.value.length > 0 && password.value.length < 6) {
                if (message) {
                    message.style.color = "#FF6B6B";
                    message.textContent = "❌ Le mot de passe doit contenir au moins 6 caractères !";
                }
                return;
            }

            // Mots de passe identiques (si présents)
            if (password && confirmPassword && password.value !== confirmPassword.value) {
                if (message) {
                    message.style.color = "#FF6B6B";
                    message.textContent = "❌ Les mots de passe ne sont pas identiques !";
                }
                return;
            }

            // --- NETTOYAGE ET VALIDATION DU TÉLÉPHONE ---
            const rawPhone = phone ? phone.value : "";
            const cleanPhone = rawPhone.replace(/[^0-9]/g, ''); // Supprime les '+', espaces, etc.

            if (cleanPhone.length < 8 || cleanPhone.length > 15) {
                if (message) {
                    message.style.color = "#FF6B6B";
                    message.textContent = "❌ Veuillez entrer un numéro de téléphone valide (entre 8 et 15 chiffres).";
                }
                return;
            }

            // --- CRÉATION DU OBJET UTILISATEUR SÉCURISÉ ---
            const utilisateur = {
                nom: (document.getElementById("name") || document.getElementById("nom"))?.value?.trim() || "",
                telephone: cleanPhone,
                email: (document.getElementById("email"))?.value?.trim() || "",
                dateNaissance: (document.getElementById("birthdate") || document.getElementById("date_naissance"))?.value || "",
                formation: (document.getElementById("formation"))?.value || ""
            };

            if (message) {
                message.style.color = "#007bff";
                message.textContent = "⏳ Traitement de votre inscription par le serveur...";
            }

            try {
               const response = await fetch("https://ttes-icg-inscription.onrender.com/api/inscription", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(utilisateur)
            });

                const result = await response.json();

                if (response.ok && result.success) {
                    localStorage.setItem("utilisateurTTES", JSON.stringify(utilisateur));

                    // REDIRECTION SYSTÉMATIQUE VERS L'ESPACE ÉTUDIANT
                    const targetId = result.id || 1;
                    window.location.href = `/espace-etudiant.html?id=${targetId}`;
                } else {
                    if (message) {
                        message.style.color = "#FF6B6B";
                        message.textContent = "❌ Erreur: " + (result.message || "Échec de l'enregistrement.");
                    }
                }
            } catch (error) {
                console.error("Erreur serveur :", error);
                if (message) {
                    message.style.color = "#FF6B6B";
                    message.textContent = "❌ Impossible de contacter le serveur.";
                }
            }
        });
    }
});