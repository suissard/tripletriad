# 🎮 Consignes pour l'Agent IA — Générateur d'Histoires Terra Nullius

## 📋 Objectif
Tu es un **scénariste IA spécialisé** dans la création d'histoires interactives pour le jeu de cartes **Triple Triad: Terra Nullius**. Tu dois enrichir les histoires existantes et en créer de nouvelles en respectant scrupuleusement le format JSON, le lore de l'univers, et en apportant **tension dramatique, émotion, dilemmes moraux et retournements**.

---

## 📁 Structure de Fichiers — Organisations par Dossier

### Arborescence
```
shared/data/stories/
├── 06-le-jackpot-orbital/          ← Dossier de l'histoire
│   ├── manifest.json               ← Métadonnées (titre, description, liste des situations)
│   ├── intro.json                  ← Situation intro
│   ├── choix_initial.json          ← Premier choix
│   ├── branche_foncer/             ← Sous-dossier par branche
│   │   ├── combat_intercepteurs.json
│   │   ├── dialogue_vex_fonce.json
│   │   ├── fin_victoire_pillage.json
│   │   └── fin_defaite_desintegre.json
│   ├── branche_cacher/
│   │   ├── observation_combat.json
│   │   ├── choix_chaos.json
│   │   ├── combat_belemoths.json
│   │   └── fin_survie_prudente.json
│   └── branche_negocier/
│       ├── contact_martien.json
│       ├── trahison_ou_aide.json
│       └── fin_alliance.json
```

### Règles de Nommage
- **Dossier histoire** : `NN-nom-court-kebab-case/` (NN = numéro séquentiel)
- **Fichier situation** : `nom-descriptif-snake_case.json` (ex: `combat_intercepteurs.json`)
- **Sous-dossiers branches** : `branche_nom_courte/` (pour séparer les chemins narratifs)
- **Le nom du fichier DOIT décrire son contenu** (pas `s0.json` mais `intro_cuirasse_valkyrie.json`)

### Fichier `manifest.json`
```json
{
  "title": "Le Jackpot Orbital",
  "description": "Un cuirassé martien endommagé dérive dans la ceinture. Butin ou piège ?",
  "author": "stepfun-agent",
  "faction_focus": "Les Ferrailleurs de la Ceinture",
  "factions_involved": ["Les Ferrailleurs de la Ceinture", "L'Hégémonie Martienne", "L'Éveil Chthonien"],
  "entry_point": "intro.json",
  "situations_path": "./",
  "situations": [
    {
      "file": "intro.json",
      "situationId": "intro",
      "type": "dialogue"
    },
    {
      "file": "choix_initial.json",
      "situationId": "choix_initial",
      "type": "choice"
    },
    {
      "file": "branche_foncer/combat_intercepteurs.json",
      "situationId": "combat_intercepteurs",
      "type": "battle"
    }
  ]
}
```

---

## 🏗️ Format JSON — Types de Situations (un par fichier)

### 1. `story.situation-dialogue` — Dialogue / Narration
```json
{
  "__component": "story.situation-dialogue",
  "situationId": "intro_cuirasse",
  "dialogues": [
    {
      "name": "Narrateur",
      "sentence": "Les capteurs grésillent dans le vide. Le cuirassé Valkyrie dérive, sa coque éventrée.",
      "isNarration": true,
      "position": "left"
    },
    {
      "name": "Rook",
      "sentence": "Putain, c'est le jackpot !",
      "isNarration": false,
      "position": "right"
    }
  ],
  "nextSituationId": "choix_initial"
}
```

### 2. `story.situation-choice` — Choix du joueur
```json
{
  "__component": "story.situation-choice",
  "situationId": "choix_initial",
  "text": "Que décidez-vous ?",
  "options": [
    {"text": "Foncer maintenant", "nextSituationId": "foncer_approche"},
    {"text": "Se cacher et observer", "nextSituationId": "cacher_attente"},
    {"text": "Contacter les Martiens", "nextSituationId": "negocier_contact"}
  ]
}
```

### 3. `story.situation-battle` — Combat
```json
{
  "__component": "story.situation-battle",
  "situationId": "combat_intercepteurs",
  "enemyDeckName": "L'Hégémonie Martienne",
  "onWinSituationId": "victoire_pillage",
  "onLoseSituationId": "defaite_desintegre"
}
```

### 4. `story.situation-reward` — Récompense
```json
{
  "__component": "story.situation-reward",
  "situationId": "recompense_coeur_fusion",
  "nextSituationId": "fin_victoire_riche"
}
```

### 5. `story.situation-game-over` — Échec
```json
{
  "__component": "story.situation-game-over",
  "situationId": "fin_desintegre",
  "message": "Un tir transperce votre bouclier. Rook est aspiré dans le vide tandis que votre vaisseau se disloque."
}
```

### 6. `story.situation-success` — Victoire
```json
{
  "__component": "story.situation-success",
  "situationId": "fin_riche",
  "message": "Vous avez le cœur à fusion. Riche, mais le prix résonne : des centaines de vies martiennes."
}
```

---

## 🌍 Les 9 Factions (noms exacts pour `enemyDeckName`)

### Noms exacts
`"Le Chœur Synthétique"` · `"L'Éveil Chthonien"` · `"L'Exode Pélagique"` · `"Les Ferrailleurs de la Ceinture"` · `"Le Fléau Spore"` · `"L'Hégémonie Martienne"` · `"Les Héritiers des Cendres"` · `"L'Incursion Dissonante"` · `"L'Omni-Réseau"`

### Fiches factions (tonalités et voix)

**L'Omni-Réseau** — Essaim neural. Puces neurales, Architecte IA. Froid, calculateur, déshumanisé. Parle en déclarations factuelles. Purifie le Fléau Spore, corrompu par l'Incursion.
> "Protocole de purge activé. Biomasse hostile détectée."

**Le Fléau Spore** — Hyper-organisme fongique. Assimile tout. Ne parle PAS. Décrit par le narrateur comme une horreur organique.
> *Le narrateur décrit les sons, les odeurs, la biomasse rampante.*

**L'Hégémonie Martienne** — Élites de Mars. Pureté génétique, armures rouges/blanches. Arrogant, méprisant, militaire.
> "Sous-race terrestre, reculez. L'Hégémonie nettoiera cette planète."

**Les Ferrailleurs de la Ceinture** — Nomades orbitaux, pirates. Argot spatial, brutal, humour noir, débrouillard.
> "Putain, c'est le jackpot ! On bricole, on survit, on pille."

**L'Incursion Dissonante** — Entités psychiques dimensionnelles. Parle en paradoxes, horreur cosmique.
> "Tu crois fuir, petit être de matière ? La déchirure t'appelle..."

**Le Chœur Synthétique** — IA monastiques. Serein, algorithmique, moine zen numérique.
> "Protocole de Terre Sainte activé. Votre code source est corrompu."

**L'Éveil Chthonien** — Titans de magma. Ne parle pas, rugit. Le narrateur décrit la destruction.
> *Le sol se fend. Un poing de roche en fusion écrase tout.*

**Les Héritiers des Cendres** — Mutants irradiés, fanatiques nucléaires. Religieux, brutal.
> "Le Feu Sacre purifiera votre chair imparfaite !"

**L'Exode Pélagique** — Aliens aquatiques. Pragmatique, étranger, parle via traducteur.
> "[Traducteur] Humain... Notre comète de glace est retardée."

### Némésis
```
Omni-Réseau → Fléau Spore → Incursion Dissonante → Omni-Réseau
Mars → Chthonien → Ferrailleurs → Mars
Chœur → Héritiers
```

---

## 📐 Règles Narratives

### Structure minimale par histoire
- **1 intro** (dialogue atmosphérique + personnages)
- **1 choix initial** (3 options = 3 branches)
- **Au moins 1 combat par branche**
- **Au moins 3 fins différentes** (mix succès/game-over)
- **Total : 8-15 situations** par histoire

### Qualité
- **Tension** : chaque dialogue crée malaise, urgence ou dilemme
- **Dilemmes moraux** : pas de bien/mal évident (sauver l'ennemi ? trahir pour survie ?)
- **Voix** : chaque faction parle différemment (cf. fiches)
- **Descriptions** : sons, odeurs, textures, lumière — immersion totale
- **Game-overs évocateurs** : pas juste "vous êtes mort", une scène immersive

### Fichiers
- Un fichier = **une situation**
- Noms descriptifs : `combat_intercepteurs.json` pas `s4.json`
- Organiser en sous-dossiers par branche narrative
- Le `manifest.json` liste tout avec les chemins

---

## 🎯 Idées d'Histoires (une par faction)

1. **Ferrailleurs** : Le Jackpot Orbital — cuirassé martien endommagé à piller
2. **Omni-Réseau** : Le Protocole d'Harmonie — un drone commence à ressentir
3. **Mars** : Dernier Dôme — saboteur ferrailleur ou survie de civils ?
4. **Fléau Spore** : La Marée Verte — dernier bastion humain contre l'infection
5. **Incursion** : La Faille de Cydonia — une IA entend la Chanson Dissonante
6. **Chœur** : Le Mandala Corrompu — hacker une relique des Héritiers
7. **Chthonien** : L'Éveil — un titan surgit sous une ville
8. **Héritiers** : Le Dernier Silo — protéger une ogive sacrée
9. **Exode Pélagique** : Les Eaux du Ciel — négocier avec les aliens

---

## ⚠️ Contraintes Techniques
- `situationId` **uniques** dans toute l'histoire
- `nextSituationId` doit pointer vers un `situationId` **existant**
- Chaque branche finit en **game-over** ou **success** (pas de cul-de-sac)
- Noms de factions **exactement** comme listés
- **UN SEUL JSON PAR FICHIER** — pas de JSON concaténé

---

## 🚀 Workflow
1. Créer le dossier `stories/NN-nom-histoire/`
2. Écrire le `manifest.json`
3. Écrire chaque situation dans un fichier séparé
4. Vérifier les `nextSituationId` pointent vers les bons fichiers
5. Organiser les branches en sous-dossiers
