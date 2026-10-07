const { createCanvas, loadImage } = require('@napi-rs/canvas');

const DOUBLE_GAP = 4;
const SHADOW_BLUR = 20;
const SHADOW_OFFSET = 10;
const FILM_HOLE_SIZE = 10;
const FILM_HOLE_GAP = 20;

function drawRoundedRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

async function render(imageBuffer, settings) {
  const image = await loadImage(imageBuffer);
  const {
    borderWidth = 20,
    borderColor = '#ffffff',
    borderRadius = 0,
    borderStyle = 'solid',
  } = settings || {};

  const bw = Math.max(1, parseInt(borderWidth, 10) || 20);
  const br = Math.max(0, parseInt(borderRadius, 10) || 0);

  let padding = bw;
  let bottomPadding = bw;
  if (borderStyle === 'polaroid') bottomPadding = bw * 3;
  else if (borderStyle === 'film') { padding = bw * 1.5; bottomPadding = bw * 1.5; }

  const cw = image.width + padding * 2;
  const ch = image.height + padding + bottomPadding;
  const canvas = createCanvas(cw, ch);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);

  if (borderStyle === 'double') {
    drawRoundedRect(ctx, 0, 0, cw, ch, br, borderColor);
    drawRoundedRect(ctx, DOUBLE_GAP, DOUBLE_GAP, cw - DOUBLE_GAP * 2, ch - DOUBLE_GAP * 2, br, '#333');
    drawRoundedRect(ctx, DOUBLE_GAP * 2, DOUBLE_GAP * 2, cw - DOUBLE_GAP * 4, ch - DOUBLE_GAP * 4, br, borderColor);
    ctx.drawImage(image, padding, padding);
  } else if (borderStyle === 'shadow') {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = SHADOW_BLUR;
    ctx.shadowOffsetX = SHADOW_OFFSET;
    ctx.shadowOffsetY = SHADOW_OFFSET;
    ctx.fillStyle = borderColor;
    ctx.fillRect(padding / 2, padding / 2, image.width + padding, image.height + padding);
    ctx.restore();
    ctx.drawImage(image, padding, padding);
  } else if (borderStyle === 'polaroid') {
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(image, padding, padding);
  } else if (borderStyle === 'film') {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#fff';
    for (let y = FILM_HOLE_GAP; y < ch - FILM_HOLE_GAP; y += FILM_HOLE_GAP) {
      ctx.beginPath();
      ctx.arc(FILM_HOLE_SIZE, y, FILM_HOLE_SIZE / 2, 0, Math.PI * 2);
      ctx.arc(cw - FILM_HOLE_SIZE, y, FILM_HOLE_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(image, padding, padding);
  } else {
    drawRoundedRect(ctx, 0, 0, cw, ch, br, borderColor);
    ctx.drawImage(image, padding, padding);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { render, drawRoundedRect };
