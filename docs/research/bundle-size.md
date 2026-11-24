# Taille du bundle : minifier les tables, déclarer `sideEffects: false` — que gagne-t-on ?

Recherche pour le ticket [« Taille du bundle : que gagne-t-on à minifier les tables et à déclarer sideEffects: false ? »](https://github.com/codeKonami/poker-hand/issues/13).
Mesures du 2026-11-24 sur le commit `3138c14` de `master` (version 2.0.0).

Deux natures de preuves, toujours séparées dans ce document :

- **Documentation** : un fait tiré d'une source primaire (documentation officielle ou code source de l'outil), avec le lien.
- **Mesure** : un chiffre relevé pendant cette recherche, avec la commande. Les scripts de mesure n'ont pas été commités ; l'essentiel est reproduit en annexe.

Conventions : tailles en octets ; « gzip » = `gzip -c fichier | wc -c` (niveau 6 par défaut). Environnement en [annexe A](#annexe-a--environnement-et-commandes-de-base).

## En bref

1. **L'écart ES / CJS n'est que du blanc.** En mode lib, Vite minifie tout sauf les espaces pour le format `es` (choix documenté). esbuild réécrit alors chaque élément des tables sur sa propre ligne : 3 octets × 25 650 éléments = 76 950 des 77 665 octets d'écart. Le CJS actuel et l'UMD de la 1.0.1 embarquent exactement le même texte de tables (97 362 octets) ; seul le code d'enrobage diffère.
2. **Minifier les espaces du fichier ES** : −77 752 octets bruts (−43,8 %), mais −2 914 octets gzip (−7,3 %), et **rien (0 à 2 octets)** dans le bundle d'un consommateur qui minifie (mesuré avec Rollup, esbuild, webpack et Vite).
3. **`"sideEffects": false`** : aucun effet mesurable aujourd'hui, dans aucun des scénarios testés. Dès que `PokerHand` est utilisée, les tables sont nécessaires (≈ 99,9 kB avec ou sans le champ). Quand rien n'est utilisé, les bundlers éliminent déjà tout sans lui. Le champ ne devient utile que si le fichier ES publié perd ses annotations `/* @__PURE__ */` ou calcule quelque chose à l'import.
4. **Le seul levier qui change l'ordre de grandeur est de ne plus livrer les tables** : générées à l'import, le fichier passe à 3 624 octets bruts / 1 683 gzip (−96 %), avec des scores identiques sur les 2 598 960 mains, un bench inchangé (écarts de ±2 %, sans tendance) et environ +1,5 ms à l'import.

La recommandation détaillée et le compromis restant sont [en fin de document](#5-recommandation).

## 1. D'où vient l'écart entre ES, CJS et UMD

### 1.1 Mesures

```sh
npm ci && npm run build
wc -c dist/poker-hand-evaluator.js dist/poker-hand-evaluator.cjs
gzip -c dist/poker-hand-evaluator.js | wc -c
gzip -c dist/poker-hand-evaluator.cjs | wc -c
git show bf5e50e:dist/pokerhand.min.js | wc -c            # UMD publié en 1.0.1
git show bf5e50e:dist/pokerhand.min.js | gzip -c | wc -c
```

| Fichier | Octets | gzip |
| --- | ---: | ---: |
| ES actuel, `dist/poker-hand-evaluator.js` | 177 691 | 39 835 |
| CJS actuel, `dist/poker-hand-evaluator.cjs` | 100 026 | 37 051 |
| UMD 1.0.1, `dist/pokerhand.min.js` (commit `bf5e50e`) | 101 710 | 37 831 |
| ES avec espaces minifiés (voir 1.3) | 99 939 | 36 921 |

Décomposition (mesure : extraction des quatre grands littéraux de tableaux de chaque fichier) :

| Fichier | Quatre grandes tables | Reste (code, petites tables) | Total |
| --- | ---: | ---: | ---: |
| ES actuel | 174 316 | 3 375 | 177 691 |
| CJS actuel | 97 362 | 2 664 | 100 026 |
| UMD 1.0.1 | 97 362 | 4 348 | 101 710 |

- Le texte des quatre tables est **identique, caractère pour caractère,** dans le CJS actuel et dans l'UMD de la 1.0.1. Les 1 684 octets d'écart entre eux sont du code : amorce webpack 3 et classe transpilée en ES5 d'un côté, classe ES2020 de l'autre.
- Dans le fichier ES, les mêmes 25 650 nombres occupent 76 954 octets de plus : un saut de ligne et deux espaces d'indentation par élément (3 × 25 650 = 76 950), plus 4 sauts de ligne finaux. Les 711 octets restants de l'écart ES / CJS sont dans le code (espaces, indentation, annotations).
- Les tables pèsent 97,3 % du fichier minifié. Par table (texte minifié, et compressée seule) :

| Table | Éléments | Octets minifiés | gzip seule |
| --- | ---: | ---: | ---: |
| `flushes` | 7 937 (dont 6 650 zéros) | 19 029 | 3 698 |
| `unique5` | 7 937 (dont 6 650 zéros) | 19 735 | 3 764 |
| `products` | 4 888 | 34 563 | 16 068 |
| `values` | 4 888 | 24 035 | 10 512 |

Après gzip, ce sont donc `products` et `values` qui pèsent (26,6 kB sur 37) : les zéros de `flushes` et `unique5` se compressent presque gratuitement.

### 1.2 Pourquoi Vite ne minifie pas les espaces du format ES

Documentation :

- Vite 5, option `build.minify` : « Note the `build.minify` option does not minify whitespaces when using the `'es'` format in lib mode, as it removes pure annotations and breaks tree-shaking. » ([Vite 5, build.minify](https://v5.vite.dev/config/build-options.html#build-minify), [texte source de la page](https://github.com/vitejs/vite/blob/v5.4.21/docs/config/build-options.md?plain=1#L209)). La valeur par défaut est `'esbuild'`.
- La même note figure toujours dans la documentation courante (Vite 8.3, minifieur par défaut `'oxc'`) : [Vite, build.minify](https://vite.dev/config/build-options#build-minify).
- Code source de Vite 5.4.21, `resolveEsbuildTranspileOptions` : pour un build lib au format `es`, Vite passe à esbuild `minifyIdentifiers: true`, `minifySyntax: true`, `minifyWhitespace: false`, avec le commentaire « Do not minify whitespace for ES lib output since that would remove pure annotations and break tree-shaking » ([esbuild.ts, lignes 352 à 438](https://github.com/vitejs/vite/blob/v5.4.21/packages/vite/src/node/plugins/esbuild.ts#L352-L438)).
- esbuild décrit la minification comme trois opérations indépendantes : « it removes whitespace, it rewrites your syntax to be more compact, and it renames local variables to be shorter », activables séparément ([esbuild, Minify](https://esbuild.github.io/api/#minify)).

Mesures qui confirment la raison invoquée :

- Le fichier ES actuel contient 4 annotations `/* @__PURE__ */` (les deux `new Map(...)` de `ranks` et `suits`, les deux enums). Le CJS, minifié entièrement, n'en contient aucune (`grep -o "__PURE__" fichier | wc -l`).
- `esbuild --minify-whitespace` supprime bien ces annotations, alors que `--minify-identifiers --minify-syntax` les conserve (essai sur un enum isolé avec esbuild 0.27.3 ; même constat sur les builds du tableau 1.3, faits par l'esbuild 0.21.5 de Vite).
- Le format « un élément par ligne » vient de la réécriture par esbuild et non des sources : tout littéral de tableau écrit sur plusieurs lignes ressort avec un élément par ligne (voir 1.4).

### 1.3 Options pour changer ce comportement

Documentation :

- Aucune option documentée de Vite ne réactive la minification des espaces pour ES en mode lib. `build.minify` accepte un booléen, `'esbuild'` ou `'terser'` en Vite 5, et la note citée plus haut s'applique à toutes ces valeurs ([build.minify](https://v5.vite.dev/config/build-options.html#build-minify)).
- `build.minify: 'terser'` n'aide pas : le plugin terser de Vite ignore explicitement ce cas, « Do not minify ES lib output since that would remove pure annotations and break tree-shaking » ([terser.ts, lignes 74 à 78](https://github.com/vitejs/vite/blob/v5.4.21/packages/vite/src/node/plugins/terser.ts#L74-L78)).
- `esbuild: { minifyWhitespace: true }` n'aide pas non plus : dans la fonction citée plus haut, la branche ES lib force `minifyWhitespace: false` même si l'option est fournie ([esbuild.ts, lignes 399 à 408](https://github.com/vitejs/vite/blob/v5.4.21/packages/vite/src/node/plugins/esbuild.ts#L399-L408)).
- `build.rollupOptions` est transmis à Rollup : « Directly customize the underlying Rollup bundle » ([Vite 5, build.rollupOptions](https://v5.vite.dev/config/build-options.html#build-rollupoptions)). Rollup documente `output.plugins` comme le moyen d'ajouter une minification à une sortie, avec `@rollup/plugin-terser` en exemple : « Adds a plugin just to this output », limité aux plugins dont les hooks s'exécutent pendant `bundle.generate()` ou `bundle.write()` ([Rollup, output.plugins](https://rollupjs.org/configuration-options/#output-plugins)).
- Terser sait conserver les annotations : option de format `preserve_annotations`, « (default `false`) -- Preserve Terser annotations in the output » ([Terser, format options](https://terser.org/docs/options/#format-options)).
- Un plugin Vite peut aussi intervenir après coup. Les plugins de minification de Vite passent après tous les plugins utilisateur (« Vite post build plugins (minify, manifest, reporting) », [Vite, Plugin Ordering](https://vite.dev/guide/api-plugin#plugin-ordering)) ; le hook `generateBundle` de Rollup est appelé « at the end of `bundle.generate()` » avec la liste complète des fichiers ([Rollup, generateBundle](https://rollupjs.org/plugin-development/#generatebundle)).
- Pour des besoins de build avancés, la documentation de Vite renvoie vers d'autres outils : « If you are building non-browser libraries, or require advanced build flows, you can use tsdown or Rolldown directly » ([Vite, Library Mode](https://vite.dev/guide/build#library-mode)). Non mesuré ici.

Mesures (même source, seule la configuration change ; les configurations sont en [annexe B](#annexe-b--configurations-de-minification-essayées)) :

| Réglage | ES (octets / gzip) | CJS (octets) | Annotations pures dans l'ES |
| --- | ---: | ---: | ---: |
| Configuration actuelle (`build.minify` par défaut) | 177 691 / 39 835 | 100 026 | 4 |
| `build.minify: false` | 179 134 / 40 139 | 179 267 | 4 |
| `build.minify: 'terser'` | 179 134 / 40 139 | 100 019 | 4 |
| `esbuild: { minifyWhitespace: true }` | 177 691 / 39 835 (identique à l'octet près) | 100 026 | 4 |
| Plugin maison, `renderChunk` + esbuild `minifyWhitespace` | 126 291 / 38 393 | 100 026 | 2 |
| Plugin maison, `generateBundle` + esbuild `minifyWhitespace` | **99 939 / 36 921** | 100 026 | 0 |
| `rollupOptions.output.plugins: [terser({ format: { preserve_annotations: true } })]` | **99 990 / 36 962** | 100 015 | 4 |
| Même chose avec terser par défaut | 99 930 / 36 913 | 100 015 | 0 |
| Étape après build : `esbuild dist/poker-hand-evaluator.js --minify-whitespace` | 99 952 / 36 942 | — | 0 |
| Même configuration sous Vite 8.3.8 (Rolldown, Oxc), sans le plugin dts | 152 124 / 39 408 | 99 940 | 4 |

Lecture :

- `'terser'` est pire que le défaut pour l'ES : plus personne ne le minifie (ni terser, ni esbuild), les identifiants ne sont même plus raccourcis.
- Un plugin en `renderChunk` ne suffit pas : la passe esbuild de Vite repasse derrière et réimprime le fichier. Il faut agir dans `generateBundle`, ou avec un plugin de sortie Rollup.
- Passer à Vite 8 ne règle rien (152 kB : indentation par tabulation, toujours un élément par ligne).
- La sortie de l'étape `esbuild` en ligne de commande porte 13 octets de plus que le plugin : un préfixe `"use strict";` ajouté parce qu'esbuild lit le `tsconfig.json` du dépôt (vérifié : lancée sur une copie du fichier hors du dépôt, la commande donne 99 939 octets, à l'identique du plugin).

### 1.4 Le formatage des sources influe-t-il sur la taille ?

Mesures (tables réécrites dans une copie des sources, configuration actuelle) :

| Écriture des tables dans `src/tables/` | ES | ES espaces minifiés | CJS |
| --- | ---: | ---: | ---: |
| Actuelle (lignes de longueur variable, commentaires) | 177 691 | 99 939 | 100 026 |
| 10 nombres par ligne, sans commentaires | 177 691 (identique à l'octet près) | 99 939 | 100 026 (identique) |
| Chaque table sur une seule ligne | 126 383 | 99 939 (identique) | 100 026 (identique) |

Avec la configuration actuelle, la seule chose qui compte est « une ligne ou plusieurs » : esbuild conserve ce caractère du littéral, puis l'imprime soit sur une ligne (séparateur `, `), soit avec un élément par ligne. La largeur des lignes, l'alignement et les commentaires n'ont aucun effet. Une fois les espaces minifiés, le formatage des sources n'a plus aucun effet du tout. Cette recherche ne se prononce pas sur la PR 4.

### 1.5 Ce que la minification des espaces change, et pour qui

Mesures :

- **Consommateur avec bundler et minification** (cas d'une application) : rien, à 2 octets près. Bundle final de `import { PokerHand }` : 99 922 octets (paquet actuel) contre 99 920 (ES minifié) avec Rollup + terser ; 99 920 et 99 920 avec esbuild ; 99 944 et 99 942 avec webpack ; 99 830 et 99 830 avec Vite 8. Détail en section 2.
- **Usage direct du fichier ES** (Node, `<script type="module">`, CDN) : −77 752 octets bruts, −2 914 octets gzip (39 835 → 36 921). Temps de chargement à froid dans Node : 1,16 ms → 1,06 ms.
- **Installation** (`npm pack --dry-run --json`) : paquet installé 284 537 → 206 785 octets (−27 %), archive 79 840 → 77 034 octets (−3,5 %).
- **Vitesse** : aucune différence (section 3).

## 2. Ce que change réellement `"sideEffects": false`

### 2.1 Documentation

- webpack définit l'effet de bord comme « code that performs a special behavior when imported, other than exposing one or more exports », et le champ comme un moyen de sauter des fichiers entiers : « `sideEffects` is much more effective since it allows to skip whole modules/files and the complete subtree », alors que `usedExports` « relies on terser to detect side effects in statements » ([webpack, Tree Shaking](https://webpack.js.org/guides/tree-shaking/)). L'option correspondante : « Tells webpack to recognise the `sideEffects` flag in `package.json` or rules to skip over modules which are flagged to contain no side effects when exports are not used » ([webpack, optimization.sideEffects](https://webpack.js.org/configuration/optimization/#optimizationsideeffects)).
- esbuild : « The `sideEffects` field in `package.json` can be used to tell esbuild which files in your package can be removed if all imports from that file end up being unused » ([esbuild, Ignore annotations](https://esbuild.github.io/api/#ignore-annotations)).
- Rollup : « Rollup itself does not read a package's `sideEffects` field. When packages are resolved with `@rollup/plugin-node-resolve`, the plugin can read `sideEffects` from `package.json` and set the per-module `moduleSideEffects` flag ». Et pour un module marqué sans effet de bord : « `false` will not include any statements from a module unless at least one import from this module is included » ([Rollup, treeshake.moduleSideEffects](https://rollupjs.org/configuration-options/#treeshake-modulesideeffects)).
- Vite 5 lit le champ dans son propre résolveur et le transmet à Rollup sous forme de `moduleSideEffects` ([packages.ts, lignes 174 à 205](https://github.com/vitejs/vite/blob/v5.4.21/packages/vite/src/node/packages.ts#L174-L205)). Rolldown (Vite 8) : « Uses package `sideEffects` metadata for bundled modules when available and static analysis otherwise » ([Rolldown, treeshake](https://rolldown.rs/reference/InputOptions.treeshake)).

Point commun de ces cinq sources : **le champ agit fichier par fichier**, et seulement quand aucun export du fichier n'est utilisé. Il ne découpe pas l'intérieur d'un fichier. Or ce paquet publie un seul fichier par format, et sa classe unique a besoin de toutes les tables.

### 2.2 Mesures

Quatre versions du paquet (build actuel ou ES minifié par esbuild, avec ou sans `"sideEffects": false`), plus l'ES minifié par terser avec annotations conservées et le build à tables générées de la section 3 (e4b), installées dans un projet de test. Chaque scénario est bundlé et minifié par Rollup 4.68.8 (`@rollup/plugin-node-resolve` + `@rollup/plugin-terser`), esbuild 0.28.2, webpack 5.113.0 (`--mode production`) et Vite 8.3.8. Commandes en [annexe E](#annexe-e--matrice-côté-consommateur). Taille du bundle final en octets :

| Scénario côté consommateur | Paquet | `sideEffects: false` | Rollup | esbuild | webpack | Vite 8 |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `PokerHand` utilisée | build actuel | sans ou avec | 99 922 | 99 920 | 99 944 | 99 830 |
| | ES minifié (esbuild) | sans ou avec | 99 920 | 99 920 | 99 942 | 99 830 |
| | tables générées | sans ou avec | 3 599 | 3 585 | 3 616 | 3 495 |
| Seul l'enum `HandRank` est utilisé | build actuel | sans ou avec | 298 | 298 | 320 | 297 |
| | ES minifié (esbuild) | sans ou avec | 367 | 369 | 625 | 368 |
| | ES minifié (terser, annotations conservées) | sans ou avec | 298 | 298 | 320 | 297 |
| | tables générées | sans ou avec | 1 388 | 1 412 | 1 679 | 1 407 |
| `PokerHand` importée mais jamais utilisée | build actuel | sans | 53 | 53 | 75 | 52 |
| | build actuel | avec | 53 | 53 | 75 | 52 |
| | ES minifié (esbuild) | sans | 398 | 400 | 656 | 399 |
| | ES minifié (esbuild) | avec | 53 | 53 | 75 | 52 |
| | tables générées | sans | 1 419 | 1 443 | 1 710 | 1 438 |
| | tables générées | avec | 53 | 53 | 75 | 52 |

« Sans ou avec » : les deux mesures ont été faites et donnent le même nombre. Le scénario `import 'poker-hand-evaluator'` seul (import nu) se comporte comme la ligne « jamais utilisée » (28 octets au lieu de 53, mêmes écarts). L'ES minifié par terser avec annotations conservées donne les mêmes chiffres que le build actuel dans les quatre scénarios (à 7 octets près quand la classe est utilisée).

### 2.3 Lecture

- **Cas normal (la classe est utilisée) : aucun effet.** Les tables sont atteignables depuis `PokerHand`, aucun bundler ne peut les retirer, avec ou sans le champ.
- **Avec le build actuel, aucun effet non plus dans les autres cas.** Le fichier ne contient que des littéraux, deux `new Map` et deux enums annotés `/* @__PURE__ */` : les quatre bundlers prouvent seuls qu'il n'y a pas d'effet de bord et retirent déjà tout ce qui est inutilisé.
- **Le champ devient un filet de sécurité si le fichier publié change.** ES minifié par esbuild (annotations perdues) : 345 octets récupérés par Rollup sur un import inutilisé (581 par webpack). Tables générées à l'import (appels de fonction au niveau module) : environ 1,4 kB récupéré.
- **Il ne fait rien pour le cas « seul l'enum est utilisé »** : le fichier est alors inclus, et seule l'analyse instruction par instruction joue. C'est là que la perte des annotations se paie (environ 70 octets avec Rollup, esbuild et Vite, 305 avec webpack), ou que le générateur reste dans le bundle (1,1 kB). Pour ce cas, esbuild documente l'annotation `/* @__PURE__ */` devant l'appel qui construit une table, avec précisément l'exemple d'une table calculée ([esbuild, Tree shaking](https://esbuild.github.io/api/#tree-shaking)). Non mesuré ici.
- **La déclaration serait exacte** : au chargement, le module ne fait que définir des constantes et une classe, sans toucher à l'état global.

## 3. Encodages alternatifs des tables

### 3.1 Variantes essayées

Chaque variante remplace uniquement le contenu de `src/tables/` dans une copie du dépôt. `src/evaluate/*` et `src/poker-hand.ts` ne sont pas modifiés, et les tables reconstruites restent des tableaux de nombres ordinaires.

- **e1, base64 naïf.** Chaque table est empaquetée en binaire (entiers de 16 bits, 32 bits pour `products`), encodée en base64, décodée à l'import avec `atob`.
- **e2, codec compact générique.** Aucune connaissance du poker : `flushes` et `unique5` sont stockées comme des paires (écart jusqu'au prochain élément non nul, différence de valeur), `products` (triée) comme des différences successives, `values` telle quelle ; le tout en entiers de longueur variable (LEB128) puis base64. Décodeur d'environ 35 lignes ([annexe C](#annexe-c--variantes-dencodage)).
- **e3, deux tables générées.** `flushes` et `unique5` sont calculées à l'import par énumération des motifs de 13 bits à 5 bits levés (30 lignes). `products` et `values` restent des littéraux.
- **e4, quatre tables générées.** En plus, `products` et `values` sont calculées en énumérant les 4 888 classes de mains à rangs répétés (carré, full, brelan, deux paires, paire) dans l'ordre du classement, puis triées par produit de nombres premiers. Deux versions : tri d'un tableau de paires avec comparateur (e4a), ou tri natif d'un `Float64Array` de clés `produit × 8192 + valeur` (e4b). Code complet en [annexe C](#annexe-c--variantes-dencodage).
- **Tables partagées.** Les quatre tables sont sorties dans un fichier `tables.cjs` unique que l'entrée ES importe et que l'entrée CJS charge avec `require` (section 3.4).

Essayé aussi, sans intérêt : les mêmes données dans des `Uint16Array` / `Uint32Array` (taille identique, bench 0,56 s contre 0,55 s).

### 3.2 Tailles et temps mesurés

| # | Variante | Fichier mesuré | Octets | gzip | `npm run bench` | Toutes les mains via l'artefact | Import à froid |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Actuel | ES (config actuelle) | 177 691 | 39 835 | 0,55 s | 1,63 s | 1,16 ms |
| 2 | Actuel | CJS | 100 026 | 37 051 | 0,55 s | 1,59 s | 1,10 ms |
| 3 | Actuel, espaces minifiés | ES | 99 939 | 36 921 | 0,55 s | 1,65 s | 1,06 ms |
| 4 | e1, base64 naïf | ES minifié | 84 191 | 36 323 | 0,55 s | 1,65 s | 2,00 ms |
| 5 | e2, codec compact | ES minifié | 34 318 | 20 466 | 0,58 s | 1,61 s | 1,86 ms |
| 6 | e3, deux tables générées | ES minifié | 61 482 | 28 906 | 0,55 s | 1,66 s | 1,46 ms |
| 7 | e4a, quatre tables générées (tri avec comparateur) | ES minifié | 3 576 | 1 644 | 0,56 s | 1,65 s | 3,48 ms |
| 8 | e4b, quatre tables générées (tri natif) | ES minifié | 3 624 | 1 683 | 0,57 s | 1,63 s | 2,51 ms |
| 9 | Tables partagées | ES 2 643 + `tables.cjs` 97 450 | 100 093 | 36 693 | 0,55 s | 1,66 s | 4,95 ms |
| | Référence : UMD 1.0.1 | | 101 710 | 37 831 | | | |

Tailles des autres sorties des mêmes variantes (octets / gzip) :

| Variante | ES avec la configuration actuelle | CJS |
| --- | ---: | ---: |
| e1, base64 naïf | 85 067 / 36 532 | 84 278 / 36 403 |
| e2, codec compact | 35 290 / 20 683 | 34 405 / 20 533 |
| e3, deux tables générées | 91 737 / 30 696 | 61 569 / 29 031 |
| e4a, quatre tables générées | 4 840 / 1 839 | 3 663 / 1 701 |
| e4b, quatre tables générées | 4 907 / 1 881 | 3 711 / 1 736 |
| Tables partagées | — | 2 719 + `tables.cjs` 97 450 |

Comment lire les colonnes de temps :

- **`npm run bench`** : médiane de 11 exécutions par variante, entrelacées (une exécution de chaque variante à tour de rôle) pour répartir le bruit de la machine. Le script affiche au centième de seconde. Il s'exécute sur les sources via `tsx` et non sur `dist/` : les lignes 1, 2, 3 et 9 partagent donc les mêmes sources et la même mesure. Étendues observées : 0,54 à 0,57 s pour l'actuel ; 0,54 à 0,61 s pour e2 ; 0,55 à 0,59 s pour e4b.
- Pour départager, la même boucle a été rejouée avec un chronométrage à la milliseconde (15 processus par variante, entrelacés, meilleure des passes 2 et 3 de chaque processus, médiane) : actuel 552,5 ms ; e1 542,9 ; e2 544,9 ; e3 541,4 ; e4a 554,4 ; e4b 557,7. **Toutes les variantes sont à ±2 % de l'actuel, sans tendance** : les écarts de la colonne `npm run bench` sont du bruit.
- **Toutes les mains via l'artefact** : `new PokerHand('…').getScore()` sur les 2 598 960 mains à partir du fichier construit (médiane de 5 exécutions, une seule pour la ligne 9). Plus lent que le bench car il inclut la validation de la chaîne. Aucune différence entre variantes ni entre fichier minifié et non minifié.
- **Import à froid** : durée de l'`import()` (ou du `require`) du fichier dans un processus Node neuf, médiane de 41 processus. Un module vide prend 0,27 ms. C'est ici que se lit le coût de décodage ou de génération.

Lecture des tailles :

- **e1 ne sert à rien** : −16 % brut, mais −1,6 % gzip. Le base64 d'un binaire à largeur fixe se compresse moins bien que du texte décimal.
- **e2 divise le fichier par trois** (−66 % brut, −45 % gzip) sans rien savoir du poker.
- **e3** retire les deux tables creuses : −38 % brut, mais seulement −22 % gzip, puisque les zéros se compressaient déjà bien.
- **e4** retire tout : −96,4 % brut et −95,4 % gzip par rapport à l'ES minifié ; −98 % brut par rapport à l'ES publié aujourd'hui.

### 3.3 Comment la correction a été vérifiée

Pour chaque variante (mesure, script en [annexe D](#annexe-d--vérification-de-la-correction)) :

1. **Tables** : les quatre tableaux reconstruits sont comparés élément par élément à ceux du dépôt (25 650 entrées). Égalité stricte pour toutes les variantes, y compris les tables entièrement générées.
2. **Scores, sur les sources** : `evaluateHand` est appelée sur les 2 598 960 mains (toutes les combinaisons `i < j < k < l < m` du paquet de `src/bench.ts`) avec les sources du dépôt et celles de la variante, dans le même processus. Nombre de scores différents : 0 pour toutes les variantes.
3. **Scores, sur les fichiers construits** : même énumération via `new PokerHand(...).getScore()` sur chaque fichier de `dist/` (ES, ES minifié, CJS). L'empreinte SHA-256 du tableau des scores commence par `fdb6e74562791326` pour les 30 fichiers testés, y compris l'ES minifié par terser et les deux entrées à tables partagées.
4. La somme des 2 598 960 scores vaut 14 603 265 300 pour l'actuel comme pour chacune des variantes chronométrées.

La suite de tests actuelle (41 tests) ne contient aucune vérification exhaustive, et `npm run bench` n'affirme rien : il faudra ajouter ce contrôle au dépôt avant de toucher au stockage des tables.

### 3.4 Partager les tables entre les entrées ESM et CJS

Ce qui est en jeu (mesure, `npm pack --dry-run --json` sur un dossier contenant `package.json`, `README.md` et le `dist/` de la variante) :

| Contenu du paquet | Archive | Installé |
| --- | ---: | ---: |
| Actuel (ES 177 691 + CJS 100 026) | 79 840 | 284 537 |
| ES minifié + CJS | 77 034 | 206 785 |
| ES minifié seul, sans fichier CJS | 39 962 | 106 759 |
| `tables.cjs` partagé + deux entrées fines | 42 033 | 109 632 |
| e2, codec compact (ES minifié + CJS) | 43 879 | 75 606 |
| e3, deux tables générées (ES minifié + CJS) | 60 977 | 129 621 |
| e4a, quatre tables générées (ES minifié + CJS) | 5 053 | 13 876 |

Le partage ne concerne que la taille du paquet sur le registre et dans `node_modules` : un bundle ne contient jamais les deux formats à la fois.

Coûts mesurés du partage par un fichier `tables.cjs` :

- Rollup avec `@rollup/plugin-node-resolve` seul échoue : `"products" is not exported by "…/dist/tables.cjs"`. Il faut que le consommateur ajoute un plugin CommonJS.
- esbuild n'élimine plus rien : 98 371 octets conservés quand seul `HandRank` est utilisé (contre 298 aujourd'hui). webpack et Vite 8 s'en sortent (625 et 368 octets).
- L'import ES dans Node passe de 1,06 ms à 4,95 ms (explication probable, non vérifiée : l'analyse statique du fichier CommonJS de 97 kB pour en déduire les exports nommés).
- Non mesuré mais attendu : un navigateur ne peut pas importer un fichier CommonJS depuis un module ES sans bundler.

Documentation sur l'autre façon de n'avoir qu'une copie, à savoir ne publier que l'ES :

- Node sait charger un module ES synchrone avec `require()` : plus derrière un drapeau depuis les versions 22.12.0 et 20.19.0, et « This feature is no longer experimental » depuis la 25.4.0 ([Node.js, Loading ECMAScript modules using require()](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)).
- Pour les paquets à double format, Node renvoie désormais à un dépôt d'exemples et signale que les conditions `import` et `require` « can lead to some hazards » ([Node.js, Packages](https://nodejs.org/api/packages.html#dual-commonjses-module-packages)).

Abandonner le fichier CJS est une rupture de compatibilité pour les versions de Node antérieures : hors périmètre de ce ticket. Avec des tables générées, la question disparaît (deux fichiers de 3,6 kB).

## 4. Coûts de chaque option

| Option | Lisibilité et débogage du code publié | Coût à l'import | Risque pour la correction |
| --- | --- | --- | --- |
| Minifier les espaces de l'ES | Faible perte : le fichier ES publié a déjà ses identifiants raccourcis (`const g = [`, `class l`) et aucune sourcemap n'est livrée. Il passe de 25 763 lignes à 1 ; une pile d'appels pointera `:1:colonne`. Avec esbuild, les 4 annotations pures disparaissent ; avec terser et `preserve_annotations`, elles restent. | −0,1 ms | Nul : même programme, empreinte des scores identique. |
| Livrer des sourcemaps pour compenser | Rend le débogage lisible. | Aucun | Aucun. Mais +397 899 octets (ES) et +269 449 octets (CJS) dans le paquet (mesure avec `vite build --sourcemap`) : plus que tout ce que la minification fait gagner. |
| `"sideEffects": false` | Aucun effet. | Aucun | Exact aujourd'hui. Devient une promesse à tenir : si le module fait un jour quelque chose d'observable à l'import, ce code pourra être supprimé chez les consommateurs. |
| e1, base64 naïf | Tables illisibles, pour un gain gzip nul. | +0,9 ms | Décodeur à tester. Dépend de `atob`, global dans Node depuis la 16 mais classé « Legacy » ([Node.js, atob](https://nodejs.org/api/globals.html#atobdata)). |
| e2, codec compact | Tables illisibles (chaînes base64), plus de recherche possible d'une valeur dans le fichier. Décodeur de 35 lignes. | +0,8 ms | Trois transformations empilées (écarts, zigzag, LEB128) : un bogue corrompt les tables sans bruit. Même dépendance à `atob`. |
| e3, deux tables générées | 16 000 nombres remplacés par 30 lignes lisibles. `products` et `values` inchangées. | +0,4 ms | Du code remplace des données : l'égalité avec les tables d'origine doit être verrouillée par un test. |
| e4, quatre tables générées | Plus aucune table publiée. Environ 70 lignes de source qui décrivent la structure du classement. On ne livre plus les tables de Cactus Kev telles quelles. | +1,45 ms (e4b) ou +2,4 ms (e4a) | Même risque que e3, sur les 25 650 entrées. Vérifié ici par égalité stricte des quatre tables et par les 2 598 960 scores. |
| Tables partagées (`tables.cjs`) | Inchangé. | +3,9 ms pour l'entrée ES | Aucun pour les scores, mais casse Rollup sans plugin CommonJS et l'usage direct dans un navigateur, et annule le tree-shaking d'esbuild. |

Limites de ces mesures : une seule machine (Apple M4) et Node 22 uniquement ; aucun chronométrage dans un navigateur ni sur un appareil lent, où les coûts à l'import seraient plus élevés dans l'absolu. Brotli n'est pas utilisé comme indicateur : en qualité 11, le même contenu donne entre 25,2 et 28,9 kB selon des détails d'enrobage (le fichier ES non minifié y est même plus petit que le minifié, 25 947 contre 28 769), ce qui le rend trop instable pour comparer des variantes.

## 5. Recommandation

1. **Ajouter `"sideEffects": false` à `package.json`.** C'est gratuit et exact, mais il ne faut en attendre aucun gain mesurable aujourd'hui. Sa valeur est de protéger les étapes 2 et 3.
2. **Ne pas présenter la minification des espaces comme un gain de taille.** Elle ne change rien pour les consommateurs qui bundlent, et 7 % de gzip pour les autres. Si on la veut pour aligner ES sur CJS et alléger l'installation de 78 kB, la voie la plus propre est `@rollup/plugin-terser` en plugin de sortie avec `preserve_annotations: true` (99 990 octets, tree-shaking identique à aujourd'hui dans tous les scénarios mesurés), au prix de deux dépendances de développement. Le plugin maison de 15 lignes arrive à 99 939 octets sans dépendance, mais perd les annotations.
3. **Si la taille est un objectif, générer les quatre tables à l'import (e4).** C'est la seule option qui change l'ordre de grandeur : 100 kB → 3,6 kB bruts, 37 kB → 1,7 kB gzip, pour les deux formats et sans toucher au chemin d'évaluation. Conditions à inscrire dans le ticket d'implémentation :
   - conserver les quatre tables actuelles comme données de test (non publiées) et tester l'égalité stricte avec les tables générées ;
   - ajouter un test exhaustif sur les 2 598 960 mains ;
   - déclarer `"sideEffects": false` (mesuré : avec Rollup, un import inutilisé retombe de 1 419 à 53 octets) et annoter les appels du générateur avec `/* @__PURE__ */` pour le cas où seul un enum est utilisé (documenté par esbuild, non mesuré ici).
   Repli prudent : e3 (les deux tables indexées par motif de bits), −38 % brut et −22 % gzip pour 30 lignes.
4. **Écarter** le base64 naïf (gain gzip nul), le partage par fichier CommonJS (casse des consommateurs) et les sourcemaps (coûtent plus qu'elles ne rapportent). Le codec compact e2 est dominé par e4 : même nature de risque, opacité en plus, pour un gain trois fois moindre.

### Le compromis qui reste à accepter

Avec e4, le paquet ne contient plus les tables de Cactus Kev comme données : la confiance ne repose plus sur « des nombres recopiés de l'implémentation de référence » mais sur « un générateur dont un test prouve qu'il redonne ces nombres ». Chaque consommateur paie en outre 1,5 à 2,4 ms de calcul à l'import (sur un Apple M4, davantage sur un appareil lent), y compris s'il n'évalue qu'une main.

Si ce déplacement est refusé, il faut accepter l'inverse : tant que les tables restent des littéraux, le paquet pèse environ 100 kB (37 kB gzip) chez tout consommateur qui utilise `PokerHand`, et ni la minification des espaces ni `sideEffects: false` n'y changent quoi que ce soit.

## Relevé au passage, hors périmètre

- esbuild signale que la condition `types` de `exports` dans `package.json` ne sera jamais utilisée, parce qu'elle est placée après `import` et `require`.
- Les entrées ES et CJS définissent chacune leur propre classe `PokerHand`. Mesure : `compareWith` entre une main créée par l'entrée ES et une main créée par l'entrée CJS lève `Incorrect hand to compare with` (test `instanceof`). C'est le risque des paquets à double format évoqué par la documentation de Node.

## Annexe A — Environnement et commandes de base

- macOS (Darwin 24.3.0, arm64), Apple M4, Node v22.23.4, npm 10.9.9.
- Résolu par `npm ci` : vite 5.4.21 (avec esbuild 0.21.5 et rollup 4.59.0), vite-plugin-dts 3.9.1, typescript 5.9.3, tsx 4.21.0 (avec esbuild 0.27.3), vitest 1.6.1.
- Outils côté consommateur, installés dans un dossier temporaire hors du dépôt : rollup 4.68.8, `@rollup/plugin-node-resolve` 16.0.3, `@rollup/plugin-terser` 1.0.2, terser 5.51.4, esbuild 0.28.2, webpack 5.113.0, webpack-cli 7.3.1, vite 8.3.8.
- Chaque variante est une copie de `src/`, `package.json`, `tsconfig.json` et `vite.config.ts` dans un dossier temporaire, avec un lien vers le `node_modules` du dépôt. Le build de la copie non modifiée est identique à l'octet près à celui du dépôt.

```sh
# tailles
wc -c fichier
gzip -c fichier | wc -c
grep -o "__PURE__" fichier | wc -l

# bench (11 fois par variante, médiane)
npm run bench

# paquet
npm pack --dry-run --json      # champs "size" (archive) et "unpackedSize" (installé)

# sourcemaps
npx vite build --sourcemap --outDir dist-map
```

## Annexe B — Configurations de minification essayées

Plugin maison (ligne « `generateBundle` » du tableau 1.3) :

```ts
import { defineConfig, transformWithEsbuild, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

function minifyEsLibWhitespace(): Plugin {
  return {
    name: 'minify-es-lib-whitespace',
    apply: 'build',
    async generateBundle(options, bundle) {
      if (options.format !== 'es') return;
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const result = await transformWithEsbuild(chunk.code, chunk.fileName, {
          minifyWhitespace: true,
          sourcemap: false,
        });
        chunk.code = result.code;
      }
    },
  };
}

export default defineConfig({
  plugins: [dts(), minifyEsLibWhitespace()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'PokerHand',
      formats: ['es', 'cjs'],
      fileName: 'poker-hand-evaluator',
    },
  },
});
```

Plugin de sortie terser (ligne « `preserve_annotations` ») : configuration actuelle, plus

```ts
import terser from '@rollup/plugin-terser';
// ...
build: {
  // lib: inchangé
  rollupOptions: {
    output: { plugins: [terser({ format: { preserve_annotations: true } })] },
  },
},
```

Les autres lignes du tableau 1.3 sont la configuration actuelle avec, respectivement, `build.minify: false`, `build.minify: 'terser'`, ou `esbuild: { minifyWhitespace: true }` à la racine. L'étape après build : `node_modules/vite/node_modules/.bin/esbuild dist/poker-hand-evaluator.js --minify-whitespace --log-level=error --outfile=…`.

## Annexe C — Variantes d'encodage

Générateur des quatre tables (e3 = `buildBitTables` seule, e4b = les deux fonctions). Dans l'essai, `src/tables/flushes.ts`, `unique5.ts`, `products.ts` et `values.ts` se contentent de réexporter ces constantes.

```ts
/** Les dix quintes, de la meilleure à la moins bonne : de l'as au six, puis A-5-4-3-2. */
const STRAIGHTS = [0x1f00, 0x0f80, 0x07c0, 0x03e0, 0x01f0, 0x00f8, 0x007c, 0x003e, 0x001f, 0x100f];

function bitCount(n: number): number {
  let count = 0;
  for (; n; n &= n - 1) count++;
  return count;
}

function buildBitTables(): [flushes: number[], unique5: number[]] {
  const flushes: number[] = [];
  const unique5: number[] = [];
  for (let q = 0; q <= 0x1f00; q++) {
    flushes.push(0);
    unique5.push(0);
  }
  STRAIGHTS.forEach((q, i) => {
    flushes[q] = 1 + i; // quintes flush : 1..10
    unique5[q] = 1600 + i; // quintes : 1600..1609
  });
  // Les 1 277 autres motifs, du plus fort (motif le plus grand) au plus faible.
  let n = 0;
  for (let q = 0x1f00; q > 0; q--) {
    if (bitCount(q) === 5 && !flushes[q]) {
      flushes[q] = 323 + n; // couleurs : 323..1599
      unique5[q] = 6186 + n; // cartes hautes : 6186..7462
      n++;
    }
  }
  return [flushes, unique5];
}

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];

function buildProductTables(): [products: number[], values: number[]] {
  // Une clé triable par classe de main : produit * 8192 + valeur
  // (produit < 2^27 et valeur < 2^13, donc clé < 2^40).
  const keys = new Float64Array(4888);
  const p = PRIMES;
  let n = 0;
  let value = 11;
  const add = (product: number) => {
    keys[n++] = product * 8192 + value++;
  };

  // Carrés : 11..166
  for (let a = 12; a >= 0; a--)
    for (let b = 12; b >= 0; b--) if (b !== a) add(p[a] ** 4 * p[b]);
  // Fulls : 167..322
  for (let a = 12; a >= 0; a--)
    for (let b = 12; b >= 0; b--) if (b !== a) add(p[a] ** 3 * p[b] ** 2);
  // Couleurs (323..1599) et quintes (1600..1609) : voir buildBitTables.
  value = 1610;
  // Brelans : 1610..2467
  for (let a = 12; a >= 0; a--)
    for (let b = 12; b >= 0; b--)
      for (let c = b - 1; c >= 0; c--) if (b !== a && c !== a) add(p[a] ** 3 * p[b] * p[c]);
  // Deux paires : 2468..3325
  for (let a = 12; a >= 0; a--)
    for (let b = a - 1; b >= 0; b--)
      for (let c = 12; c >= 0; c--) if (c !== a && c !== b) add(p[a] ** 2 * p[b] ** 2 * p[c]);
  // Paires : 3326..6185
  for (let a = 12; a >= 0; a--)
    for (let b = 12; b >= 0; b--)
      for (let c = b - 1; c >= 0; c--)
        for (let d = c - 1; d >= 0; d--)
          if (b !== a && c !== a && d !== a) add(p[a] ** 2 * p[b] * p[c] * p[d]);

  keys.sort();
  const products: number[] = [];
  const values: number[] = [];
  for (let i = 0; i < keys.length; i++) {
    products.push(Math.floor(keys[i] / 8192));
    values.push(keys[i] % 8192);
  }
  return [products, values];
}

export const [flushes, unique5] = buildBitTables();
export const [products, values] = buildProductTables();
```

e4a est identique, sauf que `buildProductTables` accumule des paires `[produit, valeur]` dans un tableau et les trie avec `entries.sort((x, y) => x[0] - y[0])`.

Décodeur de e2 (les chaînes base64 sont produites par l'encodage inverse des tables du dépôt) :

```ts
/** Chaîne base64 d'entiers LEB128. */
export function varints(data: string): number[] {
  const bin = atob(data);
  const out: number[] = [];
  let n = 0;
  let shift = 0;
  for (let i = 0; i < bin.length; i++) {
    const c = bin.charCodeAt(i);
    n |= (c & 127) << shift;
    if (c & 128) {
      shift += 7;
    } else {
      out.push(n);
      n = 0;
      shift = 0;
    }
  }
  return out;
}

/** Table triée, stockée comme différences successives (`products`). */
export function delta(data: string): number[] {
  const out = varints(data);
  for (let i = 1; i < out.length; i++) out[i] += out[i - 1];
  return out;
}

/** Table creuse, stockée comme paires (écart d'indice, différence de valeur en zigzag). */
export function sparse(data: string): number[] {
  const v = varints(data);
  const out: number[] = [];
  let value = 0;
  for (let i = 0; i < v.length; i += 2) {
    for (let gap = v[i]; gap > 1; gap--) out.push(0);
    value += v[i + 1] & 1 ? -(v[i + 1] + 1) / 2 : v[i + 1] / 2;
    out.push(value);
  }
  return out;
}
```

e1 : chaque table est écrite en octets petit-boutistes (2 octets par entrée, 4 pour `products`), encodée en base64, et relue par une boucle sur `atob(data)`.

Tables partagées : un plugin Vite marque `./flushes`, `./products`, `./unique5` et `./values` comme externes vers `./tables.cjs` (hook `resolveId`), puis émet ce fichier avec `this.emitFile` sous la forme `exports.flushes=[…];exports.products=[…];…`.

## Annexe D — Vérification de la correction

Cœur du script exécuté avec `tsx` pour chaque variante (`baseDir` = copie non modifiée, `variantDir` = variante) :

```ts
for (const name of ['flushes', 'unique5', 'products', 'values']) {
  const a = Array.from(base[name]);
  const b = Array.from(variant[name]);
  if (a.length !== b.length) throw new Error(`${name}: longueur`);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) throw new Error(`${name}[${i}]`);
}

const cardOrder = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const suitList = ['S', 'H', 'D', 'C'];
const deck = [...Array(52)].map((_, i) => cardOrder[i % 13] + suitList[i % 4]);

async function allScores(dir: string): Promise<Uint16Array> {
  const { evaluateHand } = await import(join(dir, 'src/evaluate/evaluate.ts'));
  const scores = new Uint16Array(2598960);
  let n = 0;
  for (let i = 0; i < 52; i++)
    for (let j = i + 1; j < 52; j++)
      for (let k = j + 1; k < 52; k++)
        for (let l = k + 1; l < 52; l++)
          for (let m = l + 1; m < 52; m++)
            scores[n++] = evaluateHand([deck[i], deck[j], deck[k], deck[l], deck[m]]);
  return scores;
}
// puis comparaison élément par élément des deux Uint16Array (0 différence attendue)
// et sha256 de Buffer.from(scores.buffer)
```

Pour les fichiers construits, la même énumération appelle `new PokerHand(\`${a} ${b} ${c} ${d} ${e}\`).getScore()` après `import()` du fichier ES ou `require()` du fichier CJS, et compare l'empreinte à celle des sources.

## Annexe E — Matrice côté consommateur

Paquets de test : le `dist/` de la variante et le `package.json` du dépôt, avec ou sans `"sideEffects": false`, copiés dans `node_modules/` d'un projet vide. Entrées :

```js
// PokerHand utilisée
import { PokerHand } from 'paquet';
console.log(new PokerHand('AS KS QS JS TS').getScore());

// seul l'enum est utilisé
import { HandRank } from 'paquet';
console.log(HandRank.Flush);

// import inutilisé
import { PokerHand } from 'paquet';
console.log('PokerHand is imported but never used');

// import nu
import 'paquet';
console.log('bare import');
```

Commandes (taille = somme des fichiers `.js` produits) :

```sh
rollup -i entree.js -o out/out.js -f es -p @rollup/plugin-node-resolve -p @rollup/plugin-terser
esbuild entree.js --bundle --minify --format=esm --outfile=out/out.js
webpack --mode production --entry ./entree.js -o out
vite build      # avec build.rollupOptions.input = entree.js
```
