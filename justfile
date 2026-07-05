# dzackgarza-site-v2026 — the content surface for dzackgarza.com.
#
# This repo holds pages, _data, assets, and standalone apps. The static-site
# generator (pandoc-ssg) is a *dependency*, declared in package.json and pinned
# by bun.lock — not vendored here. `just setup` installs repo dependencies and
# fetches LFS assets; `just setup-browser` installs the Chromium runtime needed
# for browser verification. Recipes invoke the locally-installed generator
# (NOT `bunx github:…`, which caches a stale clone and is not reproducible).

SSG := "bunx pandoc-ssg"
PANDOC := "pandoc"

# Show available recipes
default:
    @just --list

# Install repo dependencies and fetch Git LFS assets
setup: _check-setup-tools
    bun install
    git lfs pull

# Install Chromium for browser verification
setup-browser: _check-bun
    bun install
    bunx playwright install chromium

# Compile content/ into dist/
build: _build

# Build, then preview the site over HTTP (Ctrl-C to stop)
serve: build
    {{SSG}} serve

# Run the broad live-site readiness gate
check: _check-build _check-orphans _check-homology-fixtures _check-links

# Run browser verification over the built site
verify: _verify

# Rebuild and validate dist/ for static hosting
deploy: check verify

# Run the local QC gate used by commit hooks
test: check

# Run the push/CI gate
test-ci: test

# Bump the generator to the latest published version
update: _update-generator

# Scaffold a new blog post: just new "My Post Title"
new TITLE:
    {{SSG}} new post "{{TITLE}}" --pandoc {{PANDOC}}

# Remove build output
clean:
    rm -rf dist
    rm -f content/_data/items/projects.yaml

[private]
_check-bun:
    @command -v bun >/dev/null || { echo "Missing required tool: bun"; exit 1; }

[private]
_check-setup-tools: _check-bun
    @command -v pandoc >/dev/null || { echo "Missing required tool: pandoc"; exit 1; }
    @git lfs version >/dev/null 2>&1 || { echo "Missing required tool: git-lfs"; exit 1; }

[private]
_project-items:
    python3 scripts/generate-project-items.py

[private]
_build: _project-items
    {{SSG}} build --pandoc {{PANDOC}}

[private]
_check-build: _project-items
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
        --exclude-path content/projects/square_topologies \
        --exclude-path dist/assets/examples \
        --exclude-path dist/assets/talks \
        --exclude-path dist/projects/square_topologies \
        content dist

# pandoc-ssg's `check` validates that internal links *resolve*, but not that a
# page is linked *to* by anything — a page can build, sit in the sitemap, and
# still be reachable only by typing its URL. This flags pages unreachable from
# the home page + nav (following static links and island-injected ones).
[private]
_check-orphans: _build
    python3 scripts/check-orphans.py

[private]
_check-homology-fixtures:
    bun scripts/check-homology-fixtures.mjs

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
