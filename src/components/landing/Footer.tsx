import { Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer id="contact" className="py-16 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-lg text-foreground">Marte Company</span>
            </div>
            <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
              Built for the future of Georgian Business. სრული ERP ეკოსისტემა თანამედროვე ბიზნესისთვის.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">სწრაფი ბმულები</h4>
            <div className="space-y-2">
              {["მთავარი", "ჩვენი პროექტი", "ჩვენს შესახებ", "სამომავლო გეგმები"].map((l) => (
                <a
                  key={l}
                  href={`#${l === "მთავარი" ? "hero" : l === "ჩვენი პროექტი" ? "features" : l === "ჩვენს შესახებ" ? "about" : "roadmap"}`}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">კონტაქტი</h4>
            <div className="space-y-3">
              <a href="tel:+995568883319" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-4 h-4 text-primary" />
                +995 568 88-33-19
              </a>
              <a href="mailto:info@marte.ge" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-4 h-4 text-primary" />
                info@marte.ge
              </a>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                თბილისი, საქართველო
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Marte Company — Built for the future of Georgian Business.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
