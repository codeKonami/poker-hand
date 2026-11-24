# Dual package hazard : `compareWith` doit-il abandonner `instanceof` ?

Recherche pour le ticket [« Dual package hazard : compareWith doit-il abandonner instanceof ? »](https://github.com/codeKonami/poker-hand/issues/12), menée le 2026-11-24.

**Méthode.** Sources primaires uniquement : documentation Node.js, spécification ECMAScript, MDN, documentation des bundlers, et code source des librairies citées (liens figés sur un commit). Une affirmation suivie de **[vérifié E*n*]** a été reproduite en exécutant quelque chose ; les expériences sont décrites en [annexe](#annexe--expériences). Les autres affirmations reposent sur la source citée, sans exécution.

## Réponse courte

- **Le risque est réel et se reproduit tel quel sur `master`.** Une application ESM qui importe la librairie pendant qu'une dépendance CommonJS la `require` obtient deux classes `PokerHand` distinctes ; `compareWith` lève alors `Error('Incorrect hand to compare with')` pour une main parfaitement valide **[vérifié E1]**. `require(esm)` n'y change rien tant que `exports` sépare `import` et `require`.
- **Un wrapper ESM ne supprime pas le danger entièrement.** Il supprime la double copie ESM/CJS d'une même installation, pas les autres sources de copies : installations dupliquées dans `node_modules`, bundle UMD à côté du build npm, *realms* différents. Ces sources existaient déjà en 1.0.1, qui levait la même erreur dans ces cas **[vérifié E4]**.
- **Recommandation : oui, `compareWith` doit cesser de dépendre de l'identité de la classe.** Remplacer `instanceof` par un marqueur `Symbol.for(...)` posé sur le prototype et testé explicitement, sans `Symbol.hasInstance` et sans vérification structurelle. Garder en plus une seule copie par installation côté packaging (décision du ticket voisin sur la double entrée).
- **Compromis à accepter :** une main créée par une autre copie de la librairie est désormais acceptée, alors que la 1.0.1 la rejetait. C'est le seul écart avec le contrat de la 1.0.1 ; tout argument qui n'est pas une main continue de lever `Error('Incorrect hand to compare with')` **[vérifié E5, E6]**.

## 1. Le problème, reproduit sur `master`

`package.json` de `master` déclare deux fichiers distincts pour le même point d'entrée :

```json
"exports": { ".": { "import": "./dist/poker-hand-evaluator.js", "require": "./dist/poker-hand-evaluator.cjs" } }
```

Vite (mode librairie) produit deux bundles autonomes ; chacun contient sa propre déclaration de la classe. Le seul usage d'`instanceof` du code source est la garde de `compareWith` (`src/poker-hand.ts`, ligne 47), et le code ne déclare aucune variable `let` ou `var` au niveau module. Cette garde est donc le seul endroit où deux copies se gênent. Le guide de webpack range précisément ce cas parmi les paquets à état : un paquet n'est « stateless » que si « class instances are not tested with `instanceof` as there can be two different classes because of the double module instantiation » ([Package exports](https://webpack.js.org/guides/package-exports/#providing-commonjs-and-esm-version-stateless)).

Scénario : une application ESM importe la librairie, et une dépendance CommonJS la `require` puis renvoie une main. Résultat identique sous Node v22.23.4, v24.14.1 et v26.8.2 **[vérifié E1]** :

```text
same class object across entries: false
his instanceof PokerHand (ESM copy): false
his.constructor.name: u | his.getScore(): 2470
compareWith threw: Error "Incorrect hand to compare with"
```

Trois remarques :

- Le message est trompeur : la main est correcte, c'est la classe qui diffère. L'échec est une exception explicite, pas un résultat faux silencieux.
- C'est une régression introduite par la double entrée. La 1.0.1 n'avait qu'une entrée CommonJS (`"main": "index.js"`), donc `import` et `require` aboutissaient au même module.
- Les deux bundles minifient le nom de la classe différemment (`l` dans le build ES, `u` dans le build CJS) **[vérifié E7]**. Une détection fondée sur `constructor.name` ne fonctionnerait donc pas.

## 2. Quand existe-t-il deux copies ?

### 2.1 Les conditions documentées par Node

La documentation Node définit le *dual package hazard* ainsi : quand un paquet fournit des sources CommonJS et ES module, `require('pkg')` et `import 'pkg'` ne donnent pas la même instance ; « if the package main export is a constructor, an `instanceof` comparison of instances created by the two versions returns `false` ». Elle précise qu'il est peu probable de charger les deux volontairement, mais « it is common for an application to load one version while a dependency of the application loads the other version ». Ce texte a été déplacé de `packages.md` vers le dépôt [nodejs/package-examples, chapitre 07](https://github.com/nodejs/package-examples/blob/01d632c10d89067a44c4c22b264b2c5a4effce5a/guide/07-dual-packages/README.md) ; la page officielle [Dual CommonJS/ES module packages](https://nodejs.org/api/packages.html#dual-commonjses-module-packages) y renvoie.

Deux copies sont donc chargées quand ces deux conditions sont réunies :

1. `exports` associe les conditions `"import"` et `"require"` (ou deux sous-chemins) à des fichiers différents contenant chacun le code. Node définit `"import"` comme la condition qui correspond à `import` et `import()`, et `"require"` comme celle qui correspond à `require()`, les deux étant « always mutually exclusive » ([Conditional exports](https://nodejs.org/api/packages.html#conditional-exports)).
2. Dans le même processus, le paquet est chargé à la fois par `import` et par `require()`, directement ou via des dépendances.

Le chargeur ES a son propre cache, distinct de `require.cache` ([No `require.cache`](https://nodejs.org/api/esm.html#no-requirecache)). Les deux fichiers sont donc évalués chacun une fois.

### 2.2 Ce que change `require(esm)`

Historique tiré de la [documentation de `require()`](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require) :

| Étape | Versions |
| --- | --- |
| Ajout derrière `--experimental-require-module` | v22.0.0, v20.17.0 |
| Actif par défaut, sans flag | v23.0.0, v22.12.0, v20.19.0 |
| Plus d'avertissement expérimental | v23.5.0, v22.13.0, v20.19.0 |
| Fonctionnalité stable | v25.4.0, v24.15.0 |

À la date de cette recherche, les lignes maintenues sont v22, v24 et v26 ; v20 est en fin de vie depuis le 2026-04-30 ([calendrier des versions](https://github.com/nodejs/Release/blob/main/schedule.json)). Toutes les lignes maintenues ont donc `require(esm)` actif par défaut.

Ce que `require(esm)` **ne change pas** : la résolution. Un appel `require()` utilise les conditions `["node", "require", "module-sync"]`, jamais `"import"` ([algorithme de résolution](https://nodejs.org/api/modules.html#all-together)). Avec les `exports` actuels de `master`, `require()` charge toujours le fichier `.cjs`, et le danger persiste sur les trois versions testées, que `require(esm)` soit actif ou désactivé **[vérifié E1]**.

Ce que `require(esm)` **permet** :

- **Une seule entrée ESM pour tout le monde.** `require()` peut charger un module ES synchrone (sans `await` de haut niveau) et renvoie l'objet d'espace de noms du module ([même page](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)). Avec `"exports": "./dist/poker-hand-evaluator.js"`, `import` et `require()` obtiennent la même classe **[vérifié E2]**. Sans `require(esm)`, le même `require()` lève `ERR_REQUIRE_ESM` **[vérifié E2]**. Le guide officiel écrit : « as of May 2025, all Node.js versions that do not support `require(esm)` have already reached end-of-life » et recommande dans ce cas de pointer la condition `default` sur le build ESM ([Shipping ESM for CommonJS consumers](https://github.com/nodejs/package-examples/blob/01d632c10d89067a44c4c22b264b2c5a4effce5a/guide/04-cjs-esm-interop/shipping-esm-for-cjs/README.md)).
- **La condition `"module-sync"`**, qui correspond à `import` comme à `require()` ([Conditional exports](https://nodejs.org/api/packages.html#conditional-exports)). Placée avant un couple `import`/`require` de secours, elle donne une seule copie sur un Node récent, mais le danger revient dès que `require(esm)` est désactivé, et esbuild 0.27.3 embarque quand même les deux copies **[vérifié E2, E3]**.

Limite de la source : le chapitre de Node consacré aux dangers des paquets doubles est en cours de réécriture. L'ancien texte porte l'avertissement « A lot of the information below been outdated since Node.js started to support `require(esm)`. Do not follow the documentation below for new packages for the time being », et les pages censées le remplacer sont vides au commit consulté.

### 2.3 Les autres sources de copies

Cinq autres sources de copies existent. Le packaging n'en supprime qu'une : le bundler qui embarque les deux entrées.

**Bundler qui embarque les deux entrées (évitable par le packaging).** esbuild écrit : « when you use the `require` and `import` conditions, your package may end up in the bundle multiple times! […] This is commonly known as the dual package hazard » ([Conditions](https://esbuild.github.io/api/#conditions)). webpack choisit `import` ou `require` selon la syntaxe de l'appelant ([Reference syntax](https://webpack.js.org/guides/package-exports/#reference-syntax)). Rollup fait de même avec `@rollup/plugin-commonjs` ([`exportConditions`](https://github.com/rollup/plugins/blob/master/packages/node-resolve/README.md#exportconditions)). Avec les `exports` de `master`, le bundle esbuild contient deux copies et l'appel échoue **[vérifié E3]**. Un packaging à copie unique supprime ce cas (voir 3.1).

**Installations dupliquées dans `node_modules` (inévitable).** Node met les modules en cache par nom de fichier résolu : « it is not a *guarantee* that `require('foo')` will always return the exact same object, if it would resolve to different files » ([Module caching caveats](https://nodejs.org/api/modules.html#module-caching-caveats)). npm peut installer deux exemplaires d'un même paquet même quand un seul suffirait, car il « favors updates by default, even when doing so causes duplication » ([`npm dedupe`](https://docs.npmjs.com/cli/commands/npm-dedupe)). Vite cite aussi les paquets liés dans un monorepo ([`resolve.dedupe`](https://vite.dev/config/shared-options#resolve-dedupe)). Le code de la 1.0.1, installé deux fois, lève `Incorrect hand to compare with` ; le build de `master` empaqueté avec un wrapper ESM aussi **[vérifié E4]**.

**Bundle UMD chargé à côté du build npm (inévitable).** Aucune source primaire dédiée : chaque fichier évalué déclare sa propre classe. Dans l'arbre git de la 1.0.1, `dist/pokerhand.min.js` (UMD) et l'entrée CJS donnent deux classes distinctes, et `compareWith` échoue entre elles **[vérifié E4]**. Un build UMD de `master`, évalué comme un script qui pose un global, échoue de même face à l'entrée ESM, dans les deux sens **[vérifié E8]**. Avec un champ `exports`, Node interdit les sous-chemins non déclarés (« all subpaths of the package are encapsulated », [Main entry point export](https://nodejs.org/api/packages.html#main-entry-point-export)) ; le cas concerne donc surtout le navigateur, où une balise `<script>` expose un global à côté d'un bundle applicatif. Le fichier UMD de la 1.0.1 figure dans l'arbre git de la version, sans champ `files` ni `.npmignore` ; sa présence dans le tarball npm n'a pas été vérifiée.

***Realms* différents : iframe, contexte `vm` (inévitable).** MDN : « `[] instanceof window.frames[0].Array` will return `false` » ([instanceof and multiple realms](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof#instanceof_and_multiple_realms)). Une instance créée dans un contexte `vm` échoue au test `instanceof` **[vérifié E5]**.

**Workers et `postMessage` (inévitable, et hors de portée de toute garde fondée sur le prototype).** Node : « instances of JavaScript classes will be cloned as plain JavaScript objects » ([worker_threads](https://nodejs.org/api/worker_threads.html#considerations-when-cloning-objects-with-prototypes-classes-and-accessors)). `structuredClone(instance)` est rejeté par toutes les gardes testées sauf la lecture directe du champ `score` **[vérifié E5]**.

| Source de la seconde copie | Évitable par le packaging ? | Existait déjà en 1.0.1 ? |
| --- | --- | --- |
| `import` et `require` d'une même installation | Oui (3.1) | Non : une seule entrée |
| Bundler qui suit `import` et `require` | Oui (3.1) | Non : une seule entrée |
| Installations dupliquées | Non | Oui **[vérifié E4]** |
| UMD à côté du build npm | Non | Oui **[vérifié E4]** |
| *Realm* différent | Non | Oui, par construction d'`instanceof` |
| Passage par `postMessage` | Non | Oui, par construction d'`instanceof` |

## 3. Les parades

### 3.0 Ce qui est comparé

Tableau obtenu en exécutant cinq gardes sur les mêmes arguments **[vérifié E5]**. La colonne `instanceof` reproduit le code de `compareWith` de la 1.0.1. `A` = lève `Error('Incorrect hand to compare with')` ; `B` = lève `Error('Incorrect hand')` ; `1` = valeur retournée.

| Argument passé à `compareWith` | `instanceof` (1.0.1) | structurel : `getScore` | structurel : `score` | marqueur `Symbol.for` | `Symbol.hasInstance` |
| --- | --- | --- | --- | --- | --- |
| instance de la même copie | 1 | 1 | 1 | 1 | 1 |
| instance d'une autre copie | A | **1** | **1** | **1** | **1** |
| instance d'un autre *realm* (`vm`) | A | **1** | **1** | **1** | **1** |
| sous-classe, même copie | 1 | 1 | 1 | 1 | 1 |
| sous-classe, autre copie | A | **1** | **1** | **1** | **1** |
| instance de la 1.0.1 publiée | A | **1** | **1** | A | A |
| `Object.create(PokerHand.prototype)` | B | B | **A** | B | B |
| `structuredClone(instance)` | A | A | **1** | A | A |
| `{ getScore: () => 2470 }` | A | **1** | A | A | A |
| `{ score: 2470 }` | A | A | **1** | A | A |
| `{ getScore: () => 'abc' }` | A | **B** | A | A | A |
| objet forgé : marqueur + `getScore` | A | **1** | A | **1** | **1** |
| `{}`, chaîne, `42`, `null`, `undefined` | A | A | A | A | A |

En gras : les écarts par rapport à la colonne `instanceof`, donc par rapport à la 1.0.1. Les écarts des lignes « autre copie », « autre *realm* » et « sous-classe, autre copie » sont le but recherché ; tous les autres sont des effets de bord.

### 3.1 Une seule copie par installation : wrapper ESM, ou ESM seul

**Principe.** Le code vit dans un seul fichier. La recette historique de Node (première approche du [chapitre 07](https://github.com/nodejs/package-examples/blob/01d632c10d89067a44c4c22b264b2c5a4effce5a/guide/07-dual-packages/README.md), « Use an ES module wrapper ») garde le build CommonJS et ajoute un fichier ESM qui le ré-exporte. esbuild décrit la même parade ([Conditions](https://esbuild.github.io/api/#conditions)), et webpack la préconise pour un paquet « stateful » ([guide](https://webpack.js.org/guides/package-exports/#providing-commonjs-and-esm-version-stateful)). L'équivalent moderne est une entrée ESM unique, chargée aussi par `require()` grâce à `require(esm)` (voir 2.2).

**Avantages.**

- Aucun changement de comportement : la garde reste `instanceof`. C'est la seule parade qui respecte le contrat de la 1.0.1 à la lettre.
- Le wrapper fonctionne sur toutes les versions de Node testées, `require(esm)` actif ou non : même classe des deux côtés, `compareWith` renvoie `1` **[vérifié E2]**. Le ré-export nommé `export { PokerHand, HandRank, CompareResult } from './poker-hand-evaluator.cjs'` est reconnu par l'analyse statique de Node sur le build CJS actuel de Vite **[vérifié E2]**.
- Dans un bundle esbuild, wrapper et ESM seul donnent une seule copie, pour `--platform=node` comme `--platform=browser` **[vérifié E3]**. La recette imbriquée de webpack (`"node": { "module", "import", "require" }, "default"`) aussi **[vérifié E3]**.

**Limites.**

- Ne couvre que les deux premières lignes du tableau 2.3. Avec deux installations, le wrapper échoue comme la 1.0.1 **[vérifié E4]**.
- Avec le wrapper, les consommateurs ESM sous Node exécutent du CommonJS ; esbuild note que cette approche « doesn't provide good tree-shaking ».
- Avec l'ESM seul, `require()` échoue sur les versions de Node sans `require(esm)` (toutes en fin de vie), et renvoie un espace de noms et non la classe, sauf export nommé `'module.exports'` ([documentation](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)).
- Le choix entre ces variantes relève du ticket voisin sur la construction de la double entrée.

**Compatibilité avec le contrat 1.0.1 :** totale. Les cas qui échouaient en 1.0.1 (copies dupliquées, UMD) continuent d'échouer avec le même message.

### 3.2 Vérification structurelle (*duck typing*)

**Principe.** Accepter tout objet qui a la forme attendue : une méthode `getScore`, ou un champ `score` numérique. bn.js procède ainsi en complément d'`instanceof` ([`BN.isBN`](https://github.com/indutny/bn.js/blob/eb2e57c4e50a9b9a1f277a59ef446c13f564dddc/lib/bn.js#L61-L68)).

**Avantages.** Couvre toutes les sources de copies, y compris les versions différentes : une instance de la 1.0.1 est acceptée **[vérifié E5]**. La variante sur le champ `score` accepte même une instance passée par `structuredClone` **[vérifié E5]**.

**Limites.**

- Accepte des objets que la 1.0.1 rejetait : `{ getScore: () => 2470 }` ou `{ score: 2470 }` renvoient un résultat au lieu de lever `Incorrect hand to compare with` **[vérifié E5]**. `getScore` et `score` sont des noms courants ; un objet « joueur » doté d'un `getScore()` serait comparé comme une main, sans erreur.
- La variante sur `score` change un message existant : `Object.create(PokerHand.prototype)` lève `Incorrect hand to compare with` au lieu de `Incorrect hand` **[vérifié E5]**.
- Les champs d'instance ne sont plus ceux de la 1.0.1 : `master` expose `cards`, `score`, `handRank` là où la 1.0.1 exposait `hand`, `score`, `rank` **[vérifié E7]**. Seul `score` est commun ; une vérification sur `hand` ou `rank` ne reconnaîtrait pas les instances actuelles.

**Compatibilité avec le contrat 1.0.1 :** rompue. « Un argument qui n'est pas une main lève `Incorrect hand to compare with` » n'est plus vrai pour tout objet qui en a la forme.

### 3.3 Marqueur `Symbol.for`

**Principe.** `Symbol.for(clé)` cherche la clé dans un registre de symboles et renvoie le symbole existant, ou le crée ([spécification](https://tc39.es/ecma262/#sec-symbol.for), [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/for)). Deux copies du code obtiennent donc le même symbole. La classe pose ce symbole sur son prototype, et `compareWith` teste sa présence au lieu de l'identité de la classe.

**Avantages.**

- Couvre toutes les sources de copies d'un même agent, vérifiées une à une sur le build réel : entrée ESM face à l'entrée CJS d'une installation imbriquée **[vérifié E6]**, deux copies dans un même bundle esbuild **[vérifié E8]**, build UMD évalué comme un script face à l'entrée ESM, dans les deux sens **[vérifié E8]**.
- Couvre les *realms* d'un même agent. Le registre appartient à l'*Agent Record* ([spécification, Agents](https://tc39.es/ecma262/#sec-agents)), partagé par les iframes et contextes `vm` d'un même fil : `vm.runInNewContext("Symbol.for('x')") === Symbol.for('x')` vaut `true` **[vérifié E5]**.
- Rejette tout ce que la 1.0.1 rejetait, avec le même type et le même message : `{ getScore }`, `{ score }`, `{}`, chaîne, nombre, `null`, `undefined` **[vérifié E5, E6]**. `Object.create(PokerHand.prototype)` garde aussi son comportement 1.0.1 (`Incorrect hand`).
- Invisible : posé sur le prototype et non énumérable, le marqueur n'apparaît ni dans `describe()`, ni dans `JSON.stringify`, ni dans `Object.keys` **[vérifié E6]**.
- Les 41 tests existants passent sans modification sur un prototype jetable de cette parade **[vérifié E6]**.
- Disponible partout où la librairie tourne : `Symbol.for` existe depuis Node 0.12, Chrome 40, Firefox 36, Safari 9 ([données de compatibilité MDN](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Symbol.json)).

**Limites.**

- Falsifiable volontairement : un objet qui porte le symbole et une méthode `getScore` est accepté **[vérifié E5]**. Il faut connaître la clé exacte ; cela n'arrive pas par accident. MDN conseille de préfixer les clés du registre pour éviter les collisions.
- La clé devient un protocole public entre versions : toute future version qui la porte doit exposer un `getScore()` comparable. js-bson gère ce point en stockant sa version majeure sous le symbole et en refusant les objets d'une autre majeure ([constantes](https://github.com/mongodb/js-bson/blob/c9922e971af774d260bb529cf2c405def8036633/src/constants.ts#L1-L5), [contrôle](https://github.com/mongodb/js-bson/blob/c9922e971af774d260bb529cf2c405def8036633/src/parser/serializer.ts#L668-L670)).
- Une instance de la 1.0.1 ne porte pas le marqueur : mélanger 1.0.1 et 2.x échoue comme aujourd'hui **[vérifié E5, E6]**.
- Ne traverse pas `postMessage` ni `structuredClone`, qui ne conservent pas le prototype ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)). `instanceof` ne les traversait pas non plus.
- Un `hand instanceof PokerHand` écrit par un utilisateur reste faux entre deux copies.

**Compatibilité avec le contrat 1.0.1 :** respectée pour tout argument qui n'est pas une main. Seul écart : une vraie main issue d'une autre copie est acceptée au lieu d'être rejetée.

### 3.4 `Symbol.hasInstance`

**Principe.** `instanceof` appelle d'abord la méthode `[Symbol.hasInstance]` de l'opérande droit, si elle existe, et ne parcourt la chaîne de prototypes qu'à défaut ([spécification, InstanceofOperator](https://tc39.es/ecma262/#sec-instanceofoperator), [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/hasInstance)). La classe peut donc redéfinir `instanceof` pour qu'il teste le marqueur de 3.3. Ce n'est pas une parade distincte : c'est une autre façon d'exposer le même marqueur.

**Avantages.** La ligne `hand instanceof PokerHand` de `compareWith` reste inchangée, et le `instanceof` des utilisateurs fonctionne aussi entre copies. Le tableau 3.0 donne exactement les mêmes résultats que le marqueur explicite **[vérifié E5]**.

**Limites.**

- Change le sens d'un opérateur public pour tous les utilisateurs : `instanceof PokerHand` ne signifie plus « construit par cette classe ». MDN illustre ce mécanisme par une classe nommée `Forgeable` ([exemple](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof#instanceof_and_symbol.hasinstance)).
- La méthode statique est héritée par les sous-classes. Sans précaution, `x instanceof SousClasse` serait vrai pour toute main. Node traite ce piège dans ses flux par `if (this !== Writable) return false` ([`Writable`](https://github.com/nodejs/node/blob/7a74c7bbff77646fe999ad1f20d1410244800095/lib/internal/streams/writable.js#L437-L445)) ; avec ce garde-fou, les sous-classes gardent la sémantique ordinaire **[vérifié E5]**.
- Demande Node 6.5, Chrome 50, Firefox 50, Safari 10 ([données de compatibilité MDN](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Symbol.json)).
- Testé sur un montage d'essai seulement, pas sur le build réel.

**Compatibilité avec le contrat 1.0.1 :** identique à 3.3 pour `compareWith`, avec en plus un changement de comportement visible hors de `compareWith`.

### 3.5 Pour mémoire : garder `instanceof` et signaler les doublons

Certaines librairies refusent délibérément les instances d'une autre copie, parce que mélanger deux versions y serait dangereux. graphql-js lève en développement « Cannot use … from another module or realm. Ensure that there is only one instance of "graphql" in the node_modules directory » ([v16](https://github.com/graphql/graphql-js/blob/2b4f68feaed36fd3b221764a467c6fa78a0c9797/src/jsutils/instanceOf.ts#L17-L56)). Yjs écrit dans la console « Yjs was already imported. This breaks constructor checks and will lead to issues! » ([source](https://github.com/yjs/yjs/blob/15b0a622be2523d5060f78c57c4f7dba6a5e7132/src/index.js#L47-L66)).

Ce choix se justifie quand les données d'une copie n'ont pas de sens pour l'autre. Ici, la seule donnée lue sur l'autre main est son score, un entier défini par l'algorithme.

## 4. Ce que font les librairies de référence

| Librairie | Mécanisme (lien vers le source) | Famille |
| --- | --- | --- |
| Drizzle ORM | `entityKind = Symbol.for('drizzle:entityKind')` et une fonction `is()` qui essaie `instanceof` puis compare le marqueur le long de la chaîne de prototypes ([`entity.ts`](https://github.com/drizzle-team/drizzle-orm/blob/3bcb6a27ec1f4f1602aeeb0af2f5aec61010d72d/drizzle-orm/src/entity.ts#L1-L42)). Motif donné : « Replacing all `instanceof` statements with a custom `is()` function allowed us to handle multiple Drizzle packages interacting properly » ([notes de version 0.27.0](https://github.com/drizzle-team/drizzle-orm/releases/tag/0.27.0)). | `Symbol.for` |
| React | Les éléments portent `$$typeof`, comparé à `Symbol.for('react.transitional.element')` ([symboles](https://github.com/react/react/blob/92bb0678c52133a47b3095f6e54da883ea0d6cff/packages/shared/ReactSymbols.js#L14-L18), [`isValidElement`](https://github.com/react/react/blob/92bb0678c52133a47b3095f6e54da883ea0d6cff/packages/react/src/jsx/ReactJSXElement.js#L897-L903)). | `Symbol.for` |
| js-bson (MongoDB) | Chaque valeur expose `Symbol.for('@@mdb.bson.version')` ; le sérialiseur lève `BSONVersionError` si la majeure diffère ([`bson_value.ts`](https://github.com/mongodb/js-bson/blob/c9922e971af774d260bb529cf2c405def8036633/src/bson_value.ts#L33-L36), [`serializer.ts`](https://github.com/mongodb/js-bson/blob/c9922e971af774d260bb529cf2c405def8036633/src/parser/serializer.ts#L668-L670)). | `Symbol.for` versionné |
| Zod 4 | `Symbol.hasInstance` défini sur chaque constructeur, qui teste un ensemble de noms de traits porté par l'instance ([`core.ts`](https://github.com/colinhacks/zod/blob/d40c329910436e528d3c26cb1b9179e05abebf05/packages/zod/src/v4/core/core.ts#L137-L142)). | `Symbol.hasInstance` |
| Node.js (flux) | `Symbol.hasInstance` sur `Writable`, avec repli structurel et garde-fou pour les sous-classes ([`writable.js`](https://github.com/nodejs/node/blob/7a74c7bbff77646fe999ad1f20d1410244800095/lib/internal/streams/writable.js#L437-L445)). | `Symbol.hasInstance` |
| Day.js | `d instanceof Dayjs \|\| !!(d && d[IS_DAYJS])`, avec `IS_DAYJS = '$isDayjsObject'` ([`index.js`](https://github.com/iamkun/dayjs/blob/d3e43be0489ff1d010aca42b3115b6059215ed60/src/index.js#L9-L12)). | `instanceof` ou marqueur à clé chaîne |
| bignumber.js | `v instanceof BigNumber \|\| !!v && v._isBigNumber === true` ([source](https://github.com/MikeMcl/bignumber.js/blob/02109ca2749538d57551cdcc7e38585db111b4bb/bignumber.js#L1469-L1471)). | idem |
| decimal.js | `obj instanceof Decimal \|\| obj && obj.toStringTag === tag` ([source](https://github.com/MikeMcl/decimal.js/blob/b1d1e311eb272b16f5b2ca0e0d1f4c4fa8558edf/decimal.js#L4552-L4554)). | idem |
| Luxon | `o && o.isLuxonDateTime` ([`datetime.js`](https://github.com/moment/luxon/blob/f427515a38f6a671f8de663e6bcc040ed81f114e/src/datetime.js#L1070-L1072)). | marqueur à clé chaîne |
| long.js | `__isLong__` non énumérable sur le prototype, décrit comme « an indicator used to reliably determine if an object is a Long or not » ([source](https://github.com/dcodeIO/long.js/blob/e1bcb4f65096465b69f0fd67e68fc2a79a67ade9/index.js#L153-L171)). | marqueur à clé chaîne |
| Immutable.js | `maybeCollection['@@__IMMUTABLE_ITERABLE__@@']` ([`isCollection.ts`](https://github.com/immutable-js/immutable-js/blob/a6c7429e096bf9900a591626ca009b6a8baa860e/src/predicates/isCollection.ts#L3-L27)). | marqueur à clé chaîne |
| axios | `payload.isAxiosError === true` ([source](https://github.com/axios/axios/blob/a35e6f4ee55dcdec8c7b6f15218d636754c06c66/lib/helpers/isAxiosError.js#L12-L14)). | marqueur à clé chaîne |
| bn.js | `instanceof`, sinon test de forme sur `constructor.wordSize` et `words` ([source](https://github.com/indutny/bn.js/blob/eb2e57c4e50a9b9a1f277a59ef446c13f564dddc/lib/bn.js#L61-L68)). | structurel |
| graphql-js | v16 : `instanceof` plus erreur explicative en développement ([source](https://github.com/graphql/graphql-js/blob/2b4f68feaed36fd3b221764a467c6fa78a0c9797/src/jsutils/instanceOf.ts#L17-L56)). Branche principale : marqueur `Symbol('Schema')` local à chaque copie, donc refus maintenu ([`schema.ts`](https://github.com/graphql/graphql-js/blob/32e9bf17471d67652ba418fb92835a6dbfdb25f5/src/type/schema.ts#L104), [`instanceOf.ts`](https://github.com/graphql/graphql-js/blob/32e9bf17471d67652ba418fb92835a6dbfdb25f5/src/jsutils/instanceOf.ts#L12-L51)). | refus assumé |
| Yjs | Drapeau global et `console.error` au second import ([source](https://github.com/yjs/yjs/blob/15b0a622be2523d5060f78c57c4f7dba6a5e7132/src/index.js#L47-L66)). | refus assumé |

Lecture d'ensemble : les librairies dont les instances circulent entre modules marquent l'instance, par symbole de registre ou par propriété à clé chaîne, et gardent souvent `instanceof` en premier test. Aucune de celles consultées ne s'appuie sur le seul packaging. Celles qui gardent un `instanceof` strict le font parce que mélanger deux copies y serait incorrect, et elles l'expliquent dans le message d'erreur.

## 5. Recommandation

### Ce qu'il faut faire

1. **Dans `compareWith`, remplacer `instanceof` par un marqueur `Symbol.for` testé explicitement** (parade 3.3). C'est la seule parade qui couvre toutes les sources de copies de la section 2, hors passage par `postMessage`, tout en continuant de rejeter, avec la même erreur et le même message, tout argument qui n'est pas une main.
2. **Ne pas utiliser `Symbol.hasInstance`.** Il n'apporte rien à `compareWith` et change le sens d'`instanceof` pour tous les utilisateurs de la classe.
3. **Ne pas utiliser de vérification structurelle.** Elle rompt le contrat de la 1.0.1.
4. **Conserver une seule copie par installation côté packaging** (parade 3.1), sous la forme que retiendra le ticket voisin. Avec le marqueur, ce n'est plus une condition de justesse pour `compareWith`, mais cela reste utile : le build pèse 178 kB en ES et 100 kB en CJS (sortie de `vite build`, E1), un bundle qui embarque les deux entrées contient les deux **[vérifié E3]**, et le `instanceof` des utilisateurs reste cohérent au sein d'une installation. Les `exports` actuels (`import` et `require` vers deux bundles complets) et la variante `module-sync` avec repli ne satisfont pas cette exigence **[vérifié E2, E3]**.

### Esquisse

Prototype jetable, validé sur une copie des sources hors dépôt **[vérifié E6]** ; à reprendre proprement à l'implémentation.

```ts
const POKER_HAND_BRAND = Symbol.for('poker-hand-evaluator.PokerHand');

function isPokerHand(value: unknown): value is PokerHand {
  return (
    value != null &&
    (value as Record<symbol, unknown>)[POKER_HAND_BRAND] === true &&
    typeof (value as PokerHand).getScore === 'function'
  );
}

export class PokerHand {
  // Sur le prototype, non énumérable : absent de describe(), de JSON et d'Object.keys.
  get [POKER_HAND_BRAND](): true {
    return true;
  }

  compareWith(hand: PokerHand): CompareResult {
    if (!isPokerHand(hand)) {
      throw new Error('Incorrect hand to compare with');
    }
    const other = hand.getScore();
    if (this.score < other) return CompareResult.Win;
    if (this.score > other) return CompareResult.Loss;
    if (this.score === other) return CompareResult.Tie;
    throw new Error('Incorrect hand'); // dernier recours de la 1.0.1
  }
}
```

Résultat sur le build réel, avec deux copies chargées (entrée ESM d'une installation, entrée CJS d'une installation imbriquée) **[vérifié E6]** : la main de l'autre copie est comparée (`1`) ; `'foo'`, `{ getScore: () => 1 }`, `{ score: 1 }`, `null` et une instance 1.0.1 lèvent `Error('Incorrect hand to compare with')` ; `Object.create(PokerHand.prototype)` lève `Error('Incorrect hand')` comme en 1.0.1.

### Le compromis que le mainteneur doit accepter

- **Un écart assumé avec la lettre du contrat 1.0.1.** La 1.0.1 levait `Incorrect hand to compare with` pour une main issue d'une autre copie (installation dupliquée, UMD) **[vérifié E4]**. Avec le marqueur, ce cas renvoie le résultat de la comparaison. Aucun appel qui réussissait ne change de résultat, et aucun argument qui n'est pas une main ne cesse d'être rejeté. Si le contrat doit être tenu à la lettre, y compris pour ce cas, il ne reste que la parade 3.1 : on garde `instanceof`, et les copies inévitables de la section 2.3 continuent d'échouer comme en 1.0.1.
- **Une clé de registre à maintenir pour toujours.** `Symbol.for('poker-hand-evaluator.PokerHand')` devient un engagement entre versions : tout objet qui la porte doit fournir un `getScore()` sur la même échelle (plus petit = meilleur). Si l'échelle change un jour, il faudra changer de clé.
- **Un marqueur falsifiable.** Quiconque veut faire passer un objet arbitraire pour une main le peut. `instanceof` l'était déjà : `Object.create(PokerHand.prototype)` passe la garde de la 1.0.1 **[vérifié E7]**.
- **Pas d'interopérabilité avec la 1.0.1.** Une instance 1.0.1 reste rejetée par une 2.x **[vérifié E6]** ; la 1.0.1, qui teste `instanceof`, rejette de même toute instance 2.x.

## 6. Constats adjacents, hors périmètre du ticket

Relevés pendant les expériences ; ils touchent au même contrat mais ne sont pas traités ici.

- **`master` a perdu le dernier recours de la 1.0.1.** Pour un argument qui passe la garde mais n'a pas de score comparable, par exemple `Object.create(PokerHand.prototype)`, la 1.0.1 lève `Error('Incorrect hand')` ; `master` renvoie `3` (égalité) **[vérifié E7]**. L'esquisse ci-dessus rétablit ce comportement.
- **`require()` ne renvoie plus la classe.** En 1.0.1, `require('poker-hand-evaluator')` est la classe elle-même (`module.exports = PokerHand`, usage documenté dans le README). Sur le build de `master`, c'est un objet `{ CompareResult, HandRank, PokerHand }`, et `new (require('poker-hand-evaluator'))(...)` lève un `TypeError` **[vérifié E7]**.
- **Les champs d'instance ont été renommés** : `hand`, `score`, `rank` en 1.0.1 ; `cards`, `score`, `handRank` sur `master` **[vérifié E7]**.
- **La documentation d'esbuild est en retard sur un point** : elle écrit que Node « deliberately doesn't implement loading ESM using require » ([Conditions](https://esbuild.github.io/api/#conditions)), ce qui n'est plus vrai depuis v22.12.0 et v20.19.0.

## Annexe : expériences

Environnement : macOS, Node v22.23.4, v24.14.1 et v26.8.2, Vite 5.4.21, esbuild 0.27.3. Les montages ont été créés dans un répertoire temporaire hors dépôt et ne sont pas versionnés. `require(esm)` a été désactivé avec `--no-experimental-require-module` pour simuler un Node plus ancien.

| N° | Montage | Résultat |
| --- | --- | --- |
| E1 | Copie des sources de `master` construite avec `vite build`, installée dans `node_modules` avec son `package.json` inchangé. Application ESM qui importe la librairie, plus une dépendance CommonJS qui la `require` et renvoie une main. | Deux classes distinctes ; `compareWith` lève `Error('Incorrect hand to compare with')` sur les trois versions de Node, `require(esm)` actif ou non. |
| E2 | Même build, trois `package.json` différents : wrapper ESM ré-exportant le `.cjs` ; ESM seul (`"exports": "./dist/poker-hand-evaluator.js"`) ; `module-sync` suivi de `import`/`require`. | Wrapper : une seule classe dans tous les cas. ESM seul : une seule classe, mais `ERR_REQUIRE_ESM` si `require(esm)` est désactivé. `module-sync` : une seule classe, deux si `require(esm)` est désactivé. |
| E3 | Les variantes de E1 et E2, plus la recette imbriquée de webpack, empaquetées avec `esbuild --bundle` (`--platform=node` puis `browser`), bundle exécuté. | Deux copies et échec pour les `exports` de `master` et pour `module-sync` ; une copie et succès pour wrapper, ESM seul et recette imbriquée. |
| E4 | Sources de la 1.0.1 extraites de l'historique git (commit `bf5e50e`), installées deux fois (racine et `node_modules` imbriqué), en CommonJS pur. Même montage avec la variante wrapper de E2. Enfin, entrée CJS de la 1.0.1 face à son `dist/pokerhand.min.js`. | `Error('Incorrect hand to compare with')` dans les trois cas. |
| E5 | Une classe d'essai reprenant le `compareWith` de la 1.0.1, évaluée trois fois par garde (deux fois dans le *realm* courant, une fois dans un contexte `vm`), pour cinq gardes et dix-sept arguments, dont une instance de la 1.0.1 réelle. | Tableau de la section 3.0 ; identique sur les trois versions de Node. |
| E6 | Copie des sources de `master` avec l'esquisse de la section 5, hors dépôt : suite de tests existante, build, puis exécution avec deux copies chargées (`exports` de `master`, installation imbriquée). | 41 tests sur 41 ; résultats cités en section 5. |
| E7 | Comparaison directe entre la 1.0.1 et le build de `master` : `compareWith(Object.create(PokerHand.prototype))`, forme de `require()`, champs d'instance, nom de classe dans chaque bundle. | Résultats cités en sections 1 et 6. |
| E8 | Deux compléments, joués sur le build de `master` puis sur le prototype de E6. (a) Le scénario de E1 empaqueté par esbuild. (b) Un build UMD (`formats: ['umd']`) évalué par `vm.runInThisContext`, donc par la branche « global » de l'UMD, face à l'entrée ESM. | `master` : échec dans les deux cas. Prototype : deux copies dans le bundle et `compareWith` renvoie `1` ; UMD et ESM se comparent dans les deux sens. |

Ce qui n'a **pas** été vérifié par exécution : le comportement de webpack, Rollup et Vite comme bundlers d'application (documentation citée seulement) ; le contenu du tarball npm de la 1.0.1 ; un vrai navigateur, un vrai worker ou une vraie iframe (remplacés par `vm.runInThisContext`, `structuredClone` et un contexte `vm`) ; `Symbol.hasInstance` sur le build réel ; les versions de Node antérieures à v22.
