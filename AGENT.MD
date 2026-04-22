# AGENT.md

## Contexte général
Tu m’accompagnes dans le développement d’un projet Java sous **IntelliJ IDEA**, basé sur **Jakarta EE 11**.

Avant toute implémentation, tu dois respecter les conventions suivantes de manière stricte.

---

## Règles Git
Le projet doit être géré avec **Git**.

### Convention de branches
- La branche principale de développement doit être : `dev`
- Pour chaque nouvelle fonctionnalité, créer une branche :
    - `feat/nom-de-la-feature`
- Pour chaque correctif, créer une branche :
    - `fix/nom-du-correctif`

### Bonnes pratiques Git
- Toujours travailler sur une branche dédiée.
- Faire des commits clairs, courts et explicites.
- Documenter les changements importants dans les commits quand c’est pertinent.
- Respecter une logique de travail propre et traçable.

---

## Stack technique
- IDE : **IntelliJ IDEA**
- Framework / plateforme : **Jakarta EE 11**
- Architecture obligatoire : **MVC (Model - View - Controller)**

---

## Contraintes d’architecture
Le projet doit impérativement respecter une architecture **MVC** :

### Model
- Contient les entités métier, DTO, logique métier simple, et accès aux données si applicable.

### View
- Contient les vues / pages / templates / composants d’affichage.

### Controller
- Contient les contrôleurs qui gèrent les requêtes, la navigation et la liaison entre la vue et le modèle.

### Règles générales
- Séparer clairement les responsabilités.
- Éviter le code dupliqué.
- Garder un code lisible, modulaire et maintenable.
- Respecter les bonnes pratiques Jakarta EE 11.

---

## Documentation
Le code doit être documenté proprement.

### Documentation du code
- Ajouter des commentaires utiles quand nécessaire.
- Documenter les classes, méthodes et composants importants.
- Éviter les commentaires inutiles ou évidents.

### Documentation projet
- Créer un dossier `docs/`
- Ajouter une documentation par sujet dans des fichiers clairs et nommés explicitement.

### Exemples de documentation attendue
- `docs/architecture.md`
- `docs/setup.md`
- `docs/git-workflow.md`
- `docs/database.md`
- `docs/features/nom-feature.md`

---

## Qualité attendue
- Produire un code propre, structuré et professionnel.
- Proposer une organisation de projet cohérente dès le départ.
- Avant d’implémenter une fonctionnalité, réfléchir à son intégration dans l’architecture MVC.
- Toujours prendre en compte la maintenabilité et l’évolutivité du projet.

---

## Workflow attendu pour chaque tâche
1. Identifier la fonctionnalité ou le correctif.
2. Créer la branche Git adaptée :
    - `feat/...` pour une fonctionnalité
    - `fix/...` pour un correctif
3. Implémenter en respectant l’architecture MVC.
4. Documenter le code et la fonctionnalité dans `docs/`.
5. Faire des commits propres et explicites.
6. Préparer un travail propre à relire et intégrer dans `dev`.

---

## Base de connaissances / base de données
Si une base de connaissances, une base de données, un schéma SQL ou une documentation métier est fournie, tu dois :
- l’intégrer proprement au projet,
- la documenter dans `docs/`,
- expliquer son rôle,
- décrire son intégration technique,
- détailler les choix de conception associés.

Si des informations sont manquantes, laisse une section clairement identifiée à compléter.

---

## Consigne finale
À chaque étape, tu dois privilégier :
- la clarté,
- la structure,
- la documentation,
- le respect de Git,
- et la conformité à **Jakarta EE 11** avec une architecture **MVC** stricte.