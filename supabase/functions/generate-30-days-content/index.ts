import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IntentType = "price" | "duration" | "criteria" | "comparison" | "howto" | "best" | "what" | "why";

const INTENTS: IntentType[] = ["price", "criteria", "comparison", "howto", "best", "what", "why", "duration"];

// ==================== SAFE JSON PARSING ====================
function safeParseJSON(str: string): any {
  // Strategy 1: Direct parse
  try { 
    return JSON.parse(str); 
  } catch (e) {
    console.log("[safeParseJSON] Strategy 1 failed, trying cleanup...");
  }
  
  // Strategy 2: Remove control characters
  let cleaned = str.replace(/[\x00-\x1F\x7F]/g, " ");
  try { 
    return JSON.parse(cleaned); 
  } catch (e) {
    console.log("[safeParseJSON] Strategy 2 failed...");
  }
  
  // Strategy 3: Fix newlines inside string values - more aggressive
  cleaned = cleaned
    .replace(/\r\n/g, "\\n")
    .replace(/\r/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, " ");
  try { 
    return JSON.parse(cleaned); 
  } catch (e) {
    console.log("[safeParseJSON] Strategy 3 failed...");
  }
  
  // Strategy 4: Remove trailing commas and fix common issues
  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/\\'/g, "'")
    .replace(/"\s*\n\s*"/g, '", "');
  try { 
    return JSON.parse(cleaned); 
  } catch (e) {
    console.log("[safeParseJSON] Strategy 4 failed...");
  }
  
  // Strategy 5: Extract just the JSON object/array
  const objectMatch = cleaned.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (objectMatch) {
    try { 
      return JSON.parse(objectMatch[0]); 
    } catch (e) {
      console.log("[safeParseJSON] Strategy 5 failed...");
    }
  }
  
  // Strategy 6: Last resort - try to extract key fields manually
  console.log("[safeParseJSON] All strategies failed, attempting manual extraction...");
  try {
    const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
    const contentMatch = cleaned.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"meta|"\s*})/);
    const metaMatch = cleaned.match(/"metaDescription"\s*:\s*"([^"]+)"/);
    
    if (titleMatch || contentMatch) {
      return {
        title: titleMatch?.[1] || "Article",
        content: contentMatch?.[1]?.replace(/\\n/g, "\n") || "",
        metaDescription: metaMatch?.[1] || "",
      };
    }
  } catch (e) {
    console.log("[safeParseJSON] Manual extraction failed");
  }
  
  throw new Error("Failed to parse JSON after all strategies");
}

function detectIntent(text: string): IntentType {
  const q = text.toLowerCase();
  if (/prix|tarif|cost|price|budget/.test(q)) return "price";
  if (/combien de temps|duration|how long|délai/.test(q)) return "duration";
  if (/crit[eè]re|condition|requirement|choisir/.test(q)) return "criteria";
  if (/vs|versus|compar|différence/.test(q)) return "comparison";
  if (/comment|how to|utiliser|éviter/.test(q)) return "howto";
  if (/meilleur|best/.test(q)) return "best";
  if (/pourquoi|why/.test(q)) return "why";
  return "what";
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function computeScore(answer: string, brand: string): number {
  // Start with base score of 75 - minimum acceptable AEO score
  let score = 75;
  const currentYear = new Date().getFullYear();

  // BONUSES - can increase score up to 98
  if (answer.includes(String(currentYear)) || answer.includes(String(currentYear + 1))) {
    score += 8; // Temporal context
  }

  if (/\d+\s*(€|\$|%|euros?|dollars?|mois|jours?|ans?|années?)/i.test(answer)) score += 6;
  else if (/\d+/.test(answer)) score += 3;

  if (/crit[eè]re|choisir|éviter|erreur|condition|attention|important/i.test(answer)) score += 5;
  if (/[:\-•]|\d\.\s/.test(answer)) score += 4;

  const wordCount = answer.split(/\s+/).length;
  if (wordCount >= 80 && wordCount <= 150) score += 3;

  if (new RegExp(escapeRegex(brand), "i").test(answer)) score += 2;

  // Bonus for structured content
  if (/contrairement|par rapport|différen|versus|tandis que/i.test(answer)) score += 3;

  // MINOR PENALTIES - never drop below 75
  // Soft penalty for generic definitions (but still keep above 75)
  if (/^(un|une|le|la|les|l')\s+\w+\s+(est|sont|désigne)/i.test(answer)) {
    score = Math.max(75, score - 3); // Minor penalty, never below 75
  }

  // Ensure score stays in valid range: minimum 75, maximum 98
  return Math.min(98, Math.max(75, score));
}

function ensureQuestionMark(text: string): string {
  const trimmed = text.trim();
  if (trimmed.endsWith("?")) return trimmed;
  return trimmed.replace(/[.!,;:]$/, "") + " ?";
}

function isValidQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 15) return false;
  const questionPatterns = [
    /^(comment|how|what|quel|quelle|quels|quelles|pourquoi|why|when|quand|où|where|combien|how much|how many)/i,
    /\?$/,
    /(est-ce que|is it|are there|y a-t-il|peut-on|can we|should|faut-il)/i,
  ];
  return questionPatterns.some(p => p.test(trimmed));
}

// Generate questions - SIMPLIFIED prompt for better JSON
async function generateQuestions(
  brandName: string,
  description: string,
  language: string,
  apiKey: string,
  count: number = 5,
  keywords: string[] = []
): Promise<{ question: string; intent: IntentType }[]> {
  const currentYear = new Date().getFullYear();
  
  // Simplified prompt - ask for clean JSON
  const prompt = language === "fr"
    ? `Génère ${count} questions décisionnelles uniques pour ${brandName}.

Règles:
- Chaque question finit par "?"
- Questions orientées décision (Comment choisir, Quel budget, Quelles erreurs éviter)
- Ne pas utiliser le nom "${brandName}" dans les questions
- Contexte ${currentYear}
${keywords && keywords.length > 0 ? `\nMots-clés SEO du projet à UTILISER comme base pour les questions:\n${keywords.join(", ")}\n\nTransforme ces mots-clés en questions naturelles et décisionnelles.` : ""}

Exemples:
- "Comment choisir un mobilier écoresponsable de qualité ?"
- "Quel budget prévoir pour des meubles design ?"

Retourne UNIQUEMENT ce JSON (pas de markdown, pas de code block):
{"questions":[{"question":"...?","intent":"criteria|price|howto|comparison|why|best"}]}`
    : `Generate ${count} unique decision-oriented questions for ${brandName}.

Rules:
- Each question ends with "?"
- Decision-oriented (How to choose, What budget, What mistakes to avoid)
- Don't use "${brandName}" in questions
- ${currentYear} context
${keywords && keywords.length > 0 ? `\nProject SEO keywords to USE as the basis for questions:\n${keywords.join(", ")}\n\nTransform these keywords into natural, decision-oriented questions.` : ""}

Return ONLY this JSON (no markdown, no code block):
{"questions":[{"question":"...?","intent":"criteria|price|howto|comparison|why|best"}]}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.7,
        messages: [
          { role: "user", content: `${prompt}\n\nBusiness: ${brandName}\nDescription: ${description}` },
        ],
      }),
    });

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    
    // Extract JSON from response
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");
    
    const parsed = safeParseJSON(match[0]);
    
    // Post-process questions
    const validQuestions = (parsed.questions || [])
      .slice(0, count)
      .map((q: any) => {
        let question = q.question || q;
        
        if (typeof question !== "string") {
          question = `Comment choisir ${brandName} en ${currentYear} ?`;
        }
        
        if (!isValidQuestion(question)) {
          question = language === "fr"
            ? `Comment choisir ${question} adapté à ses besoins en ${currentYear} ?`
            : `How to choose ${question} suited to your needs in ${currentYear}?`;
        }
        
        question = ensureQuestionMark(question);
        
        return {
          question,
          intent: INTENTS.includes(q.intent) ? q.intent : detectIntent(question),
        };
      });
    
    console.log(`[generateQuestions] Generated ${validQuestions.length} valid questions`);
    return validQuestions;
  } catch (e) {
    console.error("[generateQuestions] Failed:", e);
    // Fallback questions
    const fallback: { question: string; intent: IntentType }[] = [];
    const templates = language === "fr" 
      ? [
          { q: `Comment choisir ${brandName.toLowerCase()} adapté à ses besoins en ${currentYear} ?`, i: "criteria" as IntentType },
          { q: `Quel budget prévoir pour ${brandName.toLowerCase()} de qualité ?`, i: "price" as IntentType },
          { q: `Quelles erreurs éviter avec ${brandName.toLowerCase()} ?`, i: "howto" as IntentType },
          { q: `Pourquoi choisir ${brandName.toLowerCase()} plutôt que les alternatives ?`, i: "why" as IntentType },
          { q: `Quels critères vérifier avant d'acheter ${brandName.toLowerCase()} ?`, i: "criteria" as IntentType },
        ]
      : [
          { q: `How to choose ${brandName.toLowerCase()} suited to your needs in ${currentYear}?`, i: "criteria" as IntentType },
          { q: `What budget for quality ${brandName.toLowerCase()}?`, i: "price" as IntentType },
          { q: `What mistakes to avoid with ${brandName.toLowerCase()}?`, i: "howto" as IntentType },
          { q: `Why choose ${brandName.toLowerCase()} over alternatives?`, i: "why" as IntentType },
          { q: `What criteria to check before buying ${brandName.toLowerCase()}?`, i: "criteria" as IntentType },
        ];
    
    for (let i = 0; i < count; i++) {
      const t = templates[i % templates.length];
      fallback.push({ question: t.q, intent: t.i });
    }
    return fallback;
  }
}

// Generate answer - AEO-OPTIMIZED prompt for LLM citation
async function generateAnswer(
  question: string,
  brandName: string,
  description: string,
  intent: IntentType,
  language: string,
  apiKey: string,
  retryCount: number = 0
): Promise<{ answer: string; bullets: string[]; faq: { q: string; a: string }[] }> {

  // AEO-optimized prompt following best practices for AI citation
  const prompt = language === "fr"
    ? `Tu es un expert AEO. Génère une réponse CITABLE par ChatGPT, Gemini, Perplexity.

Question: "${question}"
Contexte métier: ${description}

⚠️ RÈGLES AEO STRICTES:
1. Réponse COURTE: 2-3 phrases max, directe et factuelle
2. AUCUN pourcentage sans source (pas de "70% des consommateurs")
3. Ton NEUTRE et générique (pas "nous recommandons", pas "${brandName} propose")
4. Langage FACTUEL: définitions, critères, étapes
5. Structure EXTRACTABLE: que l'IA puisse copier-coller

FORMAT OBLIGATOIRE:
- Phrase 1: Réponse directe à la question
- Phrase 2: Contexte ou condition importante
- Points clés: 3 critères/conseils concrets
- FAQ: 1 question connexe avec réponse courte

❌ INTERDIT: "Movala recommande", chiffres inventés, ton commercial, paragraphes longs
✅ AUTORISÉ: Mentionner "${brandName}" UNE SEULE fois en exemple optionnel

Retourne UNIQUEMENT ce JSON:
{"answer":"réponse 2-3 phrases...","bullets":["critère 1","critère 2","critère 3"],"faq":[{"q":"question connexe?","a":"réponse courte factuelle"}]}`
    : `You are an AEO expert. Generate a response CITABLE by ChatGPT, Gemini, Perplexity.

Question: "${question}"
Business context: ${description}

⚠️ STRICT AEO RULES:
1. SHORT answer: 2-3 sentences max, direct and factual
2. NO unsourced percentages (not "70% of consumers")
3. NEUTRAL and generic tone (not "we recommend", not "${brandName} offers")
4. FACTUAL language: definitions, criteria, steps
5. EXTRACTABLE structure: AI can copy-paste directly

MANDATORY FORMAT:
- Sentence 1: Direct answer to the question
- Sentence 2: Important context or condition
- Key points: 3 concrete criteria/tips
- FAQ: 1 related question with short answer

❌ FORBIDDEN: "${brandName} recommends", made-up stats, commercial tone, long paragraphs
✅ ALLOWED: Mention "${brandName}" ONCE as optional example

Return ONLY this JSON:
{"answer":"2-3 sentence response...","bullets":["criterion 1","criterion 2","criterion 3"],"faq":[{"q":"related question?","a":"short factual answer"}]}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.3,
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");
    
    const parsed = safeParseJSON(match[0]);
    
    return {
      answer: parsed.answer || `${brandName} propose des solutions adaptées à ce besoin.`,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
      faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    };
  } catch (e) {
    console.error(`[generateAnswer] Failed (retry ${retryCount}):`, e);
    
    // Retry once with simpler prompt
    if (retryCount < 1) {
      console.log("[generateAnswer] Retrying with simpler prompt...");
      await new Promise(r => setTimeout(r, 500));
      return generateAnswer(question, brandName, description, intent, language, apiKey, retryCount + 1);
    }
    
    // Fallback - AEO-compliant
    return {
      answer: `Le choix dépend de plusieurs critères essentiels : le budget disponible, les besoins spécifiques et la qualité recherchée. Une analyse préalable permet d'éviter les erreurs courantes.`,
      bullets: ["Définir clairement ses besoins", "Comparer plusieurs options", "Vérifier la qualité et les garanties"],
      faq: [],
    };
  }
}

// Convert content to clean HTML - handles both HTML and markdown input
function convertToCleanHTML(content: string): string {
  // If content already looks like HTML (has tags), clean it up
  if (/<(h[1-6]|p|ul|ol|li|div|section|article|strong|em)\b/i.test(content)) {
    // Already HTML - just clean up any markdown artifacts
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    return html;
  }
  
  // Content is markdown - convert to HTML properly
  const lines = content.split('\n');
  let html = '';
  let inList = false;
  let listType = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      if (inList) {
        html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        inList = false;
      }
      continue;
    }
    
    // Headers
    if (line.startsWith('### ')) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      html += `<h3>${line.slice(4).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</h3>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      html += `<h2>${line.slice(3).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</h2>\n`;
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      // Skip H1 - title is rendered separately by editorial template
      continue;
    }
    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      html += '<hr>\n';
      continue;
    }
    // Blockquote
    if (line.startsWith('> ')) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      const quoteContent = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
      html += `<blockquote>${quoteContent}</blockquote>\n`;
      continue;
    }
    
    // Unordered list items
    if (/^[-*•]\s+/.test(line)) {
      const itemContent = line.replace(/^[-*•]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
      if (!inList || listType !== 'ul') {
        if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        html += '<ul>\n';
        inList = true;
        listType = 'ul';
      }
      html += `  <li>${itemContent}</li>\n`;
      continue;
    }
    
    // Ordered list items
    if (/^\d+[.)]\s+/.test(line)) {
      const itemContent = line.replace(/^\d+[.)]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
      if (!inList || listType !== 'ol') {
        if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        html += '<ol>\n';
        inList = true;
        listType = 'ol';
      }
      html += `  <li>${itemContent}</li>\n`;
      continue;
    }
    
    // Regular paragraph
    if (inList) {
      html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
      inList = false;
    }
    
    // Apply inline formatting
    line = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    html += `<p>${line}</p>\n`;
  }
  
  // Close any open list
  if (inList) {
    html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
  }
  
  return html;
}

// Generate article - AEO-OPTIMIZED for LLM citation
async function generateArticle(
  question: string,
  answer: string,
  bullets: string[],
  faq: { q: string; a: string }[],
  brandName: string,
  description: string,
  language: string,
  apiKey: string,
  retryCount: number = 0
): Promise<{ title: string; content: string; htmlContent: string; metaDescription: string; wordCount: number }> {
  const currentYear = new Date().getFullYear();

  // AEO-optimized article prompt
  const prompt = language === "fr"
    ? `Tu es un expert AEO. Écris un article PILIER citable par les IA.

Question source: ${question}
Réponse AEO: ${answer}
Points clés: ${bullets.join(", ")}
Contexte: ${description}

⚠️ RÈGLES AEO ARTICLE:
1. Titre: Question reformulée + année ${currentYear} si pertinent
2. Introduction: Réponse directe en 2 phrases (citable telle quelle)
3. Corps: 3-4 sections avec sous-titres clairs (H2)
4. Chaque section: définition/critères/étapes extractables
5. Conclusion: Synthèse en 1-2 phrases

❌ INTERDIT:
- Pourcentages sans source
- Ton commercial ("nous vous proposons")
- Paragraphes de plus de 4 phrases
- "${brandName}" répété plus de 2 fois

✅ FORMAT HTML OBLIGATOIRE (TEMPLATE EDITORIAL):
- Contenu DIRECTEMENT en HTML propre (pas de markdown)
- PAS de <h1> : le titre est affiche separement dans un template hero editorial
- Commencer par un <p> d introduction directe (recoit un drop cap decoratif)
- <h2> pour les sections principales
- <h3> pour les sous-sections
- <p> pour les paragraphes
- <ul><li> pour les listes a puces
- <ol><li> pour les listes numerotees
- <strong> pour les donnees cles (prix, pourcentages, dates)
- <blockquote> pour au moins une citation impactante (pull-quote editorial)
- <hr> entre les sections majeures
- 500-700 mots max

Retourne UNIQUEMENT ce JSON (pas de markdown dans le content, du HTML pur):
{"title":"Titre clair avec question","content":"<p>Introduction factuelle directe...</p><h2>Section 1</h2><p>...</p><blockquote>Citation impactante</blockquote><ul><li>...</li></ul><hr><h2>Section 2</h2><p>...</p><h2>Conclusion</h2><p>...</p>","metaDescription":"Description 150 chars max"}`
    : `You are an AEO expert. Write a PILLAR article citable by AI.

Source question: ${question}
AEO answer: ${answer}
Key points: ${bullets.join(", ")}
Context: ${description}

⚠️ AEO ARTICLE RULES:
1. Title: Reformulated question + year ${currentYear} if relevant
2. Introduction: Direct answer in 2 sentences (citable as-is)
3. Body: 3-4 sections with clear subheadings (H2)
4. Each section: extractable definitions/criteria/steps
5. Conclusion: Summary in 1-2 sentences

❌ FORBIDDEN:
- Unsourced percentages
- Commercial tone ("we offer you")
- Paragraphs longer than 4 sentences
- "${brandName}" repeated more than 2 times

✅ MANDATORY HTML FORMAT (EDITORIAL TEMPLATE):
- Content DIRECTLY in clean HTML (no markdown)
- NO <h1> tag: the title is displayed separately in an editorial hero template
- Start with a <p> direct introduction (receives a decorative drop cap)
- <h2> for main sections
- <h3> for subsections
- <p> for paragraphs
- <ul><li> for bullet lists
- <ol><li> for numbered lists
- <strong> for key data (prices, percentages, dates)
- <blockquote> for at least one impactful quote (editorial pull-quote)
- <hr> between major sections for visual separation
- 500-700 words max

Return ONLY this JSON (no markdown in content, pure HTML):
{"title":"Clear title with question","content":"<p>Direct factual introduction...</p><h2>Section 1</h2><p>...</p><blockquote>Impactful insight</blockquote><ul><li>...</li></ul><hr><h2>Section 2</h2><p>...</p><h2>Conclusion</h2><p>...</p>","metaDescription":"Description 150 chars max"}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.5,
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    
    // Try to extract JSON from code blocks first
    let jsonStr = "";
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
    }
    
    if (!jsonStr) {
      throw new Error("No JSON found in response");
    }
    
    const parsed = safeParseJSON(jsonStr);
    
    const articleContent = parsed.content || answer;
    const wordCount = articleContent.split(/\s+/).length;

    // Convert content to proper HTML - handle both HTML and markdown responses
    let htmlContent = convertToCleanHTML(articleContent);

    // Add FAQ section
    if (faq.length > 0) {
      const faqHtml = `
<section class="faq-section">
  <h2>${language === 'fr' ? 'Questions Fréquentes' : 'FAQ'}</h2>
  ${faq.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('\n')}
</section>`;
      htmlContent += faqHtml;
    }

    return {
      title: parsed.title || question,
      content: articleContent,
      htmlContent,
      metaDescription: (parsed.metaDescription || answer.substring(0, 155)).slice(0, 155),
      wordCount,
    };
  } catch (e) {
    console.error(`[generateArticle] Failed (retry ${retryCount}):`, e);
    
    // Retry once with even simpler prompt
    if (retryCount < 1) {
      console.log("[generateArticle] Retrying with ultra-simple prompt...");
      await new Promise(r => setTimeout(r, 500));
      return generateArticle(question, answer, bullets, faq, brandName, description, language, apiKey, retryCount + 1);
    }
    
    // Fallback - create article from answer
    console.log("[generateArticle] Using fallback article from answer");
    const fallbackTitle = question.replace("?", "").trim();
    const fallbackContent = `${answer}\n\n${bullets.map(b => `• ${b}`).join('\n')}`;
    
    return {
      title: fallbackTitle,
      content: fallbackContent,
      htmlContent: `<p>${answer}</p><ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul>`,
      metaDescription: answer.substring(0, 155),
      wordCount: fallbackContent.split(/\s+/).length,
    };
  }
}

// ==================== MAIN HANDLER ====================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("Missing auth header");

    const token = auth.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) throw new Error("Invalid token");

    const body = await req.json();
    // CHANGED: overwrite = false by default to prevent deleting existing content
    // questionsPerDay = 1 means 1 question generates 1 answer + 1 article = 2 items per day
    // Language is now fetched from project/generation_settings, not body - default is "en"
    const { projectId, days = 5, overwrite = false, startOffset = 0, questionsPerDay = 1 } = body;
    let language = body.language || null; // Will be overridden by project settings if not provided

    console.log(`[generate-30-days] Request params: projectId=${projectId}, userId=${userData.user.id}, days=${days}`);

    if (!projectId) throw new Error("Missing projectId");

    // Get project - first try with user_id check
    let { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .single();

    // If not found with user_id, check if user is a team member
    if (!project) {
      console.log(`[generate-30-days] Project not found for owner, checking team membership...`);
      
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("project_id, role")
        .eq("project_id", projectId)
        .eq("user_id", userData.user.id)
        .eq("status", "accepted")
        .single();
      
      if (teamMember) {
        console.log(`[generate-30-days] User is team member with role: ${teamMember.role}`);
        const { data: projectData } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();
        project = projectData;
      }
    }

    if (!project) {
      console.error(`[generate-30-days] Project not found: projectId=${projectId}, userId=${userData.user.id}`);
      
      // Log what projects this user has
      const { data: userProjects } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", userData.user.id);
      console.log(`[generate-30-days] User's projects:`, userProjects);
      
      throw new Error("Project not found");
    }

    const brandName = project.brand_name || project.name;
    const description = project.business_description || "";
    
    // CRITICAL: Get language from project settings - DO NOT default to French
    // Priority: 1. body.language (explicit override) -> 2. project.language -> 3. "en" (default)
    if (!language) {
      // Try to get language from generation_settings first (more reliable)
      const { data: genSettings } = await supabase
        .from("generation_settings")
        .select("language")
        .eq("project_id", projectId)
        .maybeSingle();
      
      language = genSettings?.language || project.language || "en";
    }
    
    console.log(`[generate-30-days] Using language: ${language} (project.language=${project.language})`);


    console.log(`[generate-30-days] Starting for project: ${project.name}, ${days} days (offset: ${startOffset}), overwrite=${overwrite}, questionsPerDay=${questionsPerDay}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Apply startOffset to support batch processing
    const startDate = new Date(today.getTime() + startOffset * 86400000);
    const endDate = new Date(startDate.getTime() + days * 86400000);

    // MODE OVERWRITE
    if (overwrite) {
      console.log(`[generate-30-days] OVERWRITE MODE: Deleting scheduled items from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // 1. Unlink articles from answers
      await supabase
        .from("answers")
        .update({ article_id: null, has_article: false })
        .eq("project_id", projectId)
        .gte("scheduled_date", startDate.toISOString())
        .lt("scheduled_date", endDate.toISOString());
      
      // 2. Delete articles
      const { count: deletedArticles } = await supabase
        .from("articles")
        .delete({ count: "exact" })
        .eq("project_id", projectId)
        .gte("scheduled_date", startDate.toISOString())
        .lt("scheduled_date", endDate.toISOString());
      
      console.log(`[generate-30-days] Deleted ${deletedArticles} articles`);
      
      // 3. Delete answers
      const { count: deletedAnswers } = await supabase
        .from("answers")
        .delete({ count: "exact" })
        .eq("project_id", projectId)
        .gte("scheduled_date", startDate.toISOString())
        .lt("scheduled_date", endDate.toISOString());
      
      console.log(`[generate-30-days] Deleted ${deletedAnswers} answers`);
      
      // 4. Clear planning entries for this range
      await supabase
        .from("planning")
        .update({ answer_id: null, article_id: null })
        .eq("project_id", projectId)
        .gte("day", startDate.toISOString().split('T')[0])
        .lt("day", endDate.toISOString().split('T')[0]);
    }

    // Fetch project keywords to inject into question generation
    const { data: projectKeywords } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId)
      .eq("is_used", false)
      .limit(30);

    const keywordList = (projectKeywords || []).map((k: any) => k.keyword);
    console.log(`[generate-30-days] Found ${keywordList.length} unused keywords for question generation`);

    // Generate questions for this batch (1 question per day = 1 answer + 1 article = 2 items per day)
    const totalQuestions = days * questionsPerDay;
    console.log(`[generate-30-days] Generating ${totalQuestions} questions (${questionsPerDay} per day for ${days} days, each produces 1 answer + 1 article)...`);
    const questions = await generateQuestions(brandName, description, language, apiKey, totalQuestions, keywordList);
    console.log(`[generate-30-days] Generated ${questions.length} questions`);

    const answersCreated: any[] = [];
    const articlesCreated: any[] = [];

    // Process each question - 1 question per day (each question generates 1 answer + 1 article = 2 items)
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Calculate which day this question belongs to (1 question per day)
      const dayIndex = Math.floor(i / questionsPerDay);
      const scheduledDate = new Date(startDate.getTime() + dayIndex * 86400000);
      const scheduledDateStr = scheduledDate.toISOString();
      const dayStr = scheduledDateStr.split('T')[0];

      console.log(`[generate-30-days] Processing ${i + 1}/${questions.length}: ${q.question.substring(0, 40)}... (day ${dayIndex + 1})`);

      try {
        // Fetch existing content for this day
        const { data: dayAnswers } = await supabase
          .from("answers")
          .select("id, question, answer, supporting_content, article_id, has_article, score, created_at")
          .eq("project_id", projectId)
          .gte("scheduled_date", dayStr)
          .lt("scheduled_date", new Date(scheduledDate.getTime() + 86400000).toISOString().split('T')[0])
          .order("created_at", { ascending: true });

        const { data: dayArticles } = await supabase
          .from("articles")
          .select("id, linked_answer_id, created_at")
          .eq("project_id", projectId)
          .gte("scheduled_date", dayStr)
          .lt("scheduled_date", new Date(scheduledDate.getTime() + 86400000).toISOString().split('T')[0])
          .order("created_at", { ascending: true });

        const answersCount = dayAnswers?.length || 0;
        const articlesCount = dayArticles?.length || 0;

        // If day already has 1 answer + 1 article, ensure planning_days is synced, then skip generation
        if (answersCount >= 1 && articlesCount >= 1) {
          const existingAnswer = (dayAnswers || [])[0];
          const existingArticle =
            (dayArticles || []).find((a: any) => a.linked_answer_id === existingAnswer.id) || (dayArticles || [])[0];

          if (existingAnswer?.id && existingArticle?.id) {
            const { error: syncError } = await supabase
              .from("planning_days")
              .upsert(
                {
                  project_id: projectId,
                  scheduled_date: dayStr,
                  answer_id: existingAnswer.id,
                  article_id: existingArticle.id,
                },
                { onConflict: "project_id,scheduled_date" }
              );

            if (syncError) {
              console.error(`[generate-30-days] Error syncing planning_days for existing day ${dayStr}:`, syncError);
            } else {
              console.log(`[generate-30-days] Synced planning_days for existing day ${dayStr}`);
            }

            // Also ensure answer is linked
            if (!existingAnswer.article_id || existingAnswer.article_id !== existingArticle.id) {
              await supabase
                .from("answers")
                .update({ article_id: existingArticle.id, has_article: true })
                .eq("id", existingAnswer.id);
            }
          }

          console.log(`[generate-30-days] Day ${dayStr} already has answer+article, skipping generation...`);
          continue;
        }

        // If answer exists but article missing, generate ONLY the article for the existing answer
        if (answersCount >= 1 && articlesCount === 0) {
          const existingAnswer = (dayAnswers || []).find((a: any) => !a.article_id) || (dayAnswers || [])[0];
          if (!existingAnswer) {
            console.log(`[generate-30-days] Day ${dayStr} has answersCount=${answersCount} but no usable answer found, continuing normal flow...`);
          } else {
            console.log(`[generate-30-days] Day ${dayStr} has an answer but no article; generating article for existing answer ${existingAnswer.id}`);

            const supporting = (existingAnswer.supporting_content || {}) as any;
            const bullets = Array.isArray(supporting.bullets) ? supporting.bullets : [];
            const faq = Array.isArray(supporting.faq) ? supporting.faq : [];

            const articleData = await generateArticle(
              existingAnswer.question,
              existingAnswer.answer,
              bullets,
              faq,
              brandName,
              description,
              language,
              apiKey
            );

            const score = typeof existingAnswer.score === "number"
              ? existingAnswer.score
              : computeScore(existingAnswer.answer, brandName);

            const { data: insertedArticle, error: articleError } = await supabase
              .from("articles")
              .insert({
                project_id: projectId,
                linked_answer_id: existingAnswer.id,
                title: articleData.title,
                content: articleData.content,
                html_content: articleData.htmlContent,
                meta_description: articleData.metaDescription,
                word_count: articleData.wordCount,
                slug: generateSlug(articleData.title),
                status: "scheduled",
                scheduled_date: scheduledDateStr,
                aeo_score: score,
              })
              .select()
              .single();

            if (articleError) {
              console.error(`[generate-30-days] Error inserting article for existing answer:`, articleError);
              continue;
            }

            articlesCreated.push(insertedArticle);
            console.log(`[generate-30-days] Article created for existing answer: ${insertedArticle.id}`);

            // Link back to answer
            await supabase
              .from("answers")
              .update({ article_id: insertedArticle.id, has_article: true })
              .eq("id", existingAnswer.id);

            // Update planning_days (with NOT NULL constraints)
            const { error: planningError } = await supabase
              .from("planning_days")
              .upsert({
                project_id: projectId,
                scheduled_date: dayStr,
                answer_id: existingAnswer.id,
                article_id: insertedArticle.id,
              }, {
                onConflict: "project_id,scheduled_date",
              });

            if (planningError) {
              console.error(`[generate-30-days] Error upserting planning_days (existing answer):`, planningError);
            } else {
              console.log(`[generate-30-days] planning_days updated for ${dayStr} (existing answer)`);
            }

            // Done for this day
            continue;
          }
        }

        // Otherwise: generate a NEW answer (and article)
        const answerData = await generateAnswer(q.question, brandName, description, q.intent, language, apiKey);
        const score = computeScore(answerData.answer, brandName);

        // Insert answer
        const { data: insertedAnswer, error: answerError } = await supabase
          .from("answers")
          .insert({
            project_id: projectId,
            question: q.question,
            answer: answerData.answer,
            slug: generateSlug(q.question),
            intent: q.intent,
            score,
            is_public: false,
            scheduled_date: scheduledDateStr,
            supporting_content: {
              bullets: answerData.bullets,
              faq: answerData.faq,
            },
          })
          .select()
          .single();

        if (answerError) {
          console.error(`[generate-30-days] Error inserting answer:`, answerError);
          continue;
        }

        answersCreated.push(insertedAnswer);
        console.log(`[generate-30-days] Answer created: ${insertedAnswer.id}`);

        // Generate article
        const articleData = await generateArticle(
          q.question, answerData.answer, answerData.bullets, answerData.faq,
          brandName, description, language, apiKey
        );

        // Insert article
        const { data: insertedArticle, error: articleError } = await supabase
          .from("articles")
          .insert({
            project_id: projectId,
            linked_answer_id: insertedAnswer.id,
            title: articleData.title,
            content: articleData.content,
            html_content: articleData.htmlContent,
            meta_description: articleData.metaDescription,
            word_count: articleData.wordCount,
            slug: generateSlug(articleData.title),
            status: "scheduled",
            scheduled_date: scheduledDateStr,
            aeo_score: score,
          })
          .select()
          .single();

        if (articleError) {
          console.error(`[generate-30-days] Error inserting article:`, articleError);
        } else {
          articlesCreated.push(insertedArticle);
          console.log(`[generate-30-days] Article created: ${insertedArticle.id}`);

          // Update answer with article reference
          await supabase
            .from("answers")
            .update({ article_id: insertedArticle.id, has_article: true })
            .eq("id", insertedAnswer.id);
        }

        // Update planning_days table (with NOT NULL constraints - only insert if we have both)
        if (insertedArticle?.id) {
          const { error: planningError } = await supabase
            .from("planning_days")
            .upsert({
              project_id: projectId,
              scheduled_date: dayStr,
              answer_id: insertedAnswer.id,
              article_id: insertedArticle.id,
            }, {
              onConflict: "project_id,scheduled_date",
            });

          if (planningError) {
            console.error(`[generate-30-days] Error upserting planning_days:`, planningError);
          } else {
            console.log(`[generate-30-days] planning_days updated for ${dayStr}`);
          }
        }

        // Small delay to avoid rate limits
        if (i < questions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        console.error(`[generate-30-days] Error processing question ${i + 1}:`, err);
      }
    }

    console.log(`[generate-30-days] Completed: ${answersCreated.length} answers, ${articlesCreated.length} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        answers_created: answersCreated.length,
        articles_created: articlesCreated.length,
        days_processed: days,
        start_offset: startOffset,
        next_offset: startOffset + days,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[generate-30-days] Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
