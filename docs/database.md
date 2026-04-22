# Base de donnees

## Configuration JPA

L'ORM utilise **EclipseLink** (fourni nativement par Payara). La configuration se trouve dans `src/main/resources/META-INF/persistence.xml`.

```xml
<persistence-unit name="LABFTPU" transaction-type="JTA">
    <jta-data-source>jdbc/LABFTDB</jta-data-source>
    <exclude-unlisted-classes>false</exclude-unlisted-classes>
    <properties>
        <property name="eclipselink.ddl-generation" value="drop-and-create-tables"/>
        <property name="eclipselink.ddl-generation.output-mode" value="database"/>
    </properties>
</persistence-unit>
```

> **Attention** : en mode `drop-and-create-tables`, les tables sont recreees a chaque redemarrage de Payara. La classe `TestInsert` se charge de reinjecter les donnees de test. En production, passer a `none` et gerer les migrations manuellement.

## Datasource Payara

La datasource `jdbc/LABFTDB` doit etre configuree dans Payara via la console d'administration ou `asadmin` :

```bash
asadmin create-jdbc-connection-pool \
  --datasourceclassname org.h2.jdbcx.JdbcDataSource \
  --restype javax.sql.DataSource \
  --property url="jdbc\:h2\:~/labftdb;AUTO_SERVER\=TRUE":user=sa:password= \
  LABFTDB_Pool

asadmin create-jdbc-resource --connectionpoolid LABFTDB_Pool jdbc/LABFTDB
```

## Entites JPA

### `Utilisateur` (table `utilisateurs`)

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | BIGINT | PK, auto-increment | |
| `identifiant` | VARCHAR(50) | NOT NULL, UNIQUE | Login de l'utilisateur |
| `mot_de_passe` | VARCHAR(64) | NOT NULL | Hash SHA-256 du mot de passe |
| `nom` | VARCHAR(50) | NOT NULL | |
| `prenom` | VARCHAR(50) | NOT NULL | |
| `role` | VARCHAR(20) | NOT NULL | Enum : `CAISSIER`, `RESPONSABLE_CAISSE`, `MCD` |

### `Client` (table `clients`)

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | BIGINT | PK, auto-increment | |
| `identifie` | BOOLEAN | NOT NULL | Client identifie ou anonyme |
| `nom` | VARCHAR(100) | | Nom (client identifie) |
| `prenom` | VARCHAR(100) | | Prenom (client identifie) |
| `date_naissance` | DATE | | |
| `rue` | VARCHAR(200) | | Adresse |
| `complement` | VARCHAR(100) | | Complement d'adresse |
| `code_postal` | VARCHAR(10) | | |
| `ville` | VARCHAR(100) | | |
| `pays` | VARCHAR(100) | | |
| `type_piece` | VARCHAR(50) | | CNI, Passeport, etc. |
| `date_delivrance` | DATE | | Date de delivrance de la piece |
| `prefecture_delivrance` | VARCHAR(100) | | Prefecture emettrice |
| `description_physique` | VARCHAR(500) | | Description (client non-identifie) |
| `date_creation` | TIMESTAMP | NOT NULL | Auto-rempli via `@PrePersist` |

### `FicheLABFT` (table `fiches_labft`)

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | BIGINT | PK, auto-increment | |
| `client_id` | BIGINT | FK NOT NULL | Reference vers `clients.id` |
| `cree_par_id` | BIGINT | FK NOT NULL | Utilisateur createur |
| `date_creation` | TIMESTAMP | NOT NULL | Auto-rempli via `@PrePersist` |
| `modifie_par_id` | BIGINT | FK | Dernier modificateur |
| `date_modification` | TIMESTAMP | | Date derniere modification |

Relations :
- `lignes` : OneToMany vers `LigneTransaction` (cascade ALL, orphanRemoval)

### `LigneTransaction` (table `lignes_transaction`)

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | BIGINT | PK, auto-increment | |
| `fiche_id` | BIGINT | FK NOT NULL | Reference vers `fiches_labft.id` |
| `type_jeu` | VARCHAR(10) | NOT NULL | Enum : `MAS`, `JTE`, `JT` |
| `type_paiement` | VARCHAR(10) | NOT NULL | Enum : `ESPECE`, `CHEQUE`, `CB` |
| `type_change` | VARCHAR(10) | | Enum : `JETON`, `PLAQUE`, `TICKET` |
| `numero_socle` | INTEGER | | Numero de socle de la machine |
| `montant_rgm` | DECIMAL(12,2) | | Montant Online / RGM |
| `change_entrant` | DECIMAL(12,2) | | Montant du change entrant |
| `change_sortant` | DECIMAL(12,2) | | Montant du change sortant |
| `observations` | VARCHAR(500) | | Notes libres |

## Enumerations

- **RoleUtilisateur** : `CAISSIER`, `RESPONSABLE_CAISSE`, `MCD`
- **TypeJeu** : `MAS` (Machine A Sous), `JTE` (Jeu de Table Electronique), `JT` (Jeu de Table)
- **TypePaiement** : `ESPECE`, `CHEQUE`, `CB`
- **TypeChange** : `JETON`, `PLAQUE`, `TICKET`

## Ajouter une entite

1. Creer la classe dans `model/entity/` avec `@Entity` et `@Table`
2. EclipseLink detecte automatiquement les entites (`exclude-unlisted-classes=false`)
3. Creer le repository correspondant dans `model/repository/` (`@Stateless` EJB)
4. Documenter le schema dans ce fichier
