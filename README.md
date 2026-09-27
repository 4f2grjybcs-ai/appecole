# appecole

Application de gestion d'une école de parapente (formation en Suisse selon les directives FSVL) :
élèves, moniteurs, carnet de vols, progression, planning et coin météo.

## État actuel

Travail en cours. La logique métier, réutilisable telle quelle dans l'app mobile, se trouve dans `src/` :

- `src/types.ts` – modèle de données (élèves, moniteurs, vols, compétences, séances, sites)
- `src/fsvl.ts` – référentiel de formation (étapes, compétences, branches théoriques, exigences par défaut)
- `src/progress.ts` – calcul de la progression vers l'examen pratique
- `src/weather.ts` – prévisions Open-Meteo et évaluation favorable / limite / défavorable par site

⚠️ Les exigences chiffrées (grands vols, sites, jours de vol) sont des valeurs par défaut
à vérifier avec le règlement de formation FSVL en vigueur.

Le squelette web (Vite) est provisoire : l'objectif est une application mobile iOS/Android
(Expo / React Native) publiée sur les stores.
