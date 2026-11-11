Version de test du **Quiz expert énergie** pour borne tactile Windows, hors ligne.

## Nouveautés de cette version

- **Trois quiz revus** : débutant, intermédiaire, expert, 10 questions chacun. Ils sont indépendants : on choisit celui qu'on veut sur l'écran d'accueil.
- **2 minutes par quiz**, avec compte à rebours. Si le temps s'écoule avant la dernière question, l'écran « Temps écoulé : échec » s'affiche et la partie n'entre pas au classement.
- **Points selon la justesse et le temps** : 100 points par bonne réponse, plus 2 points par seconde restante, au prorata des bonnes réponses.
- **Bouton « Choisir un autre quiz »** à la fin de chaque quiz, qui ramène à l'écran de choix.
- **Repère de quiz sur les scores** : une pastille (couleur, 1 à 3 barres, nom du niveau) indique à quel quiz correspond chaque score. Le classement a un onglet « Tous les quiz » et un onglet par quiz.

Les parties jouées avec la version précédente (anciens quiz) restent dans l'export CSV, mais ne figurent plus au classement.

## Installation

1. Télécharger `quiz-expert-energie-borne-…-setup.exe` ci-dessous.
2. L'ouvrir. Windows peut afficher « Windows a protégé votre ordinateur » : l'installeur n'est pas encore signé. Cliquer sur **Informations complémentaires**, puis **Exécuter quand même**.
3. Le quiz s'installe et se lance en plein écran. Il se relance tout seul à l'ouverture de session Windows.

Configuration visée : Windows 10 ou 11 64 bits, 4 Go de RAM. Aucune connexion internet n'est nécessaire.

## Sortir de l'application

Comme sur une borne, la fenêtre occupe tout l'écran et ne se ferme pas avec Alt+F4.

- **Avec un clavier** : `Ctrl+Maj+Q`.
- **Au doigt** : toucher 5 fois de suite le logo CIPREL de l'accueil, saisir le code **2468**, puis **Quitter l'application**.

Sur un poste de bureau, pour éviter le lancement à chaque ouverture de session : mettre `"openAtLogin": false` dans `%APPDATA%\quiz-expert-energie-borne\borne.json`, ou désinstaller l'application (Paramètres → Applications). Avant d'installer une nouvelle version, quitter l'application.

## À tester

- Les trois quiz, au doigt : un terminé dans les temps, un autre qu'on laisse aller au bout des 2 minutes (écran d'échec).
- Le bouton **Choisir un autre quiz** en fin de partie.
- La saisie du pseudo avec le clavier affiché à l'écran.
- Le classement (bouton **Classement** de l'accueil) : onglet « Tous les quiz », puis chaque quiz.
- L'inactivité : sans toucher l'écran pendant 90 secondes, la borne demande « Toujours là ? ». Au bout de 15 secondes de plus, elle repart à zéro pour le visiteur suivant. Le classement est conservé.
- Le bouton **Nouveau joueur** de l'accueil.

## Pour l'équipe

- **Administration** (5 touchers sur le logo, code **2468**) : export des résultats en CSV (sur une clé USB, par exemple), redémarrage de l'écran, sortie de l'application.
- **Réglages** : modifier `%APPDATA%\quiz-expert-energie-borne\borne.json` avec le Bloc-notes, puis relancer l'application :
  - `adminPin` : le code d'administration. **Changez-le avant la mise en service.**
  - `idleSeconds` : le délai d'inactivité, en secondes.
  - `zoom` : la taille de l'interface (par exemple `1.25` sur un grand écran).
  - `kiosk` : `false` pour ouvrir le quiz dans une fenêtre normale.
  - `disableGpu` : `true` si l'écran reste noir ou scintille.
- **Données** : les résultats sont enregistrés dans `%APPDATA%\quiz-expert-energie-borne\data\journal.ndjson`. Le journal technique est dans `logs\borne.log`.

En cas de problème, merci d'envoyer le fichier `logs\borne.log` avec une capture d'écran.
