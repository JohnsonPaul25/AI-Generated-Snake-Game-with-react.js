/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music, Zap, Clock, SkipForward, SkipBack } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_GAME_SPEED = 120;

type PowerUpType = 'SPEED' | 'SLOW';
type PowerUp = { x: number; y: number; type: PowerUpType };

const TRACKS = [
  { name: 'Synthwave Nights', artist: 'Neon Vibes', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { name: 'Lofi Chill', artist: 'Smooth Operator', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { name: 'EDM Rush', artist: 'DJ Snake', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

const randomFood = (currentSnake: {x: number, y: number}[]) => {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    // Ensure food doesn't spawn on the snake
    if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      break;
    }
  }
  return newFood;
};

export default function App() {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
  const [activeEffect, setActiveEffect] = useState<PowerUpType | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const directionRef = useRef(INITIAL_DIRECTION);
  const lastMoveDirectionRef = useRef(INITIAL_DIRECTION);
  const audioRef = useRef<HTMLAudioElement>(null);
  const effectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const powerUpTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
      setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = (Number(e.target.value) / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setProgress(Number(e.target.value));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrackIndex, isPlaying]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    directionRef.current = INITIAL_DIRECTION;
    lastMoveDirectionRef.current = INITIAL_DIRECTION;
    setFood(randomFood(INITIAL_SNAKE));
    setPowerUp(null);
    setActiveEffect(null);
    if (effectTimeoutRef.current) clearTimeout(effectTimeoutRef.current);
    if (powerUpTimeoutRef.current) clearTimeout(powerUpTimeoutRef.current);
    setScore(0);
    setGameOver(false);
    setIsStarted(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;

    if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) {
      setTouchStart(null);
      return;
    }

    if (!isStarted && !gameOver) {
      setIsStarted(true);
    }

    if (gameOver) {
      setTouchStart(null);
      return;
    }

    const currentDir = lastMoveDirectionRef.current;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0 && currentDir.x === 0) directionRef.current = { x: 1, y: 0 };
      else if (deltaX < 0 && currentDir.x === 0) directionRef.current = { x: -1, y: 0 };
    } else {
      if (deltaY > 0 && currentDir.y === 0) directionRef.current = { x: 0, y: 1 };
      else if (deltaY < 0 && currentDir.y === 0) directionRef.current = { x: 0, y: -1 };
    }
    
    setTouchStart(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if (!isStarted && !gameOver && e.key === 'Enter') {
        setIsStarted(true);
        return;
      }

      if (!isStarted || gameOver) return;

      const currentDir = lastMoveDirectionRef.current;
      switch (e.key) {
        case 'ArrowUp':
          if (currentDir.y === 0) directionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (currentDir.y === 0) directionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (currentDir.x === 0) directionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (currentDir.x === 0) directionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, gameOver]);

  useEffect(() => {
    if (!isStarted || gameOver) return;

    const moveSnake = () => {
      const head = snake[0];
      const dir = directionRef.current;
      const newHead = { x: head.x + dir.x, y: head.y + dir.y };
      lastMoveDirectionRef.current = dir;

      // Check wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        return;
      }

      // Check self collision
      if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return;
      }

      const newSnake = [newHead, ...snake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(randomFood(newSnake));
        
        // 20% chance to spawn a power-up if one doesn't exist
        if (!powerUp && Math.random() < 0.2) {
          const newPowerUp: PowerUp = {
            ...randomFood(newSnake),
            type: Math.random() > 0.5 ? 'SPEED' : 'SLOW'
          };
          setPowerUp(newPowerUp);
          
          if (powerUpTimeoutRef.current) clearTimeout(powerUpTimeoutRef.current);
          powerUpTimeoutRef.current = setTimeout(() => {
            setPowerUp(null);
          }, 8000); // Disappears after 8 seconds
        }
      } else {
        newSnake.pop();
      }

      // Check power-up collision
      if (powerUp && newHead.x === powerUp.x && newHead.y === powerUp.y) {
        setActiveEffect(powerUp.type);
        setPowerUp(null);
        if (powerUpTimeoutRef.current) clearTimeout(powerUpTimeoutRef.current);
        
        if (effectTimeoutRef.current) clearTimeout(effectTimeoutRef.current);
        effectTimeoutRef.current = setTimeout(() => {
          setActiveEffect(null);
        }, 5000); // Effect lasts 5 seconds
      }

      setSnake(newSnake);
    };

    const currentSpeed = activeEffect === 'SPEED' ? 60 : activeEffect === 'SLOW' ? 200 : BASE_GAME_SPEED;
    const timeoutId = setTimeout(moveSnake, currentSpeed);
    return () => clearTimeout(timeoutId);
  }, [snake, isStarted, gameOver, food, powerUp, activeEffect]);

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      localStorage.setItem('snakeHighScore', score.toString());
    }
  }, [gameOver, score, highScore]);

  useEffect(() => {
    if (!isStarted && score === 0 && snake.length === 1) {
      setFood(randomFood(INITIAL_SNAKE));
    }
  }, [isStarted, score, snake.length]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 font-sans text-slate-100 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col gap-8 items-center justify-center w-full max-w-5xl xl:max-w-6xl z-10"
      >
        {/* Header */}
        <div className="relative mb-2 flex flex-col items-center">
          <h1 
            className="text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] text-center"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            SNAKE<span className="inline-block w-2"></span>BEATS
          </h1>
          <span 
            className="absolute -bottom-4 -right-4 text-5xl md:text-6xl text-pink-400 drop-shadow-[0_0_15px_rgba(244,114,182,0.8)] -rotate-6"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Arena
          </span>
        </div>

        <div className="flex flex-col gap-6 items-center w-full max-w-[500px]">
          
          {/* Score Panels Row */}
          <div className="flex flex-row w-full gap-4 lg:gap-6">
            {/* Left Panel: High Score */}
            <motion.div 
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(59,130,246,0.4)" }}
              className="flex-1 flex flex-col items-center justify-center h-16 lg:h-20 bg-black/40 backdrop-blur-md border-2 border-blue-500/50 rounded-2xl lg:rounded-3xl p-2 shadow-[0_0_20px_rgba(59,130,246,0.2)] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
              <span className="text-[10px] lg:text-xs font-bold text-blue-400 tracking-[0.2em] uppercase mb-0 lg:mb-1 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] relative z-10 text-center">High Score</span>
              <span className="text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] relative z-10" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {highScore}
              </span>
            </motion.div>

            {/* Right Panel: Current Score */}
            <motion.div 
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(168,85,247,0.4)" }}
              className="flex-1 flex flex-col items-center justify-center h-16 lg:h-20 bg-black/40 backdrop-blur-md border-2 border-purple-500/50 rounded-2xl lg:rounded-3xl p-2 shadow-[0_0_20px_rgba(168,85,247,0.2)] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
              <span className="text-[10px] lg:text-xs font-bold text-purple-400 tracking-[0.2em] uppercase mb-0 lg:mb-1 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] relative z-10 text-center">Current Score</span>
              <motion.span 
                key={score}
                initial={{ scale: 1.3, textShadow: "0 0 30px rgba(168,85,247,1)" }}
                animate={{ scale: 1, textShadow: "0 0 15px rgba(168,85,247,0.8)" }}
                className="text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-400 relative z-10" 
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {score}
              </motion.span>
              {activeEffect && (
                <div className={`absolute bottom-1 text-[8px] lg:text-[10px] font-black tracking-widest animate-pulse text-center ${activeEffect === 'SPEED' ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]'}`}>
                  {activeEffect} BOOST
                </div>
              )}
            </motion.div>
          </div>

          {/* Game Board Container */}
          <div className="w-full flex flex-col items-center">
            <div 
              className="relative w-full bg-black/60 backdrop-blur-xl border-2 border-blue-500/50 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.3)] aspect-square touch-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
            
            {/* Grid Background Lines */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
              }}
            />

            <AnimatePresence>
              {/* Game Over Overlay */}
              {gameOver && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md"
                >
                  <h2 className="text-5xl font-black text-purple-500 mb-2 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] tracking-tight">GAME OVER</h2>
                  <p className="text-blue-100 mb-8 text-xl font-medium">Final Score: <span className="text-blue-400">{score}</span></p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetGame}
                    className="px-8 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-400 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                  >
                    Play Again
                  </motion.button>
                </motion.div>
              )}

              {/* Start Screen Overlay */}
              {!isStarted && !gameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetGame}
                    className="px-8 py-3 bg-blue-500 text-black font-bold rounded-xl hover:bg-blue-400 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                  >
                    Start Game
                  </motion.button>
                  <p className="mt-6 text-blue-400/70 text-sm font-medium tracking-widest uppercase">
                    {isTouchDevice ? "Swipe to play" : "Use arrow keys to move"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grid */}
            <div
              className="w-full h-full grid relative z-10"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                const isHead = snake[0].x === x && snake[0].y === y;
                const isSnake = snake.some(s => s.x === x && s.y === y);
                const isFood = food.x === x && food.y === y;
                const isPowerUp = powerUp?.x === x && powerUp?.y === y;

                return (
                  <div
                    key={i}
                    className="flex items-center justify-center"
                  >
                    {isHead ? (
                      <div className="w-[90%] h-[90%] bg-blue-400 rounded-sm shadow-[0_0_15px_#60a5fa] z-10" />
                    ) : isSnake ? (
                      <div className="w-[85%] h-[85%] bg-blue-600/80 rounded-sm shadow-[0_0_8px_#2563eb]" />
                    ) : isFood ? (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: [0.8, 1.1, 0.8] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-[80%] h-[80%] bg-purple-500 rounded-full shadow-[0_0_15px_#a855f7]" 
                      />
                    ) : isPowerUp ? (
                      <motion.div 
                        initial={{ scale: 0, rotate: 0 }}
                        animate={{ scale: [0.9, 1.2, 0.9], rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`w-[80%] h-[80%] rounded-md shadow-[0_0_15px_currentColor] flex items-center justify-center ${powerUp.type === 'SPEED' ? 'bg-yellow-400 text-yellow-400' : 'bg-cyan-400 text-cyan-400'}`} 
                      >
                        {powerUp.type === 'SPEED' ? <Zap className="w-4 h-4 text-black" /> : <Clock className="w-4 h-4 text-black" />}
                      </motion.div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>

        {/* Music Player Panel - Moved to bottom */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="w-full max-w-[500px] bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col items-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 pointer-events-none" />
          
          {/* Music Icon */}
          <div className="w-full max-w-[200px] h-20 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(168,85,247,0.4)] relative z-10">
            <Music className="w-10 h-10 text-white drop-shadow-md" />
          </div>

          {/* Track Info */}
          <div className="text-center mb-4 relative z-10 w-full">
            <h2 className="text-xl font-bold text-white mb-1 truncate">{TRACKS[currentTrackIndex].name}</h2>
            <p className="text-xs text-blue-200/70 font-medium truncate">{TRACKS[currentTrackIndex].artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full mb-5 relative z-10">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress || 0} 
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
              style={{
                background: `linear-gradient(to right, #a855f7 ${progress}%, rgba(255,255,255,0.1) ${progress}%)`
              }}
            />
            <div className="flex justify-between w-full text-[10px] text-white/50 mt-1.5 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-4 relative z-10">
            <button onClick={prevTrack} className="p-2 text-white/70 hover:text-white transition-colors">
              <SkipBack className="w-6 h-6 fill-current" />
            </button>
            
            <button
              onClick={togglePlay}
              className="w-14 h-14 flex items-center justify-center bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full transition-all shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </button>

            <button onClick={nextTrack} className="p-2 text-white/70 hover:text-white transition-colors">
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
          </div>

          <audio
            ref={audioRef}
            src={TRACKS[currentTrackIndex].src}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            onEnded={nextTrack}
            loop={false}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
