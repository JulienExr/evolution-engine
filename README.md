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
- Les lapins ont un sexe, une maturite, une energie, une gestation et peuvent donner naissance a des portees.
- Les lapins consomment de l'energie en se deplacant, mangent les pousses, cherchent un partenaire, mutent, vieillissent et meurent.
- Les pousses apparaissent uniquement dans la zone interieure de la carte afin d'eviter les blocages contre les bordures.
- Les genes ont des compromis : par exemple, un lapin rapide atteint mieux la nourriture mais consomme plus.
- Les renards ont aussi des genes : vitesse, vision, metabolisme, fertilite et taille.
- Les renards chassent les lapins, meurent de faim s'ils ne trouvent pas de proie, cherchent un partenaire et transmettent leurs genes avec mutation.
- Les lapins detectent les renards proches selon leur vision et fuient avant le contact, avec un cout energetique.
- La carte contient plusieurs habitats : prairie, prairie fertile, broussailles, zone humide et zone seche. Ces habitats influencent la croissance de la nourriture et les zones de couverture.
- Quelques refuges apparaissent dans les zones couvertes. Chaque refuge protege au maximum 3 lapins menaces.
- La predation favorise indirectement les lapins rapides et attentifs.
- Les saisons et les chocs secs modifient la croissance de la nourriture.
- Cliquer sur un lapin ou un renard affiche son energie, son age, son etat et ses genes.
- Sur mobile, la scene se deplace avec un doigt, zoome/dezoome avec deux doigts ou avec les boutons camera.
- Les controles permettent de modifier la vitesse de simulation, la quantite de nourriture, le taux de mutation, le climat et la selection sexuelle, puis d'ajouter des lapins ou des renards.

## Fichiers

```txt
index.html                    Structure de l'app
src/app.js                    Point d'entree et boucle principale
src/core/constants.js         Dimensions et limites du monde
src/core/math.js              Helpers mathematiques
src/state.js                  Etat mutable de la simulation
src/simulation/entities.js    Fabriques des lapins, genes et nourriture
src/simulation/foodSystem.js  Croissance et repartition de la nourriture
src/simulation/foxesSystem.js Comportement, chasse et reproduction des renards
src/simulation/genetics.js    Heredite et mutations
src/simulation/particles.js   Effets visuels courts
src/simulation/population.js  Reset, introductions et generation initiale
src/simulation/rabbitsSystem.js Comportement, fuite et reproduction des lapins
src/simulation/refuges.js     Generation et logique des refuges
src/simulation/stats.js       Moyennes et historique
src/simulation/terrain.js     Generation des habitats et acces au terrain
src/simulation/simulation.js  Orchestration d'un tick de simulation
src/rendering/worldRenderer.js Rendu isometrique principal
src/rendering/chartRenderer.js Graphique d'evolution
src/ui.js                     DOM, controles et stats
src/styles.css                Interface responsive
```
