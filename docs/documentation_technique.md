# Documentation technique — JOA LAB-FT

> Public : développeur arrivant sur le projet. Objectif : être autonome en une demi-journée de lecture + une heure de mise en route.
>
> Le projet est composé de **deux dépôts** :
> - `JOALABFT_Backend/` — API REST Jakarta EE 11 (ce dépôt)
> - `joalabft_frontend/` — SPA React 19 + Vite (dépôt séparé)

---

## 1. Vue d'ensemble

### 1.1 Objectif métier

L'application est un outil interne du casino **JOA de Saint-Laurent-en-Grandvaux** pour produire et conserver les **fiches LAB-FT** (Lutte Anti-Blanchiment et contre le Financement du Terrorisme). Toute transaction de jeu ou de change dépassant **2 000 €** doit être consignée dans un registre officiel. L'application remplace une procédure papier : elle saisit les transactions, identifie les clients, génère des fiches imprimables et conserve un journal d'audit immuable.

Trois rôles métier interagissent avec l'application :

- **Caissier** — saisit les transactions du jour, modifie les fiches du jour et de la veille uniquement.
- **Responsable de caisse** — peut tout ce que fait un caissier + modifier les fiches jusqu'à 31 jours dans le passé, importer des clients en masse depuis un Excel, modifier l'identité complète d'un client, créer d'autres caissiers, consulter l'historique d'une fiche.
- **MCD** (Membre du Comité de Direction) — pouvoirs étendus : modifier sans limite de fenêtre, supprimer fiches et clients, créer n'importe quel rôle, consulter le journal global.

### 1.2 Architecture

Architecture **3 tiers classique** avec séparation stricte front / API / base :

```
┌────────────────────┐     HTTPS/JSON      ┌──────────────────────────┐    JDBC    ┌──────────────┐
│  Navigateur        │   Bearer token     │  Payara 7 (Java 21)       │            │  BD          │
│  React 19 + Vite   │ ─────────────────► │  WAR JAX-RS + EJB + JPA   │ ─────────► │  LABFTDB     │
│  (SPA)             │ ◄───────────────── │  + EclipseLink 4          │            │              │
└────────────────────┘                    └──────────┬────────────────┘            └──────────────┘
                                                     │
                                          HTTPS sortant (résolution
                                          adresse/géo lors de l'import)
                                                     ▼
                                          api-adresse.data.gouv.fr
                                          geo.api.gouv.fr
```

Les diagrammes complets (cas d'utilisation, classes, séquences, déploiement) sont disponibles en PlantUML dans [`docs/maquettes/`](maquettes/) avec leurs rendus PNG.

### 1.3 Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Langage backend | Java | 21 |
| Plateforme | Jakarta EE | 11 |
| Serveur d'application | Payara Server | 7.2025.1 |
| Persistence | JPA / EclipseLink | 4.0.7 (fourni par Payara) |
| Injection | CDI + EJB | Jakarta EE 11 |
| API REST | JAX-RS (Jersey) | Jakarta EE 11 |
| Build backend | Apache Maven | 3.9.6 |
| Lecture Excel | Apache POI | 5.4.0 |
| Tests | JUnit Jupiter | 5.13.2 |
| Frontend | React | 19.1 |
| Routing | React Router | 7.5 |
| Bundler / dev server | Vite | 8 |
| Base de données | H2 (dev) / PostgreSQL ou MySQL (cible prod) | — |

---

## 2. Structure et dépendances

### 2.1 Arborescence du backend

```
JOALABFT_Backend/
├── pom.xml                        # Build Maven : packaging=war, Java 21
├── docs/                          # Documentation (architecture, setup, git, BD, maquettes UML)
└── src/main/
    ├── java/com/amael/joalabft_backend/
    │   ├── controller/            # Couche REST (JAX-RS @Path) + filtres @Provider
    │   ├── model/
    │   │   ├── entity/            # Entités JPA persistantes
    │   │   ├── enums/             # Énumérations métier
    │   │   ├── dto/{request,response}/  # DTO JSON (entrée / sortie)
    │   │   ├── service/           # Services métier @Stateless
    │   │   ├── repository/        # DAO @Stateless (EntityManager)
    │   │   └── util/              # WorkDay (journée 06h→05h59)
    │   └── test/TestInsert.java   # Seed @Singleton @Startup
    └── resources/META-INF/
        ├── persistence.xml        # Persistence-unit "LABFTPU", datasource jdbc/LABFTDB
        └── beans.xml              # Activation CDI
```

### 2.2 Arborescence du frontend

```
joalabft_frontend/
├── package.json                   # React 19 + React Router 7
├── vite.config.js                 # Proxy /api → :8080
└── src/
    ├── App.jsx                    # Routing
    ├── main.jsx                   # Entry React
    ├── api/                       # Wrappers fetch (auth, clients, fiches, utilisateurs, journal)
    │   └── config.js              # fetch centralisé : Bearer token + gestion 401
    ├── context/                   # AuthContext, NotificationContext
    ├── pages/                     # 15 pages (Accueil, Login, AjoutFiche, EditClient...)
    ├── components/                # 14 composants partagés (FichePapier, Modal, Icons...)
    ├── utils/                     # permissions, formatters, champsClient, libelle, print
    └── data/                      # Listes statiques (pays, départements, préfectures)
```

### 2.3 Dépendances cruciales et pourquoi

| Dépendance | Rôle | Pourquoi celle-ci |
|---|---|---|
| `jakarta.platform:jakarta.jakartaee-api:11.0.0` (provided) | API Jakarta EE | Fournit JPA, EJB, JAX-RS, CDI en une seule dépendance ; mise à disposition par Payara au runtime, donc pas embarquée dans le WAR. |
| EclipseLink 4 | Implémentation JPA | Fourni nativement par Payara — pas de dépendance à gérer côté Maven. Le `persistence-unit` est sur `transaction-type="JTA"`, donc le conteneur pilote les transactions. |
| `org.apache.poi:poi` + `poi-ooxml:5.4.0` | Lecture Excel | Nécessaire pour l'import massif de clients depuis le format `.xlsx` produit par MS Dynamics. |
| React Router 7 | Routing SPA | Gestion des routes protégées via `<PrivateRoute />` + passage de state entre pages (présélection client). |
| `@vitejs/plugin-react` | Plugin React pour Vite | Permet le JSX et le Fast Refresh en développement. |

---

## 3. Modèle de données

### 3.1 Entités JPA et relations

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Utilisateur     │     │  Client          │     │  FicheLABFT          │
│  ──────────      │     │  ─────────       │     │  ────────────        │
│  id              │◄────┤  fiches[]        │◄────┤  client (EAGER)      │
│  identifiant     │     │  ...             │     │  creePar  (EAGER)    │──┐
│  motDePasse SHA  │     │                  │     │  modifiePar (EAGER)  │──┤
│  nom/prenom      │     └──────────────────┘     │  dateCreation        │  │
│  role (enum)     │                              │  dateModification    │  │
└──────────┬───────┘                              │  lignes[] (LAZY,     │  │
           │                                      │      cascade=ALL)    │  │
           │                                      └──────────┬───────────┘  │
           │                                                 │              │
           │       ┌──────────────────────────┐              │              │
           └───────┤  LigneTransaction        │◄─────────────┘              │
                   │  ─────────────────       │                             │
                   │  typeJeu (MAS/JTE/JT)    │                             │
                   │  typePaiement (ESP/CHE/CB)                             │
                   │  typeChange (JETON/PLAQUE/TICKET)                      │
                   │  numeroSocle (Integer)   │                             │
                   │  montantRGM (BigDecimal) │                             │
                   │  changeEntrant/Sortant   │                             │
                   │  observations            │                             │
                   │  enregistreFrontCage     │                             │
                   │  caissier (EAGER, FK)    │─────────────────────────────┘
                   └──────────────────────────┘

┌──────────────────────────────────────────┐
│  JournalAction (append-only)             │
│  ────────────────                        │
│  action (CONNEXION/CREATION/MOD/SUPP...) │
│  typeEntite (FICHE/CLIENT/UTILISATEUR)   │
│  entiteId, libelleEntite, description    │
│  horodatage, utilisateur (EAGER)         │
└──────────────────────────────────────────┘
```

### 3.2 Conventions

- **Tables** en `snake_case` (`fiches_labft`, `lignes_transaction`).
- **PK** auto-incrémentées (`IDENTITY`) typées `Long`.
- **Enums** persistées en `STRING` (`@Enumerated(EnumType.STRING)`) pour la lisibilité directe en base.
- **Montants** en `BigDecimal(12, 2)` — jamais de `double` pour les sommes (précision exigée).
- **Dates** en `LocalDate` / `LocalDateTime` (API `java.time`, jamais `java.util.Date`).

### 3.3 Règle métier : journée de travail

Une « journée » du casino court de **06h00 du jour J à 05h59 du jour J+1**. C'est la base du regroupement des fiches « du jour ». Cette règle est centralisée dans `model/util/WorkDay.java` :

```java
public static LocalDate from(LocalDateTime dt) {
    if (dt == null) return null;
    return dt.getHour() < START_HOUR        // START_HOUR = 6
            ? dt.toLocalDate().minusDays(1)
            : dt.toLocalDate();
}
```

Utilisée à 4 endroits : `FicheLABFT.getDate()`, le listing dans `FicheService`, l'index d'audit, et son équivalent JS dans `frontend/src/utils/formatters.js`.

---

## 4. Couche service (logique métier)

Tous les services sont des EJB `@Stateless` : le conteneur les pool, gère leur cycle de vie et ouvre une transaction JTA `REQUIRED` par défaut sur chaque méthode publique. Aucune annotation `@TransactionAttribute` n'est utilisée — la gestion est entièrement déclarative.

### 4.1 AuthService

Méthode publique principale :

```java
public String login(String identifiant, String motDePasse) {
    Optional<Utilisateur> opt = utilisateurRepository.findByIdentifiant(identifiant);
    if (opt.isEmpty()) return null;
    Utilisateur u = opt.get();
    if (!u.getMotDePasse().equals(PasswordHasher.hash(motDePasse))) return null;
    String token = sessionStore.createSession(u);
    journalService.log(u, TypeActionJournal.CONNEXION, ...);
    return token;
}
```

**Entrée** : identifiant + mot de passe en clair.
**Sortie** : token UUID si succès, `null` sinon.
**Effet de bord** : enregistre une entrée `CONNEXION` dans le journal d'audit.

`PasswordHasher.hash()` produit un hexadécimal SHA-256 sur 64 caractères. La comparaison avec le mot de passe stocké se fait par `equals` direct.

### 4.2 SessionStore — `@ApplicationScoped`

Stockage en mémoire des tokens actifs : `ConcurrentHashMap<String, Session>` où `Session = record(Utilisateur, LocalDateTime createdAt)`. **TTL = 8 heures**, vérifié **passivement** lors de chaque appel à `getUtilisateur(token)` :

```java
public Utilisateur getUtilisateur(String token) {
    Session session = sessions.get(token);
    if (session == null) return null;
    if (session.createdAt().isBefore(LocalDateTime.now().minusHours(TTL_HEURES))) {
        sessions.remove(token);
        return null;
    }
    return session.utilisateur();
}
```

> ⚠️ **Limite connue** : aucune purge active. Les sessions expirées non re-sollicitées restent en mémoire. Acceptable à cette échelle (poignée d'utilisateurs simultanés), à revoir en production.

### 4.3 PermissionService

Centralise la matrice des droits. Deux familles de méthodes :

- `boolean peutXxx(...)` : retourne un booléen (utilisé par les ressources pour décider).
- `void ensurePeutXxx(...)` : lève `ForbiddenException` (HTTP 403) si refusé.

Exemple — fenêtre d'édition d'une fiche selon le rôle :

```java
public boolean peutModifierFiche(Utilisateur u, LocalDate dateFiche) {
    if (u == null || dateFiche == null) return false;
    if (u.getRole() == RoleUtilisateur.MCD) return true;
    long ecart = ChronoUnit.DAYS.between(dateFiche, WorkDay.today());
    if (ecart < 0) return false;
    return switch (u.getRole()) {
        case CAISSIER           -> ecart <= 1;     // jour + veille
        case RESPONSABLE_CAISSE -> ecart <= 31;    // un mois
        case MCD                -> true;            // sans limite
    };
}
```

### 4.4 FicheService

Cœur métier. Méthode emblématique : `updateFiche` réalise un **patch in-place** des lignes existantes (au lieu de tout supprimer/recréer) et capture un **diff complet** pour l'audit.

Étapes :

1. Récupération de la fiche, vérification de permission (`ensurePeutModifierFiche`).
2. **Snapshot** des lignes actuelles dans des records immuables `LigneSnapshot`.
3. Parcours de la requête : pour chaque ligne reçue :
   - Si `id != null` et existe → `applyRequestToLigne(existante, req)` (EclipseLink détecte les colonnes modifiées).
   - Si `id == null` → `buildLigne(req)` puis `fiche.addLigne(...)`.
4. Suppression des lignes orphelines via `fiche.getLignes().removeIf(...)` (orphan removal JPA cascade la suppression en base).
5. Construction de la **description du diff** avec préfixes `+ Ligne ajoutée`, `* Ligne modifiée`, `- Ligne supprimée`.
6. Persistance + log d'audit avec la description du diff.

C'est le scénario le plus complexe du projet, illustré par [`docs/maquettes/uml_sequence_creation_fiche.puml`](maquettes/uml_sequence_creation_fiche.puml).

### 4.5 ClientService

Cinq opérations métier exposées :

| Méthode | Rôle requis | Effet |
|---|---|---|
| `listClients(search)` | tout authentifié | Recherche full-text + dernière activité (single-query, voir 4.7). |
| `getClient(id)` | tout authentifié | Détail + historique des fiches associées. |
| `findSimilar(req)` | tout authentifié | Détection de doublons (même nom+prénom+DOB ou même n° pièce). |
| `createClient(req)` | tout authentifié | Crée + log `CREATION`. |
| `updateClient(id, req)` | RESPONSABLE_CAISSE / MCD | Met à jour l'identité complète. |
| `updateClientIdentification(id, req)` | tout authentifié | Met à jour uniquement adresse + pièce d'identité (réservée au CAISSIER aussi). |
| `deleteClient(id)` | MCD | Rejette si le client a des fiches. |

### 4.6 ClientImportService

Import Excel avec Apache POI. Pour chaque ligne du classeur :

1. Parsing tolérant des cellules (dates en formats multiples, `Oui`/`Non`, normalisation accents).
2. Si le lieu de naissance est en France → appel `GeoService` (`geo.api.gouv.fr`) pour formater « Ville (XX) ».
3. Si l'adresse est incomplète → fallback `AdresseService` (`api-adresse.data.gouv.fr`, base BAN).
4. Détection de doublon via `findSimilar` → la ligne est silencieusement skippée.
5. Création du client + journal `CREATION` avec mention « Import Excel ».
6. Si `!client.isComplet()` → incrément `incomplete` dans le rapport renvoyé.

Le retour `ImportClientsResponse { imported, incomplete, skipped, errors[] }` est exploité côté UI pour montrer la synthèse à l'utilisateur.

### 4.7 Optimisations notables (anti N+1)

Deux endpoints renvoient un agrégat coûteux qui aurait pu provoquer un N+1 :

- `listClients` → besoin de la dernière activité (date de la dernière fiche) pour chaque client.
- `listFiches` → besoin du totaux par fiche.

Pour `listClients`, `ClientRepository.getDerniereActivitePourIds(List<Long> ids)` fait **une seule requête** `GROUP BY` :

```sql
SELECT f.client.id, MAX(f.dateCreation)
FROM FicheLABFT f
WHERE f.client.id IN :ids
GROUP BY f.client.id
```

Le `ClientService` agrège ensuite avec un `Map<Long, LocalDate>` en mémoire. Sans cette optimisation, chaque entrée de la liste aurait déclenché une requête (« le SQL en FINE chargeait 15 s », commentaire du code).

### 4.8 JournalService

Service d'audit. Une seule méthode d'écriture (`log`) et deux de lecture (`listGlobal`, `listHistoriqueFiche`). Les entrées sont **append-only** : pas de méthode `update`, pas de `delete`. L'entité `JournalAction` n'a pas de setters publics — elle est créée puis persistée, jamais modifiée.

---

## 5. Couche API (contrôleurs JAX-RS)

### 5.1 Configuration

`JaxRsApplication.java` est annoté `@ApplicationPath("/api")`. Combiné au contexte du WAR, l'URL finale d'un endpoint est :

```
http://<host>:<port>/JOALABFT_Backend-1.0-SNAPSHOT/api/<ressource>/<path>
```

### 5.2 Filtres globaux

**`CorsFilter` (`@Provider @PreMatching`)** :
- Court-circuite les requêtes OPTIONS avec un 200 + headers CORS.
- Ajoute les headers `Access-Control-Allow-Origin: *` à toutes les réponses.

**`AuthFilter` (`@Provider`)** :
- Whitelistes `auth/login` et toutes les requêtes OPTIONS.
- Extrait le token de l'en-tête `Authorization: Bearer <token>`.
- Consulte `SessionStore`. Si invalide / expiré → 401 abort.
- En cas de succès, propage l'utilisateur via `requestContext.setProperty("utilisateur", u)` — les ressources le récupèrent en injectant `@Context ContainerRequestContext`.

### 5.3 Catalogue des endpoints

| Méthode | Chemin | Description | Permission |
|---|---|---|---|
| POST | `/auth/login` | Connexion (UUID token + détails user) | publique |
| POST | `/auth/logout` | Déconnexion (invalide la session) | token valide |
| GET | `/fiches?dateDebut&dateFin&search` | Liste des fiches sur une plage | token valide |
| GET | `/fiches/{id}` | Détail d'une fiche | token valide |
| GET | `/fiches/{id}/historique` | Historique d'audit d'une fiche | RESPONSABLE_CAISSE / MCD |
| POST | `/fiches` | Crée une fiche | token valide |
| PUT | `/fiches/{id}` | Met à jour (avec patch in-place) | selon fenêtre |
| DELETE | `/fiches/{id}` | Supprime | MCD |
| GET | `/clients?search` | Liste clients + dernière activité | token valide |
| GET | `/clients/{id}` | Détail + historique fiches | token valide |
| POST | `/clients` | Crée un client | token valide |
| POST | `/clients/match` | Détecte les doublons | token valide |
| PUT | `/clients/{id}` | Modifie l'identité complète | RESPONSABLE_CAISSE / MCD |
| PATCH | `/clients/{id}/identification` | Modifie adresse + pièce | token valide |
| DELETE | `/clients/{id}` | Supprime (refuse si fiches) | MCD |
| POST | `/clients/import` | Import Excel multipart | RESPONSABLE_CAISSE / MCD |
| GET | `/utilisateurs` | Liste utilisateurs | RESPONSABLE_CAISSE / MCD |
| POST | `/utilisateurs` | Crée un utilisateur | selon rôle créé |
| GET | `/journal` | Journal global (500 dernières) | MCD |

### 5.4 Gestion d'erreurs

Pas de `ExceptionMapper` personnalisé : on s'appuie sur le mapping standard de JAX-RS pour les exceptions de la spec :

- `NotFoundException` → 404
- `ForbiddenException` → 403
- `BadRequestException` → 400

Le frontend (`api/config.js`) parse le corps de la réponse pour extraire `body.message || body.error` et l'affiche dans les notifications.

---

## 6. Frontend React

### 6.1 Routing et garde

```jsx
// App.jsx (simplifié)
<Routes>
  <Route path="/" element={<Login />} />
  <Route element={<PrivateRoute />}>          {/* garde */}
    <Route path="/accueil" element={<Accueil />} />
    <Route path="/fiches/nouveau" element={<AjoutFiche />} />
    <Route path="/clients" element={<ListeClients />} />
    {/* ... autres routes */}
  </Route>
</Routes>
```

`PrivateRoute` lit le `user` depuis `AuthContext`. Si absent, `<Navigate to="/" replace />`. Sinon, rend `<Header />` + `<Outlet />`.

### 6.2 AuthContext

```jsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const signIn = useCallback((loginResponse) => {
    const { token, ...userData } = loginResponse
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const signOut = useCallback(async () => {
    try { await apiLogout() } catch { /* token déjà invalide */ }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])
  // ...
}
```

Le `user` est rechargé depuis `localStorage` à chaque montage du provider → la session persiste au refresh.

### 6.3 Couche fetch (`api/config.js`)

Une seule fonction `request(path, options)` est utilisée par tous les wrappers d'API. Elle :

1. Injecte automatiquement `Authorization: Bearer <token>` si présent.
2. N'écrase pas le `Content-Type` pour les `FormData` (le navigateur pose le `boundary` multipart).
3. Sur 204 → retourne `null`.
4. Sur 401 (hors `/auth/login`) → vide le `localStorage` et redirige vers `/`.
5. Sur autre 4xx/5xx → essaie de parser un message d'erreur JSON.

C'est le point de centralisation de toute la communication HTTP avec le backend.

### 6.4 Matrice de permissions UI

`utils/permissions.js` réplique la logique de `PermissionService` côté frontend (mêmes constantes : 1 jour pour CAISSIER, 31 jours pour RESPONSABLE_CAISSE). Ces fonctions servent à **afficher/masquer les boutons** : la sécurité réelle reste portée par le backend. Le front masque ce qu'il sait qu'il ne pourra pas faire, et le backend rejette ce qu'il ne devrait pas autoriser, même si quelqu'un appelle l'API en direct.

### 6.5 Débouncing des recherches

Toutes les pages avec une barre de recherche (`Accueil`, `ListeClients`, `Identification`) déclenchent leur fetch après **300 ms** d'inactivité :

```jsx
useEffect(() => {
  const t = setTimeout(load, 300)
  return () => clearTimeout(t)
}, [load])  // load dépend de search, dateDebut, dateFin
```

---

## 7. Flux d'exécution clés

### 7.1 Connexion

```
1. Login.jsx          → saisie identifiant + mdp
2. api/auth.js#login  → POST /api/auth/login
3. CorsFilter         → laisse passer (/auth/login)
4. AuthFilter         → laisse passer (whitelisted)
5. AuthResource       → AuthService.login
6. UtilisateurRepo    → findByIdentifiant
7. PasswordHasher     → SHA-256 du mdp reçu, comparaison
8. SessionStore       → createSession → token UUID
9. JournalService     → log(CONNEXION, ...)
10. Response 200      → { token, id, nom, prenom, role }
11. AuthContext.signIn → localStorage + setUser
12. navigate('/accueil')
```

### 7.2 Création d'une fiche LAB-FT

Le flow complet est décrit dans [`docs/maquettes/uml_sequence_creation_fiche.puml`](maquettes/uml_sequence_creation_fiche.puml). Trois grandes étapes :

1. **Identification du client** (page `Identification.jsx`) : recherche d'un client existant, création inline, ou client non-identifié (description physique).
2. **Saisie des lignes** (page `AjoutFiche.jsx`) : N lignes de transaction avec validations côté client (RGM > 500 €, multiple de 5 €, n° socle obligatoire si RGM renseigné).
3. **Enregistrement** : `POST /api/fiches` → `FicheService.createFiche` orchestre `ClientRepository`, `FicheLABFTRepository` (cascade INSERT lignes) et `JournalService.log(CREATION, ...)`.

### 7.3 Modification d'une fiche (avec diff)

Décrite en 4.4. La particularité est la production d'une description du diff exploitable par les responsables et les MCD :

```
Modification
+ Ligne ajoutée : MAS / ESPECE / numéro de socle 12 / RGM 1 923,41 €
* Ligne modifiée : JT / CB / sortant 1 500,00 € (auparavant : JT / CB / sortant 1 200,00 €)
- Ligne supprimée : JTE / CHEQUE / RGM 4 785,66 €
```

Cette description est stockée dans `JournalAction.description` et reste consultable dans l'historique de la fiche.

### 7.4 Import Excel

Décrit en 4.6. Voir [`docs/maquettes/uml_sequence_import_excel.puml`](maquettes/uml_sequence_import_excel.puml) pour le détail des appels aux APIs externes BAN et `geo.api.gouv.fr`.

---

## 8. Configuration et déploiement

### 8.1 Build

```bash
./mvnw clean package
# → target/JOALABFT_Backend-1.0-SNAPSHOT.war
```

### 8.2 Provisionnement Payara (à faire une seule fois)

```bash
asadmin create-jdbc-connection-pool \
  --datasourceclassname org.h2.jdbcx.JdbcDataSource \
  --restype javax.sql.DataSource \
  --property url="jdbc:h2:~/labftdb;AUTO_SERVER=TRUE":user=sa:password= \
  LABFTDB_Pool

asadmin create-jdbc-resource --connectionpoolid LABFTDB_Pool jdbc/LABFTDB
asadmin deploy target/JOALABFT_Backend-1.0-SNAPSHOT.war
```

### 8.3 Configuration JPA (`persistence.xml`)

```xml
<persistence-unit name="LABFTPU" transaction-type="JTA">
    <jta-data-source>jdbc/LABFTDB</jta-data-source>
    <exclude-unlisted-classes>false</exclude-unlisted-classes>
    <properties>
        <property name="eclipselink.ddl-generation" value="drop-and-create-tables"/>
        ...
    </properties>
</persistence-unit>
```

> ⚠️ **À retenir avant la prod** : `drop-and-create-tables` vide la base à chaque redémarrage. Pour la production, basculer sur `none` (et gérer le schéma avec Flyway/Liquibase). De même, `test/TestInsert.java` insère des utilisateurs et fiches de test à chaque démarrage (idempotent grâce à un `existsByIdentifiant` mais à ne pas déployer en prod).

### 8.4 Lancement frontend (dev)

```bash
cd ../joalabft_frontend
npm install
npm run dev          # http://localhost:5173, proxy /api → :8080
```

Le proxy Vite réécrit `/api/...` en `http://localhost:8080/JOALABFT_Backend-1.0-SNAPSHOT/api/...`, ce qui permet d'éviter les en-têtes CORS en local et de garder un code frontend identique entre dev et prod.

---

## 9. Documentation associée

- [`architecture.md`](architecture.md) — vue d'ensemble des couches MVC.
- [`database.md`](database.md) — configuration JPA + ajout d'entités.
- [`setup.md`](setup.md) — prérequis et configuration IntelliJ.
- [`git-workflow.md`](git-workflow.md) — branches et conventions de commit.
- [`maquettes/`](maquettes/) — diagrammes UML PlantUML (.puml) + rendus PNG.
- [`faq_technique.md`](faq_technique.md) — questions/réponses pour la soutenance.
