#!/bin/bash

# Détermine le dossier racine du projet (un niveau au-dessus du script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🧹 Arrêt et suppression des conteneurs (sudo)..."
cd "$ROOT_DIR"
sudo docker-compose down -v --remove-orphans

echo "🗑️ Suppression des fichiers générés..."
rm -rf "$ROOT_DIR/back/strapi_data/"
rm -rf "$ROOT_DIR/back/strapi/.tmp/"
rm -rf "$ROOT_DIR/back/strapi/dist/"
rm -rf "$ROOT_DIR/back/strapi/build/"
rm -rf "$ROOT_DIR/back/strapi/.cache/"

echo "✅ Nettoyage terminé avec succès !"
