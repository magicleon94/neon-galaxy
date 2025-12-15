import React from 'react';

interface InstallPromptProps {
  isIOS: boolean;
  deferredPrompt: any;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ isIOS, deferredPrompt }) => {
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // If accepted, the PWA will install. The user might stay in browser or switch.
    }
  };

  return (
    <div className="w-screen h-[100dvh] bg-gray-900 flex flex-col items-center justify-center p-8 text-center select-none overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-purple-900/20 to-blue-900/20 pointer-events-none"></div>

      <h1 className="text-4xl md:text-6xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 animate-pulse drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
        NEON GALAXY
      </h1>

      <div className="max-w-md w-full bg-black/80 border-2 border-cyan-500 p-6 shadow-[0_0_30px_rgba(0,255,255,0.3)] backdrop-blur-md">
        <h2 className="text-xl font-bold text-white mb-4 tracking-widest">INSTALLATION REQUIRED</h2>
        <p className="text-gray-300 mb-6 text-sm font-mono leading-relaxed">
          Pilot, this mission requires a secure fullscreen uplink.
          <br /><br />
          Please install the application to your device to bypass browser restrictions and enable flight controls.
        </p>

        {isIOS ? (
          <div className="text-left bg-gray-900/80 p-5 rounded border border-gray-700">
            <p className="text-cyan-400 mb-3 text-xs uppercase tracking-widest font-bold">Protocol (iOS):</p>
            <ol className="list-decimal list-inside text-gray-200 space-y-3 text-sm font-mono">
              <li>
                Tap the <strong className="text-white">Share</strong> button 
                <span className="inline-flex items-center justify-center mx-2 bg-gray-700 w-6 h-6 rounded text-blue-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>
                in your browser bar.
              </li>
              <li>
                Scroll down and select 
                <br/>
                <strong className="text-white ml-5">Add to Home Screen</strong> 
                <span className="inline-flex items-center justify-center mx-2 bg-gray-700 w-6 h-6 rounded text-white">
                  +
                </span>
              </li>
              <li>Launch <strong>Neon Galaxy</strong> from your Home Screen.</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-4">
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-4 bg-cyan-600 text-black font-bold uppercase tracking-widest hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(0,255,255,0.5)] border border-cyan-400"
              >
                INITIALIZE INSTALL
              </button>
            ) : (
              <div className="text-left bg-gray-900/80 p-4 rounded border border-yellow-700/50">
                <p className="text-yellow-500 mb-2 text-xs uppercase tracking-widest font-bold">Manual Override:</p>
                <p className="text-gray-300 text-sm font-mono">
                  Tap your browser menu (⋮) and select <strong className="text-white">Install App</strong> or <strong className="text-white">Add to Home Screen</strong>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-8 text-xs text-gray-500 font-mono">
        SYSTEM STATUS: WAITING FOR UPLINK...
      </div>
    </div>
  );
};

export default InstallPrompt;