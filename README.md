# appecole – École de parapente

Application mobile (iPhone et Android) pour gérer une école de parapente en Suisse,
selon les directives de formation FSVL.

- **Moniteurs** : fiches élèves, carnet de vols (pente école et grands vols), validation des
  compétences, examen théorique par branche, planning des séances, sites de vol, réglages.
- **Élèves** : leur progression vers l'examen pratique, leurs vols, leurs compétences, leurs séances.
- **Coin météo** : prévisions heure par heure pour chaque site (vent, rafales, vent vers 1500 m,
  pluie, instabilité), avec une indication favorable / limite / défavorable selon les seuils de
  l'école et l'orientation du décollage. Données Open-Meteo (modèles MeteoSwiss), sans clé d'API.
- **Alertes** : assurance ou autorisation d'élève qui expire dans les 30 jours.

> ⚠️ Les exigences avant l'examen pratique (40 grands vols, 5 sites, 10 jours) et la liste des
> compétences sont des valeurs par défaut à vérifier avec le règlement FSVL en vigueur.
> Les exigences chiffrées sont modifiables dans **Réglages**, la liste des compétences dans
> `src/lib/fsvl.ts`.

> ℹ️ L'indication météo est une aide : elle ne remplace jamais l'analyse du moniteur sur le terrain.

## Essayer l'application

```bash
npm install
npx expo start
```

Scannez le QR code avec l'application **Expo Go** (App Store / Google Play) ou appuyez sur `w`
pour l'ouvrir dans le navigateur.

Sans configuration, l'app démarre en **mode démo** : les données restent sur l'appareil.
Le bouton « Charger des données de démonstration » remplit l'app avec des élèves fictifs.

## Partager les données entre moniteurs et élèves (Supabase)

1. Créez un projet gratuit sur [supabase.com](https://supabase.com) (région Europe, p. ex. Zurich/Francfort).
2. Dans **SQL Editor**, exécutez le contenu de [`supabase/schema.sql`](supabase/schema.sql).
3. Dans **Authentication → Email Templates → Magic Link**, ajoutez le code à l'e-mail :
   `Votre code : {{ .Token }}` (l'app se connecte par code à 6 chiffres, sans mot de passe).
4. Copiez `.env.example` vers `.env` et renseignez l'URL et la clé *anon* du projet
   (**Project Settings → API**).
5. Relancez l'app. Le responsable se connecte avec son e-mail, puis crée l'école.
6. Pour chaque élève : ouvrir sa fiche → **Infos** → **Inviter l'élève**. L'élève installe l'app,
   se connecte avec cette adresse et voit uniquement ses propres données.
   Les autres moniteurs s'invitent depuis **Réglages → Moniteurs**.

Droits d'accès (appliqués côté serveur par les règles RLS de Supabase) :
les moniteurs lisent et modifient toutes les données de leur école ; un élève ne lit que sa fiche,
ses vols, ses compétences, les séances où il est inscrit, les moniteurs et les sites.
Les notes internes des moniteurs sont masquées dans l'app élève, mais font partie de la fiche
de l'élève : n'y mettez rien que l'élève ne devrait pas pouvoir lire.

## Publier sur l'App Store et Google Play

Prérequis : un compte [Apple Developer](https://developer.apple.com/programs/) (99 USD / an)
et un compte [Google Play Console](https://play.google.com/console) (25 USD, une fois),
idéalement au nom de l'école.

```bash
npm install -g eas-cli
eas login              # compte gratuit expo.dev
eas build:configure
eas build --platform all
eas submit --platform all
```

Avant la première publication : remplacez les icônes dans `assets/`, vérifiez
`bundleIdentifier` / `package` dans `app.json` (`ch.appecole.parapente`), et préparez une
politique de confidentialité (l'app stocke des données personnelles d'élèves : LPD suisse).

## Développement

```bash
npm run typecheck   # TypeScript
npm test            # tests de la logique (progression, météo, données)
```

Structure : voir [`AGENTS.md`](AGENTS.md).
