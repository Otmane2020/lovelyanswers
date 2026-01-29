import { motion } from "framer-motion";

const trustedBrands = [
  "REVOLVE",
  "BOOHOO",
  "PRETTYLITTLETHING",
  "MISSGUIDED",
  "ASOS",
  "SHEIN",
  "ZARA",
  "H&M",
  "UNIQLO",
  "FASHION NOVA",
  "GYMSHARK",
  "SKIMS",
  "PRINCESS POLLY",
  "SHOWPO",
  "LULUS",
];

export function TrustedByMarquee() {
  // Duplicate the brands for seamless infinite scroll
  const allBrands = [...trustedBrands, ...trustedBrands];

  return (
    <section className="py-8 md:py-12 bg-muted/50 overflow-hidden">
      <div className="container px-4 mb-6">
        <p className="text-center text-sm md:text-base text-muted-foreground">
          Trusted by <span className="font-bold text-foreground">7,000+</span> satisfied merchants
        </p>
      </div>
      
      <div className="relative">
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-r from-muted/50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-l from-muted/50 to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling container */}
        <motion.div
          className="flex gap-8 md:gap-16 whitespace-nowrap"
          animate={{
            x: [0, -50 * trustedBrands.length],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
        >
          {allBrands.map((brand, index) => (
            <span
              key={`${brand}-${index}`}
              className="text-lg md:text-xl font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0"
            >
              {brand}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
