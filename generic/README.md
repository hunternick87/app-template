# Generator overlays

Files in this directory are copied only when the matching option is selected.

- `db/sqlite` supplies the SQLite schema.
- `db/postgresql` supplies the PostgreSQL schema.
- `electron` is reserved for the Electron platform overlay.

`template/` is the only canonical base application. Do not add a second runnable app at the repository root.
