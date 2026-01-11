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
  let score = 65;
  const currentYear = new Date().getFullYear();

  if (answer.includes(String(currentYear)) || answer.includes(String(currentYear + 1))) {
    score += 10;
  }

  if (/\d+\s*(€|\$|%|euros?|mois|jours?)/i.test(answer)) score += 8;
  else if (/\d+/.test(answer)) score += 3;

  if (/crit[eè]re|choisir|éviter|erreur|condition/i.test(answer)) score += 8;
  if (/[:\-•]|\d\.\s/.test(answer)) score += 5;

  const wordCount = answer.split(/\s+/).length;
  if (wordCount >= 80 && wordCount <= 120) score += 5;

  if (new RegExp(escapeRegex(brand), "i").test(answer)) score += 4;

  if (/^(un|une|le|la|les|l')\s+\w+\s+(est|sont|désigne)/i.test(answer)) score -= 10;

  return Math.min(98, Math.max(50, score));
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
  count: number = 5
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

Return ONLY this JSON (no markdown, no code block):
{"questions":[{"question":"...?","intent":"criteria|price|howto|comparison|why|best"}]}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

// Generate answer - SIMPLIFIED prompt
async function generateAnswer(
  question: string,
  brandName: string,
  description: string,
  intent: IntentType,
  language: string,
  apiKey: string,
  retryCount: number = 0
): Promise<{ answer: string; bullets: string[]; faq: { q: string; a: string }[] }> {
  const currentYear = new Date().getFullYear();

  const prompt = language === "fr"
    ? `Réponds à cette question pour ${brandName}: "${question}"

Règles:
- Réponse directe avec chiffres/critères (80-120 mots)
- Mentionne ${brandName} une fois
- Contexte ${currentYear}

Retourne UNIQUEMENT ce JSON (pas de markdown):
{"answer":"réponse directe...","bullets":["point 1","point 2","point 3"],"faq":[{"q":"question connexe?","a":"réponse courte"}]}`
    : `Answer this question for ${brandName}: "${question}"

Rules:
- Direct answer with numbers/criteria (80-120 words)
- Mention ${brandName} once
- ${currentYear} context

Return ONLY this JSON (no markdown):
{"answer":"direct answer...","bullets":["point 1","point 2","point 3"],"faq":[{"q":"related question?","a":"short answer"}]}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    
    // Fallback
    return {
      answer: `${brandName} propose des solutions adaptées pour répondre à cette question. Pour plus d'informations sur "${question.replace("?", "")}", consultez les ressources disponibles sur notre site.`,
      bullets: ["Qualité garantie", "Service client réactif", "Solutions personnalisées"],
      faq: [],
    };
  }
}

// Generate article - SIMPLIFIED prompt to avoid JSON issues
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

  // VERY simplified prompt to get clean JSON
  const prompt = language === "fr"
    ? `Écris un article de blog pour ${brandName} basé sur:
Question: ${question}
Réponse: ${answer}

Règles:
- Titre accrocheur avec ${currentYear}
- 400-600 mots (pas plus!)
- Structure simple avec sections
- Meta description < 155 caractères
- NE PAS utiliser de markdown complexe dans le JSON

Retourne UNIQUEMENT ce JSON:
{"title":"Titre de l'article","content":"Introduction... Section 1... Section 2... Conclusion...","metaDescription":"Description courte"}`
    : `Write a blog article for ${brandName} based on:
Question: ${question}
Answer: ${answer}

Rules:
- Catchy title with ${currentYear}
- 400-600 words (no more!)
- Simple structure with sections
- Meta description < 155 chars
- NO complex markdown in JSON

Return ONLY this JSON:
{"title":"Article Title","content":"Introduction... Section 1... Section 2... Conclusion...","metaDescription":"Short description"}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    // Convert to simple HTML
    let htmlContent = articleContent
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .split('\n\n')
      .filter((p: string) => p.trim())
      .map((p: string) => `<p>${p.trim()}</p>`)
      .join('\n');

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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("Missing auth header");

    const token = auth.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) throw new Error("Invalid token");

    const body = await req.json();
    // REDUCED DEFAULT: 5 days instead of 30 to avoid timeouts
    const { projectId, language = "fr", days = 5, overwrite = true, startOffset = 0 } = body;

    if (!projectId) throw new Error("Missing projectId");

    // Get project
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .single();

    if (!project) throw new Error("Project not found");

    const brandName = project.brand_name || project.name;
    const description = project.business_description || "";

    console.log(`[generate-30-days] Starting for project: ${project.name}, ${days} days (offset: ${startOffset}), overwrite=${overwrite}`);

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

    // Generate questions for this batch
    console.log(`[generate-30-days] Generating ${days} questions...`);
    const questions = await generateQuestions(brandName, description, language, apiKey, days);
    console.log(`[generate-30-days] Generated ${questions.length} questions`);

    const answersCreated: any[] = [];
    const articlesCreated: any[] = [];

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const scheduledDate = new Date(startDate.getTime() + i * 86400000);
      const scheduledDateStr = scheduledDate.toISOString();
      const dayStr = scheduledDateStr.split('T')[0];

      console.log(`[generate-30-days] Processing ${i + 1}/${questions.length}: ${q.question.substring(0, 40)}...`);

      try {
        // Generate answer
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

        // Update planning table
        const { error: planningError } = await supabase
          .from("planning")
          .upsert({
            project_id: projectId,
            day: dayStr,
            answer_id: insertedAnswer.id,
            article_id: insertedArticle?.id || null,
          }, {
            onConflict: "project_id,day",
          });

        if (planningError) {
          console.error(`[generate-30-days] Error upserting planning:`, planningError);
        } else {
          console.log(`[generate-30-days] Planning updated for ${dayStr}`);
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
