import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const highlights = [
  "30+ ინტეგრირებული მოდული ერთ პლატფორმაზე",
  "RS.GE სერთიფიცირებული ინტეგრაცია",
  "Real-time სინქრონიზაცია ყველა მოწყობილობაზე",
  "ქართულ საგადასახადო კანონმდებლობასთან სრული შესაბამისობა",
  "24/7 ტექნიკური მხარდაჭერა",
  "მონაცემთა უსაფრთხოების უმაღლესი სტანდარტი",
];

const AboutSection = () => {
  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              ჩვენს შესახებ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-balance mb-6">
              შექმნილია ქართული ბიზნესისთვის
            </h2>
            <p className="text-muted-foreground text-pretty mb-8 leading-relaxed">
              Marte Company-ის მისიაა ქართული ბიზნესის ციფრული ტრანსფორმაცია. ჩვენი ERP 
              სისტემა შექმნილია ადგილობრივი ბაზრის უნიკალური მოთხოვნილებების გათვალისწინებით — 
              RS.GE ინტეგრაციით, ქართული საგადასახადო კანონმდებლობით და ქართულენოვანი ინტერფეისით.
            </p>
            <div className="space-y-3">
              {highlights.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass shadow-stack-lg rounded-[24px] p-8"
          >
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-primary tabular-nums mb-1">30+</p>
                <p className="text-sm text-muted-foreground">ინტეგრირებული მოდული</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="concentric-inner bg-secondary/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">99.9%</p>
                  <p className="text-xs text-muted-foreground mt-1">Uptime</p>
                </div>
                <div className="concentric-inner bg-secondary/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{"<"}50ms</p>
                  <p className="text-xs text-muted-foreground mt-1">სინქრონიზაციის დრო</p>
                </div>
                <div className="concentric-inner bg-secondary/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">256-bit</p>
                  <p className="text-xs text-muted-foreground mt-1">დაშიფვრა</p>
                </div>
                <div className="concentric-inner bg-secondary/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">24/7</p>
                  <p className="text-xs text-muted-foreground mt-1">მხარდაჭერა</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
