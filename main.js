'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restartBtn');

// ゲーム定数
const W = canvas.width;
const H = canvas.height;

const PADDLE_HEIGHT = 12;
const PADDLE_Y = H - 40;
const BALL_RADIUS = 8;

const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_WIDTH = 42;
const BRICK_HEIGHT = 18;
const BRICK_PADDING = 4;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = (W - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;

// ブロックの色（行ごと）
const ROW_COLORS = [
  '#e94560', // 赤
  '#f0a500', // オレンジ
  '#f7e733', // 黄
  '#4cc9f0', // 水色
  '#7bed9f', // 緑
  '#a29bfe', // 紫
];

// ゲーム状態
let state, score, lives, level;
let paddle, ball, bricks;
let keys = {};
let animId;
let mouseX = null;

// 状態定数
const STATE_IDLE = 'idle';
const STATE_PLAYING = 'playing';
const STATE_DEAD = 'dead';
const STATE_WIN = 'win';
const STATE_GAMEOVER = 'gameover';

function initGame(keepLevel = false) {
  if (!keepLevel) level = 1;
  score = 0;
  lives = 3;
  initLevel();
}

function initLevel() {
  const speed = 4 + (level - 1) * 0.5;

  paddle = {
    x: W / 2 - 60,
    y: PADDLE_Y,
    w: 120,
    h: PADDLE_HEIGHT,
    speed: 7,
  };

  ball = {
    x: W / 2,
    y: PADDLE_Y - BALL_RADIUS - 1,
    vx: speed * (Math.random() < 0.5 ? 1 : -1),
    vy: -speed,
    r: BALL_RADIUS,
    attached: true, // パドル上に乗っている状態
  };

  bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: BRICK_OFFSET_LEFT + c * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_OFFSET_TOP + r * (BRICK_HEIGHT + BRICK_PADDING),
        w: BRICK_WIDTH,
        h: BRICK_HEIGHT,
        alive: true,
        color: ROW_COLORS[r],
        points: (BRICK_ROWS - r) * 10,
      });
    }
  }

  state = STATE_IDLE;
  messageEl.textContent = 'スペースキーまたはクリックでスタート';
  restartBtn.style.display = 'none';
  updateUI();
}

function updateUI() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  levelEl.textContent = level;
}

// 入力
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ((e.key === ' ' || e.key === 'Enter') && state === STATE_IDLE) {
    launch();
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
});

canvas.addEventListener('click', () => {
  if (state === STATE_IDLE) launch();
});

restartBtn.addEventListener('click', () => {
  restartBtn.style.display = 'none';
  initGame(false);
  loop();
});

function launch() {
  state = STATE_PLAYING;
  ball.attached = false;
  messageEl.textContent = '';
}

// 当たり判定（矩形 vs 円）
function circleRect(bx, by, br, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(bx, rx + rw));
  const nearY = Math.max(ry, Math.min(by, ry + rh));
  const dx = bx - nearX;
  const dy = by - nearY;
  return dx * dx + dy * dy <= br * br;
}

function resolveCollision(bx, by, br, rx, ry, rw, rh) {
  // どの辺に衝突したか判定して反射方向を返す
  const centerX = rx + rw / 2;
  const centerY = ry + rh / 2;
  const overlapX = (rw / 2 + br) - Math.abs(bx - centerX);
  const overlapY = (rh / 2 + br) - Math.abs(by - centerY);

  if (overlapX < overlapY) {
    return { axis: 'x' };
  } else {
    return { axis: 'y' };
  }
}

function update() {
  if (state !== STATE_PLAYING) return;

  // パドル移動
  if (mouseX !== null) {
    paddle.x = mouseX - paddle.w / 2;
  }
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) paddle.x -= paddle.speed;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) paddle.x += paddle.speed;
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

  // ボール（アタッチ中はパドルに追従）
  if (ball.attached) {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = PADDLE_Y - ball.r - 1;
    return;
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  // 壁反射（左右）
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = Math.abs(ball.vx);
  }
  if (ball.x + ball.r > W) {
    ball.x = W - ball.r;
    ball.vx = -Math.abs(ball.vx);
  }

  // 天井
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy);
  }

  // 落下判定
  if (ball.y - ball.r > H) {
    lives--;
    updateUI();
    if (lives <= 0) {
      state = STATE_GAMEOVER;
      messageEl.textContent = 'ゲームオーバー！';
      restartBtn.style.display = 'inline-block';
    } else {
      state = STATE_DEAD;
      setTimeout(() => {
        ball.attached = true;
        ball.vx = (4 + (level - 1) * 0.5) * (Math.random() < 0.5 ? 1 : -1);
        ball.vy = -(4 + (level - 1) * 0.5);
        state = STATE_IDLE;
        messageEl.textContent = 'スペースキーまたはクリックで再開';
      }, 600);
    }
    return;
  }

  // パドルとの衝突
  if (circleRect(ball.x, ball.y, ball.r, paddle.x, paddle.y, paddle.w, paddle.h) && ball.vy > 0) {
    // パドル上の当たった位置に応じて角度変化
    const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const speed = Math.hypot(ball.vx, ball.vy);
    const angle = hit * (Math.PI / 3); // 最大 ±60°
    ball.vx = speed * Math.sin(angle);
    ball.vy = -speed * Math.abs(Math.cos(angle));
    ball.y = paddle.y - ball.r;
  }

  // ブロックとの衝突
  let cleared = 0;
  for (const brick of bricks) {
    if (!brick.alive) { cleared++; continue; }

    if (circleRect(ball.x, ball.y, ball.r, brick.x, brick.y, brick.w, brick.h)) {
      brick.alive = false;
      cleared++;
      score += brick.points;
      updateUI();

      const { axis } = resolveCollision(ball.x, ball.y, ball.r, brick.x, brick.y, brick.w, brick.h);
      if (axis === 'x') ball.vx *= -1;
      else ball.vy *= -1;
    }
  }

  // 全ブロック破壊
  if (cleared === bricks.length) {
    level++;
    state = STATE_WIN;
    messageEl.textContent = `レベル ${level} へ！ スペースキーまたはクリックで続ける`;
    updateUI();
    setTimeout(() => {
      initLevel();
      loop();
    }, 100);
  }
}

// 描画
function drawPaddle() {
  const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
  grad.addColorStop(0, '#e94560');
  grad.addColorStop(1, '#c73652');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
  ctx.fill();
}

function drawBall() {
  const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r);
  grad.addColorStop(0, '#ff8080');
  grad.addColorStop(1, '#cc0000');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBricks() {
  for (const b of bricks) {
    if (!b.alive) continue;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, lighten(b.color, 30));
    grad.addColorStop(1, b.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 3);
    ctx.fill();
  }
}

function lighten(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const bl = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${bl})`;
}

function drawGrid() {
  // 薄いグリッド装飾
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawBricks();
  drawPaddle();
  drawBall();

  // デスエフェクト
  if (state === STATE_DEAD) {
    ctx.fillStyle = 'rgba(233,69,96,0.15)';
    ctx.fillRect(0, 0, W, H);
  }
}

function loop() {
  if (animId) cancelAnimationFrame(animId);

  function tick() {
    update();
    draw();
    if (state !== STATE_GAMEOVER) {
      animId = requestAnimationFrame(tick);
    }
  }
  animId = requestAnimationFrame(tick);
}

// 起動
initGame();
loop();
