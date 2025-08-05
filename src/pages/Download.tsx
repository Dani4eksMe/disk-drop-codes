import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';

const Download = () => {
  const { code } = useParams();

  useEffect(() => {
    if (!code) return;

    // Redirect to local download URL
    const directDownloadUrl = `http://localhost:3001/api/download/${code}`;
    window.location.href = directDownloadUrl;
  }, [code]);

  if (!code) {
    return <Navigate to="/" replace />;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Перенаправление...</p>
        </div>
      </div>
    </div>
  );
};

export default Download;