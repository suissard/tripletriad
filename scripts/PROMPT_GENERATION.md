# Génération de Prompts Automatisée

Ce document décrit le processus de génération automatique des prompts visuels pour les cartes du jeu via un webhook n8n.

## Vue d'ensemble

Le script `scripts/generate-prompts.mjs` (ou `.cjs`) permet d'envoyer les métadonnées d'une carte à un générateur de prompt (IA via n8n) et de mettre à jour le fichier JSON de la carte avec le nouveau prompt généré.

### Webhook
- **URL :** `https://n8n.clavier.dev/webhook/createprompt`
- **Méthode :** POST
- **Body envoyé :**
  ```json
  {
    "name": "Nom de la carte",
    "function": "Description du rôle",
    "scenography": "Setting actuel (si dispo)",
    "attitude": "Comportement actuel (si dispo)",
    "faction": "Faction de la carte",
    "category": "Nom de la carte (utilisé comme archétype)"
  }
  ```

## Utilisation du Script

Le script privilégié est `scripts/generate-prompts.mjs`.

### 1. Traiter uniquement les cartes sans prompt
Recommandé pour compléter la collection sans régénérer les prompts existants.
```bash
node scripts/generate-prompts.mjs --missing-only
```

### 2. Limiter le nombre de cartes (Batch)
Utile pour ne pas saturer le webhook ou faire des tests par petits lots.
```bash
node scripts/generate-prompts.mjs --missing-only --limit 10
```

### 3. Test sur une seule carte
Idéal pour valider que le webhook répond bien sans modifier toutes les cartes.
```bash
node scripts/generate-prompts.cjs --test
```

### 4. Traiter une plage de cartes
Utile pour faire des fournées (batchs).
```bash
node scripts/generate-prompts.cjs --range 001-010
```

### 3. Traiter une carte spécifique
```bash
node scripts/generate-prompts.cjs --card 016
```

### 4. Simuler l'envoi (Dry Run)
Affiche le JSON qui serait envoyé au webhook sans rien modifier.
```bash
node scripts/generate-prompts.cjs --test --dry-run
```

### 5. Lancer sur TOUTES les cartes (150+)
```bash
node scripts/generate-prompts.cjs
```

## Sécurité et Backups

- **Backups :** À chaque modification, le script copie le fichier original dans le dossier `shared/data/base-cards-backup/`.
- **Délai :** Un délai de 2 secondes est ajouté entre chaque appel au webhook pour éviter de saturer le serveur.
- **Timeout :** Le script attend maximum 2 minutes par réponse avant de passer à la suite.

## Notes sur n8n

Le webhook est maintenant configuré sur l'URL de production (`/webhook/` au lieu de `/webhook-test/`). Cela signifie qu'il n'est plus nécessaire de cliquer sur "Execute Workflow" manuellement dans n8n pour chaque appel, à condition que le workflow soit "Actif".
