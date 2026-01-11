import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IntentType = "price" | "duration" | "criteria" | "comparison" | "howto" | "best" | "what" | "why";

const INTENTS: IntentType[] = ["price", "criteria", "comparison", "howto", "best", "what", "why", "duration"];

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

  // Bonus for temporal context
  if (answer.includes(String(currentYear)) || answer.includes(String(currentYear + 1))) {
    score += 10;
  }

  // Bonus for numbers with context
  if (/\d+\s*(€|\$|%|euros?|mois|jours?)/i.test(answer)) score += 8;
  else if (/\d+/.test(answer)) score += 3;

  // Bonus for decision criteria
  if (/crit[eè]re|choisir|éviter|erreur|condition/i.test(answer)) score += 8;

  // Bonus for structured content
  if (/[:\-•]|\d\.\s/.test(answer)) score += 5;

  // Bonus for good length
  const wordCount = answer.split(/\s+/).length;
  if (wordCount >= 80 && wordCount <= 120) score += 5;

  // Bonus for brand mention
  if (new RegExp(escapeRegex(brand), "i").test(answer)) score += 4;

  // Penalty for generic starts
  if (/^(un|une|le|la|les|l')\s+\w+\s+(est|sont|désigne)/i.test(answer)) score -= 10;

  return Math.min(98, Math.max(50, score));
}

// Generate questions for 30 days
async function generateQuestions(
  brandName: string,
  description: string,
  language: string,
  apiKey: string,
  count: number = 30
): Promise<{ question: string; intent: IntentType }[]> {
  const currentYear = new Date().getFullYear();
  
  const systemPrompt = language === "fr"
    ? `Tu génères ${count} questions DÉCISIONNELLES uniques pour un planning de contenu 30 jours.

RÈGLES:
- Questions orientées décision (Comment choisir, Quel budget, Quelles erreurs éviter...)
- NE PAS utiliser le nom de marque dans les questions
- Varier les intentions: prix, critères, comparaisons, tutoriels, erreurs à éviter
- Questions naturelles comme sur ChatGPT/Google
- Inclure le contexte ${currentYear} quand pertinent

TYPES À MIXER:
- "Comment choisir..." (criteria)
- "Quel budget prévoir pour..." (price)
- "Quelles erreurs éviter..." (howto)
- "Quelle différence entre..." (comparison)
- "Pourquoi..." (why)
- "Quel est le meilleur..." (best)

Retourne UNIQUEMENT du JSON valide.`
    : `Generate ${count} unique DECISION-ORIENTED questions for a 30-day content plan.

RULES:
- Decision-oriented questions (How to choose, What budget, What mistakes to avoid...)
- DO NOT use brand name in questions
- Mix intents: price, criteria, comparisons, tutorials, mistakes to avoid
- Natural questions like on ChatGPT/Google
- Include ${currentYear} context when relevant

Return ONLY valid JSON.`;

  const userPrompt = `
Business: ${brandName}
Description: ${description}
Language: ${language}
Count: ${count}

Generate ${count} unique questions. Return JSON:
{
  "questions": [
    {"question": "...", "intent": "criteria|price|howto|comparison|why|best|what|duration"},
    ...
  ]
}`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid JSON");
    
    const parsed = JSON.parse(match[0]);
    return parsed.questions.slice(0, count).map((q: any) => ({
      question: q.question,
      intent: INTENTS.includes(q.intent) ? q.intent : detectIntent(q.question),
    }));
  } catch (e) {
    console.error("Failed to generate questions:", e);
    // Fallback questions
    const fallback: { question: string; intent: IntentType }[] = [];
    for (let i = 0; i < count; i++) {
      fallback.push({
        question: `Comment choisir un ${brandName.toLowerCase()} adapté à ses besoins ? (${i + 1})`,
        intent: INTENTS[i % INTENTS.length],
      });
    }
    return fallback;
  }
}

// Generate answer for a question
async function generateAnswer(
  question: string,
  brandName: string,
  description: string,
  intent: IntentType,
  language: string,
  apiKey: string
): Promise<{ answer: string; bullets: string[]; faq: { q: string; a: string }[] }> {
  const currentYear = new Date().getFullYear();

  const systemPrompt = language === "fr"
    ? `Tu es un expert AEO. Rédige des réponses que ChatGPT/Gemini voudront CITER.

FORMAT CITATION-FIRST:
1. Première phrase = réponse DIRECTE avec critère/chiffre
2. Phrase 2 = contexte ${currentYear} OU condition
3. Phrase 3 = erreur à éviter OU comparaison

⛔ INTERDITS: définitions génériques, superlatifs, marketing
✅ INCLURE: chiffres, conditions, erreurs fréquentes

Mention ${brandName} UNE fois comme exemple. 80-120 mots.`
    : `You are an AEO expert. Write answers ChatGPT/Gemini will CITE.

CITATION-FIRST FORMAT:
1. First sentence = DIRECT answer with criterion/number
2. Sentence 2 = ${currentYear} context OR condition
3. Sentence 3 = mistake to avoid OR comparison

⛔ BANNED: generic definitions, superlatives, marketing
✅ INCLUDE: numbers, conditions, common mistakes

Mention ${brandName} ONCE as example. 80-120 words.`;

  const userPrompt = `
Question: ${question}
Brand: ${brandName}
Description: ${description}
Intent: ${intent}

Return ONLY valid JSON:
{
  "answer": "réponse citation-first",
  "bullets": ["critère/conseil 1", "critère/conseil 2", "critère/conseil 3"],
  "faq": [{"q": "question connexe", "a": "réponse courte"}]
}`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid JSON");
    
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("Failed to generate answer:", e);
    return {
      answer: `${brandName} propose des solutions adaptées à ce besoin. Pour plus d'informations, consultez les ressources disponibles.`,
      bullets: [],
      faq: [],
    };
  }
}

// Generate article from answer
async function generateArticle(
  question: string,
  answer: string,
  bullets: string[],
  faq: { q: string; a: string }[],
  brandName: string,
  description: string,
  language: string,
  apiKey: string
): Promise<{ title: string; content: string; htmlContent: string; metaDescription: string; wordCount: number }> {
  const currentYear = new Date().getFullYear();

  const systemPrompt = language === "fr"
    ? `Tu rédiges un article de blog SEO/AEO complet basé sur une réponse existante.

FORMAT:
- Titre accrocheur avec année ${currentYear} si pertinent
- Introduction (contexte + promesse)
- Corps structuré avec H2/H3
- Points clés intégrés naturellement
- FAQ incluse
- Conclusion avec appel à l'action subtil

TON: Expert, informatif, pas marketing
LONGUEUR: 800-1200 mots
MARQUE: Mentionner ${brandName} 2-3 fois naturellement`
    : `Write a complete SEO/AEO blog article based on an existing answer.

FORMAT:
- Catchy title with ${currentYear} if relevant
- Introduction (context + promise)
- Structured body with H2/H3
- Key points integrated naturally
- FAQ included
- Conclusion with subtle CTA

TONE: Expert, informative, not marketing
LENGTH: 800-1200 words
BRAND: Mention ${brandName} 2-3 times naturally`;

  const userPrompt = `
Question: ${question}
Answer: ${answer}
Key Points: ${bullets.join(", ")}
FAQ: ${faq.map(f => `Q: ${f.q} A: ${f.a}`).join(" | ")}
Brand: ${brandName}
Description: ${description}

Return JSON:
{
  "title": "titre article SEO",
  "content": "contenu markdown complet avec ## et ###",
  "metaDescription": "meta description 155 chars max"
}`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid JSON");
    
    const parsed = JSON.parse(match[0]);
    const wordCount = parsed.content.split(/\s+/).length;

    // Convert markdown to HTML
    let htmlContent = parsed.content
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    // Add FAQ section if exists
    if (faq.length > 0) {
      const faqHtml = `
        <section class="faq-section">
          <h2>${language === 'fr' ? 'Questions Fréquentes' : 'FAQ'}</h2>
          ${faq.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('')}
        </section>`;
      htmlContent += faqHtml;
    }

    return {
      title: parsed.title,
      content: parsed.content,
      htmlContent,
      metaDescription: parsed.metaDescription,
      wordCount,
    };
  } catch (e) {
    console.error("Failed to generate article:", e);
    return {
      title: question,
      content: answer,
      htmlContent: `<p>${answer}</p>`,
      metaDescription: answer.substring(0, 155),
      wordCount: answer.split(/\s+/).length,
    };
  }
}

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
    const { projectId, language = "fr", days = 30 } = body;

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

    console.log(`[generate-30-days] Starting for project: ${project.name}, ${days} days`);

    // Check existing scheduled items to enforce 2 items/day max (1 Answer + 1 Article)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get existing answers per day
    const { data: existingAnswers } = await supabase
      .from("answers")
      .select("id, scheduled_date")
      .eq("project_id", projectId)
      .gte("scheduled_date", today.toISOString());
    
    // Get existing articles per day  
    const { data: existingArticles } = await supabase
      .from("articles")
      .select("id, scheduled_date")
      .eq("project_id", projectId)
      .gte("scheduled_date", today.toISOString());
    
    // Build map of items per day: { dateKey: { answers: count, articles: count } }
    const itemsPerDay: Record<string, { answers: number; articles: number }> = {};
    
    for (const a of existingAnswers || []) {
      const d = new Date(a.scheduled_date);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!itemsPerDay[dateKey]) itemsPerDay[dateKey] = { answers: 0, articles: 0 };
      itemsPerDay[dateKey].answers++;
    }
    
    for (const art of existingArticles || []) {
      const d = new Date(art.scheduled_date);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!itemsPerDay[dateKey]) itemsPerDay[dateKey] = { answers: 0, articles: 0 };
      itemsPerDay[dateKey].articles++;
    }
    
    // Count days that are FULL (have both 1 answer + 1 article = 2 items max)
    const fullDays = Object.values(itemsPerDay).filter(d => d.answers >= 1 && d.articles >= 1).length;
    
    console.log(`[generate-30-days] Found ${fullDays} fully scheduled days (2 items each)`);
    console.log(`[generate-30-days] Daily limit: 1 AEO Answer + 1 Blog Article = 2 items/day MAX`);

    // Calculate how many NEW days we need to fill
    const daysToGenerate = days - fullDays;
    
    if (daysToGenerate <= 0) {
      console.log(`[generate-30-days] All ${days} days already have 2 items scheduled, nothing to generate`);
      return new Response(
        JSON.stringify({
          success: true,
          message: `All ${days} days already have 2 items scheduled (1 Answer + 1 Article per day)`,
          answers_created: 0,
          articles_created: 0,
          days,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Generate questions only for empty days
    console.log(`[generate-30-days] Generating ${daysToGenerate} questions for empty days...`);
    const questions = await generateQuestions(brandName, description, language, apiKey, daysToGenerate);
    console.log(`[generate-30-days] Generated ${questions.length} questions`);

    const answersCreated: any[] = [];
    const articlesCreated: any[] = [];

    // Step 2: Find next available dates (skip days that already have 2 items)
    let dayOffset = 0;
    let questionsProcessed = 0;
    
    while (questionsProcessed < questions.length && dayOffset < days + 30) {
      const scheduledDate = new Date(today.getTime() + dayOffset * 86400000);
      const dateKey = `${scheduledDate.getFullYear()}-${scheduledDate.getMonth()}-${scheduledDate.getDate()}`;
      
      // Check current items for this day
      const dayItems = itemsPerDay[dateKey] || { answers: 0, articles: 0 };
      
      // Skip if this day already has 2 items (1 answer + 1 article = FULL)
      if (dayItems.answers >= 1 && dayItems.articles >= 1) {
        dayOffset++;
        continue;
      }

      const q = questions[questionsProcessed];

      console.log(`[generate-30-days] Processing ${questionsProcessed + 1}/${questions.length}: ${q.question.substring(0, 50)}... for ${scheduledDate.toISOString().split('T')[0]}`);
      const scheduledDateStr = scheduledDate.toISOString();

      try {
        // Generate answer
        const answerData = await generateAnswer(
          q.question,
          brandName,
          description,
          q.intent,
          language,
          apiKey
        );

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
          console.error(`Error inserting answer:`, answerError);
          continue;
        }

        answersCreated.push(insertedAnswer);

        // Generate article
        const articleData = await generateArticle(
          q.question,
          answerData.answer,
          answerData.bullets,
          answerData.faq,
          brandName,
          description,
          language,
          apiKey
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
          console.error(`Error inserting article:`, articleError);
        } else {
          articlesCreated.push(insertedArticle);

          // Update answer with article reference
          await supabase
            .from("answers")
            .update({ article_id: insertedArticle.id, has_article: true })
            .eq("id", insertedAnswer.id);
          
          // Update local counter to track items for this day
          if (!itemsPerDay[dateKey]) itemsPerDay[dateKey] = { answers: 0, articles: 0 };
          itemsPerDay[dateKey].articles++;
        }
        
        // Update local counter for answer
        if (!itemsPerDay[dateKey]) itemsPerDay[dateKey] = { answers: 0, articles: 0 };
        itemsPerDay[dateKey].answers++;

        // Small delay to avoid rate limits
        if (questionsProcessed < questions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error(`Error processing question ${questionsProcessed + 1}:`, err);
      }
      
      questionsProcessed++;
      dayOffset++;
    }

    console.log(`[generate-30-days] Completed: ${answersCreated.length} answers, ${articlesCreated.length} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        answers_created: answersCreated.length,
        articles_created: articlesCreated.length,
        days,
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
