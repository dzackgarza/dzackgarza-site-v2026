#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tomllib
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PROJECTS_DIR = ROOT / "content" / "projects"
OUTPUT = ROOT / "content" / "_data" / "items" / "projects.yaml"

REQUIRED_FIELDS = {
    "title": str,
    "category": str,
    "description": str,
    "tags": list,
    "image": str,
    "alt": str,
    "order": int,
}


def fail(message: str) -> None:
    print(f"project data: {message}", file=sys.stderr)
    raise SystemExit(1)


def scalar(value: str | int) -> str:
    if isinstance(value, int):
        return str(value)
    return json.dumps(value, ensure_ascii=True)


def read_project(path: Path) -> dict[str, Any]:
    slug = path.name
    index = path / "index.html"
    metadata = path / "project.toml"
    if not index.is_file():
        fail(f"{path.relative_to(ROOT)} is missing index.html")
    if not metadata.is_file():
        fail(f"{path.relative_to(ROOT)} is missing project.toml")

    try:
        data = tomllib.loads(metadata.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as exc:
        fail(f"{metadata.relative_to(ROOT)}: {exc}")

    for key, expected_type in REQUIRED_FIELDS.items():
        value = data.get(key)
        if not isinstance(value, expected_type):
            fail(f"{metadata.relative_to(ROOT)}: {key} must be {expected_type.__name__}")

    tags = data["tags"]
    if not all(isinstance(tag, str) for tag in tags):
        fail(f"{metadata.relative_to(ROOT)}: tags must contain only strings")
    if len(tags) == 0:
        fail(f"{metadata.relative_to(ROOT)}: tags must not be empty")

    return {
        "slug": slug,
        "title": data["title"],
        "category": data["category"],
        "description": data["description"],
        "tags": tags,
        "image": data["image"],
        "alt": data["alt"],
        "order": data["order"],
        "href": f"/projects/{slug}/",
    }


def yaml_list(values: list[str], indent: str) -> list[str]:
    if len(values) == 0:
        return [f"{indent}[]"]
    return [f"{indent}- {scalar(value)}" for value in values]


def emit(projects: list[dict[str, Any]]) -> str:
    if len(projects) == 0:
        return "---\nprojects: []\n"

    lines = ["---", "projects:"]
    for project in projects:
        lines.extend(
            [
                f"- title: {scalar(project['title'])}",
                f"  category: {scalar(project['category'])}",
                f"  description: {scalar(project['description'])}",
                "  tags:",
                *yaml_list(project["tags"], "  "),
                f"  image: {scalar(project['image'])}",
                f"  alt: {scalar(project['alt'])}",
                "  links:",
                "  - label: \"Open project\"",
                f"    href: {scalar(project['href'])}",
            ]
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    if not PROJECTS_DIR.is_dir():
        fail(f"{PROJECTS_DIR.relative_to(ROOT)} does not exist")

    projects = [
        read_project(path)
        for path in sorted(PROJECTS_DIR.iterdir(), key=lambda p: p.name)
        if path.is_dir()
    ]
    projects.sort(key=lambda item: (item["order"], item["title"].casefold(), item["slug"]))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(emit(projects), encoding="utf-8")


if __name__ == "__main__":
    main()
