document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');

    // Récupérer la préférence enregistrée
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Mode Clair';
    }

    // Gestion de l'événement clic
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            
            if (themeIcon) themeIcon.textContent = isLight ? '☀️' : '🌙';
            if (themeText) themeText.textContent = isLight ? 'Mode Clair' : 'Mode Sombre';
            
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    }
});

    // ============================================================
    // 2. RECHERCHE DYNAMIQUE EN DIRECT
    // ============================================================
    const searchInput = document.getElementById('searchInput');
    const cards = document.querySelectorAll('.card');
    const noResults = document.getElementById('noResults');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            let hasMatch = false;

            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(query)) {
                    card.style.display = 'flex';
                    hasMatch = true;
                } else {
                    card.style.display = 'none';
                }
            });

            if (noResults) {
                noResults.style.display = hasMatch ? 'none' : 'block';
            }
        });
    }

    // ============================================================
    // 3. SOUMISSION ET VÉRIFICATION PAR CODE OTP
    // ============================================================
    const form = document.getElementById('inscriptionForm');

    // N'exécuter la logique du formulaire que s'il existe sur la page
    if (form) {

        // Sauvegarde temporaire des données saisies par l'utilisateur
        let formDataTemp = null;

        // Pré-sélection de la formation depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const selectedFormation = urlParams.get('formation');
        if (selectedFormation) {
            const formationSelect = document.getElementById('formation');
            if (formationSelect) formationSelect.value = selectedFormation;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');

            // Récupération des données du formulaire
            formDataTemp = {
                nom: document.getElementById('nom')?.value.trim(),
                email: document.getElementById('email')?.value.trim(),
                telephone: document.getElementById('telephone')?.value.trim(),
                dateNaissance: document.getElementById('dateNaissance')?.value || null,
                formation: document.getElementById('formation')?.value,
                mode_formation: document.getElementById('mode_formation')?.value || 'Présentiel'
            };

            if (!formDataTemp.nom || !formDataTemp.email || !formDataTemp.telephone || !formDataTemp.formation) {
                showAlert('Veuillez remplir tous les champs obligatoires.', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Envoi du code...';
            }

            // ÉTAPE A : Demander l'envoi du code à 6 chiffres par e-mail
            try {
                const res = await fetch('/api/demander-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formDataTemp.email, nom: formDataTemp.nom })
                });

                const data = await res.json();

                if (data.success) {
                    showAlert('🔑 Un code de vérification à 6 chiffres a été envoyé par e-mail !', 'success');
                    
                    // Demander le code à l'utilisateur (via prompt)
                    setTimeout(() => {
                        const codeSaisi = prompt(`Un code de vérification à 6 chiffres a été envoyé à l'adresse : ${formDataTemp.email}\n\nVeuillez le saisir ci-dessous :`);
                        
                        if (codeSaisi && codeSaisi.trim() !== "") {
                            validerInscriptionAvecCode(codeSaisi.trim(), submitBtn);
                        } else {
                            showAlert('Vérification annulée. Inscription non enregistrée.', 'error');
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.textContent = "Valider mon inscription";
                            }
                        }
                    }, 500);

                } else {
                    showAlert(data.message || "Impossible d'envoyer le code par e-mail.", 'error');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = "Valider mon inscription";
                    }
                }
            } catch (err) {
                console.error(err);
                showAlert("Erreur de connexion avec le serveur.", 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Valider mon inscription";
                }
            }
        });

        // ÉTAPE B : Envoyer le code saisi pour valider définitivement
        async function validerInscriptionAvecCode(code, submitBtn) {
            if (submitBtn) {
                submitBtn.textContent = 'Validation en cours...';
            }

            try {
                const res = await fetch('/api/valider-inscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formDataTemp, code })
                });

                const data = await res.json();

                if (data.success) {
                    showAlert('🎉 Inscription réussie ! Redirection en cours...', 'success');
                    form.reset();
                    setTimeout(() => {
                        window.location.href = `/espace-etudiant.html?id=${data.id}`;
                    }, 1500);
                } else {
                    showAlert(data.message || "Code incorrect.", 'error');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = "Valider mon inscription";
                    }
                }
            } catch (err) {
                console.error(err);
                showAlert("Erreur lors de la confirmation du code.", 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Valider mon inscription";
                }
            }
        }

        // Gestion des alertes sur le site
        function showAlert(msg, type) {
            let alertBox = document.getElementById('alertMsg');
            if (!alertBox) {
                alertBox = document.createElement('div');
                alertBox.id = 'alertMsg';
                alertBox.style.padding = '12px';
                alertBox.style.marginTop = '15px';
                alertBox.style.borderRadius = '8px';
                alertBox.style.textAlign = 'center';
                alertBox.style.fontWeight = '600';
                alertBox.style.transition = 'all 0.3s ease';
                form.appendChild(alertBox);
            }

            const isLight = document.body.classList.contains('light-mode');

            if (type === 'success') {
                alertBox.style.background = isLight ? '#DCFCE7' : 'rgba(22, 101, 52, 0.4)';
                alertBox.style.color = isLight ? '#15803D' : '#4ADE80';
                alertBox.style.border = isLight ? '1px solid #86EFAC' : '1px solid #16A34A';
            } else {
                alertBox.style.background = isLight ? '#FEE2E2' : 'rgba(153, 27, 27, 0.4)';
                alertBox.style.color = isLight ? '#B91C1C' : '#FCA5A5';
                alertBox.style.border = isLight ? '1px solid #FCA5A5' : '1px solid #DC2626';
            }
            
            alertBox.textContent = msg;
            alertBox.style.display = 'block';
        }
    };