# FAQ technique — Soutenance JOA LAB-FT

> Questions susceptibles d'être posées par un jury ou un développeur expérimenté. Chaque réponse est appuyée sur du code existant (chemin + extrait). Le but n'est pas de masquer les compromis : c'est de pouvoir les justifier et expliquer comment ils évolueraient en production.

---

## A. Choix de conception

### A1. Pourquoi Jakarta EE 11 et pas Spring Boot ?

C'est une consigne du projet pédagogique : démontrer la maîtrise de l'écosystème Jakarta EE (CDI, EJB, JPA, JAX-RS) sans le sucre syntaxique de Spring. Concrètement, ça donne :

- **Pas de dépendance runtime à embarquer** : `jakarta.jakartaee-api` est en scope `provided`, le WAR pèse l'essentiel de la logique métier + Apache POI.
- **Gestion transactionnelle gratuite** : `@Stateless` ouvre une transaction JTA `REQUIRED` par défaut. Aucun `@Transactional` à poser.
- **Pas de configuration "starter"** : `persistence.xml`, `beans.xml`, c'est explicite et tout est sous mes yeux.

### A2. Pourquoi un MVC strict avec couches `controller / service / repository / entity` ?

Imposé par [`CLAUDE.md`](../CLAUDE.md) : « All code must follow MVC. (…) Never mix responsibilities between layers. ». Chaque couche a une seule responsabilité :

- `controller/` — adapter HTTP. Ne contient aucune logique métier, se contente de récupérer l'utilisateur du contexte, d'appeler un service, de mapper l'exception → code HTTP.
- `model/service/` — règles métier et orchestration. C'est ici que se trouve la validation, l'audit, les calculs.
- `model/repository/` — accès JPA isolé. Aucun service ne manipule directement `EntityManager`.
- `model/entity/` — état persistant.

Le bénéfice concret : `FicheService.updateFiche` (la méthode la plus complexe du projet) ne sait rien de HTTP, ce qui rend la méthode testable unitairement sans serveur applicatif.

### A3. Pourquoi des EJB `@Stateless` et pas de simples beans CDI `@ApplicationScoped` ?

Trois raisons :

1. **Transactions automatiques** : `@Stateless` active CMT (Container-Managed Transactions) avec attribut `REQUIRED` par défaut. Chaque méthode publique s'exécute dans une transaction JTA ; les `INSERT` cascadés (fiche + lignes) sont atomiques.
2. **Pooling** : le conteneur recycle les instances. Pas un enjeu à notre échelle, mais c'est gratuit.
3. **Propagation entre EJB** : quand `FicheService` appelle `JournalService.log(...)`, la transaction est partagée — un rollback côté fiche annulera l'entrée de journal créée dans la même unité.

Un service à état partagé est aussi présent : `SessionStore` est `@ApplicationScoped` parce qu'il faut un et un seul stockage pour toute l'application (les tokens vivent au-delà d'une requête).

### A4. Pourquoi des DTO distincts des entités ?

Trois raisons :

1. **Isolation** : un changement de champ JPA ne casse pas l'API REST. Inversement, ajouter `champsManquants` (calculé) dans la réponse ne pollue pas l'entité.
2. **Lazy loading** : sérialiser une entité JPA directement provoque des `LazyInitializationException` hors transaction. Les DTO prennent ce qu'il faut pendant que la transaction est ouverte.
3. **Vue par cas d'usage** : `ClientSummaryResponse` (pour la liste) ne contient pas les mêmes champs que `ClientDetailResponse` (pour le profil). Sans DTO, il faudrait `@JsonView` ou des fields filters Jackson — pénible à maintenir.

### A5. Pourquoi le frontend ré-implémente la matrice des permissions dans `permissions.js` ?

C'est un miroir cosmétique. La vraie sécurité est au backend (l'`AuthFilter` + les `PermissionService.ensure*`). Le front se contente de masquer les boutons que l'utilisateur ne pourrait pas utiliser. Si on désactive le front, le backend refuse toujours. Cas concret : si un caissier ouvre la console et tape `fetch('/api/clients/123', { method: 'DELETE', ... })`, il reçoit un **403** — le bouton « Supprimer » qui n'apparaît pas dans son UI n'est qu'un confort.

### A6. Pourquoi un `JournalAction` à part et pas un `created_at`/`updated_at` sur chaque entité ?

L'audit a une exigence qui n'est pas satisfaite par les timestamps d'entité :

- **Append-only** : `JournalAction` n'expose pas de setter et n'a aucune méthode `update`/`delete` dans `JournalActionRepository`. Une modification a posteriori est interdite par construction.
- **Trace lisible** : l'audit capture le **diff** des lignes modifiées (« + Ligne ajoutée », « - Ligne supprimée », « * Ligne modifiée (auparavant : …) »). Un `updated_at` dit seulement « quelque chose a changé », pas quoi.
- **Pivot transversal** : une action de suppression d'un client doit rester traçable même après que la ligne `clients` n'existe plus. `JournalAction.libelleEntite` capture le nom au moment de l'action, donc on garde une trace humaine même après suppression.

### A7. Pourquoi la règle « journée de travail 06h00 → 05h59 » est-elle centralisée dans `WorkDay` ?

Avant le refactor, la valeur `6` apparaissait à 4 endroits : `FicheLABFTRepository.findWithFilters` (filtres SQL), `FicheLABFT.getDate()` (entité), `FicheService.toSummary` (calcul d'affichage), et son équivalent JS dans `formatters.js`. La centralisation (`WorkDay.START_HOUR = 6`) évite la dérive : si la règle change, on modifie une seule constante. Le commit de refactor est traçable (`5187706 refactor: factorise WorkDay`).

### A8. Pourquoi un patch in-place des lignes plutôt qu'un `deleteAll + insertAll` ?

Trois bénéfices :

1. **EclipseLink ne génère un `UPDATE` que si une colonne a réellement changé**. Modifier l'`observations` d'une ligne sur 5 ne touche qu'une seule colonne en base ; la stratégie naïve aurait fait 5 DELETE + 5 INSERT.
2. **Les IDs des lignes restent stables**. Les références dans le journal (`description` qui mentionne l'ID) restent cohérentes.
3. **Le diff d'audit reste fin**. On peut dire « ligne 456 modifiée » plutôt que « toutes les lignes ont disparu et 5 nouvelles sont apparues ».

Le code se trouve dans `FicheService.updateFiche` → snapshots stockés dans `Map<Long, LigneSnapshot>`, application via `applyRequestToLigne(existante, req)`, suppression par `removeIf(l -> !idsConserves.contains(l.getId()))` (orphan removal JPA propage la suppression).

---

## B. Sécurité et robustesse

### B1. Comment est stocké le mot de passe ?

Hash SHA-256 hexadécimal, généré par `PasswordHasher.hash` :

```java
MessageDigest digest = MessageDigest.getInstance("SHA-256");
byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
// → 64 caractères hex stockés dans utilisateurs.mot_de_passe
```

**Limites connues** :
- Pas de **sel** → deux utilisateurs avec le même mot de passe ont le même hash (rainbow tables).
- Pas de **fonction adaptative** (Bcrypt, Argon2id, PBKDF2) → le hash est rapide à calculer, donc rapide à brute-forcer.
- Comparaison via `equals` standard → théoriquement **timing-attack** possible (sortie anticipée au premier octet différent).

**Comment je le corrige en production** : remplacer `PasswordHasher` par BCrypt (`org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder` ou équivalent jBCrypt). Le sel est intégré au hash. La comparaison est faite avec `MessageDigest.isEqual(...)` qui est constant-time. C'est un changement local — seul `AuthService.login` et la création d'utilisateurs sont impactés.

### B2. Que se passe-t-il si un attaquant intercepte un token JWT… euh, Bearer UUID ?

Le token est un **UUID v4 aléatoire** (`UUID.randomUUID().toString()` dans `SessionStore.createSession`). Ce n'est pas un JWT — il ne contient aucune information, c'est juste une clé pour `ConcurrentHashMap`. Conséquences :

- **Avantage** : si on découvre une faille de l'algorithme JWT (`alg=none`, signature contournée, etc.), on n'est pas concerné.
- **Inconvénient** : ne peut pas être validé sans appel à `SessionStore`. Pas un problème en monolithe — le serait en architecture distribuée.

Si un attaquant l'intercepte (ex. : poste laissé ouvert, copie depuis la console), il peut agir au nom de l'utilisateur jusqu'au TTL de 8h. **Mitigations actuelles** : déploiement sur réseau local du casino + HTTPS sur la passerelle. **Mitigation à ajouter** : rotation du token sur 401, et idéalement passage en cookies `HttpOnly`+`SameSite=Strict` pour empêcher la lecture depuis JS.

### B3. Le token est en `localStorage`, n'est-ce pas un risque XSS ?

Oui. Un script malveillant injecté dans une page de l'application peut faire `localStorage.getItem('token')` et l'exfiltrer. Trois lignes de défense :

1. **React échappe les valeurs par défaut** dans le JSX. On n'a aucun usage de `dangerouslySetInnerHTML` dans le code.
2. **Pas d'eval / pas de chargement de scripts externes** sauf React/Vite et le bundle de l'app.
3. **CSP** côté serveur (à ajouter pour la prod). Pas en place actuellement.

L'évolution recommandée — passer le token en cookie `HttpOnly` — implique un changement de `AuthFilter` (lire un cookie au lieu d'un header). Tracé pour une future itération.

### B4. CORS est `Access-Control-Allow-Origin: *`. C'est volontaire ?

C'est explicite dans `CorsFilter` :

```java
.header("Access-Control-Allow-Origin", "*")
```

C'est volontairement permissif pour le dev. **En production** : remplacer par une liste blanche (`https://labft.intranet.joa-saintlaurent.fr` par exemple) et lire l'origine demandée. Tant que l'application n'utilise pas de cookies d'authentification, l'impact est limité (un site externe ne pourra de toute façon pas lire le token depuis le `localStorage` d'un autre origine), mais c'est une bonne pratique.

### B5. Comment sont gérées les injections SQL ?

Toutes les requêtes utilisent JPA avec paramètres nommés :

```java
em.createQuery("SELECT c FROM Client c WHERE LOWER(c.nom) LIKE :p0", Client.class)
  .setParameter("p0", "%" + token + "%")
```

Le `LIKE` reste paramétré — pas de concaténation de chaînes avec les valeurs utilisateur. Le code construit la **structure** de la requête dynamiquement (nombre de tokens), mais jamais les valeurs. EclipseLink émet des `PreparedStatement` qui empêchent l'injection.

### B6. Que se passe-t-il en cas d'erreur dans une transaction ?

CMT en attribut `REQUIRED` : si une `RuntimeException` non-checked est levée dans un EJB `@Stateless`, le conteneur **rollback** automatiquement. Concrètement, dans `FicheService.updateFiche` :

- Si `applyRequestToLigne` lève `BadRequestException`, **les modifications déjà appliquées sur les autres lignes sont annulées** (rollback), et **l'entrée de journal n'est pas créée** (la `log` n'a pas été appelée).
- Si la sauvegarde JPA échoue après que `journalService.log(...)` a inséré sa ligne, **l'entrée de journal est rollback** elle aussi.

L'audit reflète exactement les changements appliqués, sans cas de demi-modification.

### B7. Que se passe-t-il si deux utilisateurs modifient la même fiche en même temps ?

**Aucun verrouillage optimiste explicite** (`@Version`) n'est en place. En l'état :

- Les deux transactions ouvertes en parallèle vont chacune charger la fiche, modifier des lignes, et faire un commit. EclipseLink ne détecte pas le conflit. La **dernière écriture gagne**.
- Le journal d'audit garde trace des deux actions, donc on peut reconstruire post-mortem.

**Mitigation à venir** : ajouter `@Version private Long version;` sur `FicheLABFT` → EclipseLink lance `OptimisticLockException` quand deux clients essayent de mettre à jour la même version. Le frontend doit alors recharger et rejouer.

Pour le contexte actuel (un casino, 3 caissiers max, jamais sur la même fiche en parallèle), le risque est marginal. C'est documenté comme limite, à corriger si l'application sert plusieurs sites.

### B8. Comment l'import Excel se protège-t-il d'un fichier malveillant (zip bomb, formules) ?

Apache POI parse le `.xlsx` (qui est un ZIP). Risques connus :
- **Zip bomb** : POI a une protection — `ZipSecureFile.setMinInflateRatio(0.001)` par défaut. Notre code ne désactive pas cette protection.
- **Formules malveillantes** (CSV injection / DDE) : notre code ne réévalue **jamais** les formules ; on lit la valeur brute des cellules (`getStringCellValue` / `getNumericCellValue`). Une formule `=cmd|' /C calc'!A1` est lue comme texte et stockée comme telle ; elle n'est jamais exécutée par notre serveur.
- **Limite de taille** : pas de plafonnement explicite sur la taille du multipart. À ajouter via `@MultipartConfig(maxFileSize=...)` sur la ressource pour éviter qu'un fichier de 1 Go ne consomme la heap.

### B9. Comment l'application gère-t-elle les caractères Unicode / accents ?

Cohérence côté JPA : toutes les `@Column` String ont des longueurs explicites. Le `persistence.xml` n'impose pas de collation — c'est la base sous-jacente qui décide. H2 par défaut est UTF-8 ; en MySQL il faudrait `utf8mb4_unicode_ci`.

Les recherches font `LOWER(...)` mais **pas** de normalisation Unicode (`Dupont` matche `dupont` mais pas `Dupônt`). C'est un compromis acceptable pour notre dataset (clients français saisis manuellement). Pour internationaliser, il faudrait un index `unaccent` (PostgreSQL) ou une colonne dérivée `nom_normalise` indexée.

### B10. Que se passe-t-il si `SessionStore` perd ses sessions (redémarrage serveur) ?

Les sessions sont en mémoire pure (`ConcurrentHashMap`). Au redémarrage, **tous les tokens sont invalidés**. Côté frontend, le prochain appel API renvoie un 401 → `api/config.js` purge le `localStorage` et redirige vers `/`. L'utilisateur retape ses identifiants. C'est acceptable (un redémarrage de Payara est exceptionnel) et c'est même une propriété de sécurité — pas de session « zombie » qui survit à un redémarrage.

**Mitigation** pour de la haute dispo : remplacer `SessionStore` par Redis ou par des JWT signés (auto-portants, vérifiables sans état serveur). Pas un besoin actuel.

---

## C. Performances

### C1. Quel est le goulot d'étranglement le plus probable ?

Le listing combiné (fiches + clients) sur l'accueil. Décomposition :

1. `Accueil.jsx` lance **deux fetch en parallèle** : `listFiches` et `listClients`.
2. Côté backend, `listFiches` charge les fiches avec **EAGER** sur `client`, `creePar`, `modifiePar` → un seul `SELECT` joint mais avec 3 jointures.
3. `toSummary` accède aux **lignes** (`fiche.getLignes()`) pour calculer `totalRGM` et les `typesJeu` → potentiel **N+1** ici, parce que `lignes` est en `LAZY`.

Sur une journée de 50 fiches, ça reste sub-secondaire. Pour 5000 fiches, il faudrait :

- Ajouter `LEFT JOIN FETCH f.lignes` dans `findWithFilters` (en doublonnant l'entité avec un `DISTINCT` pour éviter le produit cartésien) ou
- Calculer les totaux directement en JPQL (`SELECT f.id, SUM(l.montantRGM), ...`).

### C2. Comment l'optimisation N+1 sur la dernière activité a-t-elle été faite ?

Avant : `clients.stream().map(c -> getDerniereActivite(c.id))` → 100 clients = 100 requêtes. Le commentaire dans le code dit littéralement « chargeait 15 s avec le SQL en FINE ».

Après (`ClientRepository.getDerniereActivitePourIds`) :

```java
"SELECT f.client.id, MAX(f.dateCreation) FROM FicheLABFT f " +
"WHERE f.client.id IN :ids GROUP BY f.client.id"
```

Une seule requête. Le résultat est rangé en `Map<Long, LocalDate>` côté Java, puis le service fait la jonction en mémoire :

```java
Map<Long, LocalDate> activites = clientRepository.getDerniereActivitePourIds(
        clients.stream().map(Client::getId).toList());
return clients.stream()
        .map(c -> { LocalDate activite = activites.get(c.getId()); ... })
        .toList();
```

C'est l'optimisation la plus impactante du projet.

### C3. Pourquoi les regex de l'import Excel sont-elles précompilées ?

Dans `ClientImportService`, deux patterns sont déclarés en `static final` :

```java
private static final Pattern CP_PATTERN = Pattern.compile("\\b(\\d{5})\\b");
private static final Pattern VILLE_FRANCE_PATTERN = Pattern.compile("(?i)^(.*?)[,\\s]+\\b(france|fr)\\b\\s*$");
```

Une feuille Excel typique a 200-2000 lignes. `Pattern.compile` à chaque ligne ferait 2000 compilations inutiles. Précompiler une fois coupe ce coût.

### C4. Quel est l'impact des `fetch=EAGER` sur `FicheLABFT.client` et `creePar` ?

Sur le listing de fiches, c'est exactement ce qu'on veut : le DTO `FicheSummaryResponse` a besoin du libellé client et du nom du caissier. Si on les avait laissés en `LAZY`, on aurait un N+1 dès la construction du DTO.

Le coût caché : pour `getFiche(id)` (le détail d'une fiche), on charge `client`, `creePar` et `modifiePar` même si le caller ne s'en sert pas. C'est marginal — une seule fiche → 3 jointures supplémentaires en SQL, pas une cascade exponentielle.

### C5. La méthode de connexion fait-elle un appel BD bloquant ?

Oui : `findByIdentifiant(identifiant)` est synchrone. Sur Payara, chaque requête HTTP a son thread du pool. Pour 100 connexions simultanées, on a 100 threads bloqués brièvement sur cette requête. Le `utilisateurs.identifiant` est `unique` (donc indexé) → la requête se fait en ~1 ms sur H2 / MySQL. Pas un sujet à notre échelle.

### C6. Le débouncing front est-il efficace ?

`setTimeout(load, 300)` annule et relance le timer à chaque frappe :

```jsx
useEffect(() => {
  const t = setTimeout(load, 300)
  return () => clearTimeout(t)
}, [load])
```

Pour un terme de recherche « Gustavo » (7 touches), on évite 6 requêtes HTTP sur 7. Le délai 300 ms est un compromis usuel : assez long pour absorber la frappe rapide, assez court pour rester réactif.

Limite : si l'utilisateur tape lentement (300 ms entre chaque touche), on déclenche une requête à chaque touche quand même. Solution avancée : utiliser un AbortController et annuler le fetch en cours avant d'en lancer un nouveau. Pas en place actuellement.

### C7. Les BigDecimal en `montantRGM` ne sont-ils pas coûteux ?

`BigDecimal` est ~5× plus lent que `double` pour les opérations arithmétiques, mais c'est obligatoire ici : les sommes de transactions doivent être exactes (un cumul `double` accumule des erreurs en virgule flottante). Sur 1000 lignes par fiche, on parle de quelques µs en plus, totalement négligeable face au coût du SQL. Le choix se justifie de lui-même.

### C8. Y a-t-il un cache HTTP côté frontend ?

Non. Chaque page recharge ses données via `fetch`. Justification :

- Les données sont **dynamiques par nature** (fiches du jour qui s'ajoutent en temps réel par les autres caissiers).
- Le **dataset est petit** (< 100 fiches par jour, ~quelques milliers de clients) — un fetch coûte ~30 ms réseau + ~10 ms BD.
- Un cache stale provoquerait des confusions opérationnelles bien plus coûteuses que la latence évitée.

Mitigation envisagée : `Cache-Control: max-age=60` sur les endpoints de listes statiques (départements, pays, préfectures). Aujourd'hui ces listes sont des constantes JS embarquées dans le bundle — donc déjà cachées gratuitement par le CDN du frontend.

---

## D. Évolutivité (scalabilité)

### D1. Que se passe-t-il si la charge passe à 100 caissiers simultanés ?

Le maillon faible serait :

1. **`SessionStore`** : `ConcurrentHashMap` tient sans problème 100 ou 100 000 sessions ; pas de souci de contention car les opérations sont fines (un `put` + un `get` indépendants par requête).
2. **Le pool de connexions JDBC** de Payara : par défaut, 32 connexions. À 100 caissiers actifs simultanés, on saturerait. Configurer `--maxpoolsize=128` à la création du pool.
3. **`FicheLABFTRepository.findWithFilters`** scannerait la table `fiches_labft` proportionnellement à sa taille. Ajouter un index composite sur `(date_creation, client_id)` accélèrerait drastiquement.

### D2. Que se passe-t-il avec 100 000 clients en base ?

`ClientRepository.findAll(search)` fait `LOWER(nom) LIKE '%toto%'` — un scan séquentiel, l'index sur `nom` n'est pas utilisable à cause du wildcard initial. Sur 100 000 clients, c'est ~150-300 ms. Au-delà, il faut :

- **Stocker la version normalisée** (`nom_search` = lowercase + sans accent) et indexer.
- Ou utiliser **PostgreSQL `pg_trgm` + GIN index** pour la recherche full-text.
- Ou un moteur dédié (Elasticsearch / Meilisearch) — overkill pour notre échelle.

### D3. Comment scaler le backend horizontalement (plusieurs instances Payara) ?

Trois points bloquants à résoudre :

1. **`SessionStore` en mémoire** : chaque instance aurait son propre stockage, un utilisateur connecté sur l'instance A serait inconnu de l'instance B derrière un load-balancer. Solutions :
   - **Sticky sessions** (le LB route toujours un client vers la même instance) — solution simple.
   - **Stockage externe** (Redis, Hazelcast) — meilleur passage à l'échelle.
   - **JWT signés** (auto-portants) — plus de stockage côté serveur.

2. **`TestInsert`** : tournerait sur chaque instance → multiplication des données. À désactiver en prod (idéalement via un profil ou un flag d'environnement).

3. **`drop-and-create-tables`** : chaque instance détruirait la base au démarrage — catastrophique. À basculer sur `none` + migrations Flyway.

### D4. Et le frontend ?

Le frontend est un **bundle statique** (`vite build` produit des fichiers HTML/JS/CSS hashés). Il scale trivialement :

- Hébergement derrière un CDN classique (Cloudflare, Fastly, S3 + CloudFront).
- Pas d'état serveur, donc autant d'utilisateurs qu'on veut.
- Le seul couplage est avec l'API : le proxy `/api` du dev est remplacé par une vraie URL absolue en prod (variable d'environnement `VITE_API_URL`).

### D5. Comment éviter l'éclatement du journal d'audit dans le temps ?

Le journal grossit indéfiniment (append-only). Sur 5 ans à 100 actions/jour, c'est ~180 000 entrées — encore très gérable. Mais à 10 000 actions/jour, on passerait à ~18M.

Stratégies :

1. **Partitioning par date** au niveau base (PostgreSQL `PARTITION BY RANGE (horodatage)`).
2. **Archivage** : déplacer les entrées > 5 ans dans une table `journal_actions_archive`. Notre cible légale est 5 ans pour les obligations LAB-FT, donc on a un horizon clair.
3. **`findAll(limit)` est déjà limité à 500 entrées** dans `JournalActionRepository`. Ajouter une pagination via `setFirstResult/setMaxResults` pour l'UI quand on aura besoin de remonter plus loin.

### D6. Apache POI charge tout l'Excel en mémoire — c'est tenable pour de gros imports ?

Le cas d'usage : import mensuel de quelques milliers de clients. Pour un classeur de 10 000 lignes / 15 colonnes, POI consomme ~30 Mo de heap — sans problème.

Au-delà (centaines de milliers de lignes), POI propose une **API streaming** (`SXSSFWorkbook` en écriture, `XSSF + SAX` en lecture) qui ne charge qu'une ligne à la fois. Le coût de migration est faible (changer `WorkbookFactory.create` par un parseur SAX). Documenté comme évolution possible.

### D7. Que se passe-t-il si `api-adresse.data.gouv.fr` est down lors d'un import ?

`AdresseService.resoudre(raw)` retourne `null` si l'appel échoue (pas de retry, pas de timeout explicite). Conséquence : la ligne d'import est traitée avec l'adresse parsée manuellement par `ClientImportService` (parsing maison du format `rue / CP ville / pays`). Si cette parsing échoue **et** que BAN est down, le client est créé avec l'adresse partielle et marqué `incomplete` dans la réponse.

Bonne propriété : **dégradation gracieuse**. L'import ne plante pas, il signale les lignes problématiques.

Améliorations possibles :
- **Timeout explicite** sur l'appel HTTP (actuellement on hérite des défauts JDK, potentiellement ~30 s).
- **Circuit breaker** (MicroProfile Fault Tolerance ou Resilience4j) pour court-circuiter si BAN devient lent.
- **Cache** local des adresses récemment résolues — on évite de réinterroger BAN pour 100 clients de la même commune.

### D8. Comment surveiller l'application en production ?

À mettre en place :

- **Health-check** : endpoint `/health` exposant l'état de la BD (`SELECT 1`) et la disponibilité des APIs externes. Pas encore présent — à ajouter via MicroProfile Health (3 lignes).
- **Métriques** : nombre de fiches/jour, latence des endpoints, taux d'erreur. Payara expose Prometheus via MicroProfile Metrics.
- **Tracing** : OpenTelemetry serait une bonne piste pour corréler une requête HTTP → JPA → API externe en un seul span tree.
- **Logs structurés** : actuellement `eclipselink.logging.level=WARNING`. Pour la prod, brancher SLF4J + JSON logs (passage par `Logback` ou `Log4j2`).

Le frontend pourrait être instrumenté avec Sentry pour capturer les erreurs JavaScript en production.

---

## E. Bonus : questions « pièges »

### E1. Quel est le bug le plus subtil que tu as corrigé ?

Le N+1 sur la dernière activité des clients (cf. C2). Symptôme : la liste des clients mettait 15 secondes à charger en environnement de test (commentaire littéral dans `ClientService.listClients`). Le profiling EclipseLink en `FINE` a montré N+1 requêtes. La fix a réduit le temps à ~50 ms.

Le commit `2d7e5e8` documente une autre correction : exposer `getChampsManquants()` au lieu de `isComplet()`, parce qu'un avertissement « profil incomplet » sans préciser ce qui manque oblige l'utilisateur à comparer mentalement champ par champ. La fix expose la liste des clés manquantes, permettant au front de surligner exactement les champs à compléter (fond hachuré orange).

### E2. Si tu reprenais le projet de zéro, qu'est-ce que tu changerais ?

1. **Hash de mot de passe** : BCrypt ou Argon2id dès le départ.
2. **Migrations versionnées** (Flyway) au lieu de `drop-and-create-tables`.
3. **Tests d'intégration** : il n'y a actuellement pas de couverture significative. Un test Arquillian par flow métier (création fiche, import Excel) éviterait les régressions.
4. **CI/CD** : pipeline GitHub Actions (build + test + déploiement). Le repo a un `git-workflow.md` mais pas d'automation.
5. **OpenAPI** : générer une spec via MicroProfile OpenAPI plutôt que de documenter manuellement les endpoints — le frontend pourrait générer son client automatiquement.

### E3. Quelle est la dette technique qui te gêne le plus aujourd'hui ?

L'absence de verrouillage optimiste sur `FicheLABFT` (cf. B7). À deux caissiers c'est invisible, mais en cas d'expansion à plusieurs sites, ce sera la première chose à corriger. C'est trois lignes de code (`@Version`) + une gestion d'exception côté frontend pour recharger et rejouer.

### E4. Pourquoi `Client.normaliserChamps()` est-il privé et appelé depuis `@PrePersist` / `@PreUpdate` plutôt que depuis le service ?

Garantie d'invariant : **toute** entrée en base passe par `JPA.persist()` ou `merge`, donc forcément par ce hook. Si demain un autre service écrit un client, il ne peut pas oublier d'appeler la normalisation. C'est l'application du principe « il vaut mieux que les choses soient impossibles à mal faire ».

### E5. Pourquoi la table `lignes_transaction` n'a-t-elle pas de contrainte CHECK sur les types ?

Les contraintes existent **au niveau JPA** (`@Enumerated(EnumType.STRING)` + l'enum lui-même) : EclipseLink rejette toute valeur qui ne correspond pas à une constante de l'enum. La contrainte n'est pas répliquée en SQL (ce qui serait une `CHECK constraint`) parce qu'un changement d'enum demanderait alors une migration. Compromis classique : la robustesse logique est portée par le code Java, la base se limite à un `VARCHAR(10)`.

Pour un projet plus sensible (réglementaire pur), on imposerait la CHECK au niveau base pour empêcher toute écriture parallèle (script SQL manuel, batch externe) d'introduire une valeur incohérente.

---

## F. Tableau récapitulatif des limites assumées

| # | Limite | Impact | Mitigation pour la production |
|---|---|---|---|
| 1 | SHA-256 sans sel + `equals` non timing-safe | Brute-force, rainbow tables, timing | BCrypt / Argon2id + `MessageDigest.isEqual` |
| 2 | Sessions en mémoire, expiration passive | Fuite mémoire (faible), pas de HA | Redis ou JWT signés ; purge active |
| 3 | CORS `*` | Élargit la surface d'attaque | Whitelist d'origines en production |
| 4 | Token en `localStorage` | Lecture par XSS | Cookie `HttpOnly` + CSP serveur |
| 5 | Pas de `@Version` sur les entités | Last-write-wins en cas de concurrence | `@Version` + gestion `OptimisticLockException` côté front |
| 6 | `drop-and-create-tables` | Perte données au redémarrage | Flyway / Liquibase + `none` |
| 7 | `TestInsert` chargé en CDI | Données de test en prod | Profil Maven ou flag env qui exclut la classe |
| 8 | Pas de health-check ni de métriques | Aveugle au runtime | MicroProfile Health + Metrics |
| 9 | Recherche `LIKE '%...%'` | Scan séquentiel à grand volume | Index trigram (PG) ou colonne normalisée |
| 10 | Pas de tests d'intégration | Risque de régression | Arquillian + Testcontainers |

Toutes ces limites sont documentées, comprises, et corrigeables avec un effort proportionné. Aucune n'est un blocage métier pour le cas d'usage actuel (un site, 3-10 utilisateurs, ~50 fiches/jour).
