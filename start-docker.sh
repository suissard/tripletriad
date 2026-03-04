#!/bin/bash

# Démarre les conteneurs Docker en arrière-plan
echo "Démarrage des conteneurs Docker..."
docker-compose up -d

echo "Services démarrés :"
echo "- Frontend : http://localhost"
echo "- Strapi (API) : http://localhost:1337"
echo "Pour voir les logs : docker-compose logs -f"
