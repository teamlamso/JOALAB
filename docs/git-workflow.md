# Git Workflow

## Branches principales

| Branche | Rôle |
|---|---|
| `main` | Code stable, prêt pour la production |
| `dev` | Branche d'intégration principale — tout le travail converge ici |

## Convention de nommage

| Type | Préfixe | Exemple |
|---|---|---|
| Nouvelle fonctionnalité | `feat/` | `feat/authentification-utilisateur` |
| Correctif de bug | `fix/` | `fix/erreur-connexion-db` |
| Documentation | `docs/` | `docs/mise-a-jour-architecture` |
| Refactoring | `refactor/` | `refactor/couche-service` |

## Workflow standard

```bash
# 1. Se mettre à jour depuis dev
git checkout dev
git pull origin dev

# 2. Créer sa branche de travail
git checkout -b feat/ma-fonctionnalite

# 3. Travailler, commiter régulièrement
git add <fichiers>
git commit -m "feat: description claire et concise"

# 4. Pousser la branche
git push origin feat/ma-fonctionnalite

# 5. Ouvrir une Pull Request vers dev
# 6. Après review et merge, supprimer la branche
git branch -d feat/ma-fonctionnalite
```

## Convention des messages de commit

Format : `type: description courte`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation uniquement |
| `refactor` | Refactoring sans changement de comportement |
| `test` | Ajout ou modification de tests |
| `chore` | Tâches de maintenance (dépendances, config) |

**Exemples :**
```
feat: ajout de l'authentification JWT
fix: correction de la requête JPQL sur UserDAO
docs: mise à jour du schéma de base de données
test: ajout des tests unitaires pour UserService
```

## Règles

- Ne jamais pousser directement sur `main` ou `dev`.
- Toujours travailler sur une branche dédiée.
- Un commit = une modification logique cohérente.
- Documenter les changements importants dans `docs/` avant de merger.
