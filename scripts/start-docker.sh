#!/bin/bash

# Détermine le dossier racine du projet (un niveau au-dessus du script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Charger les variables d'environnement depuis .env à la racine
if [ -f "$ROOT_DIR/.env" ]; then
    export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)
fi

# Valeurs par défaut si non définies dans .env
PORT=${PORT:-1340}
FRONTEND_PORT=${FRONTEND_PORT:-80}

echo "🚀 Démarrage des conteneurs Docker (sudo) depuis $ROOT_DIR..."

# Exécuter docker.compose depuis la racine
cd "$ROOT_DIR"
docker.compose up -d

echo ""
echo "✨ Services démarrés :"
echo "🌍 Frontend      : http://localhost:$FRONTEND_PORT"
echo "⚙️  Strapi (API) : http://localhost:$PORT"
echo ""
echo "📝 Pour voir les logs : docker.compose logs -f"
