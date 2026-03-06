import { motion } from "framer-motion";
import { Search, TrendingUp, Star, Award } from "lucide-react";
import { GoogleLogo } from "@/components/icons/ChatGPTLogo";

const chartData = [
  { month: "Month 1", value: 200 },
  { month: "Month 2", value: 800 },
  { month: "Month 3", value: 2200 },
  { month: "Month 4", value: 4500 },
  { month: "Month 5", value: 7200 },
  { month: "Month 6", value: 10000 },
];

export function TrafficGrowthSection() {
  const maxVal = 10000;

  return (
    <section className="py-12 md:py-24 bg-background relative overflow-hidden">
      <div className="container px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-14"
        >
          <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
            <GoogleLogo className="h-6 w-6 md:h-9 md:w-9" />
            <h2 className="text-xl md:text-4xl font-extrabold text-foreground">
              Google Search{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-600">
                Traffic Growth
              </span>
            </h2>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Mobile: stacked, Desktop: 3-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
            {/* Chart card — full width on mobile */}
            <div className="md:col-span-1 md:row-span-2 rounded-2xl border border-border bg-card p-3 md:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <p className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Search Console Impressions
                </p>
                <span className="text-[10px] md:text-xs font-bold text-emerald-500 bg-emerald-50 px-1.5 md:px-2 py-0.5 rounded-full">
                  +500%
                </span>
              </div>
              {/* SVG Chart */}
              <div className="relative h-32 md:h-48">
                <svg viewBox="0 0 300 160" className="w-full h-full" preserveAspectRatio="none">
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4" />
                  <line x1="0" y1="70" x2="300" y2="70" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4" />
                  <line x1="0" y1="120" x2="300" y2="120" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4" />
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M0,${150 - (200/maxVal)*130} ${chartData.map((d, i) => `L${i * 60},${150 - (d.value/maxVal)*130}`).join(' ')} L${(chartData.length-1)*60},150 L0,150 Z`}
                    fill="url(#areaGrad)"
                  />
                  <path
                    d={chartData.map((d, i) => `${i === 0 ? 'M' : 'L'}${i * 60},${150 - (d.value/maxVal)*130}`).join(' ')}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartData.map((d, i) => (
                    <circle
                      key={i}
                      cx={i * 60}
                      cy={150 - (d.value/maxVal)*130}
                      r="4"
                      fill="#10b981"
                      stroke="white"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[8px] md:text-[10px] text-emerald-600 font-semibold">
                  <span>10K</span>
                  <span>5K</span>
                  <span>1K</span>
                  <span>200</span>
                </div>
              </div>
              <div className="flex justify-between mt-1.5 md:mt-2 text-[7px] md:text-[10px] text-muted-foreground">
                {chartData.map(d => <span key={d.month}>{d.month.replace('Month ', 'M')}</span>)}
              </div>
            </div>

            {/* Before / After — side by side on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-3 md:p-5 shadow-sm flex flex-col items-center justify-center text-center">
                <p className="text-[9px] md:text-xs font-medium text-muted-foreground mb-1">Before AutoPilot Geo</p>
                <p className="text-2xl md:text-4xl font-extrabold text-foreground">~200</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">visits/month</p>
              </div>
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-3 md:p-5 shadow-sm flex flex-col items-center justify-center text-center">
                <p className="text-[9px] md:text-xs font-medium text-emerald-600 mb-1">After 6 months</p>
                <p className="text-2xl md:text-4xl font-extrabold text-emerald-600">10K+</p>
                <p className="text-[10px] md:text-xs text-emerald-600/70">visits/month</p>
              </div>
            </div>

            {/* Feature badges */}
            <div className="md:col-span-2 grid grid-cols-3 gap-2 md:gap-3">
              <FeatureBadge icon={<Search className="h-4 w-4 md:h-5 md:w-5 text-primary" />} label="Rich Snippets" />
              <FeatureBadge icon={<TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />} label="SEO Optimized" />
              <FeatureBadge icon={<Award className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />} label="Top Rankings" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeatureBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl md:rounded-2xl border border-border bg-card p-2 md:p-4 shadow-sm flex flex-col items-center justify-center text-center gap-1.5 md:gap-2">
      <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-muted/50 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-[9px] md:text-xs font-semibold text-foreground">{label}</p>
    </div>
  );
}
