import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Monitor, Package, TrendingUp, Users,
  Receipt, Printer, ChevronRight, ChevronLeft, X, Sparkles, PartyPopper
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  tip?: string;
}

const tourSteps: TourStep[] = [
  {
    title: 'მოგესალმებით! 👋',
    description: 'MARTE არის სრული ბიზნეს მართვის სისტემა. მოდით, გაგაცნოთ ძირითადი ფუნქციები.',
    icon: Sparkles,
    route: '/app',
    tip: 'ტური ნებისმიერ დროს შეგიძლიათ გამოტოვოთ',
  },
  {
    title: 'მთავარი Dashboard',
    description: 'აქ ნახავთ ბიზნესის მთავარ მეტრიკებს — შემოსავალი, მოგება, მარჟა და გაყიდვების ტრენდები რეალურ დროში.',
    icon: LayoutDashboard,
    route: '/app',
    tip: 'Dashboard ავტომატურად განახლდება ახალი გაყიდვების დამატებისას',
  },
  {
    title: 'POS სისტემა',
    description: 'გაყიდვების პუნქტი — სწრაფად მოძებნეთ პროდუქტი, დაასკანერეთ ბარკოდი და გააფორმეთ გაყიდვა.',
    icon: Monitor,
    route: '/app/pos',
    tip: 'შეგიძლიათ ბარკოდის სკანერი გამოიყენოთ სწრაფი დამატებისთვის',
  },
  {
    title: 'პროდუქტები',
    description: 'მართეთ პროდუქტების კატალოგი — დაამატეთ ახალი, განაახლეთ ფასები, აკონტროლეთ მარაგი.',
    icon: Package,
    route: '/app/products',
    tip: 'როცა მარაგი მინიმუმს ჩამოსცდება, ავტომატურად მიიღებთ შეტყობინებას',
  },
  {
    title: 'გაყიდვები და ინვოისები',
    description: 'ნახეთ ყველა გაყიდვის ისტორია, გამოიტანეთ Excel/PDF ანგარიშები და შექმენით ინვოისები კლიენტებისთვის.',
    icon: TrendingUp,
    route: '/app/sales',
    tip: 'თითოეული გაყიდვიდან შეგიძლიათ PDF ინვოისის გენერაცია',
  },
  {
    title: 'კლიენტები და მომწოდებლები',
    description: 'შეინახეთ კლიენტებისა და მომწოდებლების მონაცემები — სახელი, ტელეფონი, მისამართი, საიდენტ. ნომერი.',
    icon: Users,
    route: '/app/clients',
    tip: 'კლიენტის მიბმა გაყიდვაზე ინვოისის ავტომატურ გენერაციას გაამარტივებს',
  },
  {
    title: 'ხარჯები და ფინანსები',
    description: 'აღრიცხეთ ხარჯები, ნახეთ მოგება-ზარალი და მართეთ მომწოდებლებთან ანგარიშსწორება.',
    icon: Receipt,
    route: '/app/expenses',
    tip: 'ბუღალტერიის სექციაში ნახავთ სრულ ფინანსურ სურათს',
  },
  {
    title: 'მზად ხართ! 🎉',
    description: 'სისტემა მზად არის გამოსაყენებლად. დაიწყეთ პროდუქტების დამატებით ან პირდაპირ POS-დან გაყიდვით!',
    icon: PartyPopper,
    route: '/app',
    tip: 'ნებისმიერ დროს შეგიძლიათ ტურის თავიდან გაშვება პროფილის პარამეტრებიდან',
  },
];

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.id) return;
    // Check onboarding status from Supabase (cloud-first, cross-device)
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data?.onboarding_completed) {
          const timer = setTimeout(() => setIsActive(true), 800);
          return () => clearTimeout(timer);
        }
      });
  }, [user?.id]);

  const step = tourSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tourSteps.length - 1;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const complete = useCallback(async () => {
    setIsActive(false);
    navigate('/');
    // Persist completion to Supabase so it works across devices
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    }
  }, [navigate, user?.id]);

  const next = useCallback(() => {
    if (isLast) {
      complete();
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (tourSteps[nextStep].route !== location.pathname) {
        navigate(tourSteps[nextStep].route);
      }
    }
  }, [currentStep, isLast, complete, navigate, location.pathname]);

  const prev = useCallback(() => {
    if (!isFirst) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (tourSteps[prevStep].route !== location.pathname) {
        navigate(tourSteps[prevStep].route);
      }
    }
  }, [currentStep, isFirst, navigate, location.pathname]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  if (!isActive) return null;

  const Icon = step.icon;

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay and Wrapper to center the card */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center pb-20 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-foreground/60 backdrop-blur-sm pointer-events-auto"
              onClick={skip}
            />

            {/* Tour card */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-[101] w-[90vw] max-w-md pointer-events-auto"
            >
            <div className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {/* Close button */}
              <button
                onClick={skip}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Content */}
              <div className="p-6 pt-5">
                {/* Icon */}
                <motion.div
                  key={`icon-${currentStep}`}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4"
                >
                  <Icon className="h-7 w-7 text-primary" />
                </motion.div>

                {/* Step counter */}
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  ნაბიჯი {currentStep + 1} / {tourSteps.length}
                </p>

                {/* Title */}
                <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {step.description}
                </p>

                {/* Tip */}
                {step.tip && (
                  <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 mb-4">
                    <p className="text-xs text-primary font-medium">
                      💡 {step.tip}
                    </p>
                  </div>
                )}

                {/* Step indicators */}
                <div className="flex gap-1.5 justify-center mb-5">
                  {tourSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep
                          ? 'w-6 bg-primary'
                          : i < currentStep
                            ? 'w-1.5 bg-primary/40'
                            : 'w-1.5 bg-muted-foreground/20'
                        }`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isFirst ? skip : prev}
                    className="text-muted-foreground"
                  >
                    {isFirst ? (
                      'გამოტოვება'
                    ) : (
                      <>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        უკან
                      </>
                    )}
                  </Button>

                  <Button onClick={next} size="sm" className="px-6">
                    {isLast ? (
                      'დაწყება!'
                    ) : (
                      <>
                        შემდეგი
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Call this to reset onboarding so the tour runs again */
export async function resetOnboarding(userId?: string) {
  if (userId) {
    await import('@/integrations/supabase/client').then(({ supabase }) =>
      supabase.from('profiles').update({ onboarding_completed: false }).eq('id', userId)
    );
  }
}
