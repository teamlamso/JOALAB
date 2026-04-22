# Setup

## Prerequis

| Outil | Version minimale |
|---|---|
| JDK | 21 |
| Maven | 3.9+ (ou utiliser `./mvnw`) |
| Payara Server | 7.2025.1 |
| Base de donnees | H2 (embarquee, par defaut) |
| IDE (recommande) | IntelliJ IDEA |
| Node.js | 18+ (pour le frontend) |

## Installation du backend

### 1. Cloner le depot

```bash
git clone git@github.com:teamlamso/JOALAB.git
cd JOALAB
git checkout dev
```

### 2. Compiler et packager

```bash
./mvnw clean package
```

Le WAR est genere dans `target/JOALABFT_Backend-1.0-SNAPSHOT.war`.

### 3. Configurer la datasource Payara

Via la console d'administration Payara (`http://localhost:4848`) ou en ligne de commande :

```bash
asadmin create-jdbc-connection-pool \
  --datasourceclassname org.h2.jdbcx.JdbcDataSource \
  --restype javax.sql.DataSource \
  --property url="jdbc\:h2\:~/labftdb;AUTO_SERVER\=TRUE":user=sa:password= \
  LABFTDB_Pool

asadmin create-jdbc-resource --connectionpoolid LABFTDB_Pool jdbc/LABFTDB
```

### 4. Deployer le WAR

Deposer le WAR dans le repertoire de deploiement de Payara ou utiliser la console d'administration. L'application est accessible a :

```
http://localhost:8080/JOALABFT_Backend-1.0-SNAPSHOT/api/
```

### 5. Donnees de test

Au demarrage, la classe `TestInsert` insere automatiquement des donnees de test :

| Identifiant | Mot de passe | Role |
|---|---|---|
| `aduchat` | `password` | Caissier |
| `mcurie` | `password` | Responsable caisse |
| `jbond` | `password` | MCD |

## Installation du frontend

Le frontend React se trouve dans un projet separe (`joalabft_frontend/`).

```bash
cd joalabft_frontend
npm install
npm run dev
```

Le serveur de developpement Vite demarre sur `http://localhost:5173` avec un proxy automatique vers le backend Payara.

## Commandes courantes

### Backend
```bash
./mvnw clean compile          # Compilation seule
./mvnw clean package          # Build complet -> WAR
./mvnw test                   # Lancer tous les tests
./mvnw test -Dtest=MaClasse   # Lancer une classe de test precise
./mvnw clean                  # Nettoyer le repertoire target/
```

### Frontend
```bash
npm run dev                   # Serveur de developpement
npm run build                 # Build de production
npm run preview               # Previsualiser le build
```

## Configuration IntelliJ IDEA

1. Ouvrir le projet (`File > Open` -> selectionner le dossier racine)
2. IntelliJ detecte automatiquement le `pom.xml` Maven
3. Configurer un **Payara Server** dans `Run > Edit Configurations`
4. Ajouter un artefact de deploiement pointant vers le WAR genere
5. S'assurer que le JDK 21 est selectionne dans `File > Project Structure`
