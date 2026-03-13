"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, List } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type IntentKey = "informational" | "transactional" | "navigational" | "commercial";

interface BulkKeywordsDialogProps {
  projectId: string;
  existingKeywords: string[];
  onKeywordsAdded: () => void;
}

export function BulkKeywordsDialog({ projectId, existingKeywords, onKeywordsAdded }: BulkKeywordsDialogProps) {
  const [open, setOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkIntent, setBulkIntent] = useState<IntentKey>("informational");
  const [isAdding, setIsAdding] = useState(false);

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;

    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast.error("No keywords to add");
      return;
    }

    // Filter out duplicates
    const existingLower = existingKeywords.map((k) => k.toLowerCase());
    const uniqueLines = lines.filter((l) => !existingLower.includes(l.toLowerCase()));
    const duplicateCount = lines.length - uniqueLines.length;

    if (uniqueLines.length === 0) {
      toast.error("All keywords already exist");
      return;
    }

    setIsAdding(true);
    try {
      const rows = uniqueLines.map((keyword) => ({
        project_id: projectId,
        keyword,
        intent: bulkIntent,
        is_used: false,
      }));

      const { error } = await supabase.from("keywords").insert(rows);

      if (error) throw error;

      toast.success(
        `${uniqueLines.length} keyword${uniqueLines.length > 1 ? "s" : ""} added${
          duplicateCount > 0 ? ` (${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""} skipped)` : ""
        }`
      );
      setBulkText("");
      setOpen(false);
      onKeywordsAdded();
    } catch (error) {
      console.error("Error bulk adding keywords:", error);
      toast.error("Failed to add keywords");
    } finally {
      setIsAdding(false);
    }
  };

  const lineCount = bulkText
    .split("\n")
    .filter((l) => l.trim().length > 0).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <List className="h-4 w-4" />
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Add Keywords</DialogTitle>
          <DialogDescription>
            Add one keyword per line. Duplicates will be automatically skipped.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder={"meuble occasion pas cher\ncanapé seconde main\ntable basse vintage\n..."}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {lineCount} keyword{lineCount !== 1 ? "s" : ""} detected
            </span>
            <Select value={bulkIntent} onValueChange={(v) => setBulkIntent(v as IntentKey)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informational">Informational</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="navigational">Navigational</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleBulkAdd} disabled={isAdding || lineCount === 0}>
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              `Add ${lineCount} keyword${lineCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
