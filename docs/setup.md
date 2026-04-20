# Setup

## Prérequis

| Outil | Version minimale |
|---|---|
| JDK | 21 |
| Maven | 3.9+ (ou utiliser `./mvnw`) |
| Serveur d'application | Compatible Jakarta EE 11 (ex: WildFly 35+, GlassFish 8, Payara 6) |
| Base de données | A définir (PostgreSQL recommandé) |
| IDE (recommandé) | IntelliJ IDEA |

## Installation

### 1. Cloner le dépôt

```bash
git clone git@github.com:teamlamso/JOALAB.git
cd JOALAB
git checkout dev
```

### 2. Compiler et packager

```bash
./mvnw clean package
```

Le WAR est généré dans `target/JOALABFT_Backend-1.0-SNAPSHOT.war`.

### 3. Configurer la base de données

Voir [database.md](database.md) pour la configuration de la datasource et du schéma.

### 4. Déployer sur le serveur d'application

Déposer le WAR dans le répertoire de déploiement du serveur (ex: `standalone/deployments/` pour WildFly).

## Commandes courantes

```bash
./mvnw clean compile          # Compilation seule
./mvnw clean package          # Build complet → WAR
./mvnw test                   # Lancer tous les tests
./mvnw test -Dtest=MaClasse   # Lancer une classe de test précise
./mvnw test -Dtest=MaClasse#maMethode  # Lancer un test précis
./mvnw clean                  # Nettoyer le répertoire target/
```

## Configuration IntelliJ IDEA

1. Ouvrir le projet (`File > Open` → sélectionner le dossier racine).
2. IntelliJ détecte automatiquement le `pom.xml` Maven.
3. Configurer un **Application Server** (WildFly / GlassFish) dans `Run > Edit Configurations`.
4. Ajouter un artefact de déploiement pointant vers le WAR généré.
5. S'assurer que le JDK 21 est sélectionné dans `File > Project Structure`.
