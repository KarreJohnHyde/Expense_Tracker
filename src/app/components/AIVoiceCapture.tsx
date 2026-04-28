import { useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { parseVoiceExpense } from '../lib/voiceCommands';
import { parseVoiceAction } from '../lib/voiceActions';
import { api } from '../lib/api';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function AIVoiceCapture() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef('');

  const SpeechRecognitionCtor =
    typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
  const isSupported = Boolean(SpeechRecognitionCtor);

  const pickBestTranscript = (options: string[]) => {
    let best = options[0] || '';
    let bestScore = -1;

    for (const candidate of options) {
      const parsed = parseVoiceExpense(candidate);
      let score = 0;
      if (parsed.amount) score += 3;
      if (parsed.category) score += 2;
      if (parsed.paymentMethod) score += 2;
      if (parsed.description && parsed.description.length >= 4) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return best;
  };

  const openAddExpenseFromVoice = (rawText: string) => {
    const parsed = parseVoiceExpense(rawText);
    const payload = {
      description: parsed.description,
      amount: parsed.amount,
      category: parsed.category,
      paymentMethod: parsed.paymentMethod,
      date: parsed.date,
      source: 'voice',
    };

    navigate('/');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('expenseai:voice:open-add', { detail: payload }));
    }, 160);
    toast.success('Opened expense dialog from voice command.');
  };

  const executeVoice = async (rawText: string) => {
    const cleaned = rawText.trim();
    if (!cleaned) return;

    const action = parseVoiceAction(cleaned);
    if (action.type === 'navigate' && action.route) {
      navigate(action.route);
      toast.success(action.message);
      return;
    }

    if (action.type === 'open_add_expense') {
      openAddExpenseFromVoice(cleaned);
      return;
    }

    const parsed = parseVoiceExpense(cleaned);
    const extractedAmount = parsed.amount ? Number(parsed.amount) : NaN;

    if (!Number.isFinite(extractedAmount) || extractedAmount <= 0) {
      toast.info('Try: "Spent 450 on groceries via UPI" or "Open stocks".');
      return;
    }

    await api.addExpense({
      description: parsed.description || `${cleaned.slice(0, 40)} (Voice Log)`,
      amount: extractedAmount,
      category: parsed.category || 'Others',
      paymentMethod: parsed.paymentMethod || 'Cash',
      date: parsed.date || new Date().toISOString().split('T')[0],
      source: 'voice',
    });

    toast.success(
      `Voice expense added: ₹${extractedAmount.toLocaleString('en-IN')} · ${parsed.category || 'Others'}`,
    );
  };

  const startRecording = () => {
    if (!isSupported) {
      toast.error('Voice dictation is not supported in this browser.');
      return;
    }

    try {
      const recognition: SpeechRecognitionLike = new (SpeechRecognitionCtor as any)();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = navigator.language || 'en-IN';

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('');
        transcriptRef.current = '';
      };

      recognition.onresult = (event: any) => {
        const alternatives: string[] = [];
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const best = result?.[0]?.transcript || '';
          if (best) alternatives.push(best);
          if (result.isFinal) {
            finalTranscript += best;
          } else {
            interimTranscript += best;
          }
        }

        const candidate = pickBestTranscript(alternatives.filter(Boolean));
        const composed = (finalTranscript + interimTranscript || candidate).trim();
        if (!composed) return;

        transcriptRef.current = composed;
        setTranscript(composed);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error !== 'aborted') {
          toast.error(`Microphone error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        const finalText = transcriptRef.current.trim();
        if (finalText.length < 2) return;

        setProcessing(true);
        void executeVoice(finalText)
          .catch(() => {
            toast.error('Could not process that voice request.');
          })
          .finally(() => {
            setProcessing(false);
            window.setTimeout(() => setTranscript(''), 2500);
          });
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      toast.error('Failed to access microphone.');
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  if (!isSupported) return null;

  return (
    <>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={processing}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary hover:bg-primary/90 hover:scale-105'} ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="AI Voice Entry"
      >
        {processing ? (
          <Loader2 className="size-6 text-primary-foreground animate-spin" />
        ) : isRecording ? (
          <MicOff className="size-6 text-primary-foreground" />
        ) : (
          <Mic className="size-6 text-primary-foreground" />
        )}
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
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isRecording ? 'bg-red-500 animate-ping' : 'bg-primary animate-pulse'}`}
                />
                <span
                  className={`relative inline-flex rounded-full size-3 ${isRecording ? 'bg-red-500' : 'bg-primary'}`}
                />
              </span>
              <p className="font-semibold text-sm text-primary">
                {processing ? 'AI Processing...' : isRecording ? 'Listening...' : 'Completed'}
              </p>
            </div>
            <p className="text-sm text-foreground/80 italic">
              "{transcript || 'Say: spent 450 on groceries, or open stocks'}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
