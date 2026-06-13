# dzackgarza-site-v2026 — the content surface for dzackgarza.com.
#
# This repo holds pages, _data, assets, and standalone apps. The static-site
# generator is a *dependency*, not vendored here: recipes invoke it via bunx
# pointed at GitHub. During local generator development, override the SSG var:
#   SSG="bun /home/dzack/gitclones/pandoc-ssg/src/cli.ts" just build

SSG := env_var_or_default("SSG", "bunx github:dzackgarza/pandoc-ssg")

# Compile content/ into dist/
build:
    {{SSG}} build

# Build, then preview the site over HTTP (Ctrl-C to stop)
serve: build
    {{SSG}} serve

# Build, then fail if any internal link is broken
check:
    {{SSG}} check

# Scaffold a new blog post: just new "My Post Title"
new TITLE:
    {{SSG}} new post "{{TITLE}}"

# Remove build output
clean:
    rm -rf dist
