#!/bin/bash

echo "Démarrage des services avec Docker Compose..."
docker-compose up -d

echo ""
echo "Les conteneurs sont en cours de démarrage."
echo "L'initialisation de l'administrateur et de la base de données se fera automatiquement au premier lancement de Strapi."
echo "Strapi sera bientôt disponible sur : http://localhost:1337"
echo "Les logs peuvent être consultés avec : docker-compose logs -f strapi"
