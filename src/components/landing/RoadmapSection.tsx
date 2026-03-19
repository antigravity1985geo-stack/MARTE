import { motion } from "framer-motion";
import { Heart, Baby, GraduationCap, Cake } from "lucide-react";

const roadmapItems = [
  {
    icon: Heart,
    title: "კლინიკების მართვა",
    description: "სამედიცინო დაწესებულებების სრული მართვის სისტემა — პაციენტების რეგისტრაცია, ვიზიტების დაგეგმვა და ანგარიშგება.",
    status: "მალე",
  },
  {
    icon: Baby,
    title: "კერძო საბავშვო ბაღის მართვა",
    description: "აღსაზრდელების აღრიცხვა, მშობლებთან კომუნიკაცია, გადასახადების მართვა და დღის განრიგის დაგეგმვა.",
    status: "2025 Q3",
  },
  {
    icon: GraduationCap,
    title: "კერძო სკოლის მართვა",
    description: "მოსწავლეთა ბაზა, ნიშნების სისტემა, საგაკვეთილო ცხრილი, მასწავლებლების და ფინანსების მართვა.",
    status: "2025 Q4",
  },
  {
    icon: Cake,
    title: "საკონდიტროს მართვა",
    description: "შეკვეთების მიღება, რეცეპტურის მართვა, ინგრედიენტების საწყობი და მიწოდების ლოჯისტიკა.",
    status: "2026 Q1",
  },
];

const RoadmapSection = () => {
  return (
    <section id="roadmap" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/20 to-background" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            სამომავლო გეგმები
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-balance mb-4">
            რა გელით მალე
          </h2>
          <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
            ჩვენ მუდმივად ვვითარდებით. აქ არის ის, რაზეც ახლა ვმუშაობთ.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {roadmapItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -4 }}
              className="concentric-outer glass shadow-stack hover:shadow-stack-lg transition-shadow text-center"
            >
              <div className="concentric-inner bg-primary/5 w-14 h-14 flex items-center justify-center mx-auto mb-5">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                {item.status}
              </span>
              <h3 className="text-lg font-semibold text-foreground mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground text-pretty">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
