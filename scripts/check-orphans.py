#!/usr/bin/env python3
"""Fail if any built page is unreachable from the site's entry points.

The generator's `check` validates that internal links *resolve*; it does not
flag a page that nothing links *to*. A page can build cleanly, sit in the
sitemap, and still be reachable only by typing its URL directly (e.g.
/gallery/, which is in no nav menu and linked from no page).

"Reachable" = a BFS from the real entry points (the home page + every
navigation.toml target) following internal links. Two link sources count:

  1. static <a href="/..."> in each built page's HTML, and
  2. the island data the generator emits (blog/posts.json, _collections/*.json) —
     notes/talks/blog links are injected client-side, so they never appear in
     static HTML. Their host pages (/writing/, /talks/, /blog/) are nav-reachable,
     so their injected links are seeded as reachable.

Routes that are unlinked on purpose go in ALLOWLIST with a reason.
"""
import json, re, tomllib, pathlib, sys
from collections import deque

DIST = pathlib.Path("dist")
NAV = pathlib.Path("content/_data/navigation.toml")
ISLAND_DATA = ["blog/posts.json", "_collections/notes.json", "_collections/talks.json"]

# Routes that are intentionally not linked from anywhere. Keep each justified.
ALLOWLIST: dict[str, str] = {
    "/tutoring/": "Archived: not currently offering tutoring (NCTS postdoc abroad). "
                  "Page kept for resurrection in a few years; intentionally unlinked.",
}


def norm(u: str | None) -> str | None:
    """Normalize a link/route to a comparable form, or None if not internal."""
    if not u:
        return None
    u = u.split("#")[0].split("?")[0].strip()
    if not u.startswith("/"):
        return None
    if re.search(r"\.[a-z0-9]{2,5}$", u, re.I):  # a file (pdf/png/js) — not a page route
        return u
    return u if u.endswith("/") else u + "/"


def main() -> int:
    manifest = json.loads((DIST / "site-manifest.json").read_text())
    routes = {norm(r["url"]): r for r in manifest["routes"] if r.get("url")}
    pages = {u for u in routes if u}

    # Outgoing static links per built page.
    graph: dict[str, set[str]] = {}
    for u, r in routes.items():
        html = DIST / r["output"]
        if html.exists():
            graph[u] = {norm(m) for m in re.findall(r'href="(/[^"]*)"', html.read_text(errors="ignore"))}

    # Entry points: home + every nav target.
    roots: set[str] = {"/"}
    nav = tomllib.loads(NAV.read_text())

    def walk(items):
        for it in items:
            if it.get("href"):
                roots.add(norm(it["href"]))
            walk(it.get("children", []) or [])

    walk(nav.get("main", []))

    # Island-injected links are reachable via their nav-reachable host pages.
    for rel in ISLAND_DATA:
        p = DIST / rel
        if not p.exists():
            continue
        for item in json.loads(p.read_text()):
            if item.get("url"):
                roots.add(norm(item["url"]))
            for link in item.get("links", []) or []:
                if link.get("href"):
                    roots.add(norm(link["href"]))

    # BFS over page nodes.
    seen = set(roots)
    dq = deque(roots)
    while dq:
        for v in graph.get(dq.popleft(), ()):
            if v and v not in seen:
                seen.add(v)
                dq.append(v)

    orphans = sorted(u for u in pages if u != "/" and u not in seen and u not in ALLOWLIST)
    stale = sorted(u for u in ALLOWLIST if u not in pages or u in seen)

    if stale:
        print("Stale ALLOWLIST entries (now reachable or gone) — remove them:")
        for u in stale:
            print(f"  {u}")
        print()

    if orphans:
        print(f"Orphan pages — built but reachable from nothing ({len(orphans)}):")
        for u in orphans:
            print(f"  {u:42s} <- {routes[u]['source']}")
        print("\nLink each from nav (content/_data/navigation.toml) or another page,")
        print("or add it to ALLOWLIST in .agents/check-orphans.py with a reason.")
        return 1

    if stale:
        return 1
    print(f"No orphan pages ({len(pages)} pages, all reachable).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
