# setup-nctl

GitHub Action that installs [`nctl`](https://github.com/ninech/nctl), the command line interface
for the [Nine](https://nine.ch) API and [Deploio](https://deplo.io).

## Usage

```yaml
- uses: ninech/setup-nctl@v1
  with:
    version: latest # or e.g. 1.20.0
- run: nctl auth login
  env:
    NCTL_API_CLIENT_ID: ${{ secrets.NCTL_API_CLIENT_ID }}
    NCTL_API_CLIENT_SECRET: ${{ secrets.NCTL_API_CLIENT_SECRET }}
    NCTL_ORGANIZATION: ${{ secrets.NCTL_ORGANIZATION }}
- run: nctl get apps
```

Downloads nctl from its [GitHub releases](https://github.com/ninech/nctl/releases), verifies the
SHA-256 checksum, and caches it in the tool cache. Supports Linux, macOS and Windows on x64 and
arm64.

## Inputs

| Input     | Default  | Description              |
| --------- | -------- | ------------------------ |
| `version` | `latest` | nctl version to install. |

## Outputs

| Output    | Description                             |
| --------- | --------------------------------------- |
| `version` | The installed version.                  |
| `path`    | Directory containing the `nctl` binary. |

## Development

```sh
npm ci
npm run all # format check, lint, typecheck, tests, build
```

## Releases

Releases are created automatically from the commits on `main` with
[semantic-release](https://semantic-release.gitbook.io). PR titles must be
[Conventional Commits](https://www.conventionalcommits.org) (`fix: ...`, `feat: ...`,
`feat!: ...`), because squash merging makes them the commit message on `main`.

`dist/` is not committed on `main`. GitHub runs actions from the repository contents, so each
release adds the built `dist/` in a commit on top of the released `main` commit:

- `vX.Y.Z` and the moving major tag `vX` point to that commit. Reference these.
- `src/vX.Y.Z` points to the released `main` commit. semantic-release uses these tags to find
  the previous version.

Referencing a branch or a `main` commit doesn't work, because it has no `dist/`.

## License

[Apache License 2.0](LICENSE)
