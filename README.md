# 🏁 Kart Dash — Retro Racing

Un jeu de kart rétro façon **Mario Kart SNES** (rendu pseudo-3D "Mode 7"), jouable directement dans le navigateur et **installable sur téléphone** comme une application (PWA).

100 % vanilla JS / Canvas — aucune dépendance, tous les graphismes et sons sont générés par code (assets originaux).

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

- Rendu **Mode 7** (sol texturé en perspective, comme sur SNES) à 60 FPS
- 8 personnages jouables, 7 adversaires IA avec rubber-banding
- 3 tours, classement en temps réel, chrono, mini-carte
- **Objets** : 🍄 champignon turbo, 🍌 banane, ⚡ éclair
- Boîtes à objets, pads de boost, mini-turbo de drift
- Sons synthétisés en WebAudio (moteur, compte à rebours, objets)
- PWA complète : hors ligne via service worker, icônes, plein écran paysage

## 🚀 Déploiement

Le workflow `.github/workflows/deploy.yml` déploie automatiquement sur GitHub Pages à chaque push sur `main`.

À faire une seule fois : **Settings → Pages → Source : « GitHub Actions »**.
