# Base de données

## État actuel

La configuration JPA est initialisée mais **non connectée à une base de données**. Le fichier `persistence.xml` contient une unité de persistance vide (`default`) à compléter.

## Entités métier prévues

> **A compléter** selon les spécifications détaillées. Les entités ci-dessous sont une proposition initiale basée sur le cahier des charges.

| Entité | Description |
|---|---|
| `Client` | Données d'identité du joueur (nom, prénom, adresse, pièce d'identité) |
| `FicheLABFT` | Fiche de déclaration LAB-FT liée à un client et une opération |
| `Utilisateur` | Compte applicatif (caissier, responsable, MCD) |
| `Role` | Rôle/profil d'un utilisateur |

### Règle métier clé
Les fiches dont le montant est **≥ 2000 €** doivent être tracées dans les registres officiels anti-blanchiment. Cette logique doit être portée par la couche `service/`, pas par la base de données.

## Configuration JPA (`persistence.xml`)

Fichier : `src/main/resources/META-INF/persistence.xml`

```xml
<persistence-unit name="default" transaction-type="JTA">
    <provider>org.hibernate.jpa.HibernatePersistenceProvider</provider>
    <jta-data-source>java:/jdbc/joalabftDS</jta-data-source>

    <!-- Entités -->
    <class>com.amael.joalabft_backend.model.entity.Client</class>
    <class>com.amael.joalabft_backend.model.entity.FicheLABFT</class>
    <class>com.amael.joalabft_backend.model.entity.Utilisateur</class>
    <class>com.amael.joalabft_backend.model.entity.Role</class>

    <properties>
        <!-- Développement : recréation automatique du schéma -->
        <property name="hibernate.hbm2ddl.auto" value="update"/>
        <property name="hibernate.show_sql" value="true"/>
        <property name="hibernate.format_sql" value="true"/>
    </properties>
</persistence-unit>
```

> **A compléter** : remplacer `java:/jdbc/joalabftDS` par le JNDI réel configuré sur le serveur d'application. En production, passer `hbm2ddl.auto` à `validate`.

## Configurer la datasource (WildFly)

1. Ajouter le driver JDBC dans `standalone.xml` (ou via la console d'administration).
2. Déclarer la datasource avec le nom JNDI correspondant.
3. Adapter `persistence.xml` avec ce nom JNDI.

**Exemple WildFly (PostgreSQL) :**
```xml
<datasource jndi-name="java:/jdbc/joalabftDS" pool-name="JoalabftDS">
    <connection-url>jdbc:postgresql://localhost:5432/joalabft</connection-url>
    <driver>postgresql</driver>
    <security>
        <user-name><!-- à définir --></user-name>
        <password><!-- à définir --></password>
    </security>
</datasource>
```

## Ajouter une entité

1. Créer la classe dans `src/main/java/com/amael/joalabft_backend/model/entity/`.
2. L'annoter avec `@Entity` et `@Table(name = "nom_table")`.
3. Déclarer la classe dans `persistence.xml`.
4. Documenter le schéma dans ce fichier.

## Schéma de base de données

> **A compléter** une fois les entités définies et validées.
