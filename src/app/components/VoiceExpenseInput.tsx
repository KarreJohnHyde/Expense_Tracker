import { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface VoiceExpenseInputProps {
  onTranscribed: (text: string, data: { amount?: string; category?: string; description?: string }) => void;
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
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      toast.info('Listening... Speak your expense now.', { duration: 3000 });
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
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
    // Basic AI data extraction logic
    const lowerText = text.toLowerCase();
    
    // Extract Number
    const matchAmount = lowerText.match(/\b\d+(\.\d{1,2})?\b/);
    const amount = matchAmount ? matchAmount[0] : '';

    // Extract Context
    let category = 'Others';
    if (lowerText.includes('food') || lowerText.includes('restaurant') || lowerText.includes('coffee') || lowerText.includes('burger')) category = 'Food & Dining';
    else if (lowerText.includes('uber') || lowerText.includes('taxi') || lowerText.includes('gas') || lowerText.includes('ride')) category = 'Transportation';
    else if (lowerText.includes('shop') || lowerText.includes('grocery') || lowerText.includes('clothes')) category = 'Shopping';

    const description = text.trim();

    onTranscribed(description, { amount, category, description });
    toast.success(`Heard: "${text}"`, { duration: 4000 });
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
