import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Globe } from 'lucide-react';
import { cn } from './ui/utils';

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'zh', name: 'Chinese', native: '中文 (简体)' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
];

interface LanguageSwitcherProps {
  className?: string;
  isCompact?: boolean;
}

export function LanguageSwitcher({ className, isCompact = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger 
          className={cn(
            "glass border-border/40 hover:border-primary/50 transition-all",
            isCompact ? "w-10 h-10 p-0 justify-center" : "w-[140px]"
          )}
        >
          {isCompact ? (
             <Globe className="size-4 text-primary" />
          ) : (
            <>
               <Globe className="size-3.5 mr-2 text-primary" />
               <SelectValue placeholder="Language" />
            </>
          )}
        </SelectTrigger>
        <SelectContent className="glass-card border-border/40 min-w-[160px]">
          {languages.map((lang) => (
            <SelectItem 
              key={lang.code} 
              value={lang.code}
              className="focus:bg-primary/20 cursor-pointer"
            >
              <div className="flex flex-col items-start py-0.5">
                <span className="text-sm font-medium">{lang.native}</span>
                <span className="text-[10px] text-muted-foreground">{lang.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
