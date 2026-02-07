import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 60) + "-" + Date.now().toString(36);
}

function computeLocalScore(answer: string, businessName: string): number {
  let score = 75; // Base score
  
  // Bonus for mentioning the business name
  if (answer.toLowerCase().includes(businessName.toLowerCase())) score += 5;
  
  // Bonus for structured content
  if (answer.includes("•") || answer.includes("-") || answer.includes("1.")) score += 3;
  
  // Bonus for specific data (numbers, percentages)
  if (/\d+%|\$\d+|\d+\s*(hours?|minutes?|days?)/i.test(answer)) score += 4;
  
  // Bonus for contact info
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|@|www\.|\.com/i.test(answer)) score += 3;
  
  // Bonus for temporal context
  if (/202[4-9]|today|currently|now/i.test(answer)) score += 3;
  
  // Cap at 98
  return Math.min(score, 98);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId, businessId, businessName, businessAddress, businessContext } = await req.json();

    if (!projectId || !businessName) {
      return new Response(
        JSON.stringify({ error: "projectId and businessName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-30-local] Starting for business: ${businessName}`);

    // Get project language
    const { data: project } = await supabase
      .from("projects")
      .select("language")
      .eq("id", projectId)
      .single();

    const { data: settings } = await supabase
      .from("generation_settings")
      .select("language")
      .eq("project_id", projectId)
      .single();

    const language = settings?.language || project?.language || "en";
    console.log(`[generate-30-local] Using language: ${language}`);

    // Build context from business data
    const contextParts: string[] = [];
    if (businessContext?.rating) {
      contextParts.push(`Rating: ${businessContext.rating}/5 (${businessContext.reviewCount || 0} reviews)`);
    }
    if (businessContext?.types?.length > 0) {
      contextParts.push(`Business Type: ${businessContext.types.slice(0, 3).join(", ")}`);
    }
    if (businessContext?.phone) {
      contextParts.push(`Phone: ${businessContext.phone}`);
    }
    if (businessContext?.website) {
      contextParts.push(`Website: ${businessContext.website}`);
    }
    if (businessContext?.openingHours?.length > 0) {
      contextParts.push(`Hours: ${businessContext.openingHours.slice(0, 3).join("; ")}`);
    }

    // Generate 30 unique questions based on local SEO patterns
    const questionTemplates = language === "fr" ? [
      `Quels sont les horaires d'ouverture de ${businessName} ?`,
      `Comment contacter ${businessName} ?`,
      `Où se trouve ${businessName} ?`,
      `Quels services propose ${businessName} ?`,
      `${businessName} est-il ouvert le dimanche ?`,
      `Quels sont les avis sur ${businessName} ?`,
      `${businessName} accepte-t-il les réservations ?`,
      `Quel est le meilleur produit chez ${businessName} ?`,
      `${businessName} propose-t-il la livraison ?`,
      `Comment se rendre à ${businessName} en transport ?`,
      `${businessName} a-t-il un parking ?`,
      `Quelles sont les spécialités de ${businessName} ?`,
      `${businessName} est-il adapté aux familles ?`,
      `Quel est le rapport qualité-prix chez ${businessName} ?`,
      `${businessName} propose-t-il des offres spéciales ?`,
      `Comment réserver chez ${businessName} ?`,
      `${businessName} est-il accessible aux personnes à mobilité réduite ?`,
      `Quels moyens de paiement accepte ${businessName} ?`,
      `${businessName} a-t-il une terrasse ?`,
      `Combien coûte en moyenne une visite chez ${businessName} ?`,
      `${businessName} propose-t-il des services en ligne ?`,
      `Quelle est l'histoire de ${businessName} ?`,
      `${businessName} organise-t-il des événements ?`,
      `Quels sont les avantages de choisir ${businessName} ?`,
      `${businessName} est-il recommandé par les locaux ?`,
      `Comment ${businessName} se démarque de la concurrence ?`,
      `${businessName} propose-t-il des cartes cadeaux ?`,
      `Quelle est la meilleure heure pour visiter ${businessName} ?`,
      `${businessName} a-t-il un programme de fidélité ?`,
      `Que pensent les clients de ${businessName} ?`,
    ] : [
      `What are ${businessName}'s opening hours?`,
      `How do I contact ${businessName}?`,
      `Where is ${businessName} located?`,
      `What services does ${businessName} offer?`,
      `Is ${businessName} open on weekends?`,
      `What are the reviews for ${businessName}?`,
      `Does ${businessName} accept reservations?`,
      `What is the best product at ${businessName}?`,
      `Does ${businessName} offer delivery?`,
      `How do I get to ${businessName} by public transport?`,
      `Does ${businessName} have parking?`,
      `What are ${businessName}'s specialties?`,
      `Is ${businessName} family-friendly?`,
      `What is the value for money at ${businessName}?`,
      `Does ${businessName} have special offers?`,
      `How do I book at ${businessName}?`,
      `Is ${businessName} wheelchair accessible?`,
      `What payment methods does ${businessName} accept?`,
      `Does ${businessName} have outdoor seating?`,
      `What is the average cost at ${businessName}?`,
      `Does ${businessName} offer online services?`,
      `What is the history of ${businessName}?`,
      `Does ${businessName} host events?`,
      `What are the benefits of choosing ${businessName}?`,
      `Is ${businessName} recommended by locals?`,
      `How does ${businessName} stand out from competitors?`,
      `Does ${businessName} sell gift cards?`,
      `What is the best time to visit ${businessName}?`,
      `Does ${businessName} have a loyalty program?`,
      `What do customers think about ${businessName}?`,
    ];

    const createdAnswers: { id: string; question: string; score: number; scheduled_date: string }[] = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const question = questionTemplates[i % questionTemplates.length];
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + i);
      const scheduledDateStr = scheduledDate.toISOString().split("T")[0];

      console.log(`[generate-30-local] Generating ${i + 1}/30: ${question.substring(0, 40)}...`);

      // Generate answer via AI
      const prompt = `You are an expert at creating locally-optimized answers for businesses that rank well in AI search results.

Business Name: ${businessName}
Location: ${businessAddress || "Local area"}
${contextParts.length > 0 ? `\nBusiness Details:\n${contextParts.join("\n")}` : ""}

Question: "${question}"

Create a concise, locally-optimized answer in ${language === "fr" ? "French" : "English"} that:
1. Directly answers the question with specific, factual information
2. Includes the business name and location naturally
3. Uses concrete details (hours, contact info, ratings) when relevant
4. Is optimized for AI assistants (ChatGPT, Gemini, Claude, Perplexity)
5. Sounds natural and helpful, not robotic or promotional
6. Is between 80-150 words for optimal citation

Return ONLY the answer text, no additional formatting, labels, or quotes.`;

      try {
        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`[generate-30-local] AI request failed for question ${i + 1}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const answer = aiData.choices?.[0]?.message?.content?.trim() || "";

        if (!answer) continue;

        const score = computeLocalScore(answer, businessName);
        const slug = generateSlug(question);

        // Insert into local_answers
        const { data: inserted, error: insertError } = await supabase
          .from("local_answers")
          .insert({
            project_id: projectId,
            business_id: businessId,
            business_name: businessName,
            question,
            answer,
            score,
            slug,
            scheduled_date: scheduledDateStr,
            language,
            is_public: false,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error(`[generate-30-local] Insert error:`, insertError);
          continue;
        }

        createdAnswers.push({
          id: inserted.id,
          question,
          score,
          scheduled_date: scheduledDateStr,
        });

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error(`[generate-30-local] Error generating answer ${i + 1}:`, err);
      }
    }

    console.log(`[generate-30-local] ✅ Created ${createdAnswers.length} local answers`);

    return new Response(
      JSON.stringify({
        success: true,
        created: createdAnswers.length,
        answers: createdAnswers,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[generate-30-local] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
