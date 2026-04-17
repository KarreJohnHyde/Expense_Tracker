import { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function AppLock() {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [errorCount, setErrorCount] = useState(0);

  // Default Pin for this demo is 1234
  // Fallback to 1234 if no custom PIN is set
  const SECURE_PIN = localStorage.getItem('expenseai_vault_pin') || '1234';

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Wait 3 minutes of inactivity to lock the app
      if (!locked) {
         timeoutId = setTimeout(() => {
             setLocked(true);
         }, 180000); 
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [locked]);

  const handleUnlock = () => {
      if (pin === SECURE_PIN) {
          setLocked(false);
          setPin('');
          setErrorCount(0);
          toast.success("Identity Verified. Vault Unlocked.");
      } else {
          setErrorCount(prev => prev + 1);
          setPin('');
          toast.error("Invalid Security PIN.");
      }
  };

  return (
    <AnimatePresence>
      {locked && (
        <motion.div 
           initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
           animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
           exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
           transition={{ duration: 0.5 }}
           className="fixed inset-0 z-[100] bg-background/80 flex flex-col items-center justify-center p-4"
        >
            <motion.div 
               initial={{ scale: 0.9, y: 50 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-card border border-border/50 shadow-2xl p-8 rounded-2xl w-full max-w-sm text-center relative overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
               <div className="size-16 bg-red-500/10 rounded-full mx-auto flex items-center justify-center mb-6">
                  <Lock className="size-8 text-red-500" />
               </div>
               
               <h2 className="text-2xl font-bold mb-2">App Locked</h2>
               <p className="text-muted-foreground text-sm mb-6">
                  For your security, ExpenseAI has secured your financial data due to inactivity. Enter PIN (1234) to resume.
               </p>

               <div className="space-y-4">
                   <Input 
                      type="password" 
                      placeholder="****" 
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                      className="text-center text-2xl tracking-widest h-14 bg-background"
                      autoFocus
                   />
                   {errorCount > 0 && <p className="text-xs text-red-500 flex items-center justify-center gap-1"><AlertCircle className="size-3"/> Incorrect PIN attempts: {errorCount}</p>}
                   <Button onClick={handleUnlock} className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow border-0 text-white font-semibold flex items-center justify-center gap-2">
                      <ShieldCheck className="size-5"/> Unlock Vault
                   </Button>
               </div>
            </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
