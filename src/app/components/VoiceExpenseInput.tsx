import { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { parseVoiceExpense, VoiceExpenseResult } from '../lib/voiceCommands';

interface VoiceExpenseInputProps {
  onTranscribed: (text: string, data: VoiceExpenseResult) => void;
}

export function VoiceExpenseInput({ onTranscribed }: VoiceExpenseInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.lang = navigator.language || 'en-IN';

    recognition.onstart = () => {
      setIsRecording(true);
      toast.info('Listening... Try: "Spent 450 on groceries via UPI yesterday".', { duration: 4000 });
    };

    recognition.onresult = (event: any) => {
      const alternatives = Array.from(event.results?.[0] || []).map((r: any) => r.transcript).filter(Boolean);
      const fallback = event.results?.[0]?.[0]?.transcript || '';
      const text = pickBestTranscript(alternatives.length ? alternatives : [fallback]);
      processVoiceInput(text);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow it in settings.');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const processVoiceInput = (text: string) => {
    const parsed = parseVoiceExpense(text);
    const payload: VoiceExpenseResult = {
      description: parsed.description,
      ...(parsed.amount ? { amount: parsed.amount } : {}),
      ...(parsed.category ? { category: parsed.category } : {}),
      ...(parsed.paymentMethod ? { paymentMethod: parsed.paymentMethod } : {}),
      ...(parsed.date ? { date: parsed.date } : {}),
    };
    onTranscribed(text, payload);

    const summaryParts = [
      parsed.amount ? `₹${parsed.amount}` : null,
      parsed.category,
      parsed.paymentMethod,
      parsed.date,
    ].filter(Boolean);

    toast.success(`Heard: "${text}"${summaryParts.length ? ` • Parsed: ${summaryParts.join(' · ')}` : ''}`, { duration: 5000 });
  };

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

  const toggleRecording = () => {
    if (!isSupported) {
      toast.error('Voice recognition is not supported in this browser. Try Chrome.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!isSupported) return null;

  return (
    <Button
      variant={isRecording ? 'destructive' : 'default'}
      className={`rounded-full shadow-lg transition-all ${isRecording ? 'animate-pulse' : ''}`}
      onClick={toggleRecording}
      title="Tap to speak an expense"
    >
      {isRecording ? (
        <>
          <StopCircle className="size-4 mr-2" />
          Stop Listening
        </>
      ) : (
        <>
          <Mic className="size-4 mr-2" />
          Voice AI Entry
        </>
      )}
    </Button>
  );
}
