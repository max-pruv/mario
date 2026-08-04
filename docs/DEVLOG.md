# Devlog — IAM Kart

Journal des releases. Le numéro correspond au `CACHE_VERSION` du service worker (`sw.js`) : chaque bump déclenche la mise à jour automatique de tous les clients installés.

## v8 — Paysage obligatoire sur mobile

- Retour du mode paysage seul sur téléphone (choix gyro) : en portrait, un écran « Tourne ton téléphone » recouvre le jeu et **toute la partie se met en pause** (pas de progression IA pendant la rotation).
- L'écran rappelle l'astuce du verrou de rotation iOS pour jouer au gyroscope sans bascule.

## v7 — Bandeau d'installation

- Bandeau intelligent hors app installée : sur iOS, guide en 2 taps (Partager → « Sur l'écran d'accueil » — Apple interdit l'installation programmatique) ; sur Android/Chrome, **vrai bouton Installer en 1 clic** via `beforeinstallprompt`.
- Fermable, mémorisé 7 jours, masqué automatiquement en course, jamais affiché dans l'app installée.

## v6 — Plein écran, portrait, déblocage des vieux service workers

- Suppression du letterbox 3:2 : le jeu remplit 100 % de l'écran (100dvh), HUD adaptatif au ratio réel.
- Mode portrait entièrement jouable (FOV élargi) — répond à l'impossibilité de verrouiller l'orientation sur iOS web quand on joue au gyroscope.
- SW : navigation forcée des pages coincées sur les caches pré-v3 (elles n'avaient pas la logique d'auto-reload).

## v5 — Circuits, catégories cc, gameplay MK8, records

- **5 circuits sélectionnables** : Circuit Néon (crépuscule mégapole), **Paris** (jour, Tour Eiffel), **Nice** (Promenade au bord de la mer, palmiers), **New York** (minuit, gratte-ciel), **Biarritz** (couchant sur l'océan, phare à faisceau tournant). Chaque circuit a son tracé, son ciel, son éclairage, sa ville, ses arbres et ses rails colorés — tout est paramétré par thème dans `MAPS`.
- **Catégories 50cc / 100cc / 150cc** : multiplicateur de vitesse/accélération global, IA incluse.
- **Gameplay façon MK8** :
  - roulette d'objets animée à la prise de boîte (probabilités selon la position : les derniers reçoivent étoile/éclair, les premiers banane/carapace) ;
  - **carapace verte** (projectile), **étoile** d'invincibilité (peinture arc-en-ciel, vitesse +12 %, renverse au contact), en plus du champignon, de la banane et de l'éclair ;
  - **pièces** à ramasser sur la piste (+0,4 % de vitesse max chacune, plafonnées à 10, on en perd 3 en cas de choc) avec compteur au HUD.
- **Scoreboard local** : top 5 des temps par (circuit, cc) en localStorage, affiché à la sélection et à l'arrivée avec détection « nouveau record ».
- **Nouveau flow de menus** : pilote → circuit → catégorie → course, navigable au joystick.
- Icônes réécrites en style lisse/brillant (plus aucun pixel-art).
- Docs : `LEARNINGS.md` (patterns issus du repo minecraft) et ce devlog.

## v4 — Gyroscope, joystick, gros upgrade graphique

- Pilotage au **gyroscope** (iPhone/Android) : inclinaison = volant, permission iOS gérée, préférence mémorisée.
- **Joystick analogique** à l'écran, prioritaire sur le gyro quand il est touché ; clavier prioritaire sur tout.
- Pipeline **HDR + MSAA 4x + UnrealBloom**, éclairage par image (le ciel peint sert d'environnement PBR).
- Karts détaillés : peinture vernie clearcoat, chromes, volant, pontons, phares + projecteur du joueur.
- Monde : skyline néon, tribune avec foule, tours de projecteurs, montgolfières, bollards lumineux.
- FX : lignes de vitesse en boost, confettis à l'arrivée.
- Addons three.js vendorés (`vendor/addons/`) + import map.

## v3 — Auto-update intelligent + déploiement "comme minecraft"

- Service worker passé en *stale-while-revalidate*.
- Vérification de mise à jour au lancement / focus / toutes les 3 min ; application auto hors course.
- Suppression du workflow CI : GitHub Pages « Deploy from a branch » sur `main`, comme le repo minecraft.

## v2 — Passage à la 3D (IAM Kart)

- Réécriture complète en Three.js : rendu 3D temps réel, ombres, brouillard, coucher de soleil.
- Renommage **IAM Kart** (Inès · Alice · Marlon), personnages Inès, Alice, Marlon.
- Vaisseaux lumineux farfelus (chasseur, soucoupe, donut néon, fusée) + avions à hélice.

## v1 — Kart Dash (Mode 7)

- Premier jet : kart racer rétro pseudo-3D façon SNES en canvas 2D pur.
- 8 pilotes, IA, 3 tours, objets, pads de boost, drift, PWA hors ligne installable.
