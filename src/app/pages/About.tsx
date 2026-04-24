import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Info, ShieldCheck, Sparkles, Zap, Globe } from 'lucide-react';

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.about')}</h1>
        <p className="text-muted-foreground">
          {t('about.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-5" />
              {t('about.mission')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('about.mission_desc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              {t('about.security')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('about.security_desc')}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5" />
              {t('about.features')}
            </CardTitle>
            <CardDescription>{t('about.features_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Zap className="size-4 text-primary" />
                  {t('about.feature_ai')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('about.feature_ai_desc')}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Globe className="size-4 text-primary" />
                  {t('about.feature_multi')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('about.feature_multi_desc')}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="size-4 text-primary" />
                  {t('about.feature_secure')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('about.feature_secure_desc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
