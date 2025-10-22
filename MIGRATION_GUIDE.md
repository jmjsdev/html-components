# Guide de Migration Git Flow

## Vue d'ensemble

Ce guide décrit la migration de la structure actuelle (`master`) vers une stratégie Git Flow moderne avec `main` et `develop`.

## Structure des branches

```
main (production stable)
  └── develop (développement actif)
       ├── feature/* (nouvelles fonctionnalités)
       ├── release/* (préparation des releases)
       └── hotfix/* (corrections urgentes)
```

## Étapes de migration

### 1. Créer la branche `main`

```bash
# Créer main à partir de master
git checkout master
git pull origin master
git checkout -b main
git push -u origin main
```

### 2. Créer la branche `develop`

```bash
# Créer develop à partir de main
git checkout main
git checkout -b develop
git push -u origin develop
```

### 3. Configurer la branche par défaut sur GitHub

1. Allez sur GitHub : `Settings` > `Branches`
2. Changez la branche par défaut de `master` à `main`
3. Cliquez sur "Update"

### 4. Protéger les branches principales

Sur GitHub, configurez les protections pour `main` et `develop` :

1. `Settings` > `Branches` > `Add branch protection rule`
2. Pour `main` :
   - Pattern: `main`
   - Cochez "Require a pull request before merging"
   - Cochez "Require status checks to pass before merging"
   - Sélectionnez les checks CI obligatoires
3. Pour `develop` :
   - Pattern: `develop`
   - Cochez "Require a pull request before merging"
   - Cochez "Require status checks to pass before merging"

### 5. Nettoyer les anciennes branches (optionnel)

```bash
# Une fois que tout est migré et testé
git branch -d master  # Localement
git push origin --delete master  # Sur GitHub
```

## Workflow de développement

### Nouvelle fonctionnalité

```bash
# Créer une branche feature
git checkout develop
git pull origin develop
git checkout -b feature/ma-nouvelle-feature

# Travailler, commiter
git add .
git commit -m "feat: ma nouvelle fonctionnalité"

# Pousser et créer une PR vers develop
git push -u origin feature/ma-nouvelle-feature
```

### Préparer une release

```bash
# Créer une branche release
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# Mettre à jour la version dans package.json
npm version 1.0.0 --no-git-tag-version

# Commit
git add package.json
git commit -m "chore: bump version to 1.0.0"

# Pousser et créer une PR vers main
git push -u origin release/1.0.0
```

### Publier sur npm

Une fois la PR release mergée dans `main` :

```bash
# Sur main
git checkout main
git pull origin main

# Créer un tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions va automatiquement publier sur npm
```

### Hotfix urgent

```bash
# Créer une branche hotfix depuis main
git checkout main
git pull origin main
git checkout -b hotfix/bug-critique

# Corriger, commiter
git add .
git commit -m "fix: correction bug critique"

# Merger dans main ET develop
git checkout main
git merge hotfix/bug-critique
git push origin main

git checkout develop
git merge hotfix/bug-critique
git push origin develop

# Supprimer la branche hotfix
git branch -d hotfix/bug-critique
```

## Configuration npm pour GitHub Actions

### Créer un token npm

1. Connectez-vous sur [npmjs.com](https://www.npmjs.com/)
2. Allez dans `Access Tokens` > `Generate New Token`
3. Sélectionnez "Automation" (pour CI/CD)
4. Copiez le token

### Ajouter le token sur GitHub

1. Sur GitHub : `Settings` > `Secrets and variables` > `Actions`
2. Cliquez sur "New repository secret"
3. Nom : `NPM_TOKEN`
4. Valeur : collez votre token npm
5. Cliquez sur "Add secret"

## Workflows GitHub Actions

### CI (`.github/workflows/ci.yml`)

- Déclenché sur : push et PR vers `main`, `develop`, et branches `feature/*`, `release/*`, `hotfix/*`
- Actions :
  - Tests sur Node.js 18, 20, 22
  - Génération du rapport de couverture
  - Vérification de la qualité du code

### Publish (`.github/workflows/publish.yml`)

- Déclenché sur : tags `v*` (ex: `v1.0.0`)
- Actions :
  - Lance les tests
  - Vérifie que la version du package.json correspond au tag
  - Publie sur npm avec provenance
  - Crée une release GitHub

## Conventions de commit

Utilisez des conventions de commit claires (conventionnel commits) :

- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `docs:` documentation
- `style:` formatage, style
- `refactor:` refactoring
- `test:` ajout/modification de tests
- `chore:` tâches diverses (build, config, etc.)

## Checklist de migration

- [ ] Créer la branche `main`
- [ ] Créer la branche `develop`
- [ ] Changer la branche par défaut sur GitHub vers `main`
- [ ] Configurer les protections de branches
- [ ] Ajouter le token `NPM_TOKEN` dans les secrets GitHub
- [ ] Tester le workflow CI avec une PR
- [ ] Tester la publication npm avec un tag de test
- [ ] Nettoyer les anciennes branches
- [ ] Informer l'équipe du nouveau workflow

## Ressources

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements)
