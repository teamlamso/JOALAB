# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
./mvnw clean package       # Build WAR artifact
./mvnw clean compile       # Compile only
./mvnw test                # Run all tests
./mvnw test -Dtest=ClassName                  # Run a single test class
./mvnw test -Dtest=ClassName#methodName       # Run a single test method
```

Output: `target/JOALABFT_Backend-1.0-SNAPSHOT.war`

## Stack

- **Jakarta EE 11** on Java 21
- **Hibernate ORM 7** + **EclipseLink 4** for persistence (JPA)
- **CDI** for dependency injection
- **JSF 4** for server-side UI
- **JUnit 5** for tests

## Architecture: Strict MVC

All code must follow MVC. Place new code in the appropriate package under `com.amael.joalabft_backend`:

| Layer | Package | Responsibility |
|---|---|---|
| **Model** | `model/` | Entities, DTOs, business logic, data access |
| **View** | `webapp/` (JSPs/Facelets) | UI pages, templates, display components |
| **Controller** | `controller/` | Request handling, navigation, Model↔View binding |

Before implementing any feature, think through how it fits into MVC. Never mix responsibilities between layers.

## Git Workflow

- Main development branch: `dev`
- Feature branches: `feat/feature-name`
- Bug fix branches: `fix/bugfix-name`

Always work on a dedicated branch. Commits must be clear and concise.

## Documentation

All documentation lives in `docs/`:
- [`docs/architecture.md`](docs/architecture.md) — stack, MVC layers, data flow
- [`docs/setup.md`](docs/setup.md) — prerequisites, build, deploy, IntelliJ config
- [`docs/git-workflow.md`](docs/git-workflow.md) — branch strategy, commit conventions
- [`docs/database.md`](docs/database.md) — JPA config, datasource setup, adding entities
- `docs/features/<feature-name>.md` — one file per feature

Add Javadoc to all classes, public methods, and non-trivial components. Skip comments that merely restate the code.
