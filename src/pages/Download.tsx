import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Download as DownloadIcon, FileAudio, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface FileData {
  code: string;
  original_filename: string;
  file_size: number;
  download_count: number;
  created_at: string;
  file_path: string;
}

const Download = () => {
  const { code } = useParams();
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!code) return;

    const fetchFileData = async () => {
      try {
        const { data, error } = await supabase
          .from('mp3_uploads')
          .select('*')
          .eq('code', code)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError('Файл с таким кодом не найден');
        } else {
          setFileData(data);
        }
      } catch (error) {
        console.error('Error fetching file:', error);
        setError('Ошибка при загрузке данных файла');
      } finally {
        setLoading(false);
      }
    };

    fetchFileData();
  }, [code]);

  const handleDownload = async () => {
    if (!fileData) return;

    setDownloading(true);

    try {
      // Get download URL from Supabase Storage
      const { data: urlData, error: urlError } = await supabase.storage
        .from('mp3-files')
        .createSignedUrl(fileData.file_path, 3600); // 1 hour expiry

      if (urlError) throw urlError;

      if (!urlData?.signedUrl) {
        throw new Error('Failed to generate download URL');
      }

      // Increment download count
      await supabase.rpc('increment_download_count', { 
        upload_code: fileData.code 
      });

      // Start download
      const link = document.createElement('a');
      link.href = urlData.signedUrl;
      link.download = fileData.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Update local download count
      setFileData(prev => prev ? {
        ...prev,
        download_count: prev.download_count + 1
      } : null);

      toast({
        title: 'Скачивание началось',
        description: 'Файл начал загружаться на ваш компьютер',
      });

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Ошибка скачивания',
        description: 'Не удалось скачать файл. Попробуйте еще раз.',
        variant: 'destructive'
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    if (bytes === 0) return '0 Б';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!code) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Загрузка информации о файле...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !fileData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto">
            <Card className="shadow-card border-muted">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Файл не найден
                </h2>
                <p className="text-muted-foreground mb-6">
                  {error || 'Файл с кодом ' + code + ' не существует или был удален.'}
                </p>
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="bg-gradient-primary hover:scale-105 transition-transform"
                >
                  На главную страницу
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-card border-muted">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mx-auto mb-4">
                <FileAudio className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl text-foreground">
                Скачать файл
              </CardTitle>
              <div className="code-display text-lg">
                {fileData.code}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* File Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-gradient-secondary/30">
                  <h4 className="font-semibold text-foreground mb-1">Название файла</h4>
                  <p className="text-sm text-muted-foreground break-all">
                    {fileData.original_filename}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-gradient-secondary/30">
                  <h4 className="font-semibold text-foreground mb-1">Размер</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(fileData.file_size)}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-gradient-secondary/30">
                  <h4 className="font-semibold text-foreground mb-1">Загружен</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(fileData.created_at)}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-gradient-secondary/30">
                  <h4 className="font-semibold text-foreground mb-1">Скачиваний</h4>
                  <p className="text-sm text-muted-foreground">
                    {fileData.download_count}
                  </p>
                </div>
              </div>

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                disabled={downloading}
                size="lg"
                className="w-full bg-gradient-primary hover:scale-105 transition-transform shadow-button"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Подготовка скачивания...
                  </>
                ) : (
                  <>
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Скачать файл
                  </>
                )}
              </Button>

              {/* Back to home */}
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Загрузить новый файл
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Download;