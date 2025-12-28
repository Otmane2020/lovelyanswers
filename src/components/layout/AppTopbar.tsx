import { useState } from "react";
import { Globe, ChevronDown, Zap, Crown, Bell, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  domain: string;
}

const projects: Project[] = [
  { id: "1", name: "Sweet Deco", domain: "sweetdeco.fr" },
  { id: "2", name: "Tech Store", domain: "techstore.com" },
  { id: "3", name: "Blog Pro", domain: "blogpro.io" },
];

const languages = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

export function AppTopbar() {
  const [currentProject, setCurrentProject] = useState(projects[0]);
  const [currentLanguage, setCurrentLanguage] = useState(languages[0]);
  const [isDark, setIsDark] = useState(true);
  const creditsUsed = 67;
  const creditsTotal = 100;

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-xl">
      {/* Left: Project Selector */}
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-sm font-medium">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <span className="hidden sm:inline">{currentProject.name}</span>
              <span className="text-muted-foreground">({currentProject.domain})</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setCurrentProject(project)}
                className={cn(
                  "flex items-center gap-3 py-3",
                  currentProject.id === project.id && "bg-accent"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground">{project.domain}</span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-primary">
              + Add new project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <span>{currentLanguage.flag}</span>
              <span className="hidden sm:inline">{currentLanguage.code.toUpperCase()}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => setCurrentLanguage(lang)}
                className={cn(currentLanguage.code === lang.code && "bg-accent")}
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: Credits + Actions */}
      <div className="flex items-center gap-3">
        {/* Credits Counter */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            <span className="text-foreground">{creditsUsed}</span>
            <span className="text-muted-foreground"> / {creditsTotal}</span>
          </span>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground">credits</span>
        </div>

        {/* Upgrade Button */}
        <Button size="sm" className="gap-2 gradient-bg text-primary-foreground shadow-glow-sm hover:shadow-glow">
          <Crown className="h-4 w-4" />
          <span className="hidden sm:inline">Upgrade</span>
        </Button>

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs gradient-bg text-primary-foreground border-0">
            3
          </Badge>
        </Button>

        {/* Avatar */}
        <Button variant="ghost" size="icon" className="rounded-full">
          <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center text-sm font-semibold text-primary-foreground">
            JD
          </div>
        </Button>
      </div>
    </header>
  );
}
