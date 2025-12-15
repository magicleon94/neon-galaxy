import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import UI from './components/UI';
import { GameState } from './types';
import { PLAYER_HP } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [hp, setHp] = useState<number>(PLAYER_HP);

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-gray-900 overflow-hidden">
      {/* Container ensures aspect ratio is maintained or fits screen */}
      <div className="relative w-full h-full max-w-[1200px] max-h-[600px] shadow-2xl">
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState} 
          score={score} 
          setScore={setScore}
          setHp={setHp}
        />
        <UI 
          gameState={gameState} 
          score={score} 
          hp={hp} 
          setGameState={setGameState}
        />
      </div>
      
      {/* Background decorations for wide screens */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-purple-900/20 to-blue-900/20 pointer-events-none"></div>
    </div>
  );
};

export default App;