# Double entrée ESM/CJS : faire que `require()` renvoie la classe, avec des types corrects

- Ticket : [Double entrée ESM/CJS : comment faire que require() renvoie la classe avec des types corrects ?](https://github.com/codeKonami/poker-hand/issues/11)
- Date de la recherche : 2026-11-24. Les versions d'outils et leur état de maintenance ont été relevés ce jour-là, à la source.
- Base de code : `master` au commit `3138c14`.

## Réponse courte

1. **Forme à livrer.** Côté CJS, `module.exports = PokerHand`, avec les exports nommés attachés à la classe en propriétés statiques (`PokerHand.PokerHand`, `PokerHand.HandRank`, `PokerHand.CompareResult`, `PokerHand.default`). Côté ESM, des exports nommés plus `export default PokerHand`.
2. **Types.** Deux fichiers de déclaration, un par format : `index.d.cts` qui se termine par `export = PokerHand` et porte tout le reste (enums, types purs) dans un `declare namespace PokerHand` fusionné avec la classe ; `index.d.mts` avec les exports ESM habituels. Dans `exports`, la condition `types` vient en premier dans chaque branche `import` / `require`.
3. **Outil.** tsdown, avec deux entrées (une entrée ESM, une entrée CJS réduite à un seul export par défaut) et une troisième sortie UMD. Cette configuration a été construite et vérifiée : publint sans erreur ni avertissement, `attw --pack` « No problems found », `require()` qui renvoie la classe de Node 10.24 à Node 26.8.
4. **tsup** est écarté (son README le déclare non maintenu, sa transformation des types casse la forme voulue, pas d'UMD). **Vite en mode lib** y arrive, mais avec deux builds, une entrée `.cts` et des déclarations non regroupées ; sa propre documentation renvoie vers tsdown pour ce cas.
5. **Compromis à accepter.** Un vrai double paquet charge deux copies de la classe quand un programme mélange `import` et `require` : `compareWith` lève alors « Incorrect hand to compare with » entre les deux copies (vérifié). La variante sans ce risque existe (un seul code CJS et une façade ESM), elle est décrite en section 5.1.

## Méthode et niveau de preuve

Sources primaires uniquement : documentation de Node.js, manuel et notes de version de TypeScript, documentation et code source de tsup, tsdown, Vite, Rolldown, unplugin-dts / vite-plugin-dts, publint et arethetypeswrong. Chaque affirmation renvoie à sa source.

Les affirmations marquées **[vérifié]** ont en plus été exécutées sur un paquet d'essai construit à partir d'une copie de `src/` (hors dépôt, rien n'est commité). Tout ce qui ne porte pas cette marque vient seulement de la documentation ou du code source lu.

Versions utilisées pour les essais :

| Rôle | Version |
| --- | --- |
| Outils de build | tsdown 0.23.7 (Rolldown 1.3.3), tsup 9.0.0, Vite 8.3.8, vite-plugin-dts 5.1.2 (qui délègue à unplugin-dts 1.1.2) |
| Vérification du paquet | publint 0.3.25, `@arethetypeswrong/cli` 0.18.5 |
| TypeScript | 5.9.3 pour les builds ; 5.9.3, 6.0.3 et 7.0.2 côté consommateur |
| Node.js pour builder | 22.23.4 |
| Node.js pour exécuter | 10.24.1, 12.7.0, 12.16.3, 12.17.0, 12.22.12, 14.21.3, 16.20.2, 18.20.8, 20.18.3, 20.19.0, 22.11.0, 22.23.4, 24.14.1, 26.8.2 (binaires officiels de nodejs.org, sommes SHA-256 contrôlées) |

Les types ont été contrôlés de deux façons : `attw --pack`, et un petit banc de cinq projets consommateurs compilés avec `tsc` et `skipLibCheck: false` (CJS en `module: node16`, CJS en `module: nodenext`, ESM en `module: node16`, `moduleResolution: bundler`, et l'ancien `moduleResolution: node10` avec `esModuleInterop: false`). Chaque projet utilise la classe comme valeur et comme type, les deux enums, et les types `Suit`, `Rank`, `Card`.

## 1. Formes possibles côté CJS et déclarations de types correspondantes

### 1.1 Les règles qui contraignent la forme

**`export =` décrit `module.exports =`, `export default` décrit `module.exports.default`.** Le manuel TypeScript présente `export =` comme l'analogue direct de `module.exports = ...` ([Modules - Reference, « export = and import = require() »](https://www.typescriptlang.org/docs/handbook/modules/reference.html#export--and-import--require)). arethetypeswrong donne la table de correspondance : `module.exports = x` s'écrit `export = x` ; `export default x` dans un fichier CJS décrit `exports.default = x` ([Incorrect default export](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/FalseExportDefault.md)). Le manuel recommande d'ailleurs aux bibliothèques publiées en CommonJS d'éviter `export default` et d'utiliser `export =` quand le module a un export principal unique ([ESM/CJS Interop, « Library code needs special considerations »](https://www.typescriptlang.org/docs/handbook/modules/appendices/esm-cjs-interop.html#library-code-needs-special-considerations)).

**Un fichier de déclaration représente exactement un fichier JavaScript, et son format se lit sur son extension.** `.d.mts` décrit un `.mjs` (toujours ESM), `.d.cts` décrit un `.cjs` (toujours CJS), `.d.ts` décrit un `.js` dont le format dépend du `"type"` du `package.json` le plus proche ([Modules - Theory, « The role of declaration files »](https://www.typescriptlang.org/docs/handbook/modules/theory.html#the-role-of-declaration-files)). Un seul `index.d.ts` dans un paquet `"type": "module"` est donc lu comme ESM, même quand `require` aboutit à un `.cjs` : c'est le problème « Masquerading as ESM », dont la correction documentée est d'ajouter un `.d.cts` ([Masquerading as ESM](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/FalseESM.md)). publint applique la même règle : deux fichiers de types sont nécessaires pour une double publication ([`EXPORTS_TYPES_INVALID_FORMAT`](https://publint.dev/rules#exports_types_invalid_format)). Les extensions `.d.mts` et `.d.cts` existent depuis TypeScript 4.7 ([notes de version 4.7, « New File Extensions »](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#new-file-extensions)). Les deux autres problèmes relevés sur `master` ont la même origine d'après leur documentation : « Used fallback condition » apparaît quand la branche choisie n'a pas de déclaration à côté de son fichier JavaScript et que TypeScript poursuit à tort vers la condition suivante ([Used fallback condition](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/FallbackCondition.md)) ; « Internal resolution error » signale le plus souvent des déclarations produites séparément du JavaScript ([Internal resolution error](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/InternalResolutionError.md)).

**`types` en premier.** L'ordre des clés de `exports` est significatif, les premières l'emportent ([Node.js, « Conditional exports »](https://nodejs.org/api/packages.html#conditional-exports)). La documentation de Node dit de la condition `types` : « This condition should always be included first » ([« Community Conditions Definitions »](https://nodejs.org/api/packages.html#community-conditions-definitions)). TypeScript suit l'algorithme de Node et fait toujours correspondre `types` et `default` ([Modules - Reference, « package.json "exports" »](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports)) ; publint en fait une erreur ([`EXPORTS_TYPES_SHOULD_BE_FIRST`](https://publint.dev/rules#exports_types_should_be_first)). Deux écritures sont correctes :

- la forme imbriquée, `types` en premier dans chaque branche `import` / `require` (exemple du manuel : [« Example: explicit "types" condition »](https://www.typescriptlang.org/docs/handbook/modules/reference.html#example-explicit-types-condition)) ;
- la forme sans `types`, où TypeScript trouve `index.d.mts` à côté de `index.mjs` et `index.d.cts` à côté de `index.cjs` par substitution d'extension ([« File extension substitution »](https://www.typescriptlang.org/docs/handbook/modules/reference.html#file-extension-substitution)).

**Les anciens modes de résolution ignorent `exports`.** `moduleResolution: node10` lit `types` puis `main` à la racine du `package.json` ([« package.json "main" and "types" »](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-main-and-types), [« node10 »](https://www.typescriptlang.org/docs/handbook/modules/reference.html#node10-formerly-known-as-node)). Il faut donc garder un `types` racine qui pointe vers le `.d.cts`, cohérent avec `main`. Ce mode est déprécié dans TypeScript 6.0 et retiré dans 7.0 ([notes de version 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)) **[vérifié : TS 6.0.3 signale TS5107, TS 7.0.2 signale TS5108 « has been removed »]**.

### 1.2 Les formes possibles

| Forme | JavaScript CJS | `require()` renvoie | Déclaration CJS correcte | Verdict |
| --- | --- | --- | --- | --- |
| A. Objet d'exports (état actuel) | `exports.PokerHand = …; exports.default = …` | un objet `{ PokerHand, HandRank, … }` | `export { … }`, `export default` | Casse le contrat de la 1.0.1 |
| B. Classe + propriétés statiques | `module.exports = PokerHand`, puis `PokerHand.HandRank = …` | la classe | `export = PokerHand` + `declare namespace PokerHand` fusionné | **Forme retenue** |
| C. B avec `default` circulaire | B, plus `PokerHand.default = PokerHand` | la classe | comme B, le namespace exporte aussi `default` | Incluse dans B, sans coût |
| D. ESM seul + `export { PokerHand as 'module.exports' }` | pas de fichier CJS | la classe sur Node ≥ 20.19 / 22.12, une erreur avant | un seul `.d.mts` | Écartée, voir 5.2 |

Forme A **[vérifié]** : avec une seule entrée qui mélange exports nommés et export par défaut, tsdown comme Vite émettent `exports.default = …` et l'avertissement `MIXED_EXPORTS`, et `require()` renvoie un objet. C'est le comportement documenté de Rolldown : `output.exports: 'default'` « can only be used when the input modules have a single default export » ([Rolldown, `output.exports`](https://rolldown.rs/reference/OutputOptions.exports)).

Forme C : le motif `module.exports = X` plus `X.default = X` est celui que décrit arethetypeswrong pour qu'un import par défaut donne la même valeur partout ([CJS default export](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/CJSOnlyExportsDefault.md)) ; les types doivent alors déclarer `default` dans le namespace fusionné ([Missing `export =`](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/MissingExportEquals.md)).

### 1.3 Le `.d.cts` cible

Voici le fichier produit par tsdown dans l'essai **[vérifié]** ; c'est aussi ce qu'il faudrait écrire à la main :

```ts
declare enum HandRank {
  RoyalFlush = "ROYAL_FLUSH",
  // …
  HighCard = "HIGH_CARD"
}
declare enum CompareResult {
  Win = 1,
  Loss = 2,
  Tie = 3
}
type Suit = 'C' | 'D' | 'H' | 'S';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
type Card = `${Rank}${Suit}`;
declare class PokerHand {
  private cards;
  private score;
  private handRank;
  constructor(hand: string);
  describe(): { hand: string[]; score: number; rank: HandRank; };
  toString(): string;
  getScore(): number;
  getRank(): HandRank;
  update(hand: string): void;
  compareWith(hand: PokerHand): CompareResult;
}
declare namespace PokerHand {
  export { PokerHand, PokerHand as default, HandRank, CompareResult };
  export type { Suit, Rank, Card };
}
export = PokerHand;
```

Le patron « classe exportée par `export =` plus namespace du même nom pour les types » est celui du gabarit officiel pour un module-classe ([module-class.d.ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-class-d-ts.html)) et de la correction proposée par arethetypeswrong ([Missing `export =`](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/MissingExportEquals.md)).

Avec ce fichier, les cinq projets consommateurs compilent sans erreur **[vérifié, TS 5.9.3]**, y compris :

```ts
import PokerHand = require('poker-hand-evaluator');     // l'équivalent typé de const PokerHand = require(...)
const hand: PokerHand = new PokerHand('KS KH QC AH AD');
const rank: PokerHand.HandRank = hand.getRank();
const card: PokerHand.Card = 'KS';
```

et, dans un fichier TypeScript compilé en CommonJS :

```ts
import PokerHand, { HandRank, CompareResult, PokerHand as Named } from 'poker-hand-evaluator';
import type { Card, Suit, Rank } from 'poker-hand-evaluator';
```

### 1.4 Conséquences pour les enums et les exports de types

`export =` ne laisse aucun autre export au niveau du module. Tout le reste doit donc passer par l'entité exportée :

- **Enums (`HandRank`, `CompareResult`).** Un enum est à la fois une valeur et un type. À l'exécution, il devient une propriété statique de la classe (`PokerHand.HandRank`). Côté types, il doit être membre du namespace pour garder ses deux natures. Une simple propriété statique ne suffit pas : elle n'a pas de sens en position de type.
- **Types purs (`Suit`, `Rank`, `Card`).** Ils n'existent pas à l'exécution et ne peuvent vivre que dans le namespace.
- **`PokerHand.PokerHand` et `PokerHand.default`.** Ces deux auto-références font fonctionner `const { PokerHand } = require(...)` et, pour un projet TypeScript compilé en CommonJS, `import { PokerHand } from` et `import PokerHand from`.

Contre-exemple **[vérifié]** : une entrée CJS écrite `export default Object.assign(PokerHand, { PokerHand, HandRank, CompareResult })` produit bien `module.exports = …`, mais la déclaration générée est `declare const _default: typeof PokerHand & { … }; export = _default;`. Les consommateurs CJS perdent alors tous les types : `TS2749 'PokerHand' refers to a value, but is being used as a type` et `TS2305 Module has no exported member 'Card'`.

Deux autres effets à connaître :

- Les deux fichiers de déclaration déclarent chacun leur propre classe et leurs propres enums. TypeScript les traite comme des types distincts : passer à `compareWith` une instance venue de l'autre format est refusé (« Types have separate declarations of a private property 'cards' ») **[vérifié]**. C'est le reflet, côté types, du risque décrit en section 6.
- Quand un module ES importe un fichier CJS, Node détecte les exports nommés par analyse statique du source, sans garantie ([« CommonJS Namespaces »](https://nodejs.org/api/esm.html#commonjs-namespaces), [Named ESM exports](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/NamedExports.md)). Cela ne concerne pas ce paquet tant que la condition `import` mène à un vrai fichier ESM.

### 1.5 Deux façons d'obtenir ce `.d.cts`

**Généré.** Déclarer la fusion dans le source, à côté de la classe, pour que l'outil la recopie telle quelle. Trois ajouts dans `src/poker-hand.ts` **[vérifié : accepté par tsc 5.9.3, y compris avec `isolatedModules` et `verbatimModuleSyntax`, et par tsc 7.0.2]** :

```ts
import type { Suit, Rank, Card } from './types';

export class PokerHand { /* inchangé */ }

// Côté types : les exports nommés sont aussi des membres statiques de la classe.
export declare namespace PokerHand {
  export { PokerHand, PokerHand as default, HandRank, CompareResult };
  export type { Suit, Rank, Card };
}

// Côté exécution : la contrepartie de la déclaration ci-dessus.
Object.assign(PokerHand, { PokerHand, default: PokerHand, HandRank, CompareResult });
```

Le namespace est ambiant (`declare`) : il n'émet aucun code, il promet seulement que ces membres existent, et c'est la ligne `Object.assign` qui tient la promesse. Les propriétés statiques existent alors aussi dans la version ESM, ce qui garde les deux formats identiques.

**Écrit à la main.** Un `index.d.cts` d'une quarantaine de lignes, copié dans `dist/`. Le contenu est celui de la section 1.3 et passe le banc de consommateurs **[vérifié]**. Le prix est le risque de dérive par rapport au code, à couvrir par `attw` et un test de types en CI. Cette voie fonctionne avec n'importe quel outil de build.

## 2. Ce que savent produire tsup, tsdown et Vite

### 2.1 Tableau comparatif

| | tsup 9.0.0 | tsdown 0.23.7 | Vite 8.3.8 en mode lib + vite-plugin-dts 5.1.2 |
| --- | --- | --- | --- |
| Dernière publication | 2026-10-14 (la précédente, 8.5.1, datait du 2025-11-12) | 2026-11-06 | Vite : 2026-11-11 ; vite-plugin-dts : 2026-10-03 |
| État annoncé par le projet | « not actively maintained anymore », renvoie vers tsdown | Actif, encore en 0.x ; fonctions CJS en « maintenance-only » | Actif ; le mode lib vise les bibliothèques pour navigateur ; vite-plugin-dts déconseillé au profit d'unplugin-dts |
| Node requis pour builder | `^22.18.0 \|\| ^24.11.0 \|\| >=26.0.0` | `^22.18.0 \|\| ^24.11.0 \|\| >=26.0.0` | `^20.19.0 \|\| >=22.12.0` |
| `module.exports = PokerHand` | Oui, mais seulement avec `cjsInterop: true` **et** `splitting: true` | Oui, par défaut (`cjsDefault`) | Oui, avec un build CJS séparé |
| `.d.cts` avec `export =` et namespace | Non : la transformation des types abîme le namespace | Oui, généré | Oui avec une entrée `.cts` et des déclarations non regroupées ; non avec `bundleTypes` |
| `attw --pack` sans problème | Non avec les types générés (« Missing `export =` ») | Oui | Oui dans la configuration de la section 5.3 |
| Sortie UMD | Non (`esm`, `cjs`, `iife`) | Oui | Oui |

Sources des trois premières lignes : registre npm (`npm view <paquet> time engines`) et dépôts [egoist/tsup](https://github.com/egoist/tsup), [rolldown/tsdown](https://github.com/rolldown/tsdown), [vitejs/vite](https://github.com/vitejs/vite/releases/tag/v8.3.8), [qmhc/unplugin-dts](https://github.com/qmhc/unplugin-dts). Les lignes suivantes sont **[vérifiées]** et détaillées ci-dessous.

Dans les trois outils, la même contrainte s'applique : pour obtenir `module.exports = PokerHand`, l'entrée CJS ne doit avoir qu'**un seul export, par défaut**. L'entrée ESM, elle, garde ses exports nommés. Il faut donc deux entrées, donc deux builds ou deux configurations.

### 2.2 tsdown

- **Ce que dit la documentation.** L'option `cjsDefault`, activée par défaut : quand une entrée a « only a single default export » et que le format est CJS, tsdown transforme `export default …` en `module.exports = …` dans le JavaScript et en `export = …` dans la déclaration ([CJS Default Export](https://tsdown.dev/options/cjs-default)). Formats disponibles : `esm`, `cjs`, `iife`, `umd` ([Output Format](https://tsdown.dev/options/output-format)). Les déclarations sont produites par rolldown-plugin-dts, avec un build séparé pour le CJS ([Declaration Files](https://tsdown.dev/options/dts)). tsdown peut générer le champ `exports` ([Auto-Generating Package Exports](https://tsdown.dev/options/package-exports)) et lancer publint et attw en fin de build ([Package Validation](https://tsdown.dev/options/lint)).
- **Ce qui a été vérifié.** Avec la configuration de la section 3 : `dist/index.cjs` se termine par `module.exports = index_cjs_default;`, `dist/index.d.cts` est exactement le fichier de la section 1.3, `dist/pokerhand.min.js` expose `window.PokerHand` comme classe. Avec `exports: true`, tsdown écrit `main`, `module`, `types` (vers le `.d.cts`) et `exports["."] = { "import": "./dist/index.mjs", "require": "./dist/index.cjs" }`, c'est-à-dire la forme sans `types` explicite. Avec `attw: { profile: 'strict', level: 'error' }`, le build affiche « [attw] No problems found ».
- **Limites.**
  - Avec une entrée unique à exports mixtes, le CJS reste un objet (forme A) et tsdown affiche `MIXED_EXPORTS` **[vérifié]**.
  - La documentation prévient : « CJS is in maintenance-only mode », les fonctions propres au CJS comme `cjsDefault` sont conservées mais ne seront plus améliorées, et les nouvelles bibliothèques sont encouragées à publier en ESM seul ([Output Format](https://tsdown.dev/options/output-format)).
  - Le projet est en 0.x et ses versions mineures récentes contiennent des étapes de migration (voir les notes de [v0.23.7](https://github.com/rolldown/tsdown/releases/tag/v0.23.7)). Épingler la version.
  - Sans `target` explicite, tsdown déduit le niveau de syntaxe de `engines.node` ; sans ce champ, il ne transforme rien ([Target](https://tsdown.dev/options/target)).
- **Maintenance.** Dépôt de l'organisation Rolldown, dernier commit le 2026-11-19, sept publications stables entre le 2026-09-03 (0.23.0) et le 2026-11-06 (0.23.7).

### 2.3 tsup

- **Ce que dit la documentation.** Le README s'ouvre sur : « This project is not actively maintained anymore. Please consider using tsdown instead » ([README](https://github.com/egoist/tsup)). L'option `--cjsInterop` : « If there are only default exports and no named exports, it will be transformed to `module.exports = x` instead » ([Interop with CommonJS](https://tsup.egoist.dev/#interop-with-commonjs)). Formats : `esm`, `cjs`, `iife` ([Bundle formats](https://tsup.egoist.dev/#bundle-formats)).
- **Ce qui a été vérifié.**
  - `cjsInterop: true` seul n'a **aucun effet** : `require()` renvoie `{ default }`. Il faut aussi `splitting: true`. La raison est dans le code : le plugin n'agit que si la liste des exports du fichier est connue ([cjs-interop.ts](https://github.com/egoist/tsup/blob/main/src/plugins/cjs-interop.ts)), et elle ne l'est que lorsque esbuild construit d'abord en ESM, ce que tsup fait pour le CJS seulement avec `splitting` ou `treeshake` ([esbuild/index.ts](https://github.com/egoist/tsup/blob/main/src/esbuild/index.ts)). La documentation ne le mentionne pas, et `splitting` pour le CJS y est qualifié d'expérimental ([Code Splitting](https://tsup.egoist.dev/#code-splitting)).
  - Avec `cjsInterop`, tsup applique aux déclarations CJS le plugin [fix-dts-default-cjs-exports](https://github.com/userquin/fix-dts-default-cjs-exports) ([rollup.ts](https://github.com/egoist/tsup/blob/main/src/rollup.ts)). Sur la forme de la section 1.5, ce plugin réécrit l'intérieur du namespace au lieu de l'export du module :

    ```ts
    declare namespace PokerHand {
        // @ts-ignore
    export = PokerHand;
    export { PokerHand, HandRank, CompareResult };
        export type { Suit, Rank, Card };
    }

    export { PokerHand as default };
    ```

    Résultat : attw signale « Missing `export =` » en `node10` et `node16 (from CJS)`, et les consommateurs CJS du banc ne compilent plus.
  - `--format umd` est refusé (`Invalid value "umd"`). La sortie `iife` avec `--global-name PokerHand` donne un objet `{ default }` et non la classe.
- **Conclusion.** tsup sait produire le JavaScript voulu, pas les types voulus. Il faudrait écrire le `.d.cts` à la main et renoncer à l'UMD, sur un outil que son auteur déclare ne plus maintenir. La version 9.0.0 du 2026-10-14 apporte surtout des mises à jour de dépendances (esbuild, chokidar) et l'abandon de Node < 22.18 ; ses notes ne mentionnent aucun changement de `cjsInterop` ni de la génération des déclarations ([notes de version](https://github.com/egoist/tsup/releases/tag/v9.0.0)).

### 2.4 Vite en mode lib

- **Ce que dit la documentation.** `build.lib` accepte `formats: ('es' | 'cjs' | 'umd' | 'iife')[]` et un `name` pour la variable globale ([`build.lib`](https://vite.dev/config/build-options#build-lib)). Vite 8 construit avec Rolldown ; `build.rollupOptions` est un alias déprécié de `build.rolldownOptions` ([`build.rolldownOptions`](https://vite.dev/config/build-options#build-rolldownoptions)). Le guide précise : « Library mode includes a simple and opinionated configuration for browser-oriented and JS framework libraries. If you are building non-browser libraries, or require advanced build flows, you can use tsdown or Rolldown directly » ([Library Mode](https://vite.dev/guide/build#library-mode)). Côté types, le README de vite-plugin-dts indique « Do not recommend anymore, please use unplugin-dts instead » ([README](https://github.com/qmhc/unplugin-dts/blob/main/packages/vite-plugin-dts/README.md)) ; l'extension des déclarations se règle avec `outDirs: { dir, moduleFormat: 'cjs' | 'esm' }`, et « `moduleFormat` is not inferred from the bundler's JavaScript formats » ([options](https://github.com/qmhc/unplugin-dts/blob/main/docs/en/options.md)).
- **Ce qui a été vérifié.**
  - Le mode lib applique la même entrée à tous les formats. Avec `formats: ['es', 'cjs']` et une entrée à exports mixtes, le CJS est un objet (forme A) et Rolldown affiche `MIXED_EXPORTS`. Il faut donc **deux appels à `vite build`**, avec deux fichiers de configuration et `emptyOutDir: false` sur le second.
  - Aucune option du plugin de types ne convertit `export default` en `export =`. Avec `bundleTypes: true` (API Extractor), le `.d.cts` garde `export default PokerHand` (attw : « Incorrect default export ») et le namespace ambiant est réécrit en `export declare type { Suit, Rank, Card };`, qui est une erreur de syntaxe (`TS1003`), y compris dans le `.d.mts`.
  - La voie qui fonctionne : une entrée CJS en `.cts` qui écrit `export = PokerHand;`, un `tsconfig` en `module: "preserve"` (mode où `export =` est accepté et émis en `module.exports`, voir [« preserve »](https://www.typescriptlang.org/docs/handbook/modules/reference.html#preserve)), et des déclarations **non regroupées**. Résultat : `module.exports = PokerHand;` dans le JavaScript, `import { PokerHand } from './poker-hand.cjs'; export = PokerHand;` dans `index.d.cts`, attw « No problems found », banc de consommateurs au vert. Le détail est en section 5.3.
  - `formats: ['umd']` avec `name: 'PokerHand'` sur l'entrée à export unique expose bien la classe en global.
- **Limites.** Deux builds à orchestrer, 28 fichiers de déclaration publiés au lieu de 2 (un par module interne et par format, qui décrivent des fichiers `.cjs` / `.mjs` absents du paquet), un plugin de types que son auteur déconseille, et un guide officiel qui oriente ce cas d'usage vers tsdown.

## 3. Configuration vérifiée de bout en bout

Tout ce qui suit a été construit puis contrôlé **[vérifié]**.

### 3.1 Sources

`src/poker-hand.ts` reçoit les ajouts de la section 1.5. Les deux entrées :

```ts
// src/index.ts — entrée ESM : exports nommés + export par défaut
import { PokerHand } from './poker-hand';

export { PokerHand };
export { HandRank, CompareResult } from './types';
export type { Suit, Rank, Card } from './types';
export default PokerHand;
```

```ts
// src/index.cjs.ts — entrée CJS : UN seul export, par défaut
import { PokerHand } from './poker-hand';

export default PokerHand;
```

Le `tsconfig.json` actuel du dépôt a été utilisé sans modification.

### 3.2 `tsdown.config.ts`

```ts
import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    // ESM : exports nommés + export par défaut
    entry: { index: 'src/index.ts' },
    format: 'esm',
    dts: true,
  },
  {
    // CJS : export par défaut unique -> `module.exports = PokerHand` et `export =` dans index.d.cts
    entry: { index: 'src/index.cjs.ts' },
    format: 'cjs',
    dts: true,
    clean: false,
  },
  {
    // Navigateur : fichier UMD qui expose `window.PokerHand`
    entry: { pokerhand: 'src/index.cjs.ts' },
    format: 'umd',
    globalName: 'PokerHand',
    platform: 'browser',
    minify: true,
    dts: false,
    clean: false,
    outputOptions: { entryFileNames: 'pokerhand.min.js' },
  },
]);
```

Fichiers produits : `dist/index.mjs`, `dist/index.d.mts`, `dist/index.cjs`, `dist/index.d.cts`, `dist/pokerhand.min.js`.

### 3.3 `package.json`

Extrait limité aux champs qui comptent pour la question :

```json
{
  "name": "poker-hand-evaluator",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.cts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown",
    "lint:package": "publint --strict && attw --pack ."
  }
}
```

Pourquoi chaque champ :

- `main` sert aux versions de Node qui ne lisent pas `exports` (section 4) ; `types` à la racine sert à `moduleResolution: node10`. Les deux pointent vers la paire CJS.
- `module` est une convention de bundlers, Node l'ignore ([chapitre « dual packages » du guide Node](https://github.com/nodejs/package-examples/blob/main/guide/07-dual-packages/README.md)). Il est facultatif dès lors que `exports` existe.
- `"./package.json"` reste exporté, car introduire `exports` ferme tous les autres chemins du paquet : « This will likely be a breaking change » ([« Package entry points »](https://nodejs.org/api/packages.html#package-entry-points)). Les chemins profonds de la 1.0.1 (`poker-hand-evaluator/src/pokerhand`, `poker-hand-evaluator/dist/pokerhand.min.js`) ne sont plus atteignables par `require` sauf à les déclarer.
- La forme générée par `exports: true` de tsdown, sans conditions `types`, passe les mêmes contrôles.

### 3.4 Résultats

| Contrôle | Résultat |
| --- | --- |
| `publint --strict` | Aucune erreur, aucun avertissement. Deux suggestions : déclarer `engines.node` et `sideEffects` |
| `attw --pack .` | « No problems found » : `node10`, `node16 (from CJS)`, `node16 (from ESM)`, `bundler` tous au vert |
| Banc de consommateurs, TS 5.9.3 | 5 projets sur 5 sans erreur |
| Banc de consommateurs, TS 6.0.3 et 7.0.2 | `node16`, `nodenext`, `bundler` sans erreur ; le projet `node10` est refusé par le compilateur lui-même (option dépréciée puis retirée) |
| `const PokerHand = require('poker-hand-evaluator'); new PokerHand('KS KH QC AH AD')` | Fonctionne sur Node 10.24.1, 12.22.12, 14.21.3, 16.20.2, 18.20.8, 20.18.3, 20.19.0, 22.11.0, 22.23.4, 24.14.1, 26.8.2 |
| `const { PokerHand, HandRank, CompareResult } = require(...)` | Fonctionne, mêmes versions |
| `import PokerHand, { PokerHand as Named, HandRank, CompareResult } from 'poker-hand-evaluator'` | Fonctionne de Node 12.22.12 à 26.8.2 |
| `dist/pokerhand.min.js` évalué comme un `<script>` | `window.PokerHand` est la classe, `new PokerHand(...)` fonctionne |

Les deux suggestions de publint relèvent d'autres décisions (versions de Node supportées, tree-shaking) et ne sont pas traitées ici. Les résultats sur les vieilles versions de Node tiennent au fait que le code de cette bibliothèque n'emploie aucune syntaxe récente ; ce n'est pas une garantie de l'outil.

Remarque pour le fichier UMD : dans un paquet `"type": "module"`, Node lit un `.js` comme un module ES ([« Determining module system »](https://nodejs.org/api/packages.html#determining-module-system)). `dist/pokerhand.min.js` convient donc à une balise `<script>`, mais pas à un `require()` par chemin **[vérifié : objet vide sur Node 22.23.4, `ERR_REQUIRE_ESM` sur Node 20.18.3]**. C'est pour cette raison que Vite nomme sa sortie UMD `.umd.cjs` dans son exemple ([Library Mode](https://vite.dev/guide/build#library-mode)).

## 4. Node.js : `exports`, conditions, repli sur `main`, `require(esm)`

### 4.1 Ce que dit la documentation

| Versions | Changement | Source |
| --- | --- | --- |
| Toutes | `main` est reconnu ; il est requis pour Node 10 et antérieurs ; si `exports` et `main` coexistent, `exports` l'emporte sur les versions qui le connaissent | [« Package entry points »](https://nodejs.org/api/packages.html#package-entry-points) |
| 12.7.0 | Introduction du champ `exports` | [historique de `"exports"`](https://nodejs.org/api/packages.html#exports) |
| 13.2.0 / 12.16.0 | Exports conditionnels, derrière un drapeau | [« Conditional exports »](https://nodejs.org/api/packages.html#conditional-exports) |
| 13.7.0 / 12.17.0 | Exports conditionnels sans drapeau | [historique en tête de page](https://nodejs.org/api/packages.html) |
| 14.13.0 / 12.20.0 | Motifs dans `exports` | idem |
| 22.0.0 / 20.17.0 | `require()` d'un module ES, derrière `--experimental-require-module` | [« Loading ECMAScript modules using require() »](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require) |
| 23.0.0 / 22.12.0 / 20.19.0 | `require(esm)` sans drapeau | idem |
| 23.0.0 / 22.12.0 | Nom d'export `'module.exports'` pris en compte par `require(esm)` | idem |
| 25.4.0 / 24.15.0 | `require(esm)` n'est plus expérimental | idem |

Les numéros des versions rétroportées (colonne de gauche) viennent de l'historique de chaque section ; pour la dernière ligne, 24.15.0 figure dans les sources de la documentation (branche `main` de nodejs/node), la page publiée ne citant que 25.4.0.

Les conditions que Node implémente sont `node-addons`, `node`, `import`, `require`, `module-sync` et `default` ; `import` et `require` s'excluent toujours l'une l'autre. Les autres conditions, dont `types`, sont ignorées par Node ([« Conditional exports »](https://nodejs.org/api/packages.html#conditional-exports), [« Community Conditions Definitions »](https://nodejs.org/api/packages.html#community-conditions-definitions)).

Lignes de Node encore maintenues au 2026-11-24 : 22 (jusqu'au 2027-04-30), 24 (jusqu'au 2028-04-30) et 26 (LTS depuis le 2026-10-28). Node 20 est en fin de vie depuis le 2026-04-30 ([calendrier des versions](https://github.com/nodejs/Release/blob/main/schedule.json)).

### 4.2 Ce qui a été mesuré

Un paquet sonde reprend le `package.json` de la section 3.3, avec des fichiers factices écrits en ES5 (pour que seule la résolution soit en jeu) et un `main` qui pointe volontairement vers un autre fichier que `exports.require`, pour voir lequel est chargé **[vérifié]** :

| Node | `require('poker-hand-evaluator')` passe par | `import` passe par |
| --- | --- | --- |
| 10.24.1 | `main` | ESM indisponible |
| 12.7.0 | `main` | ESM indisponible sans drapeau |
| 12.16.3 | `main` | `exports` → `import`, seulement avec `--experimental-modules` |
| 12.17.0, 12.22.12, 14.21.3, 16.20.2, 18.20.8, 20.18.3, 20.19.0, 22.11.0, 22.23.4, 24.14.1, 26.8.2 | `exports` → `require` | `exports` → `import` |

Conséquence pratique : tant que `main` et `exports["."].require.default` désignent le même fichier CJS, `require()` renvoie la classe sur toutes ces versions, que Node comprenne `exports` ou non.

### 4.3 Ce que change `require(esm)`

Depuis Node 20.19.0 et 22.12.0, `require()` peut charger un module ES synchrone et renvoie son objet d'espace de noms. Un module ES peut choisir la valeur renvoyée en exportant le nom `'module.exports'` ; les exports nommés sont alors perdus pour les consommateurs CJS, sauf à les attacher à cette valeur ([« Loading ECMAScript modules using require() »](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)). Le guide de Node sur la migration en fait le moyen de conserver un ancien `module.exports = classe` ([Migrating exports in CommonJS](https://github.com/nodejs/package-examples/blob/main/guide/05-cjs-esm-migration/migrating-exports/README.md)).

Pour un double paquet, cela ne change rien : la condition `require` continue de mener au fichier CJS. Cela ouvre en revanche la forme D (ESM seul), examinée en 5.2.

Node documente aussi la condition `module-sync`, reconnue par les versions qui savent faire `require(esm)` : elle s'applique à `import` comme à `require` et permet de servir le fichier ESM aux Node récents tout en gardant un repli CJS sous `default` pour les autres ([« Conditional exports »](https://nodejs.org/api/packages.html#conditional-exports), [Shipping ESM for CommonJS consumers](https://github.com/nodejs/package-examples/blob/main/guide/04-cjs-esm-interop/shipping-esm-for-cjs/README.md)). Cette piste n'a pas été essayée ici, et le comportement de TypeScript face à cette condition n'a pas été vérifié.

## 5. Variantes examinées

### 5.1 Un seul code CJS et une façade ESM (sans double chargement)

C'est l'« Approach #1: Use an ES module wrapper » de l'ancienne documentation de Node, conservée dans son guide : le paquet est en CommonJS et un petit fichier ESM réexporte ses membres, de sorte que `import` et `require` partagent la même instance ([chapitre « dual packages »](https://github.com/nodejs/package-examples/blob/main/guide/07-dual-packages/README.md)). Le guide précise que ce chapitre est daté et ne doit pas servir de modèle aux paquets neufs ; le mécanisme, lui, reste valable.

Essai **[vérifié]** : `index.cjs` et `index.d.cts` produits par tsdown comme en section 3, plus deux fichiers statiques.

```js
// dist/index.mjs
import PokerHand from './index.cjs';

export const HandRank = PokerHand.HandRank;
export const CompareResult = PokerHand.CompareResult;
export { PokerHand };
export default PokerHand;
```

```ts
// dist/index.d.mts
export { default, PokerHand, HandRank, CompareResult } from './index.cjs';
export type { Suit, Rank, Card } from './index.cjs';
```

Résultats : attw « No problems found », publint sans erreur ni avertissement, banc de consommateurs au vert, et surtout la classe obtenue par `require()` est la même que celle obtenue par `import`. `compareWith` fonctionne entre les deux, et TypeScript accepte le mélange.

Coût : deux fichiers écrits à la main dont la liste d'exports doit suivre le code, et des consommateurs ESM qui reçoivent du CommonJS (pas de tree-shaking, pas d'usage direct dans un navigateur, où le fichier UMD prend le relais).

### 5.2 ESM seul avec `export { PokerHand as 'module.exports' }`

Essai **[vérifié]** sur un paquet sans fichier CJS :

| Node | `require('poker-hand-evaluator')` |
| --- | --- |
| 20.19.0, 22.23.4, 24.14.1, 26.8.2 | renvoie la classe, et c'est la même que celle de `import` |
| 12.7.0 à 20.18.3, et 22.11.0 | `ERR_REQUIRE_ESM` |
| 10.24.1 | `SyntaxError` |

La documentation de Node ne cite que 23.0.0 et 22.12.0 pour le nom `'module.exports'` ; la mesure montre qu'il est aussi pris en compte par 20.19.0. Par ailleurs, la syntaxe `export { x as 'chaîne' }` est elle-même une erreur de syntaxe sur Node 12 et 14, même pour `import`.

Côté types : TypeScript modélise `require(esm)` avec `--module nodenext` depuis la 5.8 ([notes de version 5.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html#support-for-require-of-ecmascript-modules-in---module-nodenext)), et le nom `"module.exports"` avec `node20` / `nodenext` depuis la 5.9 ([PR 61805](https://github.com/microsoft/TypeScript/pull/61805), [notes de version 5.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html#support-for---module-node20)). Mesuré avec TS 5.9.3 :

- CJS en `module: nodenext` : correct, `require()` est typé comme la classe ;
- CJS en `module: node16` : `TS1479` et `TS1471`, le paquet est jugé non importable par `require` ;
- `node10`, et `import x = require()` en `bundler` : `require()` est typé comme un objet d'espace de noms alors que Node renvoie la classe ;
- attw : avertissement « ESM (dynamic import only) » sur la ligne `node16 (from CJS)` ([CJSResolvesToESM](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/CJSResolvesToESM.md)).

Cette forme est la direction que poussent le guide de Node ([Shipping ESM for CommonJS consumers](https://github.com/nodejs/package-examples/blob/main/guide/04-cjs-esm-interop/shipping-esm-for-cjs/README.md)) et tsdown ([Output Format](https://tsdown.dev/options/output-format)), et elle supprime le double chargement. Elle ne satisfait pas la demande du ticket aujourd'hui : elle casse `require()` avant Node 20.19 / 22.12 et ne donne pas des types corrects dans tous les modes de résolution. Elle redeviendra candidate si le plancher de Node retenu est 22.12 et si l'on accepte l'avertissement d'attw.

### 5.3 Vite, configuration qui passe

Pour mémoire, la configuration CJS validée en 2.4 (le build ESM est son symétrique, avec `src/index.ts`, `formats: ['es']` et `moduleFormat: 'esm'`) :

```ts
// vite.cjs.config.ts
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      outDirs: { dir: 'dist', moduleFormat: 'cjs' },
      exclude: ['src/index.ts'],
    }),
  ],
  build: {
    emptyOutDir: false,
    lib: {
      entry: { index: 'src/index.cts' }, // contient : export = PokerHand;
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
  },
});
```

avec `"module": "preserve"` et `"include": ["src/**/*.ts", "src/**/*.cts"]` dans le `tsconfig.json`.

## 6. Recommandation

**Livrer la forme B avec tsdown**, selon la section 3 :

- CJS : `module.exports = PokerHand`, exports nommés en propriétés statiques ;
- ESM : exports nommés et export par défaut ;
- types : `index.d.cts` en `export =` avec namespace fusionné, généré à partir d'un `declare namespace` posé à côté de la classe ; `index.d.mts` généré ;
- `exports` imbriqué avec `types` en premier, `main` et `types` racine pointant vers la paire CJS ;
- UMD produit par la même configuration ;
- `publint --strict` et `attw --pack .` en CI, plus un test qui exécute littéralement `const PokerHand = require('poker-hand-evaluator'); new PokerHand('KS KH QC AH AD')` sur le paquet construit.

Pourquoi tsdown plutôt que les deux autres : c'est le seul des trois qui génère à la fois le JavaScript et les deux déclarations dans la forme voulue, sans fichier écrit à la main, et qui émet aussi l'UMD. tsup est déclaré non maintenu par son auteur et abîme la déclaration CJS. Vite y parvient au prix de deux builds et d'un plugin de types déconseillé, et sa documentation renvoie vers tsdown pour une bibliothèque qui ne vise pas d'abord le navigateur.

**Le compromis qui reste à accepter : deux copies de la classe.** Un vrai double paquet fait coexister une classe `PokerHand` ESM et une classe `PokerHand` CJS dès qu'un programme atteint le paquet par `import` d'un côté et par `require` de l'autre (par exemple une application ESM et une de ses dépendances en CJS). Node le décrit ainsi : si l'export principal est un constructeur, un `instanceof` entre instances des deux versions renvoie `false` ([« Dual package hazard »](https://github.com/nodejs/package-examples/blob/main/guide/07-dual-packages/README.md)). Ici, la conséquence est concrète **[vérifié]** : `compareWith` teste `hand instanceof PokerHand` et lève « Incorrect hand to compare with » quand la main vient de l'autre copie. Le paquet pèse aussi deux fois les tables de recherche (environ 155 ko par format, non minifié).

Si ce risque n'est pas acceptable, deux sorties existent, par ordre de coût :

1. remplacer le `instanceof` de `compareWith` par un test qui ne dépend pas de l'identité de la classe. C'est le seul `instanceof` du code source (`src/poker-hand.ts`), le reste étant des tables constantes et des fonctions pures. Les types des deux formats resteront toutefois distincts pour TypeScript (section 1.4) ;
2. adopter la variante 5.1 (un seul code CJS, façade ESM), vérifiée, au prix de deux petits fichiers à maintenir à la main.

Deux réserves secondaires sur l'outil : tsdown est en 0.x et exige Node ≥ 22.18 pour builder (cela ne concerne que le poste de développement et la CI, pas les utilisateurs du paquet), et sa documentation classe ses fonctions CJS en maintenance seule. Le repli, si `cjsDefault` venait à disparaître, est le `.d.cts` écrit à la main de la section 1.5 : le reste de la configuration ne change pas.

## Annexe : reproduire les contrôles

Sur le paquet construit, depuis la racine du dépôt :

```sh
npx tsdown
npx publint --strict
npx attw --pack .
node -e "const PokerHand = require('./dist/index.cjs'); console.log(new PokerHand('KS KH QC AH AD').getRank())"
```

`attw` est la commande du paquet `@arethetypeswrong/cli`. Pour un contrôle intégré au build, tsdown accepte `publint: true` et `attw: { profile: 'strict', level: 'error' }` (il faut alors installer `publint` et `@arethetypeswrong/core`).
