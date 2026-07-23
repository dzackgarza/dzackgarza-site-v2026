import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

/**
 * The giscus <script> carries its whole configuration in data-* attributes.
 * Parse them into a map so the assertions below are about configuration values,
 * not about substrings that happen to appear somewhere in the file.
 */
function giscusDataAttributes(): Map<string, string> {
  let partial = read("pandoc/templates/comments.html");
  let scriptTag = partial.match(/<script\b[^>]*giscus\.app\/client\.js[^>]*>/s);
  if (!scriptTag) {
    throw new Error("comments partial has no giscus client.js <script> tag");
  }
  let attributes = new Map<string, string>();
  for (let match of scriptTag[0].matchAll(/data-([a-z-]+)="([^"]*)"/g)) {
    let name = match[1];
    let value = match[2];
    if (name === undefined || value === undefined) {
      throw new Error(`unparsable data attribute in comments partial: ${match[0]}`);
    }
    attributes.set(name, value);
  }
  return attributes;
}

test("every blog post renders the comments partial", () => {
  // Pandoc resolves partials relative to the main template and silently emits
  // nothing when the call is removed, so a dropped ${ comments() } would take
  // comments off all posts without failing the build.
  expect(read("pandoc/templates/blog.html")).toContain("${ comments() }");
  // page.html must NOT pull it in — comments are a blog-post affordance.
  expect(read("pandoc/templates/page.html")).not.toContain("comments()");
});

test("giscus binds threads to the route, not the post title", () => {
  let data = giscusDataAttributes();
  // Post titles get edited; routes are the stable identity. Title mapping would
  // silently orphan an existing discussion the first time a title changed.
  expect(data.get("mapping")).toBe("pathname");
  expect(data.get("strict")).toBe("1");
});

test("giscus points at real GitHub node IDs, not configurator placeholders", () => {
  let data = giscusDataAttributes();
  // A shipped placeholder renders a widget wired to nothing.
  expect(data.get("repo")).toBe("dzackgarza/dzackgarza-site-v2026");
  expect(data.get("repo-id")).toMatch(/^R_[A-Za-z0-9_-]+$/);
  expect(data.get("category-id")).toMatch(/^DIC_[A-Za-z0-9_-]+$/);
});

test("giscus loads lazily so the deploy gate stays green", () => {
  // giscus answers HTTP 404 for a page whose discussion does not exist yet, and
  // `pandoc-ssg verify` fails the build on any console error. Eager loading
  // therefore breaks `just deploy` on every post that has no comments yet.
  expect(giscusDataAttributes().get("loading")).toBe("lazy");
});

test("giscus origin policy admits the local preview server and rejects strangers", () => {
  let policy = JSON.parse(read("giscus.json")) as {
    origins: string[];
    originsRegex: string[];
  };

  expect(policy.origins).toContain("https://dzackgarza.com");

  // `pandoc-ssg serve`/`verify` bind an ephemeral port, so the policy has to
  // admit the whole localhost range rather than one hard-coded port.
  let patterns = policy.originsRegex.map((source) => new RegExp(source));
  let matches = (origin: string): boolean => patterns.some((p) => p.test(origin));

  expect(matches("http://localhost:40957")).toBe(true);
  expect(matches("http://127.0.0.1:8080")).toBe(true);
  // An anchored pattern must not admit a lookalike host.
  expect(matches("http://localhost.evil.example:80")).toBe(false);
  expect(matches("https://dzackgarza.com.evil.example")).toBe(false);
});
