import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AdsReport {
  id: string;
  report_type: string;
  content: string;
  summary: string | null;
  created_at: string;
}

export function useAdsStreaming() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [previousReports, setPreviousReports] = useState<AdsReport[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadPreviousReports = useCallback(async (focus: string) => {
    setIsLoadingHistory(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("ads_reports")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("report_type", focus)
        .order("created_at", { ascending: false })
        .limit(10);
      setPreviousReports((data as AdsReport[]) || []);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const loadReport = (report: AdsReport) => {
    setText(report.content);
    setSavedReportId(report.id);
  };

  const saveReport = async (focus: string, content: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !content || content.length < 50) return null;

      // Extract summary (first 3 lines)
      const summary = content.split("\n").filter(l => l.trim()).slice(0, 3).join(" ").substring(0, 300);

      const { data, error } = await supabase
        .from("ads_reports")
        .insert({
          user_id: session.user.id,
          report_type: focus,
          content,
          summary,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to save report:", error);
        return null;
      }
      return data?.id || null;
    } catch (err) {
      console.error("Save report error:", err);
      return null;
    }
  };

  const startAnalysis = async (focus: string, campaignId?: string) => {
    setIsStreaming(true);
    setText("");
    setSavedReportId(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-google-ads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ focus, campaign_id: campaignId }),
        }
      );

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setText(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setText(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      // Save report to DB
      const reportId = await saveReport(focus, fullText);
      if (reportId) {
        setSavedReportId(reportId);
        // Refresh history
        loadPreviousReports(focus);
        toast({ title: "✅ Rapport sauvegardé", description: "L'analyse est enregistrée dans votre historique" });
      }

      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: any) {
      toast({ title: "Erreur analyse", description: err.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  return { 
    text, isStreaming, startAnalysis, ref, 
    savedReportId, 
    previousReports, isLoadingHistory, loadPreviousReports, loadReport 
  };
}
