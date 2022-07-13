# upgradeps &middot; [![npm version](https://badge.fury.io/js/upgradeps.svg)](https://www.npmjs.com/package/upgradeps)&nbsp;[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)

Blazingly fast command-line utility to **upgra**de all **dep**endencie**s** in package.json to latest version, potentially updating packages across major versions.

### Installation and usage

Installation not required, simply run in project's root anytime you'd like to update dependencies:

```sh
npx upgradeps
```

### Options

##### `-d` / `--dev`

Upgrade devDependencies only

```sh
npx upgradeps -d
```

##### `-m` / `--modules`

Sync node_modules if updates

```sh
npx upgradeps -m
```

##### `-p` / `--patch`

Skip major version upgrades

```sh
npx upgradeps -p
```

##### `-q` / `--query`

Query versions without upgrading (dry run)

```sh
npx upgradeps -q
```

##### `-r` / `--registry`

Set the npm registry to use

```sh
npx upgradeps -r https://registry.npmjs.org/
```

##### `-s` / `--skip`

Skip packages

```sh
npx upgradeps -s react,react-dom
```

##### `-y` / `--yarn`

Use yarn instead of npm

```sh
npx upgradeps -y
```
