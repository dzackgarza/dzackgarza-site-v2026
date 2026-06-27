# dzackgarza-site-v2026

The content surface for [dzackgarza.com](https://dzackgarza.com/) — pages,
data, assets, standalone apps, and the Pandoc template bundle that defines the
site's HTML structure and visual language. The static-site generator is a
dependency ([dzackgarza/pandoc-ssg](https://github.com/dzackgarza/pandoc-ssg)),
invoked through `just`; it is glue for compiling this repo's content and
templates, not the owner of this site's theme.

## Usage

```
just setup        # install the pinned generator (once, after clone)
just build        # content/ -> dist/
just serve        # build, then preview over HTTP
just check        # build, then fail on malformed pages or broken internal links
just verify       # build, then browser-check every page (JS errors, MathJax, landmarks)
just new "Title"  # scaffold a blog post
just update       # bump the generator to the latest published commit
```

`just verify` drives a headless browser (Playwright) over every page; run
`bunx playwright install chromium` once to fetch the browser.

The generator [pandoc-ssg](https://github.com/dzackgarza/pandoc-ssg) is a
declared dependency (`package.json`), pinned by `bun.lock` so builds are
reproducible — exactly like Jekyll in a `Gemfile`. Recipes invoke the installed
generator, *not* `bunx github:…` (which caches a stale clone and is not
reproducible). Upgrade deliberately with `just update`.

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

Changing dzackgarza.com layout, navigation markup, typography, CSS, or other
theme behavior should normally change this bundle, not the generic generator.
The generator may still provide a starter bundle for new projects, but this
repo owns the bundle used to render this site.

## Layout

```
content/
  *.md            # pages (opt in with `site.page: true` frontmatter)
  _data/          # navigation.toml, items.yaml (merged component data), items/*.yaml (split sources)
  _site.toml      # passthrough subtrees, directory→type inference
  assets/         # images, PDFs, fonts (Git LFS); copied verbatim to dist/
  */              # standalone apps copied verbatim (opaque passthrough)
pandoc/
  templates/      # site-owned Pandoc HTML templates
  defaults/       # site-owned Pandoc defaults
  filters/        # site-owned Pandoc Lua filters
  assets/theme/   # site-owned Tufte/theme CSS
```

Binary assets (PDF, PNG, JPG, fonts, wasm, …) are stored via Git LFS; see
`.gitattributes`.
