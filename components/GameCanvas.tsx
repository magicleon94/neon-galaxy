import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GameState, Player, Enemy, Projectile, Particle, Laser, EnemyType, PowerUp, PowerUpType } from '../types';
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
  DROP_CHANCE_HEART,
  DROP_CHANCE_SHIELD,
  DROP_CHANCE_MULTISHOT,
  DROP_CHANCE_BOMB,
  HEART_VALUE,
  POWERUP_SPEED,
  SHIELD_DURATION,
  MULTISHOT_DURATION
} from '../constants';
import * as Audio from '../utils/audio';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  setScore: (score: React.SetStateAction<number>) => void;
  setHp: (hp: number) => void;
  setShieldTime: (time: number) => void;
  setMultishotTime: (time: number) => void;
  isMobile: boolean;
  setScreenshot: (blob: Blob | null) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  setGameState, 
  setScore, 
  setHp, 
  setShieldTime, 
  setMultishotTime, 
  isMobile,
  setScreenshot
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const takeScreenshotRef = useRef<boolean>(false);
  
  // Input State
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  // Mobile Input State
  const joystickRef = useRef({ x: 0, y: 0, active: false });
  const fireRef = useRef(false);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });

  // Visual Effects
  const shakeRef = useRef<number>(0);
  const flashRef = useRef<number>(0); // For bomb flash

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
    invulnerableTime: 0,
    shieldTime: 0,
    multishotTime: 0
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
      invulnerableTime: 0,
      shieldTime: 0,
      multishotTime: 0
    };
    enemiesRef.current = [];
    projectilesRef.current = [];
    lasersRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    scoreRef.current = 0;
    frameCountRef.current = 0;
    shakeRef.current = 0;
    flashRef.current = 0;
    takeScreenshotRef.current = false;
    setScore(0);
    setHp(PLAYER_HP);
    setShieldTime(0);
    setMultishotTime(0);
    setScreenshot(null);
    initStars();
  }, [setScore, setHp, setShieldTime, setMultishotTime, setScreenshot, initStars]);

  // Input Handlers
  useEffect(() => {
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
        targetY: y,
        rotation: 0,
        vx: 0,
        vy: 0,
        shootOffset: Math.floor(Math.random() * 120) // Randomize firing phase
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
  
  const triggerImpact = (intensity: number) => {
      shakeRef.current = intensity;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(intensity * 10);
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
    
    // Manage Powerup Timers
    if (player.shieldTime > 0) player.shieldTime--;
    if (player.multishotTime > 0) player.multishotTime--;

    // Sync UI Timers (throttled to every 6 frames ~ 100ms)
    if (frameCountRef.current % 6 === 0) {
        setShieldTime(Math.ceil(player.shieldTime / 60));
        setMultishotTime(Math.ceil(player.multishotTime / 60));
    }

    // Reduce visual effects
    if (shakeRef.current > 0) {
        shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }
    if (flashRef.current > 0) {
        flashRef.current -= 0.1;
    }

    // 1. Player Movement
    let dx = 0;
    let dy = 0;
    
    if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) dy = -1;
    if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) dy = 1;
    if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) dx = -1;
    if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) dx = 1;

    if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        dx /= len;
        dy /= len;
    }

    if (joystickRef.current.active) {
        dx = joystickRef.current.x;
        dy = joystickRef.current.y;
    }

    player.x += dx * PLAYER_SPEED;
    player.y += dy * PLAYER_SPEED;

    player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));
    player.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.height, player.y));

    // Player Shooting (Single vs Multishot)
    const isFiring = keysRef.current['Space'] || fireRef.current;
    if (isFiring) {
        if (now - player.lastShotTime > SHOOT_COOLDOWN) {
            player.lastShotTime = now;
            Audio.playShoot(true);
            
            const spawnBullet = (vyOffset: number) => {
                projectilesRef.current.push({
                    id: Math.random(),
                    x: player.x + player.width,
                    y: player.y + player.height / 2 - 2,
                    vx: BULLET_SPEED,
                    vy: vyOffset,
                    width: 20,
                    height: 4,
                    color: player.multishotTime > 0 ? COLORS.neonGreen : COLORS.neonCyan,
                    owner: 'PLAYER',
                    damage: 10
                });
            };

            spawnBullet(0);
            
            if (player.multishotTime > 0) {
                spawnBullet(-2);
                spawnBullet(2);
            }
        }
    }

    if (player.invulnerableTime > 0) player.invulnerableTime--;

    // 2. Enemy Spawning
    const spawnRate = Math.max(30, SPAWN_RATE_BASE - Math.floor(scoreRef.current / 50));
    if (frameCountRef.current % spawnRate === 0) {
        const spawnY = Math.random() * (CANVAS_HEIGHT - 100) + 50;
        const rand = Math.random();
        
        let type: EnemyType = 'SCOUT';
        if (scoreRef.current > 500 && rand > 0.6) type = 'FIGHTER';
        if (scoreRef.current > 1000 && rand > 0.8) type = 'KAMIKAZE';
        if (scoreRef.current > 1500 && rand > 0.9) type = 'DESTROYER';

        spawnEnemy(type, CANVAS_WIDTH + 50, spawnY);
    }

    // 3. Enemy AI
    enemiesRef.current.forEach(enemy => {
        const targetX = CANVAS_WIDTH - 200 - (enemy.id % 200); 
        const shootOffset = enemy.shootOffset || 0;
        
        if (enemy.type === 'PILOT') {
            if (enemy.state === 'ENTERING') {
                enemy.x -= 3;
                if (frameCountRef.current % 30 === 0) enemy.state = 'ATTACKING';
            } else if (enemy.state === 'ATTACKING') {
                Audio.playBombThrow();
                projectilesRef.current.push({
                    id: Math.random(),
                    x: enemy.x,
                    y: enemy.y,
                    vx: -4,
                    vy: (player.y - enemy.y) * 0.02,
                    width: 15,
                    height: 15,
                    color: '#fff',
                    owner: 'ENEMY',
                    damage: 30,
                    isBomb: true
                });
                enemy.state = 'HOVERING';
            } else {
                enemy.x += 5;
                enemy.y -= 2;
                if (enemy.x > CANVAS_WIDTH + 50) enemy.hp = 0;
            }
        } else if (enemy.type === 'KAMIKAZE') {
             if (enemy.state === 'CRASHING') {
                 // Abandoned ship behavior - keeps momentum but falls
                 enemy.x -= 15; // Fast forward
                 enemy.y += 3; // Fall
                 enemy.rotation = (enemy.rotation || 0) + 0.1;
                 
                 // If it goes off screen, destroy it silently
                 if (enemy.y > CANVAS_HEIGHT + 100) enemy.hp = 0;
             } else {
                 // Rush player (faster now)
                 enemy.x -= 15;
                 enemy.y += (player.y - enemy.y) * 0.05;

                 // Eject Condition
                 if (enemy.x - player.x < 400 && enemy.x > player.x) {
                     enemy.state = 'CRASHING';
                     Audio.playCrash(); // Sound effect for eject/malfunction
                     
                     // Spawn Paratrooper
                     const stats = ENEMY_STATS.PARATROOPER;
                     enemiesRef.current.push({
                        id: Date.now() + Math.random(),
                        x: enemy.x,
                        y: enemy.y - 20,
                        width: stats.width,
                        height: stats.height,
                        hp: stats.hp,
                        maxHp: stats.hp,
                        type: 'PARATROOPER',
                        lastAttackTime: 0,
                        state: 'ATTACKING',
                        rotation: 0,
                        vx: -3,
                        vy: -10, // EJECT UPWARDS
                        shootOffset: Math.floor(Math.random() * 120)
                     });
                 }
             }
        } else if (enemy.type === 'PARATROOPER') {
            // Apply physics
            // Gravity on vy, cap at terminal velocity
            if (enemy.vy === undefined) enemy.vy = 0;
            if (enemy.vx === undefined) enemy.vx = 0;
            
            if (enemy.vy < 2) enemy.vy += 0.3; // Gravity
            
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            
            // Damping x slightly
            enemy.vx *= 0.98;
            
            // Oscillate slightly
            enemy.x += Math.sin(frameCountRef.current * 0.05) * 0.5;

            // Shoot logic (randomized)
            if ((frameCountRef.current + shootOffset) % 90 === 0) {
                Audio.playShoot(false);
                projectilesRef.current.push({
                    id: Math.random(),
                    x: enemy.x,
                    y: enemy.y + enemy.height / 2,
                    vx: -ENEMY_BULLET_SPEED,
                    vy: (player.y - enemy.y) * 0.01,
                    width: 8,
                    height: 8,
                    color: '#fff',
                    owner: 'ENEMY',
                    damage: 8
                });
            }
            
            if (enemy.y > CANVAS_HEIGHT + 50) enemy.hp = 0;
        } else {
            // Standard Enemies (Scout, Fighter, Destroyer)
            if (enemy.x > targetX) {
                enemy.x -= 4;
            } else {
                enemy.state = 'HOVERING';
                enemy.y += Math.sin((frameCountRef.current + enemy.id) * 0.05) * 2;
            }

            // Attack Logic (Randomized timing)
            if (enemy.state === 'HOVERING' && (frameCountRef.current + shootOffset) % 120 === 0) { 
                if (enemy.type === 'SCOUT') {
                    if (Math.random() > 0.3) {
                        Audio.playShoot(false);
                        projectilesRef.current.push({
                            id: Math.random(),
                            x: enemy.x,
                            y: enemy.y + enemy.height / 2,
                            vx: -ENEMY_BULLET_SPEED * 1.5,
                            vy: (player.y - enemy.y) * 0.01,
                            width: 10,
                            height: 10,
                            color: COLORS.neonYellow,
                            owner: 'ENEMY',
                            damage: 10
                        });
                    }
                } else if (enemy.type === 'FIGHTER') {
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
                    if (Math.random() > 0.5) {
                        Audio.playLaserCharge();
                        lasersRef.current.push({
                            id: Math.random(),
                            ownerId: enemy.id,
                            y: enemy.y + enemy.height / 2,
                            height: 20,
                            width: CANVAS_WIDTH,
                            state: 'WARNING',
                            timer: 60 
                        });
                    }
                }
            }
        }
    });

    enemiesRef.current = enemiesRef.current.filter(e => e.hp > 0);

    // 4. Update Projectiles
    projectilesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.isBomb) {
            p.vx *= 0.99;
            p.vy += 0.05;
        }
    });
    projectilesRef.current = projectilesRef.current.filter(p => 
        p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50
    );

    // 5. Update Lasers
    lasersRef.current.forEach(laser => {
        const owner = enemiesRef.current.find(e => e.id === ownerId(laser));
        if (owner) {
            laser.y = owner.y + owner.height / 2;
        }
        if (laser.state === 'WARNING') {
            laser.timer--;
            if (laser.timer <= 0) {
                laser.state = 'FIRING';
                laser.timer = 40;
            }
        } else if (laser.state === 'FIRING') {
            laser.timer--;
        }
    });
    lasersRef.current = lasersRef.current.filter(l => l.timer > 0);
    lasersRef.current = lasersRef.current.filter(l => enemiesRef.current.some(e => e.id === l.ownerId));

    function ownerId(l: Laser) { return l.ownerId; }

    // 6. Update PowerUps
    powerUpsRef.current.forEach(p => {
        p.x -= POWERUP_SPEED;
        p.y += Math.sin(frameCountRef.current * 0.1) * 0.5;
    });
    powerUpsRef.current = powerUpsRef.current.filter(p => p.x > -50);

    // 7. Collision Detection
    
    // Player vs PowerUps
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pu = powerUpsRef.current[i];
        if (rectIntersect(player.x, player.y, player.width, player.height, pu.x, pu.y, pu.width, pu.height)) {
            // Apply Powerup
            if (pu.type === 'HEART') {
                if (player.hp < player.maxHp) {
                    player.hp = Math.min(player.maxHp, player.hp + HEART_VALUE);
                    setHp(player.hp);
                    Audio.playPowerUp();
                }
            } else if (pu.type === 'SHIELD') {
                player.shieldTime = SHIELD_DURATION;
                Audio.playPowerUp();
            } else if (pu.type === 'MULTISHOT') {
                player.multishotTime = MULTISHOT_DURATION;
                Audio.playPowerUp();
            } else if (pu.type === 'BOMB') {
                // Flash screen
                flashRef.current = 1.0;
                Audio.playExplosion();
                triggerImpact(30);
                
                // Kill 75% of enemies
                enemiesRef.current.forEach(enemy => {
                    if (Math.random() < 0.75) {
                        enemy.hp = 0;
                        createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLORS.neonOrange, 20, 8);
                        scoreRef.current += ENEMY_STATS[enemy.type].score;
                    }
                });
                setScore(Math.floor(scoreRef.current));
            }
            
            createExplosion(pu.x, pu.y, '#fff', 10, 2);
            powerUpsRef.current.splice(i, 1);
        }
    }

    // Player Bullets vs Enemies
    projectilesRef.current.filter(p => p.owner === 'PLAYER').forEach(bullet => {
        enemiesRef.current.forEach(enemy => {
            if (rectIntersect(bullet.x, bullet.y, bullet.width, bullet.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                bullet.x = 9999;
                enemy.hp -= bullet.damage;
                createExplosion(bullet.x, bullet.y, bullet.color, 3, 3);
                
                if (enemy.hp <= 0) {
                    scoreRef.current += ENEMY_STATS[enemy.type].score;
                    setScore(Math.floor(scoreRef.current));
                    Audio.playExplosion();
                    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLORS.neonYellow, 20, 8);
                    
                    if (enemy.type === 'FIGHTER') {
                        spawnEnemy('PILOT', enemy.x, enemy.y);
                    }
                    
                    // Drop Logic
                    const roll = Math.random();
                    let dropType: PowerUpType | null = null;
                    
                    if (roll < DROP_CHANCE_BOMB) dropType = 'BOMB';
                    else if (roll < DROP_CHANCE_BOMB + DROP_CHANCE_SHIELD) dropType = 'SHIELD';
                    else if (roll < DROP_CHANCE_BOMB + DROP_CHANCE_SHIELD + DROP_CHANCE_MULTISHOT) dropType = 'MULTISHOT';
                    else if (roll < DROP_CHANCE_BOMB + DROP_CHANCE_SHIELD + DROP_CHANCE_MULTISHOT + DROP_CHANCE_HEART) dropType = 'HEART';

                    if (dropType) {
                        powerUpsRef.current.push({
                            id: Math.random(),
                            x: enemy.x + enemy.width/2,
                            y: enemy.y + enemy.height/2,
                            width: 20,
                            height: 20,
                            vx: 0,
                            type: dropType
                        });
                    }
                }
            }
        });
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.x < 9000);

    // Enemy Projectiles vs Player (Only if no Shield)
    let playerHit = false;
    const canTakeDamage = player.invulnerableTime <= 0 && player.shieldTime <= 0;

    if (canTakeDamage) {
        projectilesRef.current.filter(p => p.owner === 'ENEMY').forEach(bullet => {
            if (rectIntersect(bullet.x, bullet.y, bullet.width, bullet.height, player.x + 5, player.y + 5, player.width - 10, player.height - 10)) {
                player.hp -= bullet.damage;
                bullet.x = -9999;
                playerHit = true;
                player.invulnerableTime = 30;
                createExplosion(player.x + player.width/2, player.y + player.height/2, COLORS.neonRed, 10, 5);
                Audio.playExplosion();
                triggerImpact(20);
            }
        });

        lasersRef.current.filter(l => l.state === 'FIRING').forEach(laser => {
            if (player.y + player.height > laser.y - laser.height/2 && player.y < laser.y + laser.height/2) {
                 player.hp -= 2;
                 playerHit = true;
                 player.invulnerableTime = 0;
                 createExplosion(player.x + Math.random()*player.width, player.y + player.height/2, COLORS.neonRed, 2, 5);
                 if (frameCountRef.current % 10 === 0) triggerImpact(5);
            }
        });

        enemiesRef.current.forEach(enemy => {
            if (rectIntersect(player.x, player.y, player.width, player.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                player.hp -= 20;
                playerHit = true;
                player.invulnerableTime = 60;
                enemy.hp -= 50;
                Audio.playCrash();
                createExplosion((player.x + enemy.x)/2, (player.y + enemy.y)/2, '#fff', 20, 10);
                triggerImpact(30);
            }
        });
        
        if (playerHit) {
            setHp(player.hp);
        }
    } else if (player.shieldTime > 0) {
        // Shield collision effects (visual only, no damage)
        projectilesRef.current.filter(p => p.owner === 'ENEMY').forEach(bullet => {
             if (rectIntersect(bullet.x, bullet.y, bullet.width, bullet.height, player.x - 5, player.y - 5, player.width + 10, player.height + 10)) {
                bullet.x = -9999;
                // Shield Hit Effect
                createExplosion(bullet.x, bullet.y, COLORS.neonCyan, 5, 2);
             }
        });
    }

    if (player.hp <= 0) {
        setHp(0);
        // Only trigger screenshot logic once
        if (isMobile && canvasRef.current && !takeScreenshotRef.current) {
            takeScreenshotRef.current = true;
        }
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

  }, [gameState, setGameState, setScore, setHp, setShieldTime, setMultishotTime, setScreenshot, isMobile]);

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

    // Apply Shake
    const shakeX = (Math.random() - 0.5) * shakeRef.current;
    const shakeY = (Math.random() - 0.5) * shakeRef.current;
    
    canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;

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

    // Lasers
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
        
        ctx.save();
        if (e.rotation) {
             ctx.translate(e.x + e.width/2, e.y + e.height/2);
             ctx.rotate(e.rotation);
             ctx.translate(-(e.x + e.width/2), -(e.y + e.height/2));
        }

        if (e.type === 'PILOT') {
            ctx.beginPath();
            ctx.arc(e.x + 10, e.y + 10, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(e.x + 10, e.y + 10); ctx.lineTo(e.x + 5, e.y + 25);
            ctx.moveTo(e.x + 10, e.y + 10); ctx.lineTo(e.x + 15, e.y + 25);
            ctx.stroke();
        } else if (e.type === 'SCOUT') {
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + e.height/2);
            ctx.lineTo(e.x + e.width, e.y);
            ctx.lineTo(e.x + e.width, e.y + e.height);
            ctx.fill();
        } else if (e.type === 'FIGHTER') {
            ctx.fillRect(e.x, e.y, e.width, e.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(e.x + 10, e.y + 10, 10, 20);
        } else if (e.type === 'DESTROYER') {
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + e.height/2);
            ctx.lineTo(e.x + 20, e.y);
            ctx.lineTo(e.x + e.width, e.y);
            ctx.lineTo(e.x + e.width, e.y + e.height);
            ctx.lineTo(e.x + 20, e.y + e.height);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(e.x + 10, e.y + e.height/2, 5, 0, Math.PI*2);
            ctx.fill();
        } else if (e.type === 'KAMIKAZE') {
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + e.width, e.y + e.height / 2);
            ctx.lineTo(e.x, e.y + e.height);
            ctx.lineTo(e.x + 10, e.y + e.height / 2);
            ctx.closePath();
            ctx.fill();
            
            // Engine flame if not crashing
            if (e.state !== 'CRASHING') {
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.moveTo(e.x, e.y + 5);
                ctx.lineTo(e.x - 20 - Math.random() * 10, e.y + e.height / 2);
                ctx.lineTo(e.x, e.y + e.height - 5);
                ctx.fill();
            } else {
                // Smoke trail if crashing
                if (Math.random() > 0.5) {
                    ctx.fillStyle = '#555';
                    ctx.beginPath();
                    ctx.arc(e.x - 10, e.y + Math.random() * 20, Math.random() * 10 + 5, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        } else if (e.type === 'PARATROOPER') {
            // Parachute
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(e.x + e.width/2, e.y + 10, 15, Math.PI, 0); // Dome
            ctx.stroke();
            
            // Lines
            ctx.beginPath();
            ctx.moveTo(e.x + e.width/2 - 15, e.y + 10);
            ctx.lineTo(e.x + e.width/2, e.y + 25);
            ctx.moveTo(e.x + e.width/2 + 15, e.y + 10);
            ctx.lineTo(e.x + e.width/2, e.y + 25);
            ctx.stroke();
            
            // Body
            ctx.fillStyle = '#00ffaa';
            ctx.beginPath();
            ctx.arc(e.x + e.width/2, e.y + 25, 6, 0, Math.PI*2); // Head
            ctx.fill();
            
            ctx.strokeStyle = '#00ffaa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(e.x + e.width/2, e.y + 25);
            ctx.lineTo(e.x + e.width/2, e.y + 40); // Body
            ctx.lineTo(e.x + e.width/2 - 5, e.y + 50); // Leg L
            ctx.moveTo(e.x + e.width/2, e.y + 40);
            ctx.lineTo(e.x + e.width/2 + 5, e.y + 50); // Leg R
            ctx.stroke();
        }
        
        ctx.restore();
    });

    // PowerUps
    powerUpsRef.current.forEach(p => {
        let color = COLORS.neonPink;
        let char = '♥';

        if (p.type === 'SHIELD') { color = COLORS.neonCyan; char = 'S'; }
        else if (p.type === 'MULTISHOT') { color = COLORS.neonGreen; char = 'M'; }
        else if (p.type === 'BOMB') { color = COLORS.neonRed; char = 'B'; }

        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        
        // Background Circle
        ctx.beginPath();
        ctx.arc(p.x + p.width/2, p.y + p.height/2, p.width/1.5, 0, Math.PI*2);
        ctx.fill();

        // Icon
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, p.x + p.width/2, p.y + p.height/2 + 1);
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
    
    // Shield Visual (IMPROVED)
    if (player.shieldTime > 0) {
        ctx.save();
        const cx = player.x + player.width/2;
        const cy = player.y + player.height/2;
        const radius = Math.max(player.width, player.height);
        
        ctx.translate(cx, cy);
        
        // Inner Glow
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Rotating Rings
        ctx.rotate(frameCountRef.current * 0.05);
        ctx.strokeStyle = COLORS.neonCyan;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.neonCyan;
        
        // Outer dashed ring
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
        ctx.setLineDash([15, 10]);
        ctx.stroke();
        
        // Inner solid ring
        ctx.rotate(-frameCountRef.current * 0.1); // Counter-rotate
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    if (player.invulnerableTime % 4 < 2) { 
        ctx.shadowBlur = 15;
        ctx.shadowColor = player.color;
        ctx.fillStyle = player.color;
        
        ctx.beginPath();
        ctx.moveTo(player.x + player.width, player.y + player.height / 2);
        ctx.lineTo(player.x, player.y);
        ctx.lineTo(player.x + 10, player.y + player.height / 2);
        ctx.lineTo(player.x, player.y + player.height);
        ctx.closePath();
        ctx.fill();
        
        // Multishot Visual: Extra guns
        if (player.multishotTime > 0) {
            ctx.fillStyle = COLORS.neonGreen;
            ctx.fillRect(player.x + 5, player.y - 5, 10, 5);
            ctx.fillRect(player.x + 5, player.y + player.height, 10, 5);
        }

        // Engine
        ctx.fillStyle = '#00ffff';
        ctx.globalAlpha = 0.8 + Math.random() * 0.2;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y + player.height / 2 - 5);
        ctx.lineTo(player.x - 20 - Math.random() * 10, player.y + player.height / 2);
        ctx.lineTo(player.x, player.y + player.height / 2 + 5);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // Bomb Flash
    if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashRef.current})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Screenshot Overlay Draw
    if (takeScreenshotRef.current && isMobile) {
        ctx.save();
        // Score
        ctx.fillStyle = COLORS.neonYellow;
        ctx.font = 'bold italic 40px Orbitron';
        ctx.textAlign = 'right';
        ctx.shadowColor = COLORS.neonPink;
        ctx.shadowBlur = 10;
        ctx.fillText(`SCORE: ${Math.floor(scoreRef.current)}`, CANVAS_WIDTH - 30, 60);
        
        // Status
        ctx.fillStyle = COLORS.neonRed;
        ctx.font = 'bold 60px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('M.I.A.', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.restore();

        // Capture
        canvas.toBlob(blob => {
            if (blob) setScreenshot(blob);
        });
        takeScreenshotRef.current = false;
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

        {gameState === GameState.PLAYING && !isMobile && (
            <div className="absolute bottom-4 left-4 text-xs text-cyan-500 font-mono opacity-50 pointer-events-none">
                WASD: MOVE | SPACE: SHOOT
            </div>
        )}
    </div>
  );
};

export default GameCanvas;