import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { cn } from '@/lib/utils';

const fullscreenRoutes = ['/room/', '/game/', '/watch/', '/replay/'];

export function Layout() {
  const location = useLocation();
  const isFullscreen = fullscreenRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  return (
    <div className="min-h-screen flex flex-col">
      {!isFullscreen && <Navbar />}
      <main
        className={cn(
          'flex-1',
          !isFullscreen && 'py-6 px-4 sm:px-6 lg:px-8',
          isFullscreen && 'relative'
        )}
      >
        <div
          className={cn(
            !isFullscreen && 'mx-auto max-w-7xl w-full'
          )}
        >
          <Outlet />
        </div>
      </main>
      {!isFullscreen && (
        <footer className="border-t border-white/5 py-6 text-center text-sm text-slate-500">
          <p>QuizBattle © 2025 - 知识对战，等你来战！</p>
        </footer>
      )}
    </div>
  );
}
