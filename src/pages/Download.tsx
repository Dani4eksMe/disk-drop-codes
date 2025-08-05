import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const navigate = useNavigate();
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!code) return;

    const fetchFileData = async () => {
      try {
        // Check if file exists and is not expired (30 minutes)
        const { data, error } = await supabase
          .from('mp3_uploads')
          .select('*')
          .eq('code', code)
          .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError('Файл с таким кодом не найден или срок его действия истёк');
        } else {
          setFileData(data);
          // Immediately start download
          handleDownload(data);
        }
      } catch (error) {
        console.error('Error fetching file:', error);
        setError('Файл не найден или срок его действия истёк');
      }
    };

    fetchFileData();
  }, [code]);

  const handleDownload = async (data: FileData = fileData!) => {
    if (!data) return;

    try {
      // Get download URL from Supabase Storage
      const { data: urlData, error: urlError } = await supabase.storage
        .from('mp3-files')
        .createSignedUrl(data.file_path, 3600); // 1 hour expiry

      if (urlError) throw urlError;

      if (!urlData?.signedUrl) {
        throw new Error('Failed to generate download URL');
      }

      // Increment download count
      await supabase.rpc('increment_download_count', { 
        upload_code: data.code 
      });

      // Redirect directly to the file URL for immediate download
      window.location.href = urlData.signedUrl;

    } catch (error) {
      console.error('Download error:', error);
      setError('Не удалось скачать файл');
    }
  };

  if (!code) {
    return <Navigate to="/" replace />;
  }

  // Show loading while processing
  if (!error && !fileData) {
    return (
      <div className="min-h-screen bg-background">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Загрузка файла...</p>
            </div>
          </div>
      </div>
    );
  }

  // Show error if file not found or expired
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Файл не найден
            </h2>
            <p className="text-muted-foreground mb-6">
              {error}
            </p>
            <a 
              href="/"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              На главную страницу
            </a>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached as download redirects immediately
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Скачивание начинается...</p>
        </div>
      </div>
    </div>
  );
};

export default Download;