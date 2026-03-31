# 📋 Documentation Cartes — Triple Triad

## Structure d'une carte (modèle Strapi)

Les vrais attributs sont définis dans le Content-Type Strapi :
`back/strapi/src/api/card/content-types/card/schema.json`

### Attributs

| Attribut | Type | Obligatoire | Description | Options / Contraintes |
|---|---|---|---|---|
| **name** | `string` | ✅ | Nom de la carte | |
| **description** | `text` | ❌ | Description narrative | |
| **element** | `enumeration` | ❌ | Élément principal | `None`, `eau`, `faille_dimensionnelle`, `furtif`, `hacking`, `longue_portee`, `obsidienne`, `radiation`, `reseau`, `spore` |
| **elements** | `json` | ❌ | Éléments multiples (liste) | ex: `["radiation", "eau"]` |
| **faction** | `enumeration` | ❌ | Faction de la carte | `neutre`, `Hégémonie martienne`, `Exode pélagique`, `Héritiers des cendres`, `Omni-Réseau`, `Chœur Synthétique`, `Éveil Chthonien`, `Incursion Dissonante`, `Ferrailleurs de la Ceinture`, `Fléau Spore` |
| **topValue** | `string` | ✅ | Valeur puissance Haut | Max 1 caractère |
| **rightValue** | `string` | ✅ | Valeur puissance Droite | Max 1 caractère |
| **bottomValue** | `string` | ✅ | Valeur puissance Bas | Max 1 caractère |
| **leftValue** | `string` | ✅ | Valeur puissance Gauche | Max 1 caractère |
| **skills** | `component[]` | ❌ | Compétences spéciales | Composant `game.skill`, répétable |
| **rarity** | `enumeration` | ❌ | Rareté de la carte | `Common`, `Uncommon`, `Rare`, `Epic`, `Legendary` |
| **defaultHp** | `integer` | ✅ | Points de vie par défaut | Défaut: `3` |
| **collectionName** | `string` | ❌ | Nom de collection (lien deck) | |
| **image** | `media` | ❌ | Illustration de la carte | Types: `images` |
| **storiesRewardedFrom** | `relation` | ❌ | Relations avec les stories | Many-to-many avec `api::story.story` |

---

## 🃏 Composant Skill (`game/skill.json`)

Les capacités spéciales d'une carte.

### Attributs du composant Skill

| Attribut | Type | Description |
|---|---|---|
| **name** | `string` | Nom du skill |
| **type** | `enumeration` | Type d'effet |
| **value** | `integer` | Valeur numérique de l'effet |
| **condition** | `string` | Condition de déclenchement |

---

## 📁 Exemples et modèles

### Cartes existantes
Toutes les cartes de référence :
```
shared/data/cards.json
```

### 🆕 Créer de nouvelles cartes
Les modèles et cartes en cours de création sont dans :
```
shared/data/new-cards/
```
Les fichiers JSON ici servent de brouillon et seront intégrés dans Strapi.

#### Script utilitaire
`shared/data/new-cards/CheckFactions.js` — Vérifie les factions disponibles.

### Decks
Définitions des decks (groupes de cartes) :
```
shared/data/decks/
```

### Stories
Définitions des histoires (qui récompensent des cartes) :
```
shared/data/stories/
```

---

## 🔧 Créer une nouvelle carte

1. **Inspiré-toi** de `shared/data/cards.json` pour le format
2. **Crée un fichier JSON** dans `shared/data/new-cards/nom_de_ta_carte.json`
3. **Respecte les attributs Strapi** (voir tableau ci-dessus)
4. **Vérifie** que `faction`, `element` et `rarity` correspondent aux énumérations valides
5. **Intègre** dans Strapi après validation

### Exemple minimal
```json
{
  "name": "Goblin",
  "description": "Un petit combatant courageux.",
  "element": "None",
  "elements": ["radiation", "eau"],
  "faction": "Héritiers des cendres",
  "topValue": "2",
  "rightValue": "1",
  "bottomValue": "3",
  "leftValue": "4",
  "rarity": "Common",
  "defaultHp": 3,
  "skills": [
    {
      "name": "Rage",
      "type": "stat_mod",
      "value": 2,
      "condition": "adjacent_ennemi"
    }
  ]
}
```

### 🔑 Règles importantes
- **topValue, rightValue, bottomValue, leftValue** : chaîne d'**1 caractère** max (ex: `"5"`, `"A"`, `"+"`, etc.)
- **element** : un seul élément (énumération)
- **elements** : liste d'éléments pour les cartes multi-éléments
- **faction** : doit correspondre exactement aux 10 factions définies (case-sensitive)
- **rarity** : `Common` → `Legendary`
- **defaultHp** : entier, défaut `3`
