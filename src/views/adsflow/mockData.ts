// Realistic mock data for AdsFlow demo
export const mockCampaigns = [
  { id: "c1", name: "Summer Sale 2026 — Sneakers", objective: "Sales", status: "active", budget_type: "daily", budget_amount: 120, spent: 2840, start_date: "2026-05-01", end_date: "2026-06-15", impressions: 482310, ctr: 2.84, roas: 4.21 },
  { id: "c2", name: "Brand Awareness — Gen Z", objective: "Awareness", status: "active", budget_type: "lifetime", budget_amount: 5000, spent: 1820, start_date: "2026-05-10", end_date: "2026-06-10", impressions: 1240500, ctr: 0.94, roas: 1.12 },
  { id: "c3", name: "Newsletter Lead Gen — France", objective: "Leads", status: "active", budget_type: "daily", budget_amount: 80, spent: 1640, start_date: "2026-04-20", end_date: null, impressions: 218000, ctr: 3.42, roas: 5.84 },
  { id: "c4", name: "Retargeting — Cart Abandoners", objective: "Sales", status: "paused", budget_type: "daily", budget_amount: 60, spent: 980, start_date: "2026-04-15", end_date: null, impressions: 92400, ctr: 4.81, roas: 7.32 },
  { id: "c5", name: "App Install Push — iOS", objective: "App Installs", status: "active", budget_type: "daily", budget_amount: 150, spent: 3210, start_date: "2026-05-05", end_date: null, impressions: 612800, ctr: 1.92, roas: 2.43 },
  { id: "c6", name: "Black Friday Teaser", objective: "Engagement", status: "draft", budget_type: "lifetime", budget_amount: 8000, spent: 0, start_date: null, end_date: null, impressions: 0, ctr: 0, roas: 0 },
  { id: "c7", name: "Webinar Sign-up — B2B SaaS", objective: "Leads", status: "active", budget_type: "daily", budget_amount: 95, spent: 1180, start_date: "2026-05-12", end_date: "2026-06-01", impressions: 84200, ctr: 2.31, roas: 6.18 },
  { id: "c8", name: "Q1 Performance — Discontinued", objective: "Traffic", status: "ended", budget_type: "lifetime", budget_amount: 12000, spent: 12000, start_date: "2026-01-01", end_date: "2026-03-31", impressions: 3210000, ctr: 1.42, roas: 2.91 },
];

export const mockKpis = {
  spend: { value: 23690, change: 12.4 },
  impressions: { value: 6960210, change: 8.1 },
  clicks: { value: 142840, change: 15.2 },
  ctr: { value: 2.05, change: 0.31 },
  conversions: { value: 4218, change: 22.6 },
  roas: { value: 3.84, change: 0.42 },
  cpm: { value: 3.4, change: -0.18 },
  cpc: { value: 0.17, change: -0.03 },
};

export const mockSpendRevenue = Array.from({ length: 30 }, (_, i) => ({
  date: `May ${i + 1}`,
  spend: 600 + Math.round(Math.sin(i / 4) * 200 + Math.random() * 150),
  revenue: 2200 + Math.round(Math.cos(i / 5) * 800 + Math.random() * 400),
}));

export const mockClicksByCampaign = mockCampaigns.slice(0, 5).map(c => ({
  name: c.name.split(" — ")[0],
  clicks: Math.round(c.impressions * (c.ctr / 100)),
}));

export const mockBudgetDistribution = mockCampaigns.filter(c => c.status === "active").map(c => ({
  name: c.name.split(" — ")[0],
  value: c.spent,
}));

export const mockTopAds = [
  { id: "a1", name: "Sneakers Hero Video v3", campaign: "Summer Sale 2026", spend: 1420, clicks: 8210, ctr: 4.21, roas: 6.84, status: "active" },
  { id: "a2", name: "Cart Recovery Carousel", campaign: "Retargeting", spend: 680, clicks: 3940, ctr: 5.12, roas: 8.21, status: "active" },
  { id: "a3", name: "Newsletter — Photographer UGC", campaign: "Newsletter Lead Gen", spend: 920, clicks: 5840, ctr: 3.91, roas: 5.18, status: "active" },
  { id: "a4", name: "Webinar Speaker Lineup", campaign: "Webinar Sign-up", spend: 540, clicks: 2180, ctr: 2.84, roas: 6.42, status: "active" },
  { id: "a5", name: "iOS App — Demo Reel", campaign: "App Install Push", spend: 1840, clicks: 6210, ctr: 1.82, roas: 2.84, status: "active" },
];

export const mockAdSets = [
  { id: "as1", name: "Sneakers — Women 25-40 FR", campaign: "Summer Sale 2026 — Sneakers", audience: "Lookalike 2% — Buyers FR", placement: "Advantage+", budget: 60, status: "active", reach: 184000, frequency: 1.8, cpm: 3.21, ctr: 2.94 },
  { id: "as2", name: "Sneakers — Men 18-35 EU", campaign: "Summer Sale 2026 — Sneakers", audience: "Interest: Streetwear", placement: "IG Feed + Reels", budget: 60, status: "active", reach: 218000, frequency: 2.1, cpm: 3.42, ctr: 2.71 },
  { id: "as3", name: "Cart Recovery — 7d window", campaign: "Retargeting — Cart Abandoners", audience: "Custom: Add to Cart 7d", placement: "FB Feed + IG Stories", budget: 60, status: "paused", reach: 32400, frequency: 3.4, cpm: 4.81, ctr: 4.81 },
  { id: "as4", name: "B2B Decision Makers", campaign: "Webinar Sign-up — B2B SaaS", audience: "Job Titles: CMO, Growth", placement: "LinkedIn-style FB targeting", budget: 95, status: "active", reach: 18400, frequency: 1.4, cpm: 12.4, ctr: 2.31 },
  { id: "as5", name: "Lead Gen — Photographers", campaign: "Newsletter Lead Gen — France", audience: "Lookalike 1% — Subscribers", placement: "IG Reels", budget: 80, status: "active", reach: 64200, frequency: 1.6, cpm: 4.12, ctr: 3.42 },
];

export const mockAds = [
  { id: "ad1", name: "Sneakers Hero Video v3", format: "video", status: "active", thumb: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", ctr: 4.21, roas: 6.84, spend: 1420 },
  { id: "ad2", name: "Cart Recovery Carousel", format: "carousel", status: "active", thumb: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400", ctr: 5.12, roas: 8.21, spend: 680 },
  { id: "ad3", name: "Newsletter — Photographer UGC", format: "single_image", status: "active", thumb: "https://images.unsplash.com/photo-1554080353-a576cf803bda?w=400", ctr: 3.91, roas: 5.18, spend: 920 },
  { id: "ad4", name: "Webinar Speaker Lineup", format: "single_image", status: "active", thumb: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=400", ctr: 2.84, roas: 6.42, spend: 540 },
  { id: "ad5", name: "iOS App — Demo Reel", format: "video", status: "active", thumb: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400", ctr: 1.82, roas: 2.84, spend: 1840 },
  { id: "ad6", name: "Summer Lookbook Carousel", format: "carousel", status: "paused", thumb: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400", ctr: 2.41, roas: 3.12, spend: 420 },
];

export const mockAudiences = {
  saved: [
    { id: "s1", name: "France — Women 25-40", size: 2400000, type: "Saved", updated: "2026-05-12" },
    { id: "s2", name: "EU Sneakerheads", size: 8200000, type: "Saved", updated: "2026-05-08" },
    { id: "s3", name: "B2B SaaS Decision Makers", size: 480000, type: "Saved", updated: "2026-05-15" },
  ],
  custom: [
    { id: "cu1", name: "Cart Abandoners 30d", type: "Website Traffic", size: 42000, status: "ready", updated: "2026-05-19" },
    { id: "cu2", name: "Newsletter Subscribers", type: "Customer List", size: 18400, status: "ready", updated: "2026-05-10" },
    { id: "cu3", name: "Video Viewers 75% — Hero Reel", type: "Engagement", size: 84000, status: "ready", updated: "2026-05-17" },
    { id: "cu4", name: "App Users — Last 90d", type: "App Activity", size: 12800, status: "updating", updated: "2026-05-20" },
  ],
  lookalike: [
    { id: "l1", name: "LAL 1% — Top Buyers FR", size: 680000, type: "Lookalike 1%", updated: "2026-05-14" },
    { id: "l2", name: "LAL 2% — Newsletter Subs", size: 1340000, type: "Lookalike 2%", updated: "2026-05-12" },
    { id: "l3", name: "LAL 5% — Cart Abandoners EU", size: 8200000, type: "Lookalike 5%", updated: "2026-05-09" },
  ],
};

export const mockCreatives = [
  { id: "cr1", name: "Sneakers Hero 1080x1080", type: "image", dims: "1080×1080", thumb: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", usedIn: 4, ctr: 4.21, roas: 6.84, tags: ["sneakers", "hero", "summer"] },
  { id: "cr2", name: "Cart Carousel Card 1", type: "image", dims: "1080×1080", thumb: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400", usedIn: 2, ctr: 5.12, roas: 8.21, tags: ["retargeting", "carousel"] },
  { id: "cr3", name: "Photographer UGC Vertical", type: "image", dims: "1080×1920", thumb: "https://images.unsplash.com/photo-1554080353-a576cf803bda?w=400", usedIn: 3, ctr: 3.91, roas: 5.18, tags: ["ugc", "story"] },
  { id: "cr4", name: "Webinar Lineup Banner", type: "image", dims: "1200×628", thumb: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=400", usedIn: 1, ctr: 2.84, roas: 6.42, tags: ["b2b", "event"] },
  { id: "cr5", name: "iOS Demo Reel 30s", type: "video", dims: "1080×1920", thumb: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400", usedIn: 2, ctr: 1.82, roas: 2.84, tags: ["app", "demo"] },
  { id: "cr6", name: "Summer Lookbook Card 1", type: "image", dims: "1080×1080", thumb: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400", usedIn: 1, ctr: 2.41, roas: 3.12, tags: ["fashion", "lookbook"] },
];
