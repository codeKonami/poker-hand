# Moderniser en 1.1.0 sans rupture

La modernisation de poker-hand-evaluator (TypeScript, ESM + CJS, types fournis, CI) sort en 1.1.0 et non en 2.0.0. Ainsi, les utilisateurs en `^1.0.x` la reçoivent sans rien faire. La contrepartie est qu'aucune rupture n'est permise par rapport à la Référence 1.0.1. Tout usage qui marchait en 1.0.1 marche encore, y compris les chemins profonds jamais documentés (`src/utils/*`, `src/arrays/*`…), que des shims servent jusqu'à la 2.0.0. Les renommages d'API et les retraits de chemins attendent la 2.0.0.

## Options écartées

- **Une 2.0.0 assumée** : aucun risque pour les utilisateurs, mais personne ne la reçoit sans action. La version majeure serait dépensée sur un changement interne, au lieu de porter les renommages.
- **Une 1.1.0 qui ne protège que l'API documentée** : il y aurait moins de shims, mais le champ `exports` couperait des chemins utilisés, chez des gens qui n'ont rien changé de leur côté.

## Conséquences

- Trois changements ne sont pas des ruptures : l'abandon d'un runtime en fin de vie, s'il est déclaré dans `engines` et dans le CHANGELOG ; une relaxation documentée ; la copie renvoyée par `describe().hand`.
- Le champ `version` de `package.json` reste celui de la dernière version publiée. Changesets fait le passage de version au moment de la release.
