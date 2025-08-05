import { useState } from 'react';
import { Copy, Check, Download, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface CodeDisplayProps {
  code: string;
  onNewUpload: () => void;
}

export const CodeDisplay = ({ code, onNewUpload }: CodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: 'Код скопирован!',
        description: 'Код успешно скопирован в буфер обмена',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать код',
        variant: 'destructive'
      });
    }
  };

  const downloadUrl = `http://localhost:3001/api/download/${code}`;
  const directDownloadUrl = `http://localhost:3001/api/download/${code}`;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-slide-up">
      {/* Success Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-4 float">
          <Check className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Файл успешно загружен!
        </h2>
        <p className="text-muted-foreground">
          Ваш файл готов к использованию
        </p>
      </div>

      {/* Code Card */}
      <Card className="shadow-card border-muted glass">
        <CardHeader className="text-center pb-3">
          <CardTitle className="text-xl text-foreground">
            Ваш уникальный код
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Code Display */}
          <div className="text-center">
            <div className="inline-block p-6 rounded-lg bg-gradient-secondary border border-muted">
              <div className="code-display animate-pulse-glow">
                {code}
              </div>
            </div>
          </div>

          {/* Copy Button */}
          <Button
            onClick={copyCode}
            className="w-full bg-gradient-primary hover:scale-105 transition-transform shadow-button"
            size="lg"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Скопировано!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Скопировать код
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="shadow-card border-muted">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Инструкция по использованию
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-secondary/30">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                1
              </div>
              <p className="text-sm text-foreground">
                Держите диск в руке
              </p>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-secondary/30">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                2
              </div>
              <p className="text-sm text-foreground">
                Используйте прямую ссылку: <br/>
                <code className="bg-muted px-1 rounded text-xs break-all">{directDownloadUrl}</code>
              </p>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-secondary/30">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                3
              </div>
              <p className="text-sm text-foreground">
                Или введите команду: <code className="bg-muted px-1 rounded text-xs">/cd create {code}</code>
              </p>
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Файл будет доступен в течение 30 минут после загрузки
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Upload Button */}
      <div className="text-center">
        <Button
          onClick={onNewUpload}
          variant="outline"
          size="lg"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Загрузить новый файл
        </Button>
      </div>
    </div>
  );
};