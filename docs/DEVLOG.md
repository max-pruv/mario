# Devlog — IAM Kart

Journal des releases. Le numéro correspond au `CACHE_VERSION` du service worker (`sw.js`) : chaque bump déclenche la mise à jour automatique de tous les clients installés.

## v15 — Garage de véhicules + boutons CONTINUER

- **6 véhicules aux formes réellement différentes** : Kart classique, **Formule** (F1 à roues apparentes, ailerons), **Pod Racer** façon Star Wars (double nacelle + cockpit, en lévitation avec propulseurs lumineux), **Speeder** volant (moto anti-grav à fourches), **Brique** style Lego (carrosserie cubique à tenons chromés), **Fusée** (corps de rocket à hublots et tuyère). Sélecteur « VÉHICULE ‹ › » à l'étape pilote, mémorisé ; chaque IA roule dans son propre type de véhicule.
- Véhicules volants : bob de lévitation + propulseurs pulsants, pas de roues.
- **Bouton « CONTINUER ▶ » / « C'EST PARTI ! 🏁 »** bien visible en bas de chaque écran de sélection — plus besoin de deviner où taper.

## v14 — Horizon en vraie 3D + bouton recommencer

- **Fini le fond carton-pâte** : une chaîne de ~40 montagnes low-poly 3D entoure chaque monde (parallaxe réelle, fondu dans la brume, sommets enneigés sur Néon/Paris/Biarritz, masquées côté océan sur les cartes littorales).
- Ciel repeint : crêtes irrégulières multi-fréquences fondues dans un voile de brume à l'horizon, au lieu des deux bandes plates.
- **Bouton ↻** au HUD (et touche R) pour recommencer la course depuis zéro à tout moment — retour au décompte, chrono et positions réinitialisés.

## v13 — Bords de piste nets, menus tactiles, textures fines, bouton son

- **Bord route/pelouse enfin défini** : le terrain suit désormais le dévers de la route et reste strictement sous l'asphalte ; une bande d'herbe cousue à la bordure (ribbon) dessine une lisière nette — plus d'herbe qui « pousse sur la route ».
- **Menus entièrement tactiles** : taper directement sur les lignes de cylindrée, les tuiles de pilotes, les vignettes de circuits, les flèches ◀ ▶ et « ‹ retour » — plus besoin d'enchaîner les « next ». Les taps sont latchés (jamais perdus entre deux frames).
- **Textures plus fines** : asphalte 512px avec traces de pneus et microfissures, herbe 512px avec brins dessinés, façades 512px avec reflets de vitres, **rez-de-chaussée commerçants éclairés** (vitrines, portes, auvents rayés) sur les immeubles.
- **Bouton son 🔊/🔇** toujours visible, préférence mémorisée — moteur, bips et jingles coupables d'un tap.

## v12 — Correctif : rendu étiré en paysage (iOS)

- À la rotation, Safari iOS déclenche `resize` avant d'avoir fini son layout : le buffer de rendu restait au format portrait, étiré sur l'écran paysage (proportions fausses).
- Correctif : garde par frame — dès que les dimensions réelles du canvas changent, le renderer, le composer, la caméra et le HUD sont resynchronisés ; écouteurs `orientationchange` (avec rappels différés) et `visualViewport` ajoutés.

## v11 — Vraies villes : immeubles composites par style

- Fini les blocs étirés : **générateur d'immeubles composites** fusionnés en quelques draw calls — tours à redans avec parapets, tours cylindriques, antennes, châteaux d'eau, clim en toiture ; **immeubles haussmanniens** à toits mansardés et cheminées (Paris) ; **villas pastel à toits de tuiles** (Nice, Biarritz).
- **Fenêtres à taille réelle** : les UV des façades sont calées sur les dimensions du bâtiment (un étage = une rangée), avec 3 styles de façades peintes (verre moderne éclairé chaud/froid, pierre de taille à balcons, murs pastel à volets) et teintes murales variées par immeuble.
- **Enseignes néon lumineuses** en toiture (IAM, KART, GP ★, TURBO) sur Néon et New York, qui rayonnent dans le bloom.
- Contraste des circuits de jour renforcé (brouillard/lumière), halos d'objets adoucis.

## v10 — Refonte graphique majeure : relief, vrais karts, vrais pilotes

- **Terrain 3D** : collines procédurales, circuits avec montées/descentes (amplitude par circuit) et **virages relevés** (banking) façon MK8 — route, bordures, rails, pads et ligne de départ épousent le relief ; le sol est un maillage déplacé aplani sous la piste.
- **Karts remodelés de zéro** : carrosserie galbée (sphères fusionnées — plus un seul cube visible), garde-boue sur les 4 roues, capot moteur, jupes latérales, ailerons capsules, baquet, colonne + volant, chromes, pneus larges toriques avec jantes dorées à 5 bâtons. Géométries fusionnées (BufferGeometryUtils) pour rester fluide sur mobile.
- **Pilotes vivants** : visage cartoon peint (yeux, sourcils, sourire, joues), casquette à visière colorée, bras tendus vers le volant, mains gantées ; suspension animée, tangage dans les pentes, inclinaison dans les virages relevés.
- **Matériaux** : normal maps procédurales sur l'asphalte et l'herbe (micro-relief réactif à la lumière).
- **Décor** : arbres à triple canopée organique avec variations de teinte, rochers épars, ciel repeint en 2K avec cumulus ombrés.
- **Finitions** : vignettage cinématique, typographie ronde de jeu vidéo.

## v9 — Lancement de course en 3 étapes façon MK

- Écran titre, puis **① cylindrée** (50/100/150cc) → **② pilote** (gros plan 3D sur le kart qui tourne + grille des 8 personnages) → **③ circuit** avec preview : survol 3D du circuit en direct (caméra qui suit la piste comme l'intro des courses MK), grande minimap, carrousel des 5 vignettes, record local de la cylindrée choisie.
- Navigation retour avec B à chaque étape ; rejouer renvoie à l'étape 1.

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
