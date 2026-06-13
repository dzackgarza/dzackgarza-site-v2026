# dzackgarza-site-v2026 — the content surface for dzackgarza.com.
#
# This repo holds pages, _data, assets, and standalone apps. The static-site
# generator (pandoc-ssg) is a *dependency*, declared in package.json and pinned
# by bun.lock — not vendored here. `just setup` installs it; `just update`
# bumps it to the latest published commit. Recipes invoke the locally-installed
# generator (NOT `bunx github:…`, which caches a stale clone and is not
# reproducible).

SSG := "bunx pandoc-ssg"

# Install the pinned generator (run once after clone, and after `just update`)
setup:
    bun install

# Compile content/ into dist/
build:
    {{SSG}} build

# Build, then preview the site over HTTP (Ctrl-C to stop)
serve: build
    {{SSG}} serve

# Build, then fail on any malformed page or broken internal link
check:
    {{SSG}} check

# Scaffold a new blog post: just new "My Post Title"
new TITLE:
    {{SSG}} new post "{{TITLE}}"

# Bump the generator to the latest published version (updates bun.lock)
update:
    bun update pandoc-ssg

# Remove build output
clean:
    rm -rf dist
