# appecole – École de parapente

Application mobile (iPhone et Android) pour gérer une école de parapente en Suisse,
selon les directives de formation FSVL.

- **Carnet de vol virtuel** : l'élève note chaque vol séparément (décollage → atterrissage, navettes,
  exercices travaillés et commentaire), y compris plusieurs décollages différents le même jour.
  En pente école, une séance peut regrouper plusieurs vols.
  Le total à payer (vols + navettes) se calcule automatiquement selon les tarifs de l'école.
- **Encaissement et validation** : le moniteur du jour encaisse (montant, moyen de paiement) et valide
  les vols en une fois ; seuls les vols validés entrent dans le carnet et comptent dans la progression.
- **Export PDF du carnet** avec résumé, vols, compétences et cases de signature (élève, moniteur),
  à présenter pour l'inscription à l'examen.
- **Aujourd'hui** (moniteurs) : élèves du jour et leur statut — en préparation, en vol (avec
  l'exercice), atterri — dans l'ordre des décollages, partagé entre les téléphones des moniteurs.
- **Moniteurs** : fiches élèves, validation des compétences, onglet Vols (à encaisser, total du jour),
  planning des séances, décollages et atterrissages, liste de compétences modifiable, tarifs, réglages.
- **Progression** : vols en pente école (nombre, sans minimum), grands vols, sites différents,
  compétences acquises.
- **Liens et contenus météo** gérés par les moniteurs depuis l'app : boutons vers des sites, ou pages,
  webcams et codes d'intégration (<iframe>, ex. Windy) affichés directement dans l'écran Météo.
- **Coin météo** : prévisions heure par heure pour chaque site (vent, rafales, vent vers 1500 m,
  pluie, instabilité), avec une indication favorable / limite / défavorable selon les seuils de
  l'école et l'orientation du décollage. Données Open-Meteo (modèles MeteoSwiss), sans clé d'API.
- **Alertes** : autorisation d'élève qui expire dans les 30 jours.

> ⚠️ Les exigences avant l'examen pratique (40 grands vols, 5 sites différents) et la
> liste des compétences sont des valeurs de départ à vérifier avec le règlement FSVL en vigueur.
> Les moniteurs les modifient dans **Réglages**.

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
ses vols, ses compétences, les séances où il est inscrit, les moniteurs et les sites. Un élève peut
ajouter et corriger ses propres vols tant que le moniteur n'a pas noté le paiement ; il ne peut pas
indiquer lui-même un paiement.

Si vous aviez déjà exécuté une version précédente de `schema.sql`, exécutez-le à nouveau : il est
prévu pour être relancé sans perte de données.

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
