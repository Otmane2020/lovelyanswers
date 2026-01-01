import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

export function AccountSettings() {
  const { user } = useAuth();
  const { language } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;
      toast.success(language === "fr" ? "Profil mis à jour" : "Profile updated");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(language === "fr" ? "Erreur lors de la mise à jour" : "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">
          {language === "fr" ? "Nom complet" : "Full name"}
        </Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={language === "fr" ? "Votre nom" : "Your name"}
        />
      </div>
      <Button onClick={handleUpdateProfile} disabled={loading}>
        {loading
          ? language === "fr"
            ? "Enregistrement..."
            : "Saving..."
          : language === "fr"
          ? "Enregistrer"
          : "Save"}
      </Button>
    </div>
  );
}
