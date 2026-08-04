# 🏁 IAM Kart — Inès · Alice · Marlon

Un jeu de kart **3D** inspiré de Mario Kart, avec des **vaisseaux lumineux farfelus** façon Star Wars et des avions qui traversent le ciel. Jouable directement dans le navigateur et **installable sur téléphone** comme une application (PWA), y compris hors ligne.

Moteur **Three.js (WebGL)** — éclairage temps réel, ombres portées, ambiance coucher de soleil, néons. Tous les modèles 3D, textures et sons sont générés par code (assets 100 % originaux).

## 🎮 Jouer

**En ligne** : une fois GitHub Pages activé → `https://max-pruv.github.io/mario/`

**En local** :

```bash
npx serve .        # ou : python3 -m http.server
# puis ouvrir http://localhost:3000
```

## 📱 Installer sur ton téléphone

1. Ouvre l'URL du jeu dans Chrome (Android) ou Safari (iOS)
2. **Android** : menu ⋮ → « Ajouter à l'écran d'accueil » / « Installer l'application »
3. **iOS** : bouton Partager → « Sur l'écran d'accueil »
4. Le jeu se lance en plein écran, en paysage, et fonctionne **hors ligne**

## 🕹️ Contrôles

| Action | Clavier | Tactile |
|---|---|---|
| Diriger | ← → ou A/D | Boutons ◀ ▶ |
| Accélérer | ↑, W ou Espace | Bouton **A** |
| Freiner | ↓ ou S | — |
| Utiliser l'objet | Shift ou X | Bouton **B** |
| Démarrer / Rejouer | Entrée | Toucher l'écran |

## ✨ Fonctionnalités

- **Rendu 3D WebGL** : éclairage crépusculaire, ombres dynamiques, brouillard atmosphérique, tone mapping filmique
- **Vaisseaux lumineux farfelus** : chasseur à 4 ailes, soucoupe volante, donut néon, fusée rétro — avec halos et traînées lumineuses
- **Avions cartoon** avec hélices et traînées de condensation
- 8 personnages (Inès, Alice, Marlon, Rex, Nova, Zip, Violet, Blaze), 7 adversaires IA avec rubber-banding
- 3 tours, classement temps réel, chrono, mini-carte
- **Objets** : 🍄 champignon turbo, 🍌 banane, ⚡ éclair — boîtes à objets holographiques, pads de boost animés, mini-turbo de drift
- Portique de départ avec feux tricolores, rails néon pulsants le long de la piste
- Sons synthétisés en WebAudio (moteur, compte à rebours, objets)
- PWA complète : hors ligne via service worker, icônes, plein écran paysage

## 🚀 Déploiement (même modèle que le repo `minecraft`)

Le jeu est un site 100 % statique, sans build — exactement comme [max-pruv/minecraft](https://github.com/max-pruv/minecraft), qui est servi gratuitement sur `max-pruv.github.io/minecraft`.

GitHub Pages est **gratuit pour les repos publics** (c'est un repo privé qui demande un plan payant). À faire une seule fois :

1. **Settings → General → Danger Zone → Change visibility → Public**
2. **Settings → Pages → Source : « Deploy from a branch » → `main` / `/ (root)`**

→ le jeu est servi sur `https://max-pruv.github.io/mario/`. Chaque push sur `main` met le site à jour automatiquement, sans workflow ni CI.

## 🔄 Mises à jour automatiques (même installé)

Les clients installés (PWA) se mettent à jour tout seuls :

- le service worker sert tout depuis le cache (hors ligne instantané) **et** re-télécharge chaque fichier en arrière-plan à chaque usage (*stale-while-revalidate*) ;
- l'app vérifie s'il existe une nouvelle version **au lancement, à chaque retour au premier plan, et toutes les 3 minutes** pendant le jeu ;
- quand une nouvelle version est prête, elle s'applique automatiquement **dès que tu n'es pas en pleine course** (au menu ou après l'arrivée) — un petit message « ✨ Mise à jour prête » s'affiche en attendant.

Côté release : bumper `CACHE_VERSION` dans `sw.js` à chaque publication (comme sur le repo minecraft) pour forcer la bascule immédiate et coordonnée de tous les fichiers.

## 🧱 Crédits

- [Three.js](https://threejs.org) (MIT) — embarqué dans `vendor/` pour le mode hors ligne
