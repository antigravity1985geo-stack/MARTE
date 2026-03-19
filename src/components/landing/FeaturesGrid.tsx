import { motion } from "framer-motion";
import { RefreshCw, Users, Wifi, BookOpen } from "lucide-react";

const features = [
  {
    icon: RefreshCw,
    title: "RS.GE სრული მხარდაჭერა",
    description:
      "ორმხრივი სინქრონიზაცია RS.GE-სთან. ზედნადებების ავტომატური გაგზავნა, ფისკალიზაცია და საგადასახადო ოპერაციების სრული ავტომატიზაცია.",
    animationClass: "animate-sync-arrows",
  },
  {
    icon: Users,
    title: "HR და ხელფასები",
    description:
      "სრული Payroll ავტომატიზაცია ქართული საგადასახადო სისტემით (20% საშემოსავლო / 2% საპენსიო). დასწრების აღრიცხვა და თანამშრომლების მართვა.",
    animationClass: "",
  },
  {
    icon: Wifi,
    title: "Real-time ეკოსისტემა",
    description:
      "მყისიერი სინქრონიზაცია ყველა მოწყობილობაზე. POS-ში გაკეთებული ტრანზაქცია საწყობში რეალურ დროში აისახება.",
    animationClass: "",
  },
  {
    icon: BookOpen,
    title: "ორადი ბუღალტერია",
    description:
      "პროფესიონალური ფინანსური რეპორტინგი: მოგება-ზარალი, საცდელი ბალანსი, ფულადი ნაკადების ანალიზი და ბალანსის უწყისი.",
    animationClass: "",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const FeaturesGrid = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            ძირითადი ფუნქციები
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-balance mb-4">
            ყველაფერი რაც ბიზნესს სჭირდება
          </h2>
          <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
            ოთხი ძირითადი სვეტი, რომლებიც ქართული ბიზნესის ყოველდღიურ გამოწვევებს პასუხობს.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="concentric-outer glass shadow-stack hover:shadow-stack-lg transition-shadow cursor-default"
            >
              <div className="concentric-inner bg-primary/5 p-4 w-14 h-14 flex items-center justify-center mb-5">
                <feature.icon className={`w-6 h-6 text-primary ${feature.animationClass}`} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                {feature.description}
              </p>

              {/* Decorative ping for real-time */}
              {feature.title === "Real-time ეკოსისტემა" && (
                <div className="mt-5 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping-dot absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </span>
                  <span className="text-xs font-medium text-primary">სინქრონიზებულია</span>
                </div>
              )}

              {/* Progress bars for HR */}
              {feature.title === "HR და ხელფასები" && (
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>საშემოსავლო</span>
                    <span className="tabular-nums">20%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "20%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>საპენსიო</span>
                    <span className="tabular-nums">2%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "2%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.7 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
