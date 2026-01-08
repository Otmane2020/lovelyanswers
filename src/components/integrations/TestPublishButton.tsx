import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TestPublishButtonProps {
  integrationId: string;
  platformName: string;
  size?: "sm" | "default";
}

export function TestPublishButton({ 
  integrationId, 
  platformName,
  size = "sm" 
}: TestPublishButtonProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("cms-publish", {
        body: {
          integrationId,
          content: {
            title: "Test Article from AEO Reply",
            body: `<p>This is a test article published from AEO Reply on ${new Date().toLocaleString()}.</p><p>If you see this content on your CMS, the integration is working correctly!</p>`,
            type: "article",
            sourceId: "test",
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setTestResult("success");
        toast.success(`${platformName} test successful!`, {
          description: data.publishedUrl 
            ? `Published to: ${data.publishedUrl}` 
            : "Content was sent successfully.",
        });
      } else {
        setTestResult("error");
        toast.error(`${platformName} test failed`, {
          description: data?.message || "Unknown error occurred",
        });
      }
    } catch (error) {
      console.error("Test publish error:", error);
      setTestResult("error");
      toast.error(`Failed to test ${platformName}`, {
        description: error instanceof Error ? error.message : "Connection failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleTest}
      disabled={isTesting}
      className="gap-1.5"
    >
      {isTesting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : testResult === "success" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : testResult === "error" ? (
        <XCircle className="h-3.5 w-3.5 text-destructive" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      {isTesting ? "Testing..." : testResult === "success" ? "Passed" : "Test"}
    </Button>
  );
}
