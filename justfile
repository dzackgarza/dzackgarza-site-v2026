# dzackgarza-site-v2026 — the content surface for dzackgarza.com.
#
# This repo holds pages, _data, assets, and standalone apps. The static-site
# generator (pandoc-ssg) is a *dependency*, declared in package.json and pinned
# by bun.lock — not vendored here. `just setup` installs repo dependencies,
# installs the generator's XDG config, and fetches LFS assets; `just setup-browser`
# installs the Chromium runtime needed for browser verification. Recipes invoke
# the explicit local bin under node_modules.

# ai-review-ci contract variables consumed by doctor and workflow installers.
# The QC tiers below delegate to the central implementation in
# ~/ai-review-ci/justfiles/bun.just while keeping this repo as the caller root.
ai_review_ci_schema_version := "1"
ai_review_ci_profile := "bun"
ai_review_ci_ref := "main"
ai_review_ci_release_channel := "main"
ai_review_ci_workflow_template_version := "1"
ai_review_ci_local_delegation := "global-justfile"
ai_review_ci_default_branch := "main"

SSG := "bun node_modules/.bin/pandoc-ssg"
PLAYWRIGHT := "bun node_modules/.bin/playwright"
PANDOC := "pandoc"
JUST_MIN := "1.30.0"
BUN_MIN := "1.2.0"
UV_MIN := "0.7.0"
PANDOC_MIN := "3.6.0"
GIT_LFS_MIN := "3.0.0"

# Show available recipes
default:
    @just --list

# Install dependencies, generator config, and Git LFS assets
setup: _preflight
    bun install
    just _check-local-generator
    just _install-generator-config
    git lfs pull

# Report system tools and minimum versions needed by this project
doctor:
    @just _doctor

[private]
_doctor fail_mode="":
    #!/usr/bin/env bash
    set -euo pipefail
    fail_mode="{{fail_mode}}"
    errors=0

    version_ge() {
        local have="${1%%[-+~]*}"
        local need="${2%%[-+~]*}"
        local IFS=.
        local -a have_parts need_parts
        read -ra have_parts <<< "$have"
        read -ra need_parts <<< "$need"
        local i have_part need_part
        for ((i = 0; i < 4; i++)); do
            have_part="${have_parts[i]:-0}"
            need_part="${need_parts[i]:-0}"
            have_part="${have_part//[^0-9]/}"
            need_part="${need_part//[^0-9]/}"
            have_part="${have_part:-0}"
            need_part="${need_part:-0}"
            if ((10#$have_part > 10#$need_part)); then
                return 0
            fi
            if ((10#$have_part < 10#$need_part)); then
                return 1
            fi
        done
        return 0
    }

    check_tool() {
        local name="$1"
        local command_name="$2"
        local min_version="$3"
        local version_command="$4"
        local version_regex="$5"

        if ! command -v "$command_name" >/dev/null 2>&1; then
            printf 'missing: %s >= %s\n' "$name" "$min_version"
            errors=$((errors + 1))
            return
        fi

        local path output version
        path="$(command -v "$command_name")"
        if ! output="$(bash -lc "$version_command" 2>&1)"; then
            printf 'broken:  %s at %s (version command failed)\n' "$name" "$path"
            printf '%s\n' "$output"
            errors=$((errors + 1))
            return
        fi

        if [[ "$output" =~ $version_regex ]]; then
            version="${BASH_REMATCH[1]}"
        else
            printf 'broken:  %s at %s (could not parse version)\n' "$name" "$path"
            printf '%s\n' "$output"
            errors=$((errors + 1))
            return
        fi

        if version_ge "$version" "$min_version"; then
            printf 'ok:      %s %s at %s\n' "$name" "$version" "$path"
        else
            printf 'old:     %s %s at %s (need >= %s)\n' "$name" "$version" "$path" "$min_version"
            errors=$((errors + 1))
        fi
    }

    printf 'System tool preflight:\n'
    check_tool "just" "just" "{{JUST_MIN}}" "just --version" '^just[[:space:]]+([0-9][0-9A-Za-z.+~:-]*)'
    check_tool "bun" "bun" "{{BUN_MIN}}" "bun --version" '^([0-9][0-9A-Za-z.+~:-]*)'
    check_tool "uv" "uv" "{{UV_MIN}}" "uv --version" '^uv[[:space:]]+([0-9][0-9A-Za-z.+~:-]*)'
    check_tool "pandoc" "pandoc" "{{PANDOC_MIN}}" "pandoc --version" '^pandoc[[:space:]]+([0-9][0-9A-Za-z.+~:-]*)'
    check_tool "git-lfs" "git-lfs" "{{GIT_LFS_MIN}}" "git-lfs version" '^git-lfs/([0-9][0-9A-Za-z.+~:-]*)'

    printf '\nProject state:\n'
    if test -f config/pandoc-ssg/config.toml; then
        printf 'ok:      tracked generator config config/pandoc-ssg/config.toml\n'
    else
        printf 'missing: tracked generator config config/pandoc-ssg/config.toml\n'
        errors=$((errors + 1))
    fi
    if test -d "$HOME/.pandoc"; then
        printf 'ok:      pandoc home %s/.pandoc\n' "$HOME"
    else
        printf 'missing: pandoc home %s/.pandoc\n' "$HOME"
        errors=$((errors + 1))
    fi
    if test -f "$HOME/.pandoc/styles/macros/mathjax-sources.txt"; then
        printf 'ok:      MathJax macro manifest\n'
    else
        printf 'missing: MathJax macro manifest %s/.pandoc/styles/macros/mathjax-sources.txt\n' "$HOME"
        errors=$((errors + 1))
    fi

    printf '\nOptional check/test tool:\n'
    if command -v lychee >/dev/null 2>&1; then
        printf 'ok:      lychee at %s\n' "$(command -v lychee)"
    else
        printf 'missing: lychee (required by just check/test, not by just setup)\n'
    fi

    printf '\nOptional authoring tool:\n'
    if gum_path="$(type -P gum 2>/dev/null)"; then
        printf 'ok:      gum at %s\n' "$gum_path"
    else
        printf 'missing: gum (required only by interactive just new* recipes)\n'
    fi

    if ((errors > 0)); then
        printf '\nPreflight failed. Install or update the missing/old tools, then run: just doctor\n'
        if [[ "$fail_mode" == "--fail" ]]; then
            exit 1
        fi
    fi

# Install Chromium for browser verification
setup-browser: _check-bun
    bun install
    {{PLAYWRIGHT}} install chromium

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

# Run commit-tier QC through the central implementation
test-commit:
    @just -f ~/ai-review-ci/justfiles/bun.just -d . test-commit

# Run the push gate: commit checks plus this repo's own site suite
test-push:
    @just -f ~/ai-review-ci/justfiles/bun.just -d . test-push

# Run CI acceptance QC through the central implementation
test-ci:
    @just -f ~/ai-review-ci/justfiles/bun.just -d . test-ci

# Bump the generator to the latest published version
update: _update-generator

# Interactively create a blog post or page (a supplied title keeps the old blog-post shortcut)
new TITLE="": _check-local-generator
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ -n {{quote(TITLE)}} ]]; then
        scripts/new-content post --title {{quote(TITLE)}}
    else
        scripts/new-content
    fi

# Create a blog post; prompts for the title when omitted
new-post TITLE="": _check-local-generator
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ -n {{quote(TITLE)}} ]]; then
        scripts/new-content post --title {{quote(TITLE)}}
    else
        scripts/new-content post
    fi

# Create a page; prompts for its title and content/ directory when omitted
new-page TITLE="" DIR="": _check-local-generator
    #!/usr/bin/env bash
    set -euo pipefail
    args=(scripts/new-content page)
    if [[ -n {{quote(TITLE)}} ]]; then
        args+=(--title {{quote(TITLE)}})
    fi
    if [[ -n {{quote(DIR)}} ]]; then
        args+=(--dir {{quote(DIR)}})
    fi
    "${args[@]}"

# Remove build output
clean:
    rm -rf dist
    rm -f content/_data/items/projects.yaml

[private]
_preflight:
    @just _doctor --fail

[private]
_check-bun:
    @command -v bun >/dev/null || { echo "Missing required tool: bun; run 'just doctor'"; exit 1; }

[private]
_check-local-generator:
    @test -x node_modules/.bin/pandoc-ssg || { echo "Missing installed pandoc-ssg CLI: run 'just setup'"; exit 1; }

[private]
_install-generator-config:
    #!/usr/bin/env bash
    set -euo pipefail
    : "${HOME:?HOME is required}"
    template="config/pandoc-ssg/config.toml"
    config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
    target_dir="$config_home/pandoc-ssg"
    target="$target_dir/config.toml"
    test -f "$template" || { echo "Missing tracked pandoc-ssg generator config: $template"; exit 1; }
    test -d "$HOME/.pandoc" || { echo "Missing required pandoc config checkout: $HOME/.pandoc"; exit 1; }
    test -f "$HOME/.pandoc/styles/macros/mathjax-sources.txt" || { echo "Missing MathJax macro manifest: $HOME/.pandoc/styles/macros/mathjax-sources.txt"; exit 1; }
    mkdir -p "$target_dir"
    sed "s#__HOME__#$HOME#g" "$template" > "$target"
    echo "Installed pandoc-ssg generator config: $target"

[private]
_project-items:
    python3 scripts/generate-project-items.py

[private]
_build: _check-local-generator _project-items
    {{SSG}} build --pandoc {{PANDOC}}

[private]
_check-build: _check-local-generator _project-items
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
_check-links: _check-lychee _build
    lychee --no-progress --base-url http://website.localhost/ \
        --max-concurrency 2 --timeout 20 \
        --accept '200,206,301,302,307,308,403' \
        --exclude-path content/assets/examples \
        --exclude-path content/assets/talks \
        --exclude-path content/projects/square_topologies \
        --exclude-path dist/assets/examples \
        --exclude-path dist/assets/talks \
        --exclude-path dist/projects/square_topologies \
        content dist

[private]
_check-lychee:
    @command -v lychee >/dev/null || { echo "Missing required tool for just check/test: lychee"; exit 1; }

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
# browser: `just setup-browser`)
[private]
_verify: _check-local-generator
    {{SSG}} verify --pandoc {{PANDOC}}

# Bump the generator to the latest published version (updates bun.lock)
[private]
_update-generator:
    bun update pandoc-ssg
