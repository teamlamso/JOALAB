# Architecture

## Vue d'ensemble

JOALABFT_Backend est une application web Jakarta EE 11 packagée en WAR, suivant une architecture **MVC stricte**.

## Stack technique

| Composant | Technologie | Version |
|---|---|---|
| Plateforme | Jakarta EE | 11.0.0 |
| Langage | Java | 21 |
| Build | Apache Maven | 3.9.6 |
| Persistence | JPA / Hibernate ORM | 7.0.4.Final |
| ORM secondaire | EclipseLink | 4.0.7 |
| Injection de dépendances | CDI | Jakarta EE 11 |
| Interface web | JSF (Jakarta Faces) | 4.1.3 |
| Tests | JUnit Jupiter | 5.13.2 |

## Structure MVC

```
src/main/java/com/amael/joalabft_backend/
├── model/          # Entités JPA, DTOs, logique métier, accès aux données
├── controller/     # Servlets / Beans CDI gérant les requêtes et la navigation
└── (view)          # Pages JSF/JSP dans src/main/webapp/

src/main/webapp/
├── WEB-INF/
│   └── web.xml     # Descripteur de déploiement
├── *.xhtml / *.jsp # Vues (couche View du MVC)
└── index.jsp       # Page d'accueil

src/main/resources/
└── META-INF/
    ├── persistence.xml  # Configuration JPA (unité de persistance)
    └── beans.xml        # Activation CDI
```

## Couches MVC

### Model
- Entités JPA annotées `@Entity`, mappées sur les tables de la base de données.
- DTOs pour le transfert de données entre couches.
- EJBs ou classes de service pour la logique métier.
- DAOs ou repositories pour l'accès aux données via `EntityManager`.

### View
- Pages **JSF** (`.xhtml`) ou **JSP** (`.jsp`) dans `src/main/webapp/`.
- Aucune logique métier dans les vues — uniquement du binding EL (`#{bean.propriete}`).

### Controller
- **Managed Beans CDI** (`@Named`, `@RequestScoped` / `@SessionScoped`) pour JSF.
- **Servlets** (`@WebServlet`) pour les endpoints REST ou HTTP classiques.
- Les controllers délèguent la logique au Model et choisissent la vue à afficher.

## Flux de données

```
Requête HTTP
    ↓
Controller (Servlet / Managed Bean)
    ↓
Model (Service → DAO → EntityManager → BDD)
    ↑
Controller
    ↓
View (JSF/JSP → réponse HTML)
```

## Points d'extension

- **Persistence** : ajouter les entités dans `persistence.xml` et configurer la datasource sur le serveur d'application.
- **Sécurité** : configurer les contraintes dans `web.xml` ou via Jakarta Security.
- **REST** : ajouter Jakarta REST (JAX-RS) si des endpoints JSON sont nécessaires.
