# dzackgarza-site-v2026

The content surface for [dzackgarza.com](https://dzackgarza.com/) — pages, data, assets, standalone apps, and the Pandoc template bundle that defines the site's HTML structure and visual language.
The static-site generator is a dependency ([dzackgarza/pandoc-ssg](https://github.com/dzackgarza/pandoc-ssg)), invoked through `just`; it is glue for compiling this repo's content and templates, not the owner of this site's theme.

## Usage

```
just setup          # install deps, generator config, and LFS assets
just doctor         # report system tools, versions, and setup prerequisites
just build          # content/ -> dist/
just serve          # build, then preview over HTTP
just check          # build, then fail on malformed pages or broken internal links
just setup-browser  # install Chromium for browser verification
just verify         # browser-check every page (JS errors, MathJax, landmarks)
just new "Title"    # scaffold a blog post
just update         # bump the generator to the latest published commit
```

## Requirements

Install these system tools before running the project recipes:

- `just >= 1.30.0`

- `bun >= 1.2.0`

- `pandoc >= 3.6.0`

- `uv >= 0.7.0`

- `git-lfs >= 3.0.0`

Run `just doctor` to print the exact tools found on the current machine, the versions detected, and any missing or too-old setup prerequisites.
`just setup` starts with the same preflight and fails before installing dependencies when a required system tool is missing or below the minimum version.

Run `just setup` once after cloning.
It runs `bun install` to install the pinned dependency graph from `package.json` and `bun.lock`, verifies the local `node_modules/.bin/pandoc-ssg` executable, installs the tracked generator config from `config/pandoc-ssg/config.toml` into `$XDG_CONFIG_HOME/pandoc-ssg/config.toml` (default: `~/.config/pandoc-ssg/config.toml`), then runs `git lfs pull` to fetch binary assets.

The installed generator config points at the author's central Pandoc toolchain:

- `~/.pandoc`

- `~/.pandoc/styles/macros/mathjax-sources.txt`

Those paths must exist before `just setup` can install the config.
They are shared author-level Pandoc state, not vendored site assets.

`just setup` does not install the browser runtime used by `just verify`. Run `just setup-browser` only when you need the Playwright Chromium browser for `just verify` or `just deploy`.

`just check` and `just test` also require `lychee` for link checking.

The generator [pandoc-ssg](https://github.com/dzackgarza/pandoc-ssg) is a declared dependency (`package.json`), pinned by `bun.lock` so builds are reproducible — exactly like Jekyll in a `Gemfile`. Recipes invoke the installed local executable at `node_modules/.bin/pandoc-ssg`, *not* `bunx github:…` (which caches a stale clone and is not reproducible).
Upgrade deliberately with `just update`.

To develop against a local generator checkout instead:

```
SSG="bun /path/to/pandoc-ssg/src/cli.ts" just build
```

## Template bundle

The checked-in `pandoc/` directory is the site-owned Pandoc bundle:

- `pandoc/templates/` defines page and post HTML.

- `pandoc/defaults/` defines the Pandoc defaults used for each page type.

- `pandoc/filters/` contains Lua filters for transclusion, components, math, and theorem labels.

- `pandoc/assets/theme/` contains the Tufte-based visual layer and site-specific CSS.

- `pandoc/registry.toml` ties page types, schemas, templates, defaults, filters, and scaffolds together.

Changing dzackgarza.com layout, navigation markup, typography, CSS, or other theme behavior should normally change this bundle, not the generic generator.
The generator may still provide a starter bundle for new projects, but this repo owns the bundle used to render this site.

## Layout

```
content/
  *.md            # pages (opt in with `site.page: true` frontmatter)
  _data/          # navigation.toml plus editable data-source YAML, e.g. items/*.yaml
  _site.toml      # passthrough subtrees, directory→type inference
  assets/         # images, PDFs, fonts (Git LFS); copied verbatim to dist/
  projects/       # standalone apps; each folder has index.html + project.toml
pandoc/
  templates/      # site-owned Pandoc HTML templates
  defaults/       # site-owned Pandoc defaults
  filters/        # site-owned Pandoc Lua filters
  assets/theme/   # site-owned Tufte/theme CSS
```

Binary assets (PDF, PNG, JPG, fonts, wasm, …) are stored via Git LFS; see `.gitattributes`.

Project landing-page data is generated from `content/projects/*/project.toml` by `just build`; do not edit `content/_data/items/projects.yaml` by hand.
