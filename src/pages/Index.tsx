import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import POSAnimationSection from "@/components/landing/POSAnimationSection";
import AboutSection from "@/components/landing/AboutSection";
import RoadmapSection from "@/components/landing/RoadmapSection";
import IndustryShowcase from "@/components/landing/IndustryShowcase";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesGrid />
      <IndustryShowcase />
      <POSAnimationSection />
      <AboutSection />
      <RoadmapSection />
      <Footer />
    </div>
  );
};

export default Index;
