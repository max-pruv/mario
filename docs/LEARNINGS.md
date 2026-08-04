# Learnings — ce que le repo `minecraft` nous a appris (et ce qu'on en a repris)

Analyse du repo [max-pruv/minecraft](https://github.com/max-pruv/minecraft) (~5 700 lignes de JS vanilla + Three.js, zéro build, zéro asset externe) et de la façon dont ses patterns ont été appliqués — ou adaptés — dans IAM Kart.

## 1. Architecture "zéro build"

**Minecraft** : site 100 % statique — `index.html` + modules ES dans `src/` + Three.js vendoré dans `vendor/`. Aucune étape de compilation, servi tel quel par GitHub Pages depuis la branche `main`.

**Repris dans IAM Kart** : même modèle exactement. Three.js et ses addons de post-processing sont vendorés dans `vendor/` avec un import map, ce qui garde le jeu 100 % hors ligne et déployable en poussant sur `main`. C'est le pattern le plus rentable des deux projets : pas de CI, pas de node_modules en prod, déploiement = `git push`.

## 2. PWA et mises à jour

**Minecraft** : service worker en *stale-while-revalidate* — tout est servi depuis le cache instantanément (hors ligne parfait) pendant que le réseau rafraîchit le cache en arrière-plan. Un `CACHE_VERSION` bumpé à chaque release force la bascule coordonnée. Fallback de navigation vers `index.html` hors ligne.

**Repris et amélioré dans IAM Kart** : même stratégie SWR (copiée quasi telle quelle — elle est éprouvée), plus :
- vérification de nouvelle version au lancement, au retour au premier plan et toutes les 3 minutes (`registration.update()`) ;
- application automatique de la mise à jour par reload **différé à un moment sûr** (jamais en pleine course), avec toast à l'écran.

## 3. Contrôles tactiles

**Minecraft** : joystick virtuel invoqué là où le pouce gauche touche l'écran (`touch.joyId` par identifiant de touch), drag-to-look à droite, tap-vs-hold distingué par timer (`holdTimer` + `repeatTimer` pour le minage continu), détection d'appareil tactile via `matchMedia('(pointer: coarse)')`.

**Repris dans IAM Kart** :
- la détection `(pointer: coarse)` pour afficher les contrôles tactiles et tenter le plein écran ;
- le multi-touch par identifiant de pointeur (`setPointerCapture` sur le joystick, boutons A/B indépendants) ;
- joystick **analogique** horizontal fixe (plutôt qu'invoqué) car en course seul l'axe gauche-droite compte — un emplacement fixe est plus prévisible à haute vitesse.

**Ajouté au-delà de minecraft** : pilotage au **gyroscope** (DeviceOrientation, permission iOS demandée dans un geste utilisateur), avec hiérarchie clavier > joystick > gyro.

## 4. Persistance locale

**Minecraft** : 13 usages de `localStorage` — édits de blocs, collection de créatures, stats éducatives, temps de jeu quotidien, niveaux adaptatifs. Tout en JSON, chargé avec `try/catch` silencieux (un localStorage corrompu ou indisponible ne casse jamais le jeu).

**Repris dans IAM Kart** : même pattern défensif `try { JSON.parse(...) } catch { valeur par défaut }` pour :
- le **scoreboard** : top 5 des temps par `(circuit, catégorie cc)` avec nom et date ;
- la préférence gyroscope.

## 5. Génération procédurale d'assets

**Minecraft** : atlas de textures entièrement peint sur canvas au démarrage (`textures.js`, 559 lignes) — le repo ne contient aucune image de gameplay. Terrain déterministe par bruit fractal (seule la *différence* est sauvegardée).

**Repris dans IAM Kart** : toutes les textures (route, ciel, herbe, vitrines de la ville, damier), tous les modèles 3D et tous les sons (WebAudio) sont générés en code. Les seuls fichiers binaires du repo sont les icônes PWA. Bénéfices identiques : repo minuscule, pas de droits d'auteur sur des assets, cache PWA trivial.

- Astuce reprise : PRNG maison déterministe (`seed * 16807 % 2147483647`) pour que les décors (arbres, ville, foule) soient identiques à chaque chargement — important pour que les circuits soient "les mêmes" d'une session à l'autre sans rien sauvegarder.

## 6. Boucle de jeu et robustesse

**Minecraft** : `dt` clampé pour éviter les téléportations après un onglet en arrière-plan ; substepping physique anti-tunnel.

**Repris dans IAM Kart** : `dt` clampé à 33 ms ; la logique de progression de course (index de piste fenêtré + comptage de tours par franchissement) est tolérante aux gros pas de temps. Les projectiles (carapaces) utilisent la même recherche fenêtrée que les karts.

## 7. Ce que minecraft fait et qu'on n'a pas (encore) repris

- **Mode éducatif** avec quiz, difficulté adaptative et limite de temps quotidienne — transposable en "quiz aux stands" entre deux courses.
- **NPCs compagnons** (Marlon y suit le joueur et parle français) — transposable en commentateur de course.
- **Streaming de chunks** — inutile ici (circuits bornés), mais utile si un jour on fait un mode exploration libre.
