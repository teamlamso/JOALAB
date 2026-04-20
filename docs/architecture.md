# Architecture

## Vue d'ensemble

JOALABFT_Backend est l'application backend d'un outil de gestion des fiches **LAB-FT** (Lutte Anti-Blanchiment et contre le Financement du Terrorisme) pour le casino JOA de Saint Laurent en Grandvaux.

L'application est une WAR **Jakarta EE 11** suivant une architecture **MVC stricte**.

## Domaine métier

Une **fiche LAB-FT** est un document de conformité créé lorsqu'un client effectue une opération de change ou de jeu dépassant un certain seuil. Les fiches dépassant **2000 €** doivent être inscrites dans des registres officiels anti-blanchiment.

### Profils utilisateurs

| Profil | Rôle |
|---|---|
| **Caissier** | Crée et consulte les fiches LAB-FT |
| **Responsable caisse** | Valide, supervise et recherche les fiches |
| **MCD** (Manager Conformité et Déontologie) | Accès complet, gestion des registres officiels |

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
├── model/
│   ├── entity/         # Entités JPA (FicheLABFT, Client, Utilisateur…)
│   ├── dto/            # DTOs pour le transfert de données entre couches
│   ├── service/        # Logique métier (création de fiche, règles >2000€…)
│   └── repository/     # DAOs / accès EntityManager
├── controller/         # Managed Beans CDI (JSF) ou Servlets
└── util/               # Classes utilitaires transverses

src/main/webapp/
├── WEB-INF/
│   └── web.xml         # Descripteur de déploiement
├── pages/              # Vues JSF (.xhtml) par fonctionnalité
└── index.jsp           # Page d'accueil / redirection

src/main/resources/
└── META-INF/
    ├── persistence.xml  # Configuration JPA
    └── beans.xml        # Activation CDI
```

## Couches MVC

### Model
- **Entités JPA** (`@Entity`) : `Client`, `FicheLABFT`, `Utilisateur`, `Role`…
- **Services** : logique métier (calcul de seuil, archivage, règles de conformité).
- **Repositories/DAOs** : accès base de données via `EntityManager`.
- **DTOs** : objets de transfert découplés des entités pour les vues.

### View
- Pages **JSF** (`.xhtml`) dans `src/main/webapp/pages/`.
- Aucune logique métier dans les vues — uniquement du binding EL (`#{bean.propriete}`).
- Formulaires de saisie rapide avec pré-remplissage depuis les données client.

### Controller
- **Managed Beans CDI** (`@Named`, scoped) pour JSF.
- Délèguent systématiquement la logique aux services du Model.
- Gèrent la navigation entre les vues.

## Flux de données

```
Requête HTTP (Caissier / Responsable / MCD)
    ↓
Controller (Managed Bean CDI)
    ↓
Service (logique métier, règles LAB-FT)
    ↓
Repository → EntityManager → Base de données
    ↑
Controller
    ↓
View JSF → réponse HTML
```

## Points d'extension futurs

- **Sécurité par profil** : Jakarta Security avec rôles `CAISSIER`, `RESPONSABLE`, `MCD`.
- **Export registres officiels** : génération PDF/Excel des fiches >2000€.
- **Recherche avancée** : JPQL ou Criteria API sur les fiches par client, date, montant.
- **Audit trail** : journalisation automatique des créations/modifications de fiches.
