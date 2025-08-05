import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FileUpload } from '@/components/FileUpload';
import { CodeDisplay } from '@/components/CodeDisplay';

const Index = () => {
  const [uploadedCode, setUploadedCode] = useState<string | null>(null);

  const handleUploadComplete = (code: string) => {
    setUploadedCode(code);
  };

  const handleNewUpload = () => {
    setUploadedCode(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pb-12">
        {!uploadedCode ? (
          <FileUpload onUploadComplete={handleUploadComplete} />
        ) : (
          <CodeDisplay code={uploadedCode} onNewUpload={handleNewUpload} />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
