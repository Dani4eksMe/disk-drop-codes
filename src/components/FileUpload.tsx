import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Music, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onUploadComplete: (code: string) => void;
}

export const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите аудио файл',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'Ошибка',
        description: 'Размер файла не должен превышать 20 МБ',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(80);

      // Upload file to local server
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      setUploadProgress(100);
      setUploadStatus('success');
      
      setTimeout(() => {
        onUploadComplete(data.code);
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить файл. Попробуйте еще раз.',
        variant: 'destructive'
      });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('idle');
      }, 2000);
    }
  }, [onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.flac']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <Card className="w-full max-w-lg mx-auto shadow-card border-muted">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`upload-zone cursor-pointer ${isDragActive ? 'dragover' : ''} ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            {uploadStatus === 'idle' && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary">
                  {isDragActive ? (
                    <Upload className="w-8 h-8 text-primary-foreground" />
                  ) : (
                    <Music className="w-8 h-8 text-primary-foreground" />
                  )}
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {isDragActive ? 'Отпустите файл здесь' : 'Загрузите MP3 файл'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Перетащите файл или кликните для выбора
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Максимальный размер: 20 МБ
                  </p>
                </div>
              </>
            )}

            {uploadStatus === 'uploading' && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary animate-pulse-glow">
                  <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
                </div>
                
                <div className="text-center w-full">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Загрузка файла...
                  </h3>
                  <Progress value={uploadProgress} className="w-full mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploadProgress}% завершено
                  </p>
                </div>
              </>
            )}

            {uploadStatus === 'success' && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-audio-success">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-audio-success">
                    Файл успешно загружен!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Генерируем ваш код...
                  </p>
                </div>
              </>
            )}

            {uploadStatus === 'error' && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive">
                  <AlertCircle className="w-8 h-8 text-destructive-foreground" />
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-destructive">
                    Ошибка загрузки
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Попробуйте еще раз
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {uploadStatus === 'idle' && (
          <div className="mt-4">
            <Button 
              onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
              className="w-full bg-gradient-primary hover:scale-105 transition-transform shadow-button"
              disabled={isUploading}
            >
              <Music className="w-4 h-4 mr-2" />
              Выбрать файл
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};