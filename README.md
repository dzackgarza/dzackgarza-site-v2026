# dzackgarza-site-v2026

The content surface for [dzackgarza.com](https://dzackgarza.com/) — pages,
data, assets, and standalone apps. The static-site generator is a dependency
([dzackgarza/pandoc-ssg](https://github.com/dzackgarza/pandoc-ssg)), invoked
through `just`; it is not vendored here.

## Usage

```
just build      # content/ -> dist/
just serve      # build, then preview over HTTP
just check      # build, then fail on broken internal links
just new "Title"  # scaffold a blog post
```

Recipes call `bunx github:dzackgarza/pandoc-ssg`. To develop against a local
generator checkout, override the `SSG` variable:

```
SSG="bun /path/to/pandoc-ssg/src/cli.ts" just build
```

## Layout

```
content/
  *.md            # pages (opt in with `site.page: true` frontmatter)
  _data/          # navigation.toml, math-macros.yaml, items.yaml (component data)
  _site.toml      # passthrough subtrees, directory→type inference
  assets/         # images, PDFs, fonts (Git LFS); copied verbatim to dist/
  */              # standalone apps copied verbatim (opaque passthrough)
```

Binary assets (PDF, PNG, JPG, fonts, wasm, …) are stored via Git LFS; see
`.gitattributes`.
