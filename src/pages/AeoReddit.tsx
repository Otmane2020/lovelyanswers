import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  TrendingUp, 
  Eye,
  Zap,
  Copy,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock Reddit posts data
const redditPosts = [
  {
    id: "1",
    subreddit: "r/seo",
    title: "What is a good SEO tool for beginners?",
    views: "11K",
    trending: true,
    suggestedComment: "I'd recommend starting with Google Search Console and Analytics - they're free and give you essential data. For keyword research, tools like Ubersuggest have free tiers. Once you're ready to invest, Ahrefs or SEMrush are industry standards. The key is to start simple and scale up as you learn what metrics matter most for your site.",
    url: "https://reddit.com/r/seo/example1"
  },
  {
    id: "2",
    subreddit: "r/marketing",
    title: "How do you track ROI on content marketing?",
    views: "8.2K",
    trending: true,
    suggestedComment: "Great question! We track several metrics: organic traffic growth, keyword rankings, conversion rates from organic, and assisted conversions. Google Analytics 4 makes this easier with attribution modeling. The key is setting up proper goal tracking before you start your content campaigns.",
    url: "https://reddit.com/r/marketing/example2"
  },
  {
    id: "3",
    subreddit: "r/smallbusiness",
    title: "Best way to improve local SEO for a restaurant?",
    views: "5.1K",
    trending: false,
    suggestedComment: "Focus on your Google Business Profile first - complete every section, add photos weekly, and respond to all reviews. Then ensure your NAP (Name, Address, Phone) is consistent across all directories. Local schema markup on your website helps too. These basics will get you 80% of the results.",
    url: "https://reddit.com/r/smallbusiness/example3"
  },
  {
    id: "4",
    subreddit: "r/seo",
    title: "Is AI content detection hurting rankings?",
    views: "15K",
    trending: true,
    suggestedComment: "From our testing, Google doesn't penalize AI content specifically - they penalize low-quality content regardless of source. The key is to add unique insights, data, and expertise that AI can't replicate. Human editing and fact-checking are essential.",
    url: "https://reddit.com/r/seo/example4"
  },
];

export default function AeoReddit() {
  const { toast } = useToast();
  const [onboardingProgress] = useState(45);
  const [timeLeft] = useState("17 minutes");

  const handleCopyAndOpen = (post: typeof redditPosts[0]) => {
    navigator.clipboard.writeText(post.suggestedComment);
    toast({
      title: "Comment copied!",
      description: "Opening Reddit post in new tab...",
    });
    window.open(post.url, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Onboarding Progress Card */}
        <Card className="p-6 border border-border/50 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-foreground">{onboardingProgress}%</span>
              </div>
              <div className="w-24 h-1 bg-primary rounded-full mt-2" />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              <span>{timeLeft} left</span>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Onboarding in progress...
          </h2>
          <p className="text-muted-foreground text-sm">
            You can leave this page, we'll email you when everything is ready.
          </p>
        </Card>

        {/* Reddit Posts List */}
        <div className="space-y-4">
          {redditPosts.map((post) => (
            <Card key={post.id} className="p-5 border border-border/50">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Reddit Icon */}
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">r/</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{post.subreddit}</span>
                      {post.trending && (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <h3 className="font-medium text-foreground">{post.title}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{post.views} views</span>
                </div>
              </div>

              {/* Suggested Comment */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">Suggested Comment</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-4">
                  {post.suggestedComment}
                </p>
              </div>

              {/* Action Button */}
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={() => handleCopyAndOpen(post)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy & Open Post
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer Text */}
        <p className="text-center text-muted-foreground text-sm py-4">
          Scanning Reddit for opportunities to engage with your audience.
        </p>
      </div>
    </DashboardLayout>
  );
}
