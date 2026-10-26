---
name: Quiz expert énergie — CIPREL
description: Quiz illustré sur les centrales à cycle combiné gaz, dans le langage visuel de « La centrale du futur » (brikelec).
colors:
  ink: "#1f2832"
  ink-soft: "#44525f"
  navy: "#26456f"
  sky: "#e6f3f9"
  cream: "#fff6e3"
  surface: "#ffffff"
  line: "#c9dbe6"
  ciprel-orange: "#ed7f06"
  ciprel-orange-ink: "#a85200"
  ciprel-green: "#0d9330"
  success: "#0b7a28"
  danger: "#b3392f"
  energy: "#f5c242"
  flow-gas: "#ed7f06"
  flow-flue: "#c8553d"
  flow-power: "#f5c242"
  flow-steam: "#3f80c4"
  flow-grid: "#0d9330"
typography:
  display:
    fontFamily: "'Baloo 2', sans-serif"
    fontSize: "clamp(1.6rem, 4.2vw, 2.6rem)"
    fontWeight: 800
    lineHeight: 1.05
  question:
    fontFamily: "'Baloo 2', sans-serif"
    fontSize: "clamp(1.2rem, 2.6vw, 1.5rem)"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "'Nunito', sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  numeric:
    fontFamily: "'Baloo 2', sans-serif"
    fontWeight: 800
rounded:
  sm: "10px"
  md: "18px"
  answer: "22px"
  lg: "26px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ciprel-orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    height: "48px"
  answer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.answer}"
    height: "60px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

## Overview
Un quiz d'experts dans l'univers de brikelec : aplats, traits encrés, pastilles arrondies cerclées d'un trait épais, techniciens CIPREL comme guides. Le schéma d'un cycle combiné (turbine à gaz, chaudière de récupération, alternateur, cycle eau-vapeur, réseau) est la carte du parcours : chaque quiz terminé met sa section sous tension. Le contenu, 55 questions corrigées, est celui du document client, mot pour mot.

## Colors
Tokens repris de brikelec (`app/assets/css/main.css`) :
- **Encre** `#1f2832` : texte et traits.
- **Ciel** `#e6f3f9` : fond.
- **Orange CIPREL** `#ed7f06` : action principale (texte encre, 5,4:1) et réponse choisie. Jamais comme couleur de texte : utiliser `#a85200`.
- **Vert réussite** `#0b7a28` : bonne réponse, niveau expert.
- **Rouge** `#b3392f` : réponse fausse, niveau « à reprendre ».

Chaque section du schéma prend la couleur de son flux (`app/data/sections.js`) : gaz `#ed7f06`, fumées `#c8553d`, électricité `#f5c242`, eau-vapeur `#3f80c4`, réseau `#0d9330`.

## Typography
- **Baloo 2** (700 à 800) : titres, énoncés des questions, scores, pastilles A à D et boutons.
- **Nunito** (500 à 800) : réponses, explications et bulles des guides.
- Les phrases de calcul (avec « = » et des chiffres) des explications sont posées à part, en Baloo, sur fond crème à bord pointillé, comme au tableau. Les notations du document (`C_corrigé`) passent en indice.
- Chiffres tabulaires pour le chrono, les scores et le classement.

## Layout
- Accueil : le schéma du cycle combiné domine. Le panneau du guide, de la jauge « Charge de la centrale » et des récompenses est à côté au-dessus de 1200 px, dessous en dessous. Vient ensuite le parcours, une liste verticale reliée par un trait qui prend la couleur de la section quand elle est terminée (pas de grille de cartes identiques).
- Quiz : colonne de 880 px au plus, avec une barre collante (accueil, quiz, numéro de question, chrono, son), la jauge des questions, la carte question, puis la correction.
- Marges de 16 px sur mobile, sans défilement horizontal de 375 à 1440 px.

## Components
- **Réponse** : pilule de 60 px de haut avec une pastille ronde A à D (trait encre de 3 px). Ce sont des boutons radio natifs, donc les flèches fonctionnent au clavier, ainsi que les raccourcis A à D, 1 à 4 et Entrée.
  - Choisie : trait encre de 3 px, fond `#fff3d1` et pastille orange.
  - Juste : trait et pastille verts, avec une coche.
  - Fausse : trait et pastille rouges, avec une croix.
  - Les autres passent en gris lisible (7,6:1).
- **Correction** : panneau cerclé d'encre, vert pâle ou rouge pâle. Le technicien se réjouit ou réfléchit, avec une réaction courte, la bonne réponse et l'explication.
- **Jauge des questions** : une pastille par question. Vert pour juste, rouge pour faux, marine pour « enregistrée » à l'examen, cercle orange pour la question en cours.
- **Pastille de niveau** : « À reprendre », « Acquis » ou « Niveau expert », selon le barème du document.
- **Partage** : carte PNG, bouton « Défier un collègue » (jaune énergie), LinkedIn, puis les autres réseaux en icônes.

## Do's and Don'ts
- Toujours un pictogramme dessiné (SVG au trait), jamais d'emoji.
- Pas de dégradé violet, pas de texte en dégradé, pas de verre dépoli.
- Pas de liseré coloré épais sur un côté des cartes. Le détecteur signale la pointe de la bulle des guides et le bord de la jauge : ce sont des faux positifs (un carré pivoté et un trait de remplissage).
- Contraste d'au moins 4,5:1 pour le texte et focus visible (anneau marine de 3 px).
- Respecter `prefers-reduced-motion` : flux, flamme et ventilateur du schéma s'arrêtent.

## Risques de l'adaptation du Word, du plus grave au moins grave
1. **Fuite du corrigé** : l'API publique ne peut pas lire `answer` ni `explanation` (droits par colonne). La correction n'arrive qu'après la réponse, ou à la fin de l'examen.
2. **Réponse perdue** (coupure réseau, rechargement) : chaque réponse est enregistrée tout de suite et rejouable sans doublon. La tentative reprend là où elle s'était arrêtée.
3. **Double clic ou double validation** : bouton « Valider » distinct du choix. Les boutons sont désactivés pendant l'envoi, et la base ignore une seconde réponse.
4. **Énoncés longs sur mobile** : énoncé en 1,2 rem, réponses sur plusieurs lignes, barre allégée sous 480 px, défilement automatique vers la correction.
5. **Formules illisibles** (P = S × cos φ, corrections NOx) : phrases de calcul posées à part, avec les indices.
6. **Examen sans retour immédiat** : la jauge marque les réponses « enregistrées ». À la fin, les erreurs sont dépliées dans la correction.
7. **Classement faussé par les révisions** : les révisions sont hors classement et ne changent pas le meilleur score.
8. **Partage qui dévoile les réponses** : la page publique ne montre que juste ou faux.
9. **Accès clavier et lecteurs d'écran** : radios natives, `fieldset`/`legend`, focus déplacé sur la correction puis sur la question suivante, jauges décrites en texte.
10. **Ton « générique »** : techniciens et schéma CIPREL, vocabulaire d'exploitation, pas de cartes en grille.
