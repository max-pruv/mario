# Devlog — IAM Kart

Journal des releases. Le numéro correspond au `CACHE_VERSION` du service worker (`sw.js`) : chaque bump déclenche la mise à jour automatique de tous les clients installés.

## v23 — Chat vocal, choix du pilote, menus pleine hauteur

- **Nouvelle étape 4/5 « Choisis ton pilote »** (solo **et** duo) : chacun choisit qui conduit — Inès, Alice, Marlon (avec leurs vrais visages) ou un rival. En duo, chacun voit le pilote de l'autre ; si les deux prennent le même, l'invité est décalé automatiquement sur le siège libre au départ.
- **Joueur 2 visible sur la minimap** : gros point doré cerclé marqué « 2 », et sous la carte un indicateur **« ▲ J2 devant / ▼ J2 derrière »** en direct.
- **Menus pleine hauteur en portrait** : les 10 écrans (titre, cylindrée, véhicule, couleur, pilote, circuit + 4 écrans duo) étirent leur contenu sur tout l'écran au lieu de se tasser au centre.

### Chat vocal entre les deux joueurs

- **Bouton 🎙 en haut à droite dès que les deux téléphones sont connectés** : un tap → le micro s'active (autorisation demandée la première fois) et la voix part **directement** vers l'autre téléphone par le même tunnel pair-à-pair WebRTC que le jeu — aucun serveur, aucune inscription.
- Chacun contrôle son propre micro (🎙 OFF par défaut, bouton rouge quand il émet) ; l'autre entend dans le haut-parleur. Écho et bruit filtrés (echoCancellation + noiseSuppression).
- Astuce iOS : si le son de l'autre n'arrive pas tout de suite, un simple tap n'importe où le débloque (règle Apple sur la lecture audio).
- Le micro se coupe proprement à la fin de la partie ou si la connexion tombe.
- Testé de bout en bout : deux navigateurs à micros simulés, flux vocal reçu dans les deux sens, on/off propre — 7/7.

## v35 — Multijoueur : connexion fiabilisée entre réseaux différents

- **Serveurs relais TURN gratuits** ajoutés à la config WebRTC : les parties **4G ↔ Wi-Fi** passent maintenant à travers les NAT d'opérateurs (avant, seule la découverte marchait, le tunnel échouait sur certains réseaux).
- **Chien de garde côté invité** : si la connexion au joueur n'aboutit pas en 14 s → message clair « Connexion impossible — re-tape le code pour réessayer » (fini l'écran qui tourne dans le vide).
- **Chien de garde côté hôte** : si le code ne s'enregistre pas auprès de l'annuaire en 9 s → « Annuaire injoignable — vérifie ta connexion Internet ».
- Statut visible « Connexion au joueur… » pendant l'établissement du tunnel.

## v34 — Animations MK8 : sauts, planeur, étincelles, lumières

- **Rampes de saut** (2 tranches orange incandescentes par circuit) : décollage, **planeur delta à la couleur du kart**, cabrage/piqué selon la vitesse verticale, descente planée, **squash d'atterrissage** avec rebond d'amorti. L'IA saute aussi ; la hauteur de vol voyage en réseau.
- **Hop de drift** au déclenchement du dérapage + **étincelles par paliers** (bleues en charge, orange quand le mini-turbo est prêt).
- **Lumières** : halo néon coloré sous chaque kart (intense la nuit), feux de freinage rouges, **faisceaux de phares volumétriques** pour les joueurs sur les circuits nocturnes, squash/stretch en boost.
- Direction réduite en l'air (60 %) pour des sauts qui se pilotent comme dans MK8.

## v32-v33 — UI ancrée, prénoms en multi, bouton bonus accessible, 2 nouveaux circuits

- **Widgets ancrés** : plaques, compteurs, sous-titres, flèches et minimap partagent un seul ancrage par écran — plus de « BRIQUE » hors de sa plaque ni de flèches décalées de leurs zones tactiles (le tap raté n'avance plus l'étape : « taper n'importe où » ne vaut plus que sur titre et arrivée).
- **iPad/paysage** : les menus démarrent sous la barre de boutons dans les deux orientations ; pavé numérique adaptatif.
- **Prénoms en multijoueur** : puce « ✏️ Prénom » sur les écrans multi — le prénom voyage en réseau et s'affiche dans le lobby, le mini-classement et l'écran d'arrivée.
- **Bouton bonus déplacé** près de l'accélérateur (gros slot tappable au-dessus des boutons A/B) — le B marche toujours.
- **Quitter** = flèche de sortie classique ➜] en haut à droite, ↻ recommencer juste dessous.
- **2 nouveaux circuits** : **Odyssée Cosmique** (nuit stellaire, 900 étoiles, tours néon, relief lunaire) et **Vallée Psychédélique** (ciel arc-en-ciel, montagnes magenta, monde bonbon).

## v29 — Musique d'ambiance, finesse ×4, vraie pleine hauteur

- **Musique d'ambiance procédurale** (séquenceur WebAudio embarqué, zéro fichier) : arpèges doux dans les menus (96 BPM), groove entraînant en course (132 BPM, basse + mélodie pentatonique + charley) — coupée par le bouton son, reprise propre.
- **Finesse ×4** : rendu au quasi-natif des iPhone (pixel ratio plafonné à 2,5 au lieu de 1,75 — ~2× plus de pixels dans chaque direction), anisotropie des textures doublée (routes nettes jusqu'à l'horizon).
- **Pleine hauteur** : `100dvh` sur la scène (zone de l'indicateur home comprise) et les menus descendent plus près du bouton bas.

## v28 — UI des menus : barre unifiée, cartes lisibles

- **Barre du haut unifiée** : GYRO / son / AUTO deviennent des pilules de même hauteur dans une vraie rangée flex (plus de tailles disparates ni de positions au pixel), micro assorti à droite.
- **‹ RETOUR aligné sur la ligne de titre** (plus de puce qui flotte au milieu de l'écran) + voile de lisibilité derrière l'en-tête.
- **Chaque option 50/100/150cc a sa carte** (fond sombre translucide, bordure, surbrillance cyan pour la sélection) — fini le texte blanc illisible posé sur la scène 3D.
- **Plaques** derrière les noms de véhicule / pilote / circuit pour une lisibilité constante.

## v27 — Révolution graphique

- **Model Y entièrement resculptée** : carrosserie **loftée par 14 sections transversales** (vraies courbures automobiles : capot bombé, ceinture de caisse, pincement de pavillon, hayon fastback) au lieu d'une extrusion plate. **Texture de carrosserie 1024** : vitrages teintés avec montants A/B/C, lignes de portes, poignées affleurantes, ombres de passages de roues, bas de caisse satin, reflet de ciel sur les épaules. Plancher plat d'EV, becquet avant, entrée d'air, DRLs LED, bandeau arrière.
- **Route crédible** : texture 1024 — granulat deux tons, **traces de gomme ondulantes dans la trajectoire**, plaques de réasphaltage, fissures rebouchées, taches d'huile, billes de gomme au bord, lignes blanches écaillées, relief micro-bosselé.
- **Bords de piste vivants** : ~1500 **touffes d'herbe 3D instanciées** (lames dessinées, teintes variées) qui épousent le terrain le long du circuit.
- **Ciel vivant** : nuages volumétriques dérivants + vrai disque solaire lumineux (lune en nocturne).
- **Particules** : poussière ocre hors-piste, fumée blanche de drift, échappement orange en boost — derrière chaque kart.
- **Ombres de contact** : disque d'ombre douce sous chaque véhicule, collé à la route même dans les virages relevés — les karts « tiennent » au sol.

## v26 — Lobby jusqu'à 8 joueurs

- **Une partie, jusqu'à 8 joueurs** : l'hôte crée le code, chacun rejoint, l'écran hôte liste les joueurs en direct (« Joueur 2 ✓ prêt… ») et un gros bouton **« ON EST AU COMPLET (N joueurs) ▶ »** verrouille la partie et lance les choix.
- **Topologie en étoile** : chaque invité ne parle qu'à l'hôte qui relaie positions (15 Hz), objets et arrivées aux autres — aucun serveur, toujours du pair-à-pair.
- Sièges attribués au départ (conflits de pilotes résolus), **badges numérotés** sur la minimap, mini-classement et écran d'arrivée pour N joueurs.
- Vocal en étoile : tous parlent avec l'hôte.
- Déconnexion par siège : 15 s de reconnexion, sinon l'IA reprend ce volant sans arrêter la course ; « Partie pleine » au 9ᵉ.

## v25 — Menus : plus d'overlap, vraie pleine hauteur

- Les titres des menus démarrent désormais **sous** la rangée de boutons (GYRO/son/AUTO) grâce à la même sonde safe-area que le HUD de course — fini « CHOISIS TON VÉHICULE » caché derrière les boutons.
- La mise en page des menus s'étale sur **toute** la hauteur restante (plus de gros vide au-dessus de CONTINUER).

## v24 — Header lisible, quitter, carapace rouge, scoreboard 100 % réel

- **Header de course sous la barre iOS** (sonde `env(safe-area-inset-top)`) : position, tour, chrono et objet enfin lisibles.
- **Slot d'objet tappable** (+ rappel « tape ici ! » clignotant, halo doré) — le bouton B marche toujours.
- **Bouton 🏠 quitter** sous ↻ : retour au menu en un tap, réseau coupé proprement.
- **Carapace rouge à tête chercheuse** : vise le kart juste devant, plus rapide, voyage en réseau avec sa cible.
- **« ⚠ DEMI-TOUR ! »** : alerte clignotante quand on roule à contresens.
- **Nouveau moteur sonore** : deux couches (growl + basse), filtre qui suit la vitesse, léger tremolo — plus « jeu vidéo », moins raspy. Sons de choc entre karts, jingle dernier tour.
- **Prénom mémorisé** : si on te connaît déjà, le record est enregistré sans rien demander ; la question n'apparaît qu'au premier record.
- **Multijoueur : uniquement les vrais joueurs** dans tous les classements — position en haut à gauche, mini-classement sous la minimap et écran d'arrivée comptent entre humains (les IA roulent mais ne comptent pas) ; plus de « Record local » hors-sujet en ligne.
- **Bouton ‹ RETOUR visible** (vraie puce cliquable) sur tous les écrans + **pavé numérique géant** pour taper le code de partie.
- Audit scoreboard automatisé : temps par tour additionnés = temps final = record stocké (aucune donnée inventée).

## v22 — Conduite précise, kart à plat sur la piste

- **Les 4 roues toujours au sol** : l'orientation du kart est désormais calculée à partir de la **vraie normale de la surface** (devers + pente combinés, projetés sur le cap réel du kart). Fini la voiture penchée n'importe comment dans les virages relevés ou lors des bousculades — elle épouse la route quelle que soit sa direction.
- **Direction plus précise** : zone morte + courbe progressive sur le joystick et le gyroscope (petits mouvements de pouce = micro-corrections, extrémités = braquage complet).
- **Stable à haute vitesse** : le braquage est automatiquement adouci de ~30 % à pleine vitesse — plus de zigzag nerveux en ligne droite.
- **Moins d'effet « crabe »** : la caméra suit le cap ~60 % plus vite, la voiture reste visuellement dans l'axe quand on tourne ; réponse visuelle du braquage accélérée.

## v21 — Multijoueur : deux enfants, deux téléphones, un code

- **Mode « À DEUX EN LIGNE » sur l'écran titre** : pair-à-pair WebRTC (PeerJS vendoré, annuaire cloud gratuit uniquement pour se trouver — le jeu circule ensuite en direct entre les deux téléphones, Wi-Fi ou 4G).
- **Zéro friction** : l'hôte tape « Créer une partie » → un **code géant à 4 chiffres** s'affiche ; l'autre tape le code sur un pavé numérique → connectés. L'hôte choisit cylindrée + circuit, chacun choisit son véhicule et sa couleur (visibles l'un chez l'autre), départ synchronisé.
- **Phase 1 — course partagée** : chaque téléphone simule son propre kart et envoie sa position 15×/s (interpolation + dead-reckoning en face) ; l'hôte simule les 6 karts IA et les diffuse 10×/s ; tours, classement et temps partagés.
- **Phase 2 — objets et collisions** : carapaces, bananes et éclairs voyagent en événements réseau et existent sur les deux téléphones ; c'est toujours la simulation de la *victime* qui décide d'un tête-à-queue (pas de « je t'ai touché chez moi ») ; collisions kart-contre-kart symétriques, l'étoile renverse aussi l'adversaire.
- **Phase 3 — confort** : bouton **REVANCHE 🔁** synchronisé à l'arrivée (Entrée relance les deux téléphones) ; si la connexion casse en course, bannière « reconnexion… » et retentatives pendant 15 s, puis **l'IA prend le volant du joueur disparu** et la course continue ; codes en collision régénérés automatiquement.
- Testé de bout en bout en headless : 2 navigateurs + PeerServer local — connexion, course fantôme dans les deux sens, IA diffusées, objets croisés, revanche, déconnexion. 15/15.
- Le solo est inchangé (suite v20 : 15/15, course IA complète OK).

## v20 — Couleur du véhicule, accélérateur auto, portrait plein écran

- **Nouvelle étape 3/4 « Choisis ta couleur »** après le choix du véhicule : 8 teintes (rose, rouge, bleu, vert, jaune, violet, orange, blanc), navigables aux flèches ou d'un tap sur les pastilles, mémorisées (`iam-color`). Le véhicule du joueur est repeint en direct dans le garage et en course.
- **Accélérateur automatique par défaut** : le kart accélère tout seul (comme l'assistance MK8) — on se concentre sur la direction. Nouveau bouton 🚗 **AUTO/MANU** en haut de l'écran pour repasser en mode manuel (bouton A), choix mémorisé.
- **Mode portrait vraiment plein écran** : la scène occupe désormais toute la hauteur du téléphone (plus de bandes noires) — le conteneur `#stage` est épinglé au viewport.
- **Fini le kart enterré hors piste** : le sol visible est un mélange progressif entre le bord de route et le terrain brut ; le kart utilisait le terrain brut et passait sous le décor (visible à New York). Nouvelle fonction `groundYAt(x, z)` qui reproduit exactement la formule du mesh du sol — le kart roule maintenant *sur* ce qu'on voit.
- **Survol des circuits fluide** : la caméra de présentation interpole entre les échantillons du tracé au lieu de sauter d'un point à l'autre (fini les saccades).
- **Minimap déplacée en portrait** : en haut à droite, elle ne chevauche plus le bouton A.
- **7ᵉ véhicule : « MODEL Y »**, un SUV électrique inspiré de la Tesla Model Y — carrosserie extrudée depuis le vrai profil latéral (capot plongeant, ligne fastback), toit vitré panoramique teinté d'une seule pièce (le pilote est assis à l'intérieur, visible à travers), phares LED effilés, bandeau lumineux arrière rouge sur toute la largeur, bas de caisse noir, passages de roues, rétroviseurs et poignées affleurantes. Aucun logo ni marque dans le jeu. Un des pilotes IA le conduit aussi en course.
- **Sauvetage automatique façon Lakitu** : hors piste plus de 3 secondes (1,4 s si vraiment perdu) → le kart est replacé sur la piste, avec avertissement clignotant « ⤺ RETOUR SUR LA PISTE… » et bip. L'étoile autorise toujours les raccourcis dans l'herbe.
- **Portraits beaucoup plus réalistes** (toujours 100 % dessinés en code, aucune photo publiée) : texture 512×256, peau modelée par dégradés (lumière, pommettes, menton), iris noisette à stries et double reflet, cils et sourcils poil à poil, vraies lèvres avec brillance, nez ombré, mèches de cheveux en 3 tons (ondulées Inès, raides brillantes Alice, épis Marlon), verres de lunettes avec reflets (hexagones dorés d'Alice, effet miroir bleu de Marlon), taches de rousseur en constellation.

## v19 — Avatars Inès · Alice · Marlon + gyro par défaut

- **Portraits personnalisés des trois pilotes**, inspirés de la photo de famille mais dessinés en code (aucune photo publiée — le site est public) : **Marlon** cheveux courts châtains ébouriffés + lunettes de soleil miroir bleues + grand sourire ; **Inès** cheveux mi-longs ondulés avec raie au milieu, yeux noisette ; **Alice** longs cheveux raides + **lunettes hexagonales dorées** + taches de rousseur. Vrais cheveux 3D à la place des casquettes pour les trois.
- **Gyroscope activé par défaut** : sur Android/desktop dès le lancement ; sur iOS, la permission est demandée au premier tap (exigence Apple). Le bouton 🧭 permet toujours de le couper (choix mémorisé).

## v18 — Fix superpositions de l'écran titre

- Les contrôles tactiles (joystick, boutons A/B) ne s'affichent plus que **pendant la course** — les menus sont propres.
- La ligne d'aide clavier ne chevauche plus le bouton JOUER : réservée au desktop et repositionnée au-dessus.
- Le bouton gyroscope reste accessible dans les menus (sorti du bloc contrôles).

## v17 — Loading de mise à jour, portrait, véhicule unique, swipe, fix luminosité iOS

- **Écran de chargement de mise à jour** : au lancement, si une nouvelle version est disponible, un écran « 🔄 Mise à jour du jeu… » bloque jusqu'à son installation puis recharge — on joue toujours sur la dernière version (garde-fou 20 s, jamais en pleine course).
- **Portrait jouable** : l'overlay « tourne ton téléphone » est retiré, le jeu tourne dans les deux orientations (FOV adapté).
- **Sélection simplifiée** : plus de choix de pilote/couleurs — l'étape 2 est un pur **choix de véhicule** (gros plan 3D, 6 formes).
- **Swipe partout** : glisser horizontalement change de véhicule et de circuit, glisser verticalement change de cylindrée — en plus des taps et flèches.
- **Fix luminosité iOS** : le pipeline bloom HDR rendait l'image laiteuse et surexposée sur iPhone — rendu direct (tone mapping natif + MSAA canvas) sur iOS, bloom conservé ailleurs.

## v16 — Autocomplétion des prénoms (anti-doublons)

- En tapant les premières lettres dans la fenêtre de fin de course, les prénoms déjà connus (joueurs récents + tous les noms du leaderboard) s'affichent en suggestions tappables, filtrées en direct — insensible à la casse **et aux accents** (« ines » retrouve « Inès »).
- À la sauvegarde, un prénom identique à un existant (casse/accents différents) est **fusionné** avec la graphie d'origine : plus de doublons Marlon/marlon dans le classement.

## v15 — Garage de véhicules, boutons CONTINUER, leaderboard nominatif

- **6 véhicules aux formes réellement différentes** : Kart classique, **Formule** (F1 à roues apparentes, ailerons), **Pod Racer** façon Star Wars (double nacelle + cockpit, en lévitation avec propulseurs lumineux), **Speeder** volant (moto anti-grav à fourches), **Brique** style Lego (carrosserie cubique à tenons chromés), **Fusée** (corps de rocket à hublots et tuyère). Sélecteur « VÉHICULE ‹ › » à l'étape pilote, mémorisé ; chaque IA roule dans son propre type de véhicule.
- Véhicules volants : bob de lévitation + propulseurs pulsants, pas de roues.
- **Passe de détail** : pneus à sculptures (texture de bande de roulement), disques de frein + étriers rouges, rétroviseurs chromés (Kart/F1), **halo de sécurité F1**, plaques numérotées par personnage, bandes néon sous les véhicules volants.
- **Bouton « CONTINUER ▶ » / « C'EST PARTI ! 🏁 »** bien visible en bas de chaque écran de sélection — plus besoin de deviner où taper.
- **Leaderboard nominatif** : à la fin de la course, une fenêtre demande le prénom — saisie clavier **ou reconnexion en 1 tap** aux joueurs passés (mémorisés). Chaque record stocke prénom, date, véhicule, personnage et **le temps de chaque tour** dans la base locale JSON (localStorage). « Meilleur tour » affiché à l'arrivée.

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
