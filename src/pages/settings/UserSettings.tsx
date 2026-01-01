import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

export function UserSettings() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [productUpdates, setProductUpdates] = useState(true);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Platform language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Security</Label>
            <Button variant="outline" className="w-full justify-start">
              Change password
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Product Updates</Label>
              <p className="text-xs text-muted-foreground">
                Receive emails about new features and updates
              </p>
            </div>
            <Switch
              checked={productUpdates}
              onCheckedChange={setProductUpdates}
            />
          </div>

          <Button className="w-full">Save changes</Button>
        </div>
      </Card>
    </div>
  );
}
