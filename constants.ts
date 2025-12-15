export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;

export const PLAYER_SPEED = 8;
export const PLAYER_HP = 100;
export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 30;

export const BULLET_SPEED = 15;
export const ENEMY_BULLET_SPEED = 6;
export const SHOOT_COOLDOWN = 120; // ms

// Powerups
export const HEART_VALUE = 20;
export const POWERUP_SPEED = 3;

// Durations in frames (assuming 60fps)
export const SHIELD_DURATION = 300; // 5 seconds
export const MULTISHOT_DURATION = 600; // 10 seconds

// Drop Chances (cumulative checks)
export const DROP_CHANCE_HEART = 0.15;
export const DROP_CHANCE_SHIELD = 0.03;
export const DROP_CHANCE_MULTISHOT = 0.03;
export const DROP_CHANCE_BOMB = 0.02;

// Enemy Constants
export const SPAWN_RATE_BASE = 100;

export const ENEMY_STATS = {
  SCOUT: { width: 40, height: 30, hp: 20, score: 100, color: '#fcee0a' }, // Single shot
  FIGHTER: { width: 50, height: 40, hp: 40, score: 300, color: '#ff00ff' }, // Tri-shot, spawns pilot
  DESTROYER: { width: 80, height: 60, hp: 150, score: 1000, color: '#ff0000' }, // Laser
  PILOT: { width: 20, height: 20, hp: 1, score: 500, color: '#ffffff' } // Throws bomb
};

// Cyberpunk Palette
export const COLORS = {
  background: '#050510',
  neonPink: '#ff00ff',
  neonCyan: '#00ffff',
  neonYellow: '#fcee0a',
  neonGreen: '#0aff0a',
  neonRed: '#ff0033',
  neonOrange: '#ffaa00',
  grid: '#1a1a2e',
  text: '#ffffff'
};