# Git Workflow

Canonical repository: `Embark-Digitals/CV--Generator` (private).

## Branches

| Branch      | Purpose                                        |
| ----------- | ---------------------------------------------- |
| `main`      | Approved production releases only              |
| `build/mvp` | Active implementation and integration          |
| `feature/*` | Isolated additions                             |
| `fix/*`     | Corrections                                    |
| `audit/*`   | Independent audit work                         |

## Rules

1. Never push directly to `main`. Changes reach `main` through reviewed pull
   requests from `build/mvp`.
2. Commit after each coherent phase with a descriptive message.
3. Never commit secrets, `.env` files, or real personal CV data.
   The `.gitignore` blocks `private/`, `source-data/`, `.env*` and
   `paulina*` paths as a defence in depth.
4. `audit/*` branches never merge code; they hold findings only.

## Initial user setup

See [INITIAL_USER_SETUP.md](INITIAL_USER_SETUP.md).
