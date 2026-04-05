# Génération de Visuels Automatisée

Ce document explique comment utiliser le script `scripts/generate-visuals.mjs` pour peupler votre instance Strapi avec les visuels des cartes, soit en récupérant des fichiers locaux, soit en les générant via l'IA.

## Vue d'ensemble

Le script automatise le flux complexe suivant pour chaque carte :
1. **Vérification Strapi** : Il vérifie si la carte existe déjà dans Strapi (par son nom) pour éviter les doublons.
2. **Recherche Locale** : Il regarde si un fichier image correspondant au champ `image` du JSON existe déjà sur votre disque.
3. **Génération IA (n8n)** : Si l'image n'est pas trouvée localement, il appelle un webhook n8n pour générer une image à partir du prompt structuré de la carte.
4. **Téléchargement** : Si l'image est générée, elle est téléchargée temporairement.
5. **Upload Strapi** : L'image (locale ou générée) est envoyée dans la médiathèque de Strapi.
6. **Création de Carte** : La carte est créée dans Strapi avec toutes ses statistiques et son association à l'image.

## Prérequis

- **Strapi** : Doit être lancé localement (généralement sur le port 1337).
- **Fichier .env** : Doit contenir les identifiants admin :
  ```env
  STRAPI_PORT=1337
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=votre_mot_de_passe
  ```
- **n8n** : Le workflow `createvisual` doit être actif sur `https://n8n.clavier.dev`.

## Utilisation du Script

### 1. Test sur une seule carte
Idéal pour vérifier que la connexion à Strapi et au Webhook fonctionne.
```bash
node scripts/generate-visuals.mjs --test
```

### 2. Traiter une carte spécifique
Si vous voulez importer/générer une carte précise (ex: 016-heg-faucheuse.json) :
```bash
node scripts/generate-visuals.mjs --card 016
```

### 3. Lancer la génération complète
Traite toutes les cartes présentes dans `shared/data/base-cards/` qui ne sont pas encore dans Strapi.
```bash
node scripts/generate-visuals.mjs
```

## Options Avancées (Arguments)

| Argument | Description |
| :--- | :--- |
| `--test` | Ne traite que la première carte manquante trouvée. |
| `--card <ID>` | Filtre par ID (ex: `016`). Pratique pour importer une carte précise. |
| `--range <S-E>` | Traite une plage de cartes par leur préfixe numérique (ex: `001-010`). |

## Détails Techniques

- **Modèle IA** : Par défaut, le script demande à n8n d'utiliser le modèle `sourceful/riverflow-v2-fast`.
- **Format** : Toutes les images générées sont converties en `.png` et stockées temporairement dans `tmp/visuals/` avant l'upload.
- **Statistiques** : Les statistiques de la carte (topValue, rightValue, etc.) sont extraites du JSON et envoyées à Strapi sous forme de chaînes de caractères.

## Logique de Recherche d'Images Locales

Le script est "intelligent" : avant de dépenser des crédits d'IA pour générer une image, il cherche si vous l'avez déjà dans l'un de ces dossiers :
- Racine du projet
- `front/public/`
- `back/strapi/public/`
- `shared/assets/`

Si le champ `"image": "base/001.png"` est présent dans votre JSON, il testera par exemple `front/public/base/001.png`.

## Résumé des Résultats

À la fin de l'exécution, un bilan s'affiche :
```text
===================================
🎉 BILAN DE LA GÉNÉRATION
===================================
Cartes existantes déjà en base : 120
Nouvelles images via n8n      : 5
Visuels locaux réutilisés      : 2
Échecs de traitement          : 0
===================================
```

> [!TIP]
> Si le script échoue à se connecter à Strapi, vérifiez que votre serveur Strapi est bien lancé et que les identifiants dans le `.env` sont corrects.
