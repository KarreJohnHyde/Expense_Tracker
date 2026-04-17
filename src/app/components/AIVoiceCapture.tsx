import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { classifyExpense } from '../lib/classifier';
import { api } from '../lib/api';

export function AIVoiceCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      
      let finalTranscript = '';
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event.error);
        if (event.error !== 'aborted') toast.error('Microphone error: ' + event.error);
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
        // use state callback mechanism to grab latest transcript string
        setTranscript(prev => {
            const finalTxt = prev;
            if (finalTxt.length > 3) {
                processTranscript(finalTxt);
            } else {
                setTranscript('');
            }
            return prev;
        });
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      toast.error('Failed to access microphone.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const processTranscript = async (text: string) => {
    setProcessing(true);
    toast.info("Extracting insights with Brain.js...");
    try {
      // Basic AI heuristic for extraction
      const amountMatches = text.match(/\b\d+(\.\d{1,2})?\b/);
      let extractedAmount = amountMatches ? parseFloat(amountMatches[0]) : 0;
      
      if (!extractedAmount) {
         toast.error("Could not detect any numerical amount in your voice.");
         return;
      }
      
      const prediction = classifyExpense(text);
      
      await api.addExpense({
         description: text.substring(0, 40) + ' (Voice Log)',
         amount: extractedAmount,
         category: prediction.category,
         paymentMethod: 'Cash',
         date: new Date().toISOString().split('T')[0],
         source: 'voice'
      });
      toast.success("Voice Expense Categorized as: " + prediction.category);
    } catch (err) {
      toast.error('Failed to save voice expense');
    } finally {
      setProcessing(false);
      setTimeout(() => setTranscript(''), 2000);
    }
  };

  return (
    <>
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        disabled={processing}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary hover:bg-primary/90 hover:scale-105'} ${processing && 'opacity-50 cursor-not-allowed'}`}
      >
         {processing ? <Loader2 className="size-6 text-primary-foreground animate-spin" /> : (isRecording ? <MicOff className="size-6 text-primary-foreground" /> : <Mic className="size-6 text-primary-foreground" />)}
      </button>

      <AnimatePresence>
         {(isRecording || processing || transcript) && (
            <motion.div 
               initial={{ opacity: 0, y: 50, scale: 0.9 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 50, scale: 0.9 }}
               className="fixed bottom-24 right-6 z-50 bg-background/80 backdrop-blur-md p-4 rounded-xl border border-primary/20 shadow-xl max-w-sm w-72"
            >
               <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex size-3">
                     <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isRecording ? 'bg-red-500 animate-ping' : 'bg-primary animate-pulse'}`}></span>
                     <span className={`relative inline-flex rounded-full size-3 ${isRecording ? 'bg-red-500' : 'bg-primary'}`}></span>
                  </span>
                  <p className="font-semibold text-sm text-primary">{processing ? 'AI Processing...' : (isRecording ? 'Listening...' : 'Completed')}</p>
               </div>
               <p className="text-sm text-foreground/80 italic">"{transcript || 'Say something like: "I spent 20 dollars on coffee"'}"</p>
            </motion.div>
         )}
      </AnimatePresence>
    </>
  );
}
