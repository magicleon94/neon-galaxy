import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GameState, Player, Enemy, Projectile, Particle, Laser, EnemyType, PowerUp } from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  COLORS, 
  PLAYER_SPEED, 
  PLAYER_WIDTH, 
  PLAYER_HEIGHT, 
  PLAYER_HP,
  BULLET_SPEED, 
  ENEMY_BULLET_SPEED, 
  SHOOT_COOLDOWN, 
  ENEMY_STATS, 
  SPAWN_RATE_BASE,
  HEART_DROP_CHANCE,
  HEART_VALUE,
  POWERUP_SPEED
} from '../constants';
import * as Audio from '../utils/audio';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  setScore: (score: React.SetStateAction<number>) => void;
  setHp: (hp: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, setScore, setHp }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  // Input State
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  // Mobile Input State
  const [isMobile, setIsMobile] = useState(false);
  const joystickRef = useRef({ x: 0, y: 0, active: false });
  const fireRef = useRef(false);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });

  // Game Entities
  const playerRef = useRef<Player>({
    x: 100,
    y: CANVAS_HEIGHT / 2,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    hp: PLAYER_HP,
    maxHp: PLAYER_HP,
    lastShotTime: 0,
    color: COLORS.neonCyan,
    invulnerableTime: 0
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  
  // Starfield background
  const starsRef = useRef<{x: number, y: number, size: number, speed: number}[]>([]);

  // Initialization
  const initStars = useCallback(() => {
    starsRef.current = [];
    for(let i=0; i<100; i++) {
        starsRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 3 + 1
        });
    }
  }, []);

  const resetGame = useCallback(() => {
    playerRef.current = {
      x: 100,
      y: CANVAS_HEIGHT / 2,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      hp: PLAYER_HP,
      maxHp: PLAYER_HP,
      lastShotTime: 0,
      color: COLORS.neonCyan,
      invulnerableTime: 0
    };
    enemiesRef.current = [];
    projectilesRef.current = [];
    lasersRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    scoreRef.current = 0;
    frameCountRef.current = 0;
    setScore(0);
    setHp(PLAYER_HP);
    initStars();
  }, [setScore, setHp, initStars]);

  // Input Handlers
  useEffect(() => {
    // Detect Touch
    const checkTouch = () => {
        setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space' && (gameState === GameState.MENU || gameState === GameState.GAME_OVER)) {
        setGameState(GameState.PLAYING);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', checkTouch);
    };
  }, [gameState, setGameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      resetGame();
      Audio.initAudio();
      Audio.startBGM();
    } else {
      Audio.stopBGM();
    }
  }, [gameState, resetGame]);

  // Joystick Logic
  const handleJoystickMove = (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const maxRadius = rect.width / 2;

      let dx = touch.clientX - centerX;
      let dy = touch.clientY - centerY;
      const distance = Math.sqrt(dx*dx + dy*dy);

      // Normalize
      if (distance > maxRadius) {
          dx = (dx / distance) * maxRadius;
          dy = (dy / distance) * maxRadius;
      }

      setStickOffset({ x: dx, y: dy });
      
      // Calculate normalized vector for game input (0-1)
      joystickRef.current = { 
          x: dx / maxRadius, 
          y: dy / maxRadius, 
          active: true 
      };
  };

  const handleJoystickEnd = () => {
      setStickOffset({ x: 0, y: 0 });
      joystickRef.current = { x: 0, y: 0, active: false };
  };

  // Helpers
  const spawnEnemy = (type: EnemyType, x: number, y: number) => {
    const stats = ENEMY_STATS[type];
    enemiesRef.current.push({
        id: Date.now() + Math.random(),
        x: x,
        y: y,
        width: stats.width,
        height: stats.height,
        hp: stats.hp,
        maxHp: stats.hp,
        type: type,
        lastAttackTime: 0,
        state: 'ENTERING',
        targetY: y
    });
  };

  const createExplosion = (x: number, y: number, color: string, count = 10, speed = 5) => {
    for(let i=0; i<count; i++) {
        particlesRef.current.push({
            id: Math.random(),
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * speed,
            vy: (Math.random() - 0.5) * speed,
            life: 1.0,
            color: color,
            size: Math.random() * 4 + 1
        });
    }
  };

  // --------------------------------------------------------------------------
  // GAME LOOP
  // --------------------------------------------------------------------------
  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    frameCountRef.current++;
    const player = playerRef.current;
    const now = Date.now();

    // 1. Player Movement (WASD + Joystick)
    let dx = 0;
    let dy = 0;
    
    // Keyboard
    if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) dy = -1;
    if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) dy = 1;
    if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) dx = -1;
    if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) dx = 1;

    // Normalize diagonal for keyboard
    if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        dx /= len;
        dy /= len;
    }

    // Joystick Override/Addition
    if (joystickRef.current.active) {
        dx = joystickRef.current.x;
        dy = joystickRef.current.y;
    }

    player.x += dx * PLAYER_SPEED;
    player.y += dy * PLAYER_SPEED;

    // Bounds check
    player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));
    player.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.height, player.y));

    // Player Shooting
    const isFiring = keysRef.current['Space'] || fireRef.current;
    if (isFiring) {
        if (now - player.lastShotTime > SHOOT_COOLDOWN) {
            player.lastShotTime = now;
            Audio.playShoot(true);
            projectilesRef.current.push({
                id: Math.random(),
                x: player.x + player.width,
                y: player.y + player.height / 2 - 2,
                vx: BULLET_SPEED,
                vy: 0,
                width: 20,
                height: 4,
                color: COLORS.neonCyan,
                owner: 'PLAYER',
                damage: 10
            });
        }
    }

    if (player.invulnerableTime > 0) player.invulnerableTime--;

    // 2. Enemy Spawning
    // Rate increases with score
    const spawnRate = Math.max(30, SPAWN_RATE_BASE - Math.floor(scoreRef.current / 50));
    if (frameCountRef.current % spawnRate === 0) {
        const spawnY = Math.random() * (CANVAS_HEIGHT - 100) + 50;
        const rand = Math.random();
        
        let type: EnemyType = 'SCOUT';
        if (scoreRef.current > 500 && rand > 0.6) type = 'FIGHTER';
        if (scoreRef.current > 1500 && rand > 0.9) type = 'DESTROYER';

        spawnEnemy(type, CANVAS_WIDTH + 50, spawnY);
    }

    // 3. Enemy AI
    enemiesRef.current.forEach(enemy => {
        // Movement Logic
        const targetX = CANVAS_WIDTH - 200 - (enemy.id % 200); // Varied hover X positions
        
        if (enemy.type === 'PILOT') {
            // Kamikaze pilot logic
            if (enemy.state === 'ENTERING') {
                // Initial burst out of ship
                enemy.x -= 3;
                if (frameCountRef.current % 30 === 0) enemy.state = 'ATTACKING';
            } else if (enemy.state === 'ATTACKING') {
                // Throw bomb
                Audio.playBombThrow();
                projectilesRef.current.push({
                    id: Math.random(),
                    x: enemy.x,
                    y: enemy.y,
                    vx: -4,
                    vy: (player.y - enemy.y) * 0.02, // Aim at player
                    width: 15,
                    height: 15,
                    color: '#fff',
                    owner: 'ENEMY',
                    damage: 30,
                    isBomb: true
                });
                enemy.state = 'HOVERING'; // Done attacking
            } else {
                // Fly away/die
                enemy.x += 5;
                enemy.y -= 2;
                if (enemy.x > CANVAS_WIDTH + 50) enemy.hp = 0; // Despawn
            }
        } else {
            // Standard ship logic
            if (enemy.x > targetX) {
                enemy.x -= 4; // Fly in
            } else {
                enemy.state = 'HOVERING';
                // Bobbing
                enemy.y += Math.sin((frameCountRef.current + enemy.id) * 0.05) * 2;
            }

            // Attack Logic
            if (enemy.state === 'HOVERING' && frameCountRef.current % 120 === 0) { // Global cadence for simplicity, could use individual timers
                if (enemy.type === 'SCOUT') {
                    // Single Shot
                    if (Math.random() > 0.3) {
                        Audio.playShoot(false);
                        projectilesRef.current.push({
                            id: Math.random(),
                            x: enemy.x,
                            y: enemy.y + enemy.height / 2,
                            vx: -ENEMY_BULLET_SPEED * 1.5, // Scouts shoot fast aimed shots
                            vy: (player.y - enemy.y) * 0.01,
                            width: 10,
                            height: 10,
                            color: COLORS.neonYellow,
                            owner: 'ENEMY',
                            damage: 10
                        });
                    }
                } else if (enemy.type === 'FIGHTER') {
                    // Tri-shot
                    if (Math.random() > 0.4) {
                        Audio.playShoot(false);
                        for (let i = -1; i <= 1; i++) {
                            projectilesRef.current.push({
                                id: Math.random(),
                                x: enemy.x,
                                y: enemy.y + enemy.height / 2,
                                vx: -ENEMY_BULLET_SPEED,
                                vy: i * 2,
                                width: 12,
                                height: 8,
                                color: COLORS.neonPink,
                                owner: 'ENEMY',
                                damage: 15
                            });
                        }
                    }
                } else if (enemy.type === 'DESTROYER') {
                    // Laser Beam
                    if (Math.random() > 0.5) {
                        Audio.playLaserCharge();
                        lasersRef.current.push({
                            id: Math.random(),
                            ownerId: enemy.id,
                            y: enemy.y + enemy.height / 2,
                            height: 20,
                            width: CANVAS_WIDTH,
                            state: 'WARNING',
                            timer: 60 // 1 second charge
                        });
                    }
                }
            }
        }
    });

    // Cleanup dead enemies
    enemiesRef.current = enemiesRef.current.filter(e => e.hp > 0);

    // 4. Update Projectiles
    projectilesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.isBomb) {
            p.vx *= 0.99; // Drag
            p.vy += 0.05; // Gravityish
        }
    });
    // Remove offscreen
    projectilesRef.current = projectilesRef.current.filter(p => 
        p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50
    );

    // 5. Update Lasers
    lasersRef.current.forEach(laser => {
        const owner = enemiesRef.current.find(e => e.id === ownerId(laser));
        if (owner) {
            // Track owner Y
            laser.y = owner.y + owner.height / 2;
        }

        if (laser.state === 'WARNING') {
            laser.timer--;
            if (laser.timer <= 0) {
                laser.state = 'FIRING';
                laser.timer = 40; // Fire duration
            }
        } else if (laser.state === 'FIRING') {
            laser.timer--;
        }
    });
    lasersRef.current = lasersRef.current.filter(l => l.timer > 0);
    // Remove laser if owner dead
    lasersRef.current = lasersRef.current.filter(l => enemiesRef.current.some(e => e.id === l.ownerId));

    function ownerId(l: Laser) { return l.ownerId; }

    // 6. Update PowerUps
    powerUpsRef.current.forEach(p => {
        p.x -= POWERUP_SPEED;
        // Drifting motion
        p.y += Math.sin(frameCountRef.current * 0.1) * 0.5;
    });
    powerUpsRef.current = powerUpsRef.current.filter(p => p.x > -50);

    // 7. Collision Detection
    
    // Player vs PowerUps
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pu = powerUpsRef.current[i];
        if (rectIntersect(player.x, player.y, player.width, player.height, pu.x, pu.y, pu.width, pu.height)) {
            if (player.hp < player.maxHp) {
                player.hp = Math.min(player.maxHp, player.hp + HEART_VALUE);
                setHp(player.hp);
                Audio.playPowerUp();
                createExplosion(pu.x, pu.y, COLORS.neonPink, 10, 2);
            }
            powerUpsRef.current.splice(i, 1);
        }
    }

    // Player Bullets vs Enemies
    projectilesRef.current.filter(p => p.owner === 'PLAYER').forEach(bullet => {
        enemiesRef.current.forEach(enemy => {
            if (rectIntersect(bullet.x, bullet.y, bullet.width, bullet.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                // Hit
                bullet.x = 9999; // Remove bullet
                enemy.hp -= bullet.damage;
                createExplosion(bullet.x, bullet.y, bullet.color, 3, 3);
                
                if (enemy.hp <= 0) {
                    // Enemy Die
                    scoreRef.current += ENEMY_STATS[enemy.type].score;
                    setScore(Math.floor(scoreRef.current));
                    Audio.playExplosion();
                    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLORS.neonYellow, 20, 8);
                    
                    // Special Death Logic
                    if (enemy.type === 'FIGHTER') {
                        // Eject Pilot
                        spawnEnemy('PILOT', enemy.x, enemy.y);
                    }
                    
                    // Drop Heart?
                    if (Math.random() < HEART_DROP_CHANCE) {
                        powerUpsRef.current.push({
                            id: Math.random(),
                            x: enemy.x + enemy.width/2,
                            y: enemy.y + enemy.height/2,
                            width: 20,
                            height: 20,
                            vx: 0,
                            type: 'HEART'
                        });
                    }
                }
            }
        });
    });
    // Clean used bullets
    projectilesRef.current = projectilesRef.current.filter(p => p.x < 9000);

    // Enemy Projectiles vs Player
    let playerHit = false;
    if (player.invulnerableTime <= 0) {
        // Bullets
        projectilesRef.current.filter(p => p.owner === 'ENEMY').forEach(bullet => {
            if (rectIntersect(bullet.x, bullet.y, bullet.width, bullet.height, player.x + 5, player.y + 5, player.width - 10, player.height - 10)) {
                player.hp -= bullet.damage;
                bullet.x = -9999;
                playerHit = true;
                player.invulnerableTime = 30;
                createExplosion(player.x + player.width/2, player.y + player.height/2, COLORS.neonRed, 10, 5);
                Audio.playExplosion();
                if (navigator.vibrate) navigator.vibrate(200); // Haptic Impact
            }
        });

        // Lasers
        lasersRef.current.filter(l => l.state === 'FIRING').forEach(laser => {
            // Simple rect check for beam
            if (player.y + player.height > laser.y - laser.height/2 && player.y < laser.y + laser.height/2) {
                 player.hp -= 2; // Damage per frame
                 playerHit = true;
                 player.invulnerableTime = 0; // Continuous damage
                 createExplosion(player.x + Math.random()*player.width, player.y + player.height/2, COLORS.neonRed, 2, 5);
                 if (frameCountRef.current % 10 === 0 && navigator.vibrate) navigator.vibrate(50); // Haptic Buzz
            }
        });

        // Ship collision
        enemiesRef.current.forEach(enemy => {
            if (rectIntersect(player.x, player.y, player.width, player.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                player.hp -= 20;
                playerHit = true;
                player.invulnerableTime = 60;
                enemy.hp -= 50; // Ram damage
                Audio.playCrash();
                createExplosion((player.x + enemy.x)/2, (player.y + enemy.y)/2, '#fff', 20, 10);
                if (navigator.vibrate) navigator.vibrate(400); // Heavy Haptic
            }
        });
        
        if (playerHit) {
            setHp(player.hp);
        }
    }

    if (player.hp <= 0) {
        setHp(0);
        setGameState(GameState.GAME_OVER);
    }

    // 8. Background Update
    starsRef.current.forEach(s => {
        s.x -= s.speed;
        if (s.x < 0) s.x = CANVAS_WIDTH;
    });

    // 9. Particles
    particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

  }, [gameState, setGameState, setScore, setHp]);

  const rectIntersect = (x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number) => {
    return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
  };

  // --------------------------------------------------------------------------
  // RENDER LOOP
  // --------------------------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Stars
    ctx.fillStyle = '#ffffff';
    starsRef.current.forEach(s => {
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Lasers (Behind ships)
    lasersRef.current.forEach(l => {
        if (l.state === 'WARNING') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(0, l.y - 1, CANVAS_WIDTH, 2);
        } else {
            ctx.fillStyle = '#ff0033';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff0000';
            ctx.fillRect(0, l.y - l.height/2, CANVAS_WIDTH, l.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, l.y - l.height/4, CANVAS_WIDTH, l.height/2);
            ctx.shadowBlur = 0;
        }
    });

    // Enemies
    enemiesRef.current.forEach(e => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = ENEMY_STATS[e.type].color;
        ctx.fillStyle = ENEMY_STATS[e.type].color;
        
        if (e.type === 'PILOT') {
            // Little guy
            ctx.beginPath();
            ctx.arc(e.x + 10, e.y + 10, 8, 0, Math.PI*2);
            ctx.fill();
            // Limbs
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(e.x + 10, e.y + 10); ctx.lineTo(e.x + 5, e.y + 25);
            ctx.moveTo(e.x + 10, e.y + 10); ctx.lineTo(e.x + 15, e.y + 25);
            ctx.stroke();
        } else if (e.type === 'SCOUT') {
            // Triangle pointing left
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + e.height/2);
            ctx.lineTo(e.x + e.width, e.y);
            ctx.lineTo(e.x + e.width, e.y + e.height);
            ctx.fill();
        } else if (e.type === 'FIGHTER') {
            // Blocky ship
            ctx.fillRect(e.x, e.y, e.width, e.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(e.x + 10, e.y + 10, 10, 20); // Cockpit
        } else if (e.type === 'DESTROYER') {
            // Large Capital
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + e.height/2);
            ctx.lineTo(e.x + 20, e.y);
            ctx.lineTo(e.x + e.width, e.y);
            ctx.lineTo(e.x + e.width, e.y + e.height);
            ctx.lineTo(e.x + 20, e.y + e.height);
            ctx.fill();
            // Laser port
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(e.x + 10, e.y + e.height/2, 5, 0, Math.PI*2);
            ctx.fill();
        }
    });

    // PowerUps
    powerUpsRef.current.forEach(p => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.neonPink;
        ctx.fillStyle = COLORS.neonPink;
        
        // Heart shape
        const x = p.x + p.width/2;
        const y = p.y + p.height/2 - 2;
        const size = p.width / 2;
        
        ctx.beginPath();
        ctx.moveTo(x, y + size/2);
        ctx.bezierCurveTo(x, y, x - size, y - size, x - size, y - size/3);
        ctx.bezierCurveTo(x - size, y + size/3, x, y + size, x, y + size);
        ctx.bezierCurveTo(x, y + size, x + size, y + size/3, x + size, y - size/3);
        ctx.bezierCurveTo(x + size, y - size, x, y, x, y + size/2);
        ctx.fill();
    });

    // Projectiles
    projectilesRef.current.forEach(p => {
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        
        if (p.isBomb) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.width/2, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }
    });

    // Particles
    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Player
    const player = playerRef.current;
    if (player.invulnerableTime % 4 < 2) { // Flicker
        ctx.shadowBlur = 15;
        ctx.shadowColor = player.color;
        ctx.fillStyle = player.color;
        
        // Sleek Spaceship
        ctx.beginPath();
        ctx.moveTo(player.x + player.width, player.y + player.height / 2); // Nose
        ctx.lineTo(player.x, player.y); // Top back
        ctx.lineTo(player.x + 10, player.y + player.height / 2); // Center back
        ctx.lineTo(player.x, player.y + player.height); // Bottom back
        ctx.closePath();
        ctx.fill();
        
        // Engine Flame
        ctx.fillStyle = '#00ffff';
        ctx.globalAlpha = 0.8 + Math.random() * 0.2;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y + player.height / 2 - 5);
        ctx.lineTo(player.x - 20 - Math.random() * 10, player.y + player.height / 2);
        ctx.lineTo(player.x, player.y + player.height / 2 + 5);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

  }, []);

  const loop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black select-none touch-none">
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="max-w-full max-h-full border-2 border-gray-800 shadow-[0_0_50px_rgba(0,255,255,0.2)]"
        />
        
        {/* Mobile Controls */}
        {gameState === GameState.PLAYING && isMobile && (
            <>
                {/* Joystick Zone */}
                <div 
                    className="absolute bottom-6 left-6 w-36 h-36 rounded-full bg-white/10 border-2 border-white/20 backdrop-blur-sm touch-none flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                    onTouchStart={handleJoystickMove}
                    onTouchMove={handleJoystickMove}
                    onTouchEnd={handleJoystickEnd}
                >
                    <div 
                        className="w-12 h-12 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(0,255,255,0.8)] pointer-events-none transform transition-transform duration-75"
                        style={{
                            transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`
                        }}
                    />
                </div>

                {/* Fire Button */}
                <div 
                    className="absolute bottom-8 right-8 w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/50 backdrop-blur-sm touch-none flex items-center justify-center active:bg-red-500/60 active:scale-95 transition-all opacity-60 hover:opacity-100"
                    onTouchStart={(e) => { e.preventDefault(); fireRef.current = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); fireRef.current = false; }}
                >
                    <div className="w-16 h-16 rounded-full bg-red-500/50 shadow-[0_0_15px_rgba(255,0,0,0.5)] flex items-center justify-center">
                        <span className="font-bold text-white/80 text-sm tracking-wider">FIRE</span>
                    </div>
                </div>
            </>
        )}

        {/* Controls Hint */}
        {gameState === GameState.PLAYING && !isMobile && (
            <div className="absolute bottom-4 left-4 text-xs text-cyan-500 font-mono opacity-50 pointer-events-none">
                WASD: MOVE | SPACE: SHOOT
            </div>
        )}
    </div>
  );
};

export default GameCanvas;