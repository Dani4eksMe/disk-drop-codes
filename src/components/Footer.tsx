import { Heart, Github, Music } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="w-full py-8 px-4 mt-12">
      <div className="container mx-auto">
        {/* Main Footer Content */}
        <div className="text-center space-y-4">
          {/* Made with love */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <span>Создано с</span>
            <Heart className="w-4 h-4 text-red-500 animate-pulse" />
            <span>автором</span>
            <span className="font-semibold text-primary">Dan4ikx</span>
          </div>

          {/* Features */}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              <span>MP3 до 20 МБ</span>
            </div>
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              <span>Уникальные коды</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-xs text-muted-foreground/60 pt-4 border-t border-muted">
            © 2024 Кастомные диски. Все права защищены.
          </div>
        </div>
      </div>
    </footer>
  );
};