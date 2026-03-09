import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const AccessDeniedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10"
        >
          <ShieldX className="h-12 w-12 text-destructive" />
        </motion.div>

        <h1 className="mb-2 text-3xl font-bold text-foreground">წვდომა შეზღუდულია</h1>
        <p className="mb-8 text-muted-foreground text-lg">
          თქვენ არ გაქვთ ამ გვერდზე შესვლის უფლება. მიმართეთ ადმინისტრატორს წვდომის მისაღებად.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            უკან დაბრუნება
          </Button>
          <Button onClick={() => navigate('/')} className="gap-2">
            <Home className="h-4 w-4" />
            მთავარი გვერდი
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AccessDeniedPage;
