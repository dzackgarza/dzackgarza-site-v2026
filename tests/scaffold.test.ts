import { expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repo = resolve(import.meta.dir, "..");

async function tempContent(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dzackgarza-site-scaffold-"));
  const content = join(root, "content");
  await mkdir(join(content, "_islands", "collection"), { recursive: true });
  await writeFile(join(content, "_islands", "collection", "main.ts"), "export {};\n");
  return content;
}

test("site page scaffold creates valid page metadata in the requested directory", async () => {
  const content = await tempContent();
  const root = resolve(content, "..");

  try {
    const proc = Bun.spawn(
      [
        join(repo, "scripts", "new-content"),
        "page",
        "--title",
        "Research Notes",
        "--dir",
        "pages",
      ],
      {
        cwd: repo,
        env: { ...process.env, CONTENT_DIR: content, PANDOC_DIR: join(repo, "pandoc") },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode, `${stdout}\n${stderr}`).toBe(0);
    const page = await readFile(join(content, "pages", "research-notes.md"), "utf8");
    expect(page).toContain("title: Research Notes");
    expect(page).toContain("page: true");
    expect(page).toContain("type: page");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("site authoring script creates a dated blog post without an interactive prompt", async () => {
  const content = await tempContent();
  const root = resolve(content, "..");

  try {
    const proc = Bun.spawn(
      [join(repo, "scripts", "new-content"), "post", "--title", "A New Post"],
      {
        cwd: repo,
        env: { ...process.env, CONTENT_DIR: content, PANDOC_DIR: join(repo, "pandoc") },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode, `${stdout}\n${stderr}`).toBe(0);
    const date = new Date().toISOString().slice(0, 10);
    const post = await readFile(join(content, "blog", `${date}-a-new-post.md`), "utf8");
    expect(post).toContain("title: A New Post");
    expect(post).toMatch(new RegExp(`date: ['\"]?${date}['\"]?`));
    expect(post).toContain("page: true");
    expect(post).toContain("type: blog-post");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
