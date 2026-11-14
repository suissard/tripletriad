#!/bin/bash
set -euo pipefail

# Détermine le dossier racine du projet (un niveau au-dessus du script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ⚠️ Opération destructive : supprime le volume PostgreSQL (toute la base) et les uploads.
if [ "${1:-}" != "--yes" ]; then
    echo "⚠️  Cette commande supprime DÉFINITIVEMENT la base PostgreSQL (volume pgdata) et les uploads Strapi."
    echo "    Pense à lancer 'npm run backup' avant."
    read -r -p "Continuer ? [y/N] " answer
    case "$answer" in
        [yY]|[yY][eE][sS]) ;;
        *) echo "Annulé."; exit 0 ;;
    esac
fi

echo "🧹 Arrêt et suppression des conteneurs..."
cd "$ROOT_DIR"
docker compose down -v --remove-orphans

echo "🗑️ Suppression des fichiers générés..."
rm -rf "$ROOT_DIR/back/strapi_data/"
rm -rf "$ROOT_DIR/back/strapi/.tmp/"
rm -rf "$ROOT_DIR/back/strapi/dist/"
rm -rf "$ROOT_DIR/back/strapi/build/"
rm -rf "$ROOT_DIR/back/strapi/.cache/"

echo "✅ Nettoyage terminé avec succès !"
