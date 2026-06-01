# Architecture

## Vue d'ensemble

JOALABFT_Backend est l'application backend d'un outil de gestion des fiches **LAB-FT** (Lutte Anti-Blanchiment et contre le Financement du Terrorisme) pour le casino JOA de Saint Laurent en Grandvaux.

L'application est une WAR **Jakarta EE 11** exposant une **API REST JAX-RS** consommee par un frontend React (SPA).

## Domaine metier

Une **fiche LAB-FT** est un document de conformite cree lorsqu'un client effectue une operation de change ou de jeu depassant un certain seuil. Les fiches depassant **2000 EUR** doivent etre inscrites dans des registres officiels anti-blanchiment.

### Profils utilisateurs

| Profil | Role |
|---|---|
| **Caissier** | Cree et consulte les fiches LAB-FT |
| **Responsable caisse** | Valide, supervise et recherche les fiches |
| **MCD** (Manager Conformite et Deontologie) | Acces complet, gestion des registres officiels |

## Stack technique

| Composant | Technologie | Version |
|---|---|---|
| Plateforme | Jakarta EE | 11.0.0 |
| Langage | Java | 21 |
| Build | Apache Maven | 3.9.6 |
| Serveur d'application | Payara | 7.2025.1 |
| Persistence | JPA / EclipseLink | 4.0.7 |
| Injection de dependances | CDI + EJB | Jakarta EE 11 |
| API REST | JAX-RS (Jersey) | Jakarta EE 11 |
| Tests | JUnit Jupiter | 5.13.2 |

## Structure MVC

```
src/main/java/com/amael/joalabft_backend/
+-- model/
|   +-- entity/         # Entites JPA (FicheLABFT, Client, Utilisateur, LigneTransaction)
|   +-- enums/          # Enumerations (TypeJeu, TypePaiement, TypeChange, RoleUtilisateur)
|   +-- dto/
|   |   +-- request/    # DTOs entrants (FicheRequest, LigneTransactionRequest, LoginRequest...)
|   |   +-- response/   # DTOs sortants (FicheDetailResponse, FicheSummaryResponse, LoginResponse...)
|   +-- service/        # Logique metier (FicheService, AuthService, SessionStore)
|   +-- repository/     # DAOs / acces EntityManager (EJBs @Stateless)
+-- controller/         # Ressources JAX-RS (@Path) + AuthFilter
+-- test/               # Donnees de test inserees au demarrage (TestInsert)

src/main/resources/
+-- META-INF/
    +-- persistence.xml  # Configuration JPA (EclipseLink, datasource jdbc/LABFTDB)
    +-- beans.xml        # Activation CDI
```

## Couches MVC

### Model
- **Entites JPA** (`@Entity`) : `Client`, `FicheLABFT`, `LigneTransaction`, `Utilisateur`
- **Services** (`@Stateless` EJB) : logique metier (FicheService, AuthService)
- **Repositories** (`@Stateless` EJB) : acces base de donnees via `EntityManager`
- **DTOs** : objets de transfert decouple des entites pour l'API REST

### View
- **Frontend React** (SPA) dans un projet separe (`joalabft_frontend/`)
- Communique avec le backend via l'API REST (JSON)
- Aucune vue JSF/JSP cote backend

### Controller
- **Ressources JAX-RS** (`@Path`) : AuthResource, FicheResource, ClientResource
- **AuthFilter** : filtre d'authentification par token Bearer sur toutes les routes (sauf login et OPTIONS)
- Deleguent systematiquement la logique aux services du Model

## Authentification

L'authentification est geree par tokens de session en memoire :

1. `POST /api/auth/login` : verifie identifiant + mot de passe (BCrypt cout 12, fallback SHA-256 pour les comptes anciens), retourne un token UUID
2. Le token est stocke dans `SessionStore` (ConcurrentHashMap en memoire)
3. `AuthFilter` intercepte toutes les requetes, verifie le token Bearer et injecte l'`Utilisateur` dans le contexte de la requete
4. `POST /api/auth/logout` : invalide le token

## Flux de donnees

```
Requete HTTP (Frontend React)
    |
AuthFilter (verification token Bearer)
    |
Controller (Ressource JAX-RS)
    |
Service (logique metier, validation)
    |
Repository -> EntityManager -> Base de donnees
    |
Controller -> Response JSON
```

## Endpoints API

| Methode | Chemin | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/logout` | Deconnexion |
| GET | `/api/fiches` | Liste filtree (dates, recherche) |
| GET | `/api/fiches/{id}` | Detail d'une fiche |
| POST | `/api/fiches` | Creation d'une fiche |
| PUT | `/api/fiches/{id}` | Mise a jour des lignes |
| GET | `/api/clients` | Liste / recherche de clients |
| GET | `/api/clients/{id}` | Detail d'un client |
| POST | `/api/clients` | Creation d'un client |
| PUT | `/api/clients/{id}` | Mise a jour d'un client |

## Donnees de test

La classe `TestInsert` (`@Singleton @Startup`) insere des donnees de test au demarrage :
- 3 utilisateurs (aduchat, mcurie, jbond) avec mot de passe `password`
- 4 clients (3 identifies + 1 non-identifie)
- 4 fiches avec des lignes de transaction variees

Cette insertion est automatique car EclipseLink est configure en `drop-and-create-tables`.
