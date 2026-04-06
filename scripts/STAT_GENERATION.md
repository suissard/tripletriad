# Génération de Statistiques Automatisée

Ce document explique comment utiliser le script `scripts/generate-card-stats.mjs` pour générer des statistiques Triple Triad (Top, Right, Bottom, Left) basées sur la rareté d'une carte et les synchroniser avec Strapi.

## Vue d'ensemble

Le générateur utilise les plages de score total suivantes (basées sur la rareté) :
- **Common** : 0 - 9
- **Uncommon** : 10 - 19
- **Rare** : 20 - 28
- **Epic** : 29 - 35
- **Legendary** : 36 - 40

Le script distribue le score total sur les 4 directions, avec un maximum de 10 par direction.

## Utilisation du Script

### 1. Générer des stats pour test
Affiche des statistiques aléatoires pour une rareté donnée sans modifier de fichier.
```bash
node scripts/generate-card-stats.mjs --rarity Rare
```

### 2. Mettre à jour et Synchroniser sur Strapi
Met à jour le fichier JSON **ET** met à jour la carte sur Strapi (si elle existe).
```bash
node scripts/generate-card-stats.mjs --file shared/data/cards/base-cards/001-neu-refugie-des-confins.json --sync
```

### 3. Synchroniser uniquement (sans régénérer)
Si vous avez déjà modifié vos fichiers JSON locaux et voulez juste pousser les valeurs vers Strapi.
```bash
node scripts/generate-card-stats.mjs --dir shared/data/cards/base-cards --push
```

### 4. Mode automatique global
```bash
node scripts/generate-card-stats.mjs --auto --sync
```

## Options CLI

| Option | Description |
| :--- | :--- |
| `--rarity <R>` | Simule une génération pour une rareté donnée. |
| `--file <path>` | Cible un fichier JSON spécifique. |
| `--dir <path>` | Cible tout un dossier de fichiers JSON. |
| `--auto` | Cible par défaut `shared/data/cards`. |
| `--sync` | Régénère les stats localement ET synchronise avec Strapi. |
| `--push` | Ne régénère RIEN, pousse juste les stats locales actuelles vers Strapi. |

## Prérequis Strapi

Le script a besoin d'un fichier `.env` à la racine avec :
```env
ADMIN_EMAIL=votre_email
ADMIN_PASSWORD=votre_password
STRAPI_PORT=1340 (ou PORT)
```

## Détails Techniques

- **Source** : La logique est centralisée dans `scripts/utils/stats.mjs`.
- **API Strapi** : Utilise l'endpoint `content-manager/collection-types/api::card.card`.
- **Identification** : Les cartes sont identifiées sur Strapi par leur nom (`name`).

> [!IMPORTANT]
> L'option `--sync` **écrase** les statistiques locales et distantes. Utilisez `--push` si vous avez fait des ajustements manuels dans vos fichiers JSON que vous souhaitez conserver.
