/**
 * Shared magazine-style article template used by every content-generating
 * function (generate-articles, generate-geo-content, generate-aeo-article).
 * One look across GEO/SEO/AEO/Local AEO so a reader can't tell which
 * pipeline produced a piece — same typography, same brand colors, same
 * icon set — instead of each function inventing its own ad-hoc HTML.
 *
 * Colors/fonts are pulled straight from the app's own design tokens
 * (src/index.css: --primary #2e3a8c, --primary-deep #1f2761, paper/ink,
 * Syne/Fraunces/Inter/DM Mono) so published articles actually look like
 * AutoPilot GEO, not a generic template.
 */

export function escapeHtml(str: string): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// AEO's prompt asks the model for raw HTML (<a href="#section1">, <li>...),
// but it doesn't always stay in HTML mode for the whole response — the TOC
// or an internal link sometimes slips out in markdown syntax instead. Only
// the http(s) case used to get linkified here; a same-page anchor like
// "(#section1)" or a relative "(/blog)" fell through as literal bracket
// text, which is exactly the broken-looking TOC/links this fixes.
const linkifyMarkdown = (html: string): string =>
  html.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_m, text, url) => {
    const isAbsolute = /^https?:\/\//.test(url);
    return `<a href="${url}"${isAbsolute ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
  });

// Same reasoning for bullet/numbered lists: a stray markdown list line
// dropped into otherwise-HTML content rendered as a literal "* text" line
// instead of a real <li>, since the whole-document passthrough below never
// looked at individual lines once it saw *any* HTML block tag.
const listifyMarkdown = (html: string): string => {
  const lines = html.split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  for (const raw of lines) {
    const trimmed = raw.trim();
    const ul = /^[-*•]\s+(.*)$/.exec(trimmed);
    const ol = !ul && /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (ul) {
      if (listType !== "ul") { closeList(); out.push("<ul>"); listType = "ul"; }
      out.push(`<li>${ul[1]}</li>`);
    } else if (ol) {
      if (listType !== "ol") { closeList(); out.push("<ol>"); listType = "ol"; }
      out.push(`<li>${ol[1]}</li>`);
    } else {
      closeList();
      out.push(raw);
    }
  }
  closeList();
  return out.join("\n");
};

/**
 * Small, dependency-free markdown -> HTML converter. Generation prompts
 * across the app ask the model for "## / ### headings, markdown lists,
 * **bold**" — this covers exactly that surface (headings, paragraphs,
 * bold/italic, bullet/numbered lists, blockquotes, links, simple pipe
 * tables) rather than pulling in a full markdown library for a Deno edge
 * function. Input that's already HTML (a `<h2>` etc.) passes through
 * mostly untouched — see linkifyMarkdown/listifyMarkdown above for the
 * exception.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";
  // Already HTML (contains block tags) — leave it as-is, aside from
  // mopping up any markdown-style links/lists the model mixed in (see
  // linkifyMarkdown/listifyMarkdown above).
  if (/<(h[1-6]|p|ul|ol|table|div|blockquote)[\s>]/i.test(md)) {
    return listifyMarkdown(linkifyMarkdown(md));
  }

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let tableRows: string[][] = [];
  let inTable = false;

  const inline = (text: string): string =>
    escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_m, linkText, url) => {
        const isAbsolute = /^https?:\/\//.test(url);
        return `<a href="${url}"${isAbsolute ? ' target="_blank" rel="noopener"' : ""}>${linkText}</a>`;
      });

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushTable = () => {
    if (!tableRows.length) return;
    const [header, ...body] = tableRows;
    out.push('<div class="table-wrap"><table>');
    out.push("<thead><tr>" + header.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead>");
    out.push("<tbody>");
    for (const row of body) {
      out.push("<tr>" + row.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>");
    }
    out.push("</tbody></table></div>");
    tableRows = [];
    inTable = false;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // Table row: | a | b | c |  (skip the |---|---| separator row)
    if (/^\|.+\|$/.test(trimmed)) {
      if (/^\|[\s:|-]+\|$/.test(trimmed)) continue;
      inTable = true;
      tableRows.push(
        trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim())
      );
      continue;
    }
    if (inTable) flushTable();

    if (!trimmed) {
      closeList();
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) {
      closeList();
      const level = Math.min(h[1].length + 1, 4); // markdown H2 -> visual h2, deepest caps at h4
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      closeList();
      out.push(`<blockquote><p>${inline(trimmed.replace(/^>\s?/, ""))}</p></blockquote>`);
      continue;
    }

    const ol = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    const ul = /^[-*•]\s+(.*)$/.exec(trimmed);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inline(trimmed)}</p>`);
  }
  closeList();
  if (inTable) flushTable();

  return out.join("\n");
}

// Minimal, line-style icon set (24x24, stroke=currentColor) — no emoji,
// anywhere in this template. Matches the site's own icon language.
const ICONS = {
  faq: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.75c0 1.5-2.4 2-2.4 3.25"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/></svg>`,
  book: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"/></svg>`,
  spark: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
};

const KICKER_LABEL: Record<string, string> = {
  geo: "GEO · Generative Engine Optimization",
  seo: "SEO · Guide",
  aeo: "AEO · Answer Engine Optimization",
  local_aeo: "Local AEO",
  shopping: "Shopping Guide",
};

export interface ArticlePageOptions {
  kind: "geo" | "seo" | "aeo" | "local_aeo" | "shopping";
  title: string;
  /** Short italic dek under the title — the AEO direct answer, a meta
   *  description, or any one-line summary. Optional. */
  dek?: string;
  /** Body content — markdown or HTML, either is accepted. */
  bodyMarkdown: string;
  metaDescription?: string;
  brandName: string;
  websiteUrl: string;
  language: string;
  /** Gradient callout box under the body — AEO's "featured answer" recap. */
  keyTakeaway?: string;
  faq?: Array<{ q: string; a: string }>;
  keywords?: string[];
}

export function renderArticlePage(opts: ArticlePageOptions): string {
  const {
    kind, title, dek, bodyMarkdown, metaDescription, brandName, websiteUrl,
    language, keyTakeaway, faq = [], keywords = [],
  } = opts;

  const safeTitle = escapeHtml(title);
  const safeBrand = escapeHtml(brandName);
  const safeUrl = escapeHtml(websiteUrl || "");
  const safeDesc = escapeHtml(metaDescription || dek || "");
  const kicker = KICKER_LABEL[kind] || "AutoPilot GEO";
  const faqTitle = language === "fr" ? "Questions fréquentes" : "Frequently asked questions";
  const readAllLabel = language === "fr" ? "Voir tous nos articles" : "View all our articles";
  const summaryLabel = language === "fr" ? "En résumé" : "Key takeaway";
  const bodyHtml = markdownToHtml(bodyMarkdown);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: metaDescription || dek || "",
    author: { "@type": "Organization", name: brandName },
    publisher: { "@type": "Organization", name: brandName, url: websiteUrl },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  };
  const faqSchema = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle} | ${safeBrand}</title>
<meta name="description" content="${safeDesc}">
<meta name="robots" content="index, follow">
${safeUrl ? `<link rel="canonical" href="${safeUrl}">` : ""}

<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:type" content="article">
${safeUrl ? `<meta property="og:url" content="${safeUrl}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">

<script type="application/ld+json">${JSON.stringify(articleSchema, null, 2)}</script>
${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema, null, 2)}</script>` : ""}

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&family=Fraunces:ital,wght@0,400;1,400;1,500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">

<style>
:root{
  --primary:#2e3a8c; --primary-deep:#1f2761; --primary-soft:#eef0fb;
  --paper:#f5f6fb; --ink:#14162e; --ink-soft:#585b78; --surface:#ffffff;
  --line:#e4e5f0; --radius:0.9rem;
  --gradient-primary:linear-gradient(135deg,#2e3a8c 0%,#1f2761 100%);
}
@media (prefers-color-scheme: dark){
  :root{
    --paper:#14162e; --ink:#f5f6fb; --ink-soft:#a7abd1; --surface:#1f2761;
    --line:#333a6b; --primary-soft:#232b5e;
  }
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  background:var(--paper); color:var(--ink);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  line-height:1.75; font-size:17px; -webkit-font-smoothing:antialiased;
}
.wrap{max-width:760px;margin:0 auto;padding:3rem 1.5rem 4rem;}

.kicker{
  display:inline-flex; align-items:center; gap:.4rem;
  font-family:'DM Mono',monospace; font-size:.72rem; font-weight:500;
  letter-spacing:.14em; text-transform:uppercase; color:var(--primary);
  background:var(--primary-soft); border:1px solid var(--line);
  padding:.4rem .75rem; border-radius:999px; margin-bottom:1.5rem;
}
.kicker svg{flex-shrink:0;}

h1{
  font-family:'Syne',sans-serif; font-weight:800; letter-spacing:-0.02em;
  font-size:2.5rem; line-height:1.15; margin:0 0 1.25rem; color:var(--ink);
}
.dek{
  font-family:'Fraunces',serif; font-style:italic; font-weight:400;
  font-size:1.3rem; line-height:1.6; color:var(--ink-soft);
  margin:0 0 2.25rem; padding-bottom:2rem; border-bottom:1px solid var(--line);
}

article h2{
  font-family:'Syne',sans-serif; font-weight:700; letter-spacing:-0.01em;
  font-size:1.55rem; line-height:1.3; color:var(--ink);
  margin:2.75rem 0 1.1rem; padding-bottom:.6rem; border-bottom:2px solid var(--primary);
}
article h3{
  font-family:'Syne',sans-serif; font-weight:700; font-size:1.2rem;
  color:var(--ink); margin:1.75rem 0 .75rem;
}
article h4{ font-size:1.05rem; font-weight:600; margin:1.25rem 0 .5rem; color:var(--ink); }

article p{ margin:0 0 1.25rem; color:var(--ink); }
/* Magazine drop cap on the very first paragraph of the body */
main > p:first-of-type::first-letter{
  font-family:'Fraunces',serif; font-weight:500; font-size:3.4rem;
  float:left; line-height:.85; padding:.1rem .1rem 0 0; color:var(--primary);
}
main > p.aeo-answer:first-of-type::first-letter{ float:none; font-size:1em; padding:0; }

article ul, article ol{ margin:0 0 1.5rem; padding-left:1.4rem; }
article li{ margin-bottom:.6rem; }
article ul li::marker{ color:var(--primary); }
article ol li::marker{ color:var(--primary); font-weight:700; font-family:'DM Mono',monospace; }
article strong{ font-weight:650; color:var(--ink); }
article em{ font-style:italic; color:var(--ink-soft); }
article code{
  font-family:'DM Mono',monospace; font-size:.85em; background:var(--primary-soft);
  padding:.15em .4em; border-radius:.35em; color:var(--primary-deep);
}
article a{ color:var(--primary); text-decoration:underline; text-decoration-color:var(--line); text-underline-offset:2px; }

article blockquote{
  margin:1.75rem 0; padding:.25rem 0 .25rem 1.4rem; border-left:3px solid var(--primary);
  font-family:'Fraunces',serif; font-style:italic; font-size:1.15rem; color:var(--ink-soft);
}

/* Compatibility hooks: generate-aeo-article's prompt asks the model for
   these exact classes directly in its HTML output (aeo-answer/aeo-summary
   callouts, a CTA block, an optional TOC) — style them here rather than
   let them fall back to unstyled default tags. */
article p.aeo-answer{
  font-size:1.1rem; background:var(--primary-soft); border-left:3px solid var(--primary);
  padding:1.1rem 1.4rem; border-radius:0 var(--radius) var(--radius) 0; margin-bottom:1.75rem;
}
article div.aeo-summary{
  background:var(--surface); border:1px solid var(--line); border-radius:var(--radius);
  padding:1.25rem 1.5rem; margin-bottom:1.75rem;
}
article div.aeo-summary > p:first-child{ font-family:'Syne',sans-serif; font-weight:700; margin-bottom:.6rem; }
article div.aeo-summary ul{ margin-bottom:0; }
article nav.toc{
  background:var(--surface); border:1px solid var(--line); border-radius:var(--radius);
  padding:1.25rem 1.5rem; margin-bottom:2rem;
}
article nav.toc h2{ margin:0 0 .75rem; padding:0; border:none; font-size:1.05rem; }
article nav.toc ul{ margin-bottom:0; }
article nav.toc a{ text-decoration:none; }
article div.cta-section{ margin:2rem 0; }
article a.cta-button{
  display:inline-block; background:var(--gradient-primary); color:#fff !important;
  font-weight:600; text-decoration:none !important; padding:.85rem 1.6rem;
  border-radius:.6rem; box-shadow:0 10px 30px -12px rgba(46,58,140,.5);
}
article hr{ border:none; border-top:1px solid var(--line); margin:2.5rem 0; }

.table-wrap{ overflow-x:auto; margin:1.75rem 0; border:1px solid var(--line); border-radius:var(--radius); }
table{ width:100%; border-collapse:collapse; font-size:.92rem; }
th{
  font-family:'DM Mono',monospace; font-size:.72rem; text-transform:uppercase; letter-spacing:.06em;
  text-align:left; background:var(--primary-soft); color:var(--primary-deep);
  padding:.75rem 1rem; border-bottom:1px solid var(--line);
}
td{ padding:.75rem 1rem; border-bottom:1px solid var(--line); color:var(--ink); }
tr:last-child td{ border-bottom:none; }

.takeaway{
  background:var(--gradient-primary); border-radius:1rem; padding:1.6rem 1.9rem;
  margin:2.5rem 0; box-shadow:0 16px 40px -18px rgba(46,58,140,.55);
}
.takeaway .label{
  font-family:'DM Mono',monospace; font-size:.7rem; letter-spacing:.14em; text-transform:uppercase;
  color:rgba(255,255,255,.7); margin-bottom:.5rem; display:flex; align-items:center; gap:.4rem;
}
.takeaway p{ margin:0; color:#fff; font-family:'Fraunces',serif; font-style:italic; font-size:1.15rem; line-height:1.65; }

.faq{ margin-top:3rem; border-top:1px solid var(--line); padding-top:2rem; }
.faq-head{ display:flex; align-items:center; gap:.6rem; margin-bottom:1.5rem; color:var(--primary); }
.faq-head h2{ margin:0; padding:0; border:none; font-size:1.35rem; }
.faq-item{ padding:1.25rem 0; border-bottom:1px solid var(--line); }
.faq-item:last-child{ border-bottom:none; padding-bottom:0; }
.faq-item h3{ margin:0 0 .5rem; font-size:1.05rem; }
.faq-item p{ margin:0; color:var(--ink-soft); }

footer{
  margin-top:3.5rem; padding-top:1.75rem; border-top:1px solid var(--line);
  display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.75rem;
}
footer .brand{ font-family:'Syne',sans-serif; font-weight:700; font-size:.9rem; color:var(--ink); }
footer a.all-articles{
  display:inline-flex; align-items:center; gap:.45rem; font-size:.85rem; font-weight:500;
  color:var(--primary); text-decoration:none;
}
footer a.all-articles:hover{ text-decoration:underline; }

@media (max-width:640px){
  .wrap{ padding:2rem 1.25rem 3rem; }
  h1{ font-size:1.85rem; }
  .dek{ font-size:1.1rem; }
  article h2{ font-size:1.3rem; }
}
</style>
</head>
<body>
<div class="wrap">
<article itemscope itemtype="https://schema.org/Article">
<header>
  <span class="kicker">${ICONS.spark}${kicker}</span>
  <h1 itemprop="headline">${safeTitle}</h1>
  ${dek ? `<p class="dek">${escapeHtml(dek)}</p>` : ""}
  <meta itemprop="datePublished" content="${new Date().toISOString()}">
  <meta itemprop="author" content="${safeBrand}">
</header>

<main itemprop="articleBody">
${bodyHtml}

${keyTakeaway ? `<div class="takeaway">
  <div class="label">${ICONS.check}${summaryLabel}</div>
  <p>${escapeHtml(keyTakeaway)}</p>
</div>` : ""}
</main>

${faq.length ? `<section class="faq" itemscope itemtype="https://schema.org/FAQPage">
  <div class="faq-head">${ICONS.faq}<h2>${faqTitle}</h2></div>
  ${faq.map((f) => `<div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">${escapeHtml(f.q)}</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">${escapeHtml(f.a)}</p>
    </div>
  </div>`).join("\n")}
</section>` : ""}

<footer>
  <span class="brand">${safeBrand}</span>
  ${safeUrl ? `<a class="all-articles" href="${safeUrl}/blog" target="_blank" rel="noopener">${ICONS.book}${readAllLabel}</a>` : ""}
</footer>
</article>
</div>
</body>
</html>`;
}
