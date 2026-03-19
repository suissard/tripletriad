#!/bin/bash

echo "Arrêt et suppression des conteneurs, réseaux, et volumes liés à Docker Compose..."
docker-compose down -v --remove-orphans

echo "Suppression des fichiers et dossiers générés (base de données, uploads, build, cache, dist)..."
rm -rf back/strapi_data/
rm -rf back/strapi/.tmp/
rm -rf back/strapi/dist/
rm -rf back/strapi/build/
rm -rf back/strapi/.cache/

echo "Nettoyage terminé avec succès ! ✅"
