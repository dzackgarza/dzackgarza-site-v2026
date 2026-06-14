# dzackgarza-site-v2026

The content surface for [dzackgarza.com](https://dzackgarza.com/) — pages,
data, assets, and standalone apps. The static-site generator is a dependency
([dzackgarza/pandoc-ssg](https://github.com/dzackgarza/pandoc-ssg)), invoked
through `just`; it is not vendored here.

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

## Layout

```
content/
  *.md            # pages (opt in with `site.page: true` frontmatter)
  _data/          # navigation.toml, items.yaml (component data)
  _site.toml      # passthrough subtrees, directory→type inference
  assets/         # images, PDFs, fonts (Git LFS); copied verbatim to dist/
  */              # standalone apps copied verbatim (opaque passthrough)
```

Binary assets (PDF, PNG, JPG, fonts, wasm, …) are stored via Git LFS; see
`.gitattributes`.
