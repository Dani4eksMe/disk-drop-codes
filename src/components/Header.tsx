import { Disc3, Headphones } from 'lucide-react';

export const Header = () => {
  return (
    <header className="w-full py-8 px-4">
      <div className="container mx-auto text-center">
        {/* Logo and Title */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative">
            <Disc3 className="w-12 h-12 text-primary animate-spin" style={{ animationDuration: '8s' }} />
            <Headphones className="w-6 h-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-left">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Кастомные диски
            </h1>
            <p className="text-sm text-muted-foreground">
              by Dan4ikx
            </p>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Загружайте MP3 файлы и получайте уникальные коды для создания кастомных дисков в игре
        </p>

        {/* Audio Wave Animation */}
        <div className="flex justify-center mt-6">
          <div className="audio-wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </header>
  );
};