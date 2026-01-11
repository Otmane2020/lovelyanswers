import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { useActiveProject, useUpdateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

export function CompetitorSettings() {
  const { project, isLoading } = useActiveProject();
  const updateProject = useUpdateProject();
  
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");

  // Load competitors from project
  useEffect(() => {
    if (project?.competitors) {
      setCompetitors(project.competitors);
    }
  }, [project]);

  const addCompetitor = () => {
    if (newCompetitor && !competitors.includes(newCompetitor)) {
      setCompetitors([...competitors, newCompetitor]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (competitor: string) => {
    setCompetitors(competitors.filter(c => c !== competitor));
  };

  const handleSave = async () => {
    if (!project) return;

    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        updates: {
          competitors: competitors,
        },
      });
      toast.success("Competitors saved successfully");
    } catch (error) {
      toast.error("Failed to save competitors");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No project found. Please create a project first.</p>
      </Card>
    );
  }

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
              <Label>Added competitors ({competitors.length})</Label>
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

          {competitors.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No competitors added yet. Add competitor domains to track their content strategy.
            </p>
          )}

          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={updateProject.isPending}
          >
            {updateProject.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save competitors"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
