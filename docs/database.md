# Base de données

## État actuel

La configuration JPA est initialisée mais **non connectée à une base de données**. Le fichier `persistence.xml` contient une unité de persistance vide (`default`) à compléter.

## Configuration JPA (`persistence.xml`)

Fichier : `src/main/resources/META-INF/persistence.xml`

```xml
<persistence-unit name="default" transaction-type="JTA">
    <jta-data-source>java:/jdbc/joalabftDS</jta-data-source>

    <!-- Entités à déclarer ici ou via scanning automatique -->

    <properties>
        <!-- Hibernate : création automatique du schéma en dev -->
        <property name="hibernate.hbm2ddl.auto" value="update"/>
        <property name="hibernate.show_sql" value="true"/>
        <property name="hibernate.format_sql" value="true"/>
    </properties>
</persistence-unit>
```

> **A compléter** : remplacer `java:/jdbc/joalabftDS` par le JNDI réel configuré sur le serveur d'application.

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

## Fournisseurs ORM disponibles

Deux implémentations JPA sont présentes dans les dépendances Maven :

| Fournisseur | Artifact | Usage |
|---|---|---|
| **Hibernate ORM** | `org.hibernate.orm:hibernate-core:7.0.4.Final` | Recommandé — fournisseur principal |
| **EclipseLink** | `org.eclipse.persistence:org.eclipse.persistence.jpa:4.0.7` | Alternatif |

Pour forcer Hibernate comme provider, ajouter dans `persistence.xml` :
```xml
<provider>org.hibernate.jpa.HibernatePersistenceProvider</provider>
```

## Ajout d'une entité

1. Créer la classe dans `src/main/java/com/amael/joalabft_backend/model/`.
2. L'annoter avec `@Entity` et `@Table(name = "nom_table")`.
3. Déclarer la classe dans `persistence.xml` (ou laisser le scanning automatique si activé).
4. Documenter le schéma dans ce fichier sous une section dédiée.

## Schéma de base de données

> **A compléter** au fur et à mesure de la définition des entités métier.
