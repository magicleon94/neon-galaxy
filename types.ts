export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  lastShotTime: number;
  color: string;
  invulnerableTime: number;
}

export type EnemyType = 'SCOUT' | 'FIGHTER' | 'DESTROYER' | 'PILOT';

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  type: EnemyType;
  lastAttackTime: number;
  state: 'ENTERING' | 'HOVERING' | 'ATTACKING';
  targetY?: number; // For movement smoothing
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  owner: 'PLAYER' | 'ENEMY';
  damage: number;
  isBomb?: boolean;
}

export interface Laser {
  id: number;
  ownerId: number; // Enemy ID
  y: number;
  height: number;
  width: number; // Length
  state: 'WARNING' | 'FIRING';
  timer: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: 'HEART';
}