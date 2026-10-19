const canvas = document.querySelector('canvas')!;
const context = canvas.getContext('2d')!;
const startedAt = performance.now();
let frame = 0;

function draw(now: number) {
  const seconds = (now - startedAt) / 1000;
  context.fillStyle = '#101b36';
  context.fillRect(0, 0, 960, 540);
  context.strokeStyle = '#243454';
  context.lineWidth = 1;
  for (let x = 0; x <= 960; x += 40) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 540); context.stroke();
  }
  for (let y = 0; y <= 540; y += 40) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(960, y); context.stroke();
  }
  context.fillStyle = '#7e94c4';
  context.font = '12px monospace';
  context.fillText('CV LAB / MOTION STUDY', 40, 48);
  context.fillText('LIVE FIXTURE', 805, 48);
  context.fillStyle = '#edf2ff';
  context.font = '30px sans-serif';
  context.fillText('A little movement. A measurable change.', 40, 104);
  context.fillStyle = '#96aad1';
  context.font = '14px sans-serif';
  context.fillText('Capture a sequence to compare position, color, and time.', 40, 136);
  const x = 480 + Math.sin(seconds * 2) * 300;
  const y = 300 + Math.cos(seconds * 2) * 50;
  context.strokeStyle = '#385080';
  context.beginPath(); context.ellipse(480, 300, 300, 50, 0, 0, Math.PI * 2); context.stroke();
  const gradient = context.createRadialGradient(x - 12, y - 15, 2, x, y, 36);
  gradient.addColorStop(0, '#d2e1ff'); gradient.addColorStop(.45, '#719cff'); gradient.addColorStop(1, '#3e5be1');
  context.fillStyle = gradient;
  context.beginPath(); context.arc(x, y, 36, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#96aad1';
  context.font = '13px monospace';
  context.fillText(`FRAME ${String(frame++).padStart(6, '0')}`, 40, 482);
  context.fillText(`TIME ${seconds.toFixed(3)}s`, 40, 505);
  context.fillStyle = '#8affcf';
  context.fillRect(840, 466, 60, 40);
  context.fillStyle = '#4265ea';
  context.fillRect(765, 466, 60, 40);
  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
