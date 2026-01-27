import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, placeId } = await req.json();

    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Google Places API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If placeId is provided, get place details
    if (placeId) {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,reviews,types,opening_hours,photos,geometry&key=${GOOGLE_PLACES_API_KEY}`;
      
      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (data.status !== "OK") {
        return new Response(
          JSON.stringify({ error: data.error_message || "Place not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const place = data.result;
      
      // Extract top reviews for Q&A generation context
      const topReviews = (place.reviews || []).slice(0, 5).map((r: any) => ({
        text: r.text,
        rating: r.rating,
      }));

      return new Response(
        JSON.stringify({
          business: {
            id: placeId,
            name: place.name,
            address: place.formatted_address,
            phone: place.formatted_phone_number || "",
            website: place.website || "",
            rating: place.rating || 0,
            reviewCount: place.user_ratings_total || 0,
            types: place.types || [],
            openingHours: place.opening_hours?.weekday_text || [],
            location: place.geometry?.location || null,
            reviews: topReviews,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search for places by query
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query or placeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return new Response(
        JSON.stringify({ error: data.error_message || "Search failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = (data.results || []).slice(0, 5).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      types: place.types || [],
    }));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in places-search:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
