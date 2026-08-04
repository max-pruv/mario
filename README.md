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

## 🚀 Déploiement

Le workflow `.github/workflows/deploy.yml` déploie automatiquement sur GitHub Pages à chaque push sur `main`.

À faire une seule fois : **Settings → Pages → Source : « GitHub Actions »**.

## 🧱 Crédits

- [Three.js](https://threejs.org) (MIT) — embarqué dans `vendor/` pour le mode hors ligne
