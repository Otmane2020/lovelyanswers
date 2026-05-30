// Shared editorial HTML normalizer used by all content-generation
// and publishing edge functions to guarantee magazine-layout-ready output.
export function normalizeEditorialBody(input: string | null | undefined): string {
  let html = (input || "").trim();
  if (!html) return "";
  html = html.replace(/<!doctype[^>]*>/gi, "");
  html = html.replace(/<\/?(?:html|head|body)[^>]*>/gi, "");
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, "");
  html = html.replace(/<\/?(?:article|section)[^>]*>/gi, "");
  html = html.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  html = html.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  html = html.replace(/<meta[^>]*>/gi, "");
  html = html.replace(/\sstyle\s*=\s*"[^"]*"/gi, "");
  html = html.replace(/\sstyle\s*=\s*'[^']*'/gi, "");
  // Markdown headings -> h2/h3
  html = html.replace(/(^|\n)\s*#{3}\s+(.+)$/gm, "$1<h3>$2</h3>");
  html = html.replace(/(^|\n)\s*#{2}\s+(.+)$/gm, "$1<h2>$2</h2>");
  // Bold
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  // Promote known editorial section labels to h2
  html = html.replace(
    /(^|\n)\s*(Opening Summary|Comparison Criteria|Comparison Table|How to Choose[^\n]*|FAQ|Key Takeaways|Conclusion|Introduction|Overview)\s*$/gmi,
    "$1<h2>$2</h2>"
  );
  // Wrap loose paragraphs
  html = html.split(/\n{2,}/).map((chunk) => {
    const text = chunk.trim();
    if (!text) return "";
    if (/^<(h[1-6]|p|ul|ol|li|blockquote|table|thead|tbody|tr|div|details|summary|figure|img)/i.test(text)) return text;
    return `<p>${text.replace(/\n+/g, "<br>")}</p>`;
  }).filter(Boolean).join("\n\n");
  return html.replace(/\n{3,}/g, "\n\n").trim();
}

// Lightweight version for short Q&A answers — keeps them as a single
// well-formed paragraph block when no HTML is present.
export function normalizeAnswerText(input: string | null | undefined): string {
  const text = (input || "").trim();
  if (!text) return "";
  if (/<\/?(p|h[1-6]|ul|ol|table|blockquote)/i.test(text)) {
    return normalizeEditorialBody(text);
  }
  return text;
}
