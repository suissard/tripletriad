#!/bin/bash

echo "Arrêt et suppression des conteneurs, réseaux, et volumes liés à Docker Compose..."
docker-compose down -v --remove-orphans

echo "Suppression des fichiers et dossiers générés (base de données, uploads, build, cache, dist)..."
rm -rf strapi_data/
rm -rf strapi/.tmp/
rm -rf strapi/dist/
rm -rf strapi/build/
rm -rf strapi/.cache/

echo "Nettoyage terminé avec succès ! ✅"
