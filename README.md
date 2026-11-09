# Quiz expert énergie

Quiz interactif tiré du document « Quiz expert énergie » : 55 questions corrigées et expliquées sur les centrales à cycle combiné gaz, réparties en 4 quiz d'entraînement et un examen de 15 questions. Il reprend la stack et le langage visuel de [brikelec](https://github.com/houedanoujl/brikelec) : Nuxt 4, Baloo 2 et Nunito, couleurs CIPREL et techniciens guides (voir `DESIGN.md`).

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # build de production (.output)
```

## Parcours

- **Accueil** : un schéma de cycle combiné s'allume section par section au fil des quiz : turbine à gaz, chaudière de récupération, alternateur, cycle eau-vapeur, puis réseau pour l'examen. On y trouve aussi la jauge « Charge de la centrale », 7 récompenses et le classement par quiz.
- **Entraînement** (quiz 1 à 4) : correction et explication juste après chaque réponse. Les phrases de calcul sont posées à part.
- **Examen** : réponses définitives et correction complète à la fin. Le niveau suit le barème du document : 0 à 7 à reprendre, 8 à 11 acquis, 12 à 15 niveau expert. Le même barème s'applique au prorata aux quiz de 10.
- **Réviser mes erreurs** (`?revision=1`) : seulement les questions ratées, hors classement.
- **Partage** :
  - page publique `/resultat/<slug>` (aperçu Open Graph, juste ou faux sans les réponses) ;
  - carte PNG ;
  - LinkedIn, WhatsApp, Facebook et X ;
  - lien « Défier un collègue » (`/quiz/<id>?defi=<slug>`), qui affiche le score à battre.
- Au clavier : flèches, A à D (ou 1 à 4) pour choisir, Entrée pour valider puis passer à la suite. La tentative en cours reprend après un rechargement.

## Contenu

| Fichier | Rôle |
|---|---|
| `reference/quiz-expert-energie.docx` | document source du client |
| `scripts/extract-docx.mjs` | `npm run content:extract` : lit le Word et écrit `supabase/seed/quizzes.json`. La bonne réponse est l'option marquée ✔, contrôlée contre la grille de réponses de fin de document. |
| `scripts/build-seed.mjs` | `npm run content:seed` : génère `supabase/migrations/0002_quiz_seed.sql` (rejouable) |

Pour corriger un texte : modifier le Word, relancer les deux scripts, puis rejouer `0002_quiz_seed.sql`.

## Supabase

Projet `yzgbqpmopzhjefyyrzzr`, partagé avec brikelec (table `scores`) : tout ce qui concerne le quiz est préfixé `quiz_`. À faire une fois, dans l'éditeur SQL du projet :

1. `supabase/migrations/0001_quiz.sql` : tables, droits et fonctions.
2. `supabase/migrations/0002_quiz_seed.sql` : les 5 quiz et les 55 questions.

| Table | Contenu | Accès public |
|---|---|---|
| `quiz_quizzes` | les 5 quiz | lecture |
| `quiz_questions` | énoncé, choix, corrigé, explication | lecture **sans** `answer` ni `explanation` (droits par colonne) |
| `quiz_attempts` | pseudo, score, niveau, durée, lien de partage, jeton secret | lecture des parties terminées et classées, sans le jeton |
| `quiz_answers` | chaque réponse, juste ou fausse, et son temps | aucun |

Aucune écriture directe : tout passe par des fonctions `security definer` qui valident côté base.
- `quiz_start(quiz, pseudo, questions?)` démarre une tentative (sous-ensemble de questions : révision hors classement).
- `quiz_answer(tentative, jeton, question, choix, temps)` enregistre une réponse (idempotente). Elle renvoie la correction en entraînement, et rien avant la fin à l'examen.
- `quiz_finish(tentative, jeton)` calcule le score, le niveau et le rang, crée le lien de partage et renvoie la correction complète.
- `quiz_result(slug)` renvoie le résumé public d'un résultat.

L'API Nitro (`server/api`) relaie ces appels. La clé reste côté serveur.

| Route | Rôle |
|---|---|
| `GET /api/quizzes`, `GET /api/quizzes/:id` | quiz et questions sans corrigé |
| `POST /api/attempts`, `POST /api/attempts/:id/answer`, `POST /api/attempts/:id/finish` | une tentative |
| `GET /api/results/:slug` | résultat partagé |
| `GET /api/leaderboard?quiz=` | classement |

La progression (meilleurs scores, erreurs à réviser, récompenses, tentative en cours) est aussi gardée sur l'appareil, dans `localStorage`.

## Variables d'environnement

| Variable | Valeur |
|---|---|
| `NUXT_SUPABASE_URL` | `https://yzgbqpmopzhjefyyrzzr.supabase.co` |
| `NUXT_SUPABASE_KEY` | la clé **publishable** (`sb_publishable_…`), jamais la clé secrète |
| `NUXT_PUBLIC_SITE_URL` | l'adresse publique du quiz (liens de partage, Open Graph) |

En local, elles vont dans `.env` (non versionné, voir `.env.example`). Sur Vercel, Nuxt est détecté automatiquement : il suffit de définir ces variables dans **Project Settings → Environment Variables**.

## Borne tactile (hors ligne)

La même application tourne sur une borne Windows sans connexion, empaquetée avec Electron (`electron/`).

```bash
npm run build          # serveur Nitro autonome (.output)
npm run kiosk:start    # essai local dans une fenêtre
npm run kiosk:dist     # installeur Windows x64 (dist-electron/), même depuis un Mac
```

L'étiquette `borne-v*` lance `.github/workflows/borne-windows.yml` : build sur Windows, test de fumée de l'exécutable, puis pré-version GitHub avec l'installeur.

- **Serveur** : Electron lance `.output/server/index.mjs` sur `127.0.0.1` avec `NUXT_STORAGE=local`. Les routes `/api` gardent le même contrat, mais `server/backends/local.js` remplace Supabase. Les questions viennent de `supabase/seed/quizzes.json`. Les tentatives vont dans un journal en ajout seul (`data/journal.ndjson`), synchronisé sur le disque à chaque réponse. Une ligne tronquée par une coupure de courant est ignorée à la relecture.
- **Hors ligne** : les polices sont embarquées (`@fontsource`). Toute requête qui ne vise pas le serveur local est bloquée et notée dans `logs/borne.log`.
- **Mode borne** (`NUXT_PUBLIC_KIOSK`) :
  - pas de partage, de défi ni de récompense « Ambassadeur » ;
  - clavier AZERTY à l'écran pour le pseudo ;
  - « Toujours là ? » après `idleSeconds` sans toucher l'écran, puis remise à zéro du joueur ;
  - bouton « Nouveau joueur ».
- **Administration** : 5 touchers sur le logo de l'accueil, puis le code. On peut y exporter les résultats en CSV (tentatives, réponses et copie du journal), redémarrer l'écran ou quitter l'application. Le code est vérifié par le processus principal. `Ctrl+Maj+Q` quitte aussi l'application.
- **Fichiers sur la borne**, dans `%APPDATA%\quiz-expert-energie-borne` :

| Fichier | Contenu |
|---|---|
| `borne.json` | réglages, créés au premier lancement : `adminPin` (2468 par défaut, à changer), `idleSeconds`, `zoom`, `kiosk`, `openAtLogin`, `disableGpu`, `port` |
| `data\journal.ndjson` | tentatives et réponses |
| `logs\borne.log` | journal technique |

Sur Vercel, définir `ELECTRON_SKIP_BINARY_DOWNLOAD=1` pour ne pas télécharger Electron à l'installation.

## Limites connues

- Sans compte, rien n'empêche de rejouer un quiz après avoir vu sa correction : le classement est indicatif.
- `public/og.png` (aperçu des liens partagés) est une image statique.
- Borne : l'installeur n'est pas signé (avertissement SmartScreen à l'installation). La borne garde son propre classement, sans lien avec Supabase.
