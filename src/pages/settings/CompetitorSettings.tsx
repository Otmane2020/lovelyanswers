import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

export function CompetitorSettings() {
  const [competitors, setCompetitors] = useState<string[]>([
    "competitor1.com",
    "competitor2.com",
  ]);
  const [newCompetitor, setNewCompetitor] = useState("");

  const addCompetitor = () => {
    if (newCompetitor && !competitors.includes(newCompetitor)) {
      setCompetitors([...competitors, newCompetitor]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (competitor: string) => {
    setCompetitors(competitors.filter(c => c !== competitor));
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Competitors</h3>
            <p className="text-sm text-muted-foreground">
              Add competitor domains to monitor and analyze their strategies
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              placeholder="Enter competitor domain (e.g. example.com)"
              onKeyPress={(e) => e.key === "Enter" && addCompetitor()}
            />
            <Button onClick={addCompetitor} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          {competitors.length > 0 && (
            <div className="space-y-2">
              <Label>Added competitors</Label>
              <div className="flex flex-wrap gap-2">
                {competitors.map((competitor) => (
                  <Badge
                    key={competitor}
                    variant="secondary"
                    className="gap-1 pr-1 py-1.5"
                  >
                    {competitor}
                    <button
                      onClick={() => removeCompetitor(competitor)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full">Save competitors</Button>
        </div>
      </Card>
    </div>
  );
}
