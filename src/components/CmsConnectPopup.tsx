import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CMS_OPTIONS = [
  { id: "wordpress", name: "WordPress", icon: "🔵" },
  { id: "shopify", name: "Shopify", icon: "🟢" },
  { id: "wix", name: "Wix", icon: "🟡" },
  { id: "webflow", name: "Webflow", icon: "🔷" },
  { id: "duda", name: "Duda", icon: "🟠" },
  { id: "framer", name: "Framer", icon: "⬛" },
];

interface CmsConnectPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CmsConnectPopup({ open, onOpenChange }: CmsConnectPopupProps) {
  const navigate = useNavigate();
  const [selectedCms, setSelectedCms] = useState<string | null>(null);

  const handleConnect = () => {
    navigate("/integrations");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔗 Connect Your Store
          </DialogTitle>
          <DialogDescription>
            Connect your CMS to auto-publish AEO answers as FAQ pages on your website
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-3 py-4">
          {CMS_OPTIONS.map((cms) => (
            <button
              key={cms.id}
              onClick={() => setSelectedCms(cms.id)}
              className={`
                p-4 rounded-xl border transition-all text-center relative
                ${selectedCms === cms.id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {selectedCms === cms.id && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              )}
              <div className="text-2xl mb-1">{cms.icon}</div>
              <p className="text-xs font-medium">{cms.name}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Later
          </Button>
          <Button 
            className="flex-1 gap-2" 
            onClick={handleConnect}
            disabled={!selectedCms}
          >
            <ExternalLink className="w-4 h-4" />
            Configure
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
