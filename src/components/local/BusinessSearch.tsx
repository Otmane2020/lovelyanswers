"use client";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
}

interface BusinessSearchProps {
  onSelectBusiness: (placeId: string) => void;
  isLoading: boolean;
}

export function BusinessSearch({ onSelectBusiness, isLoading }: BusinessSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("places-search", {
          body: { query, action: "search" },
        });

        if (error) throw error;

        if (data?.results) {
          setResults(data.results);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Error searching businesses:", error);
        toast.error("Failed to search businesses");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setQuery(result.name);
    setShowResults(false);
    onSelectBusiness(result.id);
  };

  return (
    <Card className="border-orange-200/50 dark:border-orange-800/30 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto p-3 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white w-fit mb-4">
          <MapPin className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl">Local AEO</CardTitle>
        <CardDescription className="text-base">
          Search and select your business to get started with local AI optimization
        </CardDescription>
      </CardHeader>
      <CardContent className="max-w-md mx-auto">
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Café de Paris, 75001 Paris"
              className="pl-10 pr-10"
              onFocus={() => results.length > 0 && setShowResults(true)}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Autosuggest Dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  disabled={isLoading}
                  className={cn(
                    "w-full p-3 text-left hover:bg-accent transition-colors border-b last:border-b-0",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.name}</p>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {result.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm shrink-0">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      <span>{result.rating}</span>
                      <span className="text-muted-foreground">({result.reviewCount})</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {showResults && results.length === 0 && query.length >= 3 && !isSearching && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
              No businesses found
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Start typing to search for your business on Google Places
        </p>
      </CardContent>
    </Card>
  );
}
