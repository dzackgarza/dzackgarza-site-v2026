# dzackgarza-site-v2026 — the content surface for dzackgarza.com.
#
# This repo holds pages, _data, assets, and standalone apps. The static-site
# generator (pandoc-ssg) is a *dependency*, declared in package.json and pinned
# by bun.lock — not vendored here. `just setup` installs it; `just update`
# bumps it to the latest published commit. Recipes invoke the locally-installed
# generator (NOT `bunx github:…`, which caches a stale clone and is not
# reproducible).

SSG := "bunx pandoc-ssg"
PANDOC := "pandoc"

# Show available recipes
default:
    @just --list

# Install dependencies, LFS assets, and browser verification runtime
setup:
    bun install
    git lfs pull
    bunx playwright install chromium

# Compile content/ into dist/
build: _build

# Build, then preview the site over HTTP (Ctrl-C to stop)
serve: build
    {{SSG}} serve

# Run the broad live-site readiness gate
check: _check-build _check-orphans _check-links

# Run browser verification over the built site
verify: _verify

# Rebuild and validate dist/ for static hosting
deploy: check verify

# Run the local QC gate used by commit hooks
test: check

# Run the push/CI gate
test-ci: test

# Scaffold a new blog post: just new "My Post Title"
new TITLE:
    {{SSG}} new post "{{TITLE}}" --pandoc {{PANDOC}}

# Remove build output
clean:
    rm -rf dist

[private]
_build:
    {{SSG}} build --pandoc {{PANDOC}}

[private]
_check-build:
    {{SSG}} check --pandoc {{PANDOC}}

# pandoc-ssg's `check` only validates internal links in static HTML; the
# collection data is rendered from content/_data/ sources such as
# content/_data/items/*.yaml, so external + asset links slip past it. This
# lints the content source (so even *bare* URLs that never render as <a href>
# are checked) plus every built page, resolving root-relative links against the
# live local deployment.
# Vendored/archived third-party artifacts (example dumps, slide decks) are
# skipped.
[private]
_check-links: _build
    lychee --no-progress --base-url http://website.localhost/ \
        --max-concurrency 8 --timeout 20 \
        --accept '200,206,301,302,307,308,403' \
        --exclude-path content/assets/examples \
        --exclude-path content/assets/talks \
        --exclude-path content/square_topologies \
        --exclude-path dist/assets/examples \
        --exclude-path dist/assets/talks \
        --exclude-path dist/square_topologies \
        content dist

# pandoc-ssg's `check` validates that internal links *resolve*, but not that a
# page is linked *to* by anything — a page can build, sit in the sitemap, and
# still be reachable only by typing its URL. This flags pages unreachable from
# the home page + nav (following static links and island-injected ones).
[private]
_check-orphans: _build
    python3 scripts/check-orphans.py

# Build, then drive a headless browser over every page: fail on JS/console
# errors, missing landmarks, or MathJax errors (needs the playwright dep + a
# browser: `bunx playwright install chromium`)
[private]
_verify:
    {{SSG}} verify --pandoc {{PANDOC}}

# Bump the generator to the latest published version (updates bun.lock)
[private]
_update-generator:
    bun update pandoc-ssg
