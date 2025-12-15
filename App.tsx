import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UI from './components/UI';
import InstallPrompt from './components/InstallPrompt';
import { GameState } from './types';
import { PLAYER_HP } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [hp, setHp] = useState<number>(PLAYER_HP);
  
  // PowerUp States (Time remaining in seconds for UI)
  const [shieldTime, setShieldTime] = useState<number>(0);
  const [multishotTime, setMultishotTime] = useState<number>(0);

  // Sharing State
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  
  // Device & PWA State
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if Mobile (Touch device)
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    // 2. Check if Standalone (PWA)
    const checkStandalone = () => {
      const isStandaloneBool = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true || 
        document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneBool);
    };

    // 3. Check if iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    };

    // 4. Listen for Install Prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    checkMobile();
    checkStandalone();
    checkIOS();

    window.addEventListener('resize', checkMobile);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // If Mobile Web (Not App) -> Show Install Prompt
  if (isMobile && !isStandalone) {
    return <InstallPrompt isIOS={isIOS} deferredPrompt={deferredPrompt} />;
  }

  return (
    <div className="relative w-screen h-[100dvh] flex flex-col items-center justify-center bg-gray-900 overflow-hidden select-none touch-none">
      {/* Container fits screen dynamically. Removed max-w/max-h to allow full scaling */}
      <div className="relative w-full h-full shadow-2xl flex items-center justify-center">
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState} 
          score={score} 
          setScore={setScore}
          setHp={setHp}
          setShieldTime={setShieldTime}
          setMultishotTime={setMultishotTime}
          isMobile={isMobile}
          setScreenshot={setScreenshot}
        />
        <UI 
          gameState={gameState} 
          score={score} 
          hp={hp} 
          shieldTime={shieldTime}
          multishotTime={multishotTime}
          setGameState={setGameState}
          isMobile={isMobile}
          screenshot={screenshot}
        />
      </div>
      
      {/* Background decorations for wide screens */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-purple-900/20 to-blue-900/20 pointer-events-none"></div>
    </div>
  );
};

export default App;