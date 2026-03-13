"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TestPublishButtonProps {
  integrationId: string;
  platformName: string;
  projectId?: string;
  size?: "sm" | "default";
}

export function TestPublishButton({ 
  integrationId, 
  platformName,
  projectId,
  size = "sm" 
}: TestPublishButtonProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      let title = "Test Article from AEO Reply";
      let body = `<p>This is a test article published from AEO Reply on ${new Date().toLocaleString()}.</p>`;
      let sourceId = "test";

      if (projectId) {
        // First try to get a real article with full HTML content
        const { data: articles } = await supabase
          .from("articles")
          .select("id, title, html_content, content, slug")
          .eq("project_id", projectId)
          .not("html_content", "is", null)
          .order("created_at", { ascending: false })
          .limit(1);

        if (articles && articles.length > 0 && articles[0].html_content) {
          const article = articles[0];
          title = article.title;
          body = article.html_content;
          sourceId = article.id;
        } else {
          // Fallback: use an answer but wrap in HTML
          const { data: answers } = await supabase
            .from("answers")
            .select("id, question, answer, slug")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (answers && answers.length > 0) {
            const answer = answers[0];
            title = answer.question;
            body = `<h1>${answer.question}</h1><p>${answer.answer}</p>`;
            sourceId = answer.id;
          }
        }
      }

      const { data, error } = await supabase.functions.invoke("cms-publish", {
        body: {
          integrationId,
          content: {
            title,
            body,
            type: "article",
            sourceId,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setTestResult("success");
        setPublishedUrl(data.publishedUrl || null);
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
    <div className="flex items-center gap-1">
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
      {testResult === "success" && publishedUrl && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          asChild
        >
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      )}
    </div>
  );
}
