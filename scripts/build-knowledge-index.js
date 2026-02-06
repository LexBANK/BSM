import fs from "fs";
import path from "path";

const knowledgeDir = path.join(process.cwd(), "data", "knowledge");
const indexPath = path.join(knowledgeDir, "index.json");

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .filter((file) => file.toLowerCase() !== "example.md");
}

function safeSlug(name) {
  return name
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractTitle(mdText, fallback) {
  const lines = mdText.split(/\r?\n/);
  const h1 = lines.find((line) => /^#\s+/.test(line));
  if (h1) return h1.replace(/^#\s+/, "").trim();
  return fallback;
}

function buildIndex() {
  const files = listMarkdownFiles(knowledgeDir);

  const documents = files.map((file) => {
    const filePath = path.join(knowledgeDir, file);
    const text = fs.readFileSync(filePath, "utf8");

    return {
      slug: safeSlug(file),
      file,
      title: extractTitle(text, file.replace(/\.md$/i, ""))
    };
  });

  const out = {
    generatedAt: new Date().toISOString(),
    documents
  };

  fs.writeFileSync(indexPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`✔ knowledge index built: ${indexPath} (${documents.length} docs)`);
}

buildIndex();
