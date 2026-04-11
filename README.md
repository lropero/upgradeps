# upgradeps · [![npm version](https://badge.fury.io/js/upgradeps.svg)](https://www.npmjs.com/package/upgradeps) [![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)

Audit and upgrade all dependencies in package.json.

**upgradeps** is a small command-line tool that inspects the dependencies declared in your package.json file, compares them with the latest versions published on the npm registry, and optionally updates package.json for you.

![upgradeps screenshot](https://user-images.githubusercontent.com/4450399/184115801-ca0fa405-32f3-49b3-9db3-bfb86a804845.png)

## Features

- Dry run by default, never changing files unless explicitly told to.
- Supports all standard dependency groups: dependencies, devDependencies, peerDependencies, optionalDependencies, bundledDependencies.
- Lets you restrict upgrades to minor and patch versions only.
- Avoids upgrading to versions published too recently (configurable minimum release age, default 24 hours).
- Automatically removes semver `^` carets when upgrading, locking your package.json to exact versions.
- Can use npm or yarn as the package manager.
- Supports a simple JSON configuration file so you do not have to repeat flags.

## Quick start

From the root of a Node project:

1. Audit dependencies without changing anything:

```sh
npx upgradeps
```

2. Apply all available upgrades (carets are removed automatically):

```sh
npx upgradeps -u
```

3. Upgrade only minor and patch versions:

```sh
npx upgradeps -u -m
```

## CLI usage

upgradeps is intended to be used via npx:

```sh
npx upgradeps [options]
```

### -a / --age \<minutes\>

Set the minimum age in minutes a published version must have before it is eligible as an upgrade target.

If a newer version exists but was published less than this many minutes ago, it is skipped and the next eligible version (if any) is selected instead. When no eligible upgrade exists because the newest candidate is too recent, the tool reports the skipped version so you can see what was held back.

```sh
npx upgradeps -a 720
```

Set to `0` to disable the age gate and consider all published versions:

```sh
npx upgradeps -a 0
```

### -g / --groups \<groups\>

Specify dependency groups to process as a comma-separated list.

Available groups:

- bundledDependencies
- dependencies
- devDependencies
- optionalDependencies
- peerDependencies

If omitted, all groups present in package.json are processed.

```sh
npx upgradeps -g dependencies,devDependencies
```

### -m / --minor

Process only minor and patch updates, ignoring major version bumps.

Use this when you want safe, non-breaking upgrades.

```sh
npx upgradeps -m
```

### -r / --registry \<registry\>

Use a custom npm registry URL.

```sh
npx upgradeps -r https://registry.npmjs.org
```

### -s / --skip \<packages\>

Skip specified packages during upgrade, as a comma-separated list.

This is useful when a dependency is pinned for compatibility reasons.

```sh
npx upgradeps -u -s react,react-dom
```

### -u / --upgrade

Modify package.json in place, writing upgraded versions back to each dependency group. Semver `^` carets are automatically removed, locking dependencies to exact versions.

Without this flag, upgradeps only prints a report.

```sh
npx upgradeps -u
```

### -v / --verbose

Print information about all dependencies (including those that are already at their latest version).

```sh
npx upgradeps -v
```

### -y / --yarn

Use yarn instead of npm when running install commands during an upgrade.

```sh
npx upgradeps -u -y
```

## Configuration file

Instead of repeating the same flags, you can add a `.upgradeps.json` file next to your package.json to define default behavior.

If you run upgradeps without any options, `.upgradeps.json` is loaded (if it exists) and its values are used (with built-in defaults where needed). If you pass any CLI options, `.upgradeps.json` is ignored for that run and only CLI flags + defaults are used.

### Example .upgradeps.json

```json
{
  "age": 1440,
  "groups": ["dependencies", "devDependencies"],
  "minor": false,
  "registry": "",
  "skip": ["react", "react-dom"],
  "upgrade": false,
  "verbose": false,
  "yarn": false
}
```

### Available options

All properties are optional. When a property is omitted, its default is used.

- **`age`** (number): Set minimum age in minutes a published version must have before it is eligible for upgrade. Versions published more recently are skipped. Default: `1440` (24 hours)
- **`groups`** (array of strings): Specify dependency groups to process. Default: `[]` (all supported groups present in package.json)
- **`minor`** (boolean): Process only minor and patch updates. Default: `false`
- **`registry`** (string): Set custom npm registry URL. Default: `""`
- **`skip`** (array of strings): Skip packages during upgrade. Default: `[]` (none)
- **`upgrade`** (boolean): Upgrade package.json with latest versions. Default: `false`
- **`verbose`** (boolean): Print information for up-to-date dependencies as well. Default: `false`
- **`yarn`** (boolean): Use yarn instead of npm. Default: `false`

### CLI vs config

- Running upgradeps with no options uses `.upgradeps.json` (if present) + built-in defaults.
- Running upgradeps with one or more options uses only CLI flags + built-in defaults (`.upgradeps.json` is ignored for that run).

In other words, `.upgradeps.json` is for _plain_ runs with no flags (as soon as you pass options, you're opting into a fully CLI-driven run).

## Tips

- Run a dry audit first (without -u) to see what will change.
- Commit your package.json and lockfile before running upgradeps so you can easily revert if needed.
- Combine -u with -m to perform safe, incremental updates on large projects.

## License

ISC

## Links

- npm package page: https://www.npmjs.com/package/upgradeps
- Repository and issue tracker: https://github.com/lropero/upgradeps
