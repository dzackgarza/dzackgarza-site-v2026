# dzackgarza.com Pandoc bundle

This directory is the site-owned Pandoc bundle for dzackgarza.com.

`pandoc-ssg` is the compiler glue: it discovers content, loads this registry,
invokes Pandoc, copies declared assets, and writes the output tree. It does not
own this site's visual language or HTML structure.

This bundle owns:

- page-type registration in `registry.toml`
- Pandoc defaults in `defaults/`
- HTML templates in `templates/`
- site-owned Lua filters in `filters/`
- the Tufte-based theme layer in `assets/theme/`
- the MathJax macro extraction helper in `bin/`

Tufte is the deliberate prose and academic-typography choice for this site.
Navigation, taxonomy chips, page chrome, and any future component substrate are
site-theme decisions here, not generator responsibilities.

The current defaults also use the author's canonical Pandoc filter toolchain via
`PANDOC_DIR` for:

- `convert_amsthm_envs.lua`
- `tikzcd.lua`

Those filters are not part of `pandoc-ssg`; they are author-level Pandoc tooling.
