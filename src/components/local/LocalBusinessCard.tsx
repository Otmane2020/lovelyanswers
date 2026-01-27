import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Star, Phone, Globe, Clock, X, ExternalLink } from "lucide-react";

interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  types: string[];
  openingHours?: string[];
  location?: { lat: number; lng: number };
}

interface LocalBusinessCardProps {
  business: Business;
  onClear: () => void;
}

export function LocalBusinessCard({ business, onClear }: LocalBusinessCardProps) {
  return (
    <Card className="border-orange-200/50 dark:border-orange-800/30 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-semibold">{business.name}</h3>
              <Button variant="ghost" size="icon" onClick={onClear} className="shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4" />
              {business.address}
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{business.rating}</span>
                <span className="text-muted-foreground">({business.reviewCount} reviews)</span>
              </div>
              {business.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{business.phone}</span>
                </div>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">
                    {business.website.replace(/^https?:\/\//, "")}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {business.openingHours && business.openingHours.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  Opening Hours
                </div>
                <div className="text-sm space-y-0.5">
                  {business.openingHours.slice(0, 3).map((hours, i) => (
                    <p key={i}>{hours}</p>
                  ))}
                  {business.openingHours.length > 3 && (
                    <p className="text-muted-foreground">
                      +{business.openingHours.length - 3} more...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-1 md:w-48">
            <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-orange-600">{business.rating}</p>
              <p className="text-xs text-muted-foreground">Average Rating</p>
            </div>
            <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-red-600">{business.reviewCount}</p>
              <p className="text-xs text-muted-foreground">Total Reviews</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
