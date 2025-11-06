# Configuration GitHub - À faire maintenant

La migration Git Flow est terminée ! Voici les dernières étapes à effectuer sur GitHub.

## 1. Changer la branche par défaut

1. Allez sur https://github.com/jmjsdev/html-components/settings/branches
2. Dans "Default branch", changez de `master` à `main`
3. Cliquez sur "Update" et confirmez

## 2. Protéger les branches principales

### Protection de `main`

1. Allez sur https://github.com/jmjsdev/html-components/settings/branch_protection_rules/new
2. Branch name pattern: `main`
3. Cochez :
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1 minimum)
   - ✅ Require status checks to pass before merging
     - Cherchez et ajoutez : `test`, `lint`
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings
4. Cliquez sur "Create"

### Protection de `develop`

1. Allez sur https://github.com/jmjsdev/html-components/settings/branch_protection_rules/new
2. Branch name pattern: `develop`
3. Cochez :
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Cherchez et ajoutez : `test`, `lint`
4. Cliquez sur "Create"

## 3. Configurer le token npm pour la publication automatique

### Créer un token npm

1. Connectez-vous sur https://www.npmjs.com/
2. Cliquez sur votre avatar > "Access Tokens"
3. Cliquez sur "Generate New Token" > "Classic Token"
4. Type: **Automation**
5. Copiez le token (vous ne pourrez pas le revoir)

### Ajouter le token sur GitHub

1. Allez sur https://github.com/jmjsdev/html-components/settings/secrets/actions
2. Cliquez sur "New repository secret"
3. Name: `NPM_TOKEN`
4. Secret: collez votre token npm
5. Cliquez sur "Add secret"

## 4. Vérifier le workflow de publication

Le tag `v1.0.0` a été poussé, ce qui devrait déclencher le workflow de publication :

1. Allez sur https://github.com/jmjsdev/html-components/actions
2. Vous devriez voir "Publish to NPM" en cours d'exécution
3. **ATTENTION** : Il va échouer tant que vous n'avez pas configuré le `NPM_TOKEN` (étape 3)

Une fois le token configuré :
- Le workflow publiera automatiquement `html-components@1.0.0` sur npm
- Une release GitHub sera créée automatiquement

## 5. Nettoyer les anciennes branches (optionnel)

Une fois que tout fonctionne bien, vous pouvez supprimer les anciennes branches :

```bash
# Localement
git branch -d master refactor claude/refactor-npm-component-011CUM5w1PZoxq7fmAyYqs2e

# Sur GitHub
git push origin --delete cheerio-update
git push origin --delete refactor
git push origin --delete "claude/refactor-npm-component-011CUM5w1PZoxq7fmAyYqs2e"
git push origin --delete dependabot/npm_and_yarn/braces-3.0.3
# Les release branches peuvent être gardées pour référence
```

## 6. Résoudre l'alerte de sécurité

GitHub a détecté 1 vulnérabilité (low) :
- https://github.com/jmjsdev/html-components/security/dependabot/48

Vérifiez et résolvez cette alerte via Dependabot.

## Checklist finale

- [ ] Branche par défaut changée vers `main`
- [ ] Protection de `main` activée
- [ ] Protection de `develop` activée
- [ ] Token `NPM_TOKEN` configuré
- [ ] Workflow de publication vérifié et fonctionnel
- [ ] Package `html-components@1.0.0` publié sur npm
- [ ] Alerte de sécurité résolue
- [ ] Anciennes branches nettoyées

## Workflow de développement maintenant

### Nouvelle fonctionnalité

```bash
git checkout develop
git pull origin develop
git checkout -b feature/ma-feature
# ... travail ...
git push -u origin feature/ma-feature
# Créer une PR vers develop sur GitHub
```

### Release

```bash
git checkout develop
git pull origin develop
git checkout -b release/1.1.0
# Mettre à jour package.json version
npm version 1.1.0 --no-git-tag-version
git add package.json
git commit -m "chore: bump version to 1.1.0"
git push -u origin release/1.1.0
# Créer une PR vers main sur GitHub
# Une fois mergée dans main :
git checkout main
git pull origin main
git tag v1.1.0
git push origin v1.0.0
# GitHub Actions publie automatiquement sur npm
```

## Support

Consultez le `MIGRATION_GUIDE.md` pour plus de détails sur le workflow Git Flow.
