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

# Install the pinned generator (run once after clone, and after `just update`)
setup:
    bun install

# Compile content/ into dist/
build:
    {{SSG}} build --pandoc {{PANDOC}}

# Build, then preview the site over HTTP (Ctrl-C to stop)
serve: build
    {{SSG}} serve

# Build, then fail on any malformed page or broken internal link
check:
    {{SSG}} check --pandoc {{PANDOC}}

# QC gate (run by the global pre-commit hook): build + fail on malformed pages
# or broken internal links.
test: check

# pandoc-ssg's `check` only validates internal links in static HTML; the
# notes/talks listings are client-rendered from content/_data/items.yaml, so
# their external + asset links slip past it. This lints that data file plus
# every built page, resolving root-relative links against the live local
# deployment. Vendored/archived third-party artifacts (example dumps, slide
# decks) are skipped.
#
# Check for dead links across the site + collection data (lychee)
check-links: build
    lychee --no-progress --base-url http://website.localhost/ \
        --max-concurrency 8 --timeout 20 \
        --accept '200,206,301,302,307,308,403' \
        --exclude-path dist/assets/examples \
        --exclude-path dist/assets/talks \
        --exclude-path dist/square_topologies \
        content/_data/items.yaml dist

# Build, then drive a headless browser over every page: fail on JS/console
# errors, missing landmarks, or MathJax errors (needs the playwright dep + a
# browser: `bunx playwright install chromium`)
verify:
    {{SSG}} verify --pandoc {{PANDOC}}

# Scaffold a new blog post: just new "My Post Title"
new TITLE:
    {{SSG}} new post "{{TITLE}}" --pandoc {{PANDOC}}

# Bump the generator to the latest published version (updates bun.lock)
update:
    bun update pandoc-ssg

# Remove build output
clean:
    rm -rf dist
