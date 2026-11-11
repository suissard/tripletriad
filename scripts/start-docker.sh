#!/bin/bash
set -euo pipefail

# Détermine le dossier racine du projet (un niveau au-dessus du script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Charger les variables d'environnement depuis .env à la racine
# (`set -a` + source gère correctement les valeurs avec espaces / caractères spéciaux)
if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
else
    echo "❌ Fichier .env introuvable. Copie .env.example vers .env et renseigne les secrets." >&2
    exit 1
fi

echo "🚀 Démarrage des conteneurs Docker depuis $ROOT_DIR..."

cd "$ROOT_DIR"
docker compose up -d

echo ""
echo "✨ Services démarrés :"
echo "🌍 Frontend      : http://localhost"
echo "⚙️  Strapi (API) : http://localhost:${STRAPI_PORT}"
echo ""
echo "📝 Pour voir les logs : docker compose logs -f"
