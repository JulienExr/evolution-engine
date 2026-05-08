# Evolution Engine

Simulateur de selection naturelle en vue isometrique, sans dependances externes.

## Lancer

```bash
python3 -m http.server 4173
```

Puis ouvrir :

```txt
http://127.0.0.1:4173
```

## Modele

- Les lapins se deplacent sur une prairie isometrique.
- Chaque lapin possede des genes : vitesse, vision, metabolisme, fertilite et taille.
- Les lapins consomment de l'energie en se deplacant, mangent les pousses, se reproduisent, mutent, vieillissent et meurent.
- Les genes ont des compromis : par exemple, un lapin rapide atteint mieux la nourriture mais consomme plus.
- Les controles permettent de modifier la vitesse de simulation, la quantite de nourriture, le taux de mutation, le climat et la pression de selection.

## Fichiers

```txt
index.html                    Structure de l'app
src/app.js                    Point d'entree et boucle principale
src/core/constants.js         Dimensions et limites du monde
src/core/math.js              Helpers mathematiques
src/state.js                  Etat mutable de la simulation
src/simulation/entities.js    Fabriques des lapins, genes et nourriture
src/simulation/terrain.js     Generation et acces au terrain
src/simulation/simulation.js  Ticks, selection, reproduction et stats
src/rendering/worldRenderer.js Rendu isometrique principal
src/rendering/chartRenderer.js Graphique d'evolution
src/ui.js                     DOM, controles et stats
src/styles.css                Interface responsive
```
