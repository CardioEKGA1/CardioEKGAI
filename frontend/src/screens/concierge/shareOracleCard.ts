// © 2026 SoulMD, LLC. All rights reserved.
// Renders today's oracle card to a square PNG and opens the iOS share
// sheet (or downloads as a fallback). Pure Canvas 2D — no dependencies.
// Matches the on-device reveal: deep-purple nebula top, opal bottom with
// italic serif message, SoulMD Oracle wordmark, Cho Ku Rei symbol.

interface ShareableCard {
  title: string;
  body: string;
  category_label?: string;
  date?: string;
}

const CANVAS_SIZE = 1080;  // square, Instagram-friendly
const NEBULA_HEIGHT_PCT = 0.55;
const GOLD = '#d4a86b';
const GOLD_GLOW = '#f5c26b';
const INK = '#4a3a2e';
const INK_SOFT = '#6b5646';

// Cho Ku Rei as an inline SVG string — keeps this file self-contained and
// matches ChoKuRei.tsx's vector exactly.
const choKuReiSVG = (color: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 120 120">
  <line x1="60" y1="6"  x2="60" y2="114" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
  <line x1="16" y1="22" x2="104" y2="22" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 104 22 L 104 62 L 16 62 L 16 78 L 90 78 L 90 92 L 30 92 L 30 104 L 76 104"
        fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function loadSVGAsImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('svg load failed'));
    img.src = url;
  });
}

// Word-wraps text, returns the array of wrapped lines. Respects explicit \n.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    const words = para.split(/\s+/);
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

async function renderOracleCard(card: ShareableCard): Promise<Blob> {
  const S = CANVAS_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');

  const nebulaH = Math.round(S * NEBULA_HEIGHT_PCT);

  // ─── Nebula top ─────────────────────────────────────────────────────
  // Base dark purple
  const baseGrad = ctx.createLinearGradient(0, 0, 0, nebulaH);
  baseGrad.addColorStop(0, '#1a0d35');
  baseGrad.addColorStop(0.5, '#2d1b4e');
  baseGrad.addColorStop(1, '#4a2d6b');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, S, nebulaH);

  // Soft purple cloud upper-left
  const cloudL = ctx.createRadialGradient(S * 0.3, nebulaH * 0.35, 0, S * 0.3, nebulaH * 0.35, S * 0.55);
  cloudL.addColorStop(0, 'rgba(155,123,212,0.55)');
  cloudL.addColorStop(1, 'rgba(155,123,212,0)');
  ctx.fillStyle = cloudL;
  ctx.fillRect(0, 0, S, nebulaH);

  // Pink cloud lower-right
  const cloudR = ctx.createRadialGradient(S * 0.75, nebulaH * 0.75, 0, S * 0.75, nebulaH * 0.75, S * 0.5);
  cloudR.addColorStop(0, 'rgba(246,191,211,0.45)');
  cloudR.addColorStop(1, 'rgba(246,191,211,0)');
  ctx.fillStyle = cloudR;
  ctx.fillRect(0, 0, S, nebulaH);

  // Stars — seeded, not animated on the export.
  ctx.save();
  for (let i = 0; i < 60; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1 * S;
    const y = (Math.sin(i * 78.233)  * 43758.5453) % 1 * nebulaH;
    const r = ((Math.sin(i * 24.541)  * 43758.5453) % 1) * 2.2 + 0.6;
    ctx.globalAlpha = 0.4 + ((i % 7) / 10);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(Math.abs(x), Math.abs(y), r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // Soft glow behind the symbol
  const glow = ctx.createRadialGradient(S / 2, nebulaH / 2, 0, S / 2, nebulaH / 2, S * 0.32);
  glow.addColorStop(0, 'rgba(255,223,150,0.55)');
  glow.addColorStop(1, 'rgba(255,223,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, nebulaH);

  // 8 radiating light beams
  ctx.save();
  ctx.translate(S / 2, nebulaH / 2);
  const beamLen = nebulaH * 0.55;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * beamLen, Math.sin(angle) * beamLen);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * beamLen, Math.sin(angle) * beamLen); ctx.stroke();
  }
  ctx.restore();

  // Centered Cho Ku Rei
  const symbol = await loadSVGAsImage(choKuReiSVG('#ffffff'));
  const sSize = Math.round(S * 0.28);
  ctx.drawImage(symbol, (S - sSize) / 2, (nebulaH - sSize) / 2, sSize, sSize);

  // ─── Opal bottom ───────────────────────────────────────────────────
  const opalGrad = ctx.createLinearGradient(0, nebulaH, 0, S);
  opalGrad.addColorStop(0, '#fff8ec');
  opalGrad.addColorStop(1, '#f5e6cf');
  ctx.fillStyle = opalGrad;
  ctx.fillRect(0, nebulaH, S, S - nebulaH);

  // Soft top separator line
  ctx.fillStyle = 'rgba(212,168,107,0.25)';
  ctx.fillRect(S * 0.25, nebulaH, S * 0.5, 2);

  // Category label (small, uppercase, gold-ish)
  const pad = S * 0.08;
  const textX = pad;
  let y = nebulaH + S * 0.07;
  if (card.category_label) {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((card.category_label || '').toUpperCase(), S / 2, y);
    y += S * 0.05;
  }

  // Title — serif, bold
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = 'bold 54px "Cormorant Garamond", "Playfair Display", Georgia, serif';
  const titleLines = wrapText(ctx, card.title, S - 2 * pad);
  for (const line of titleLines) {
    ctx.fillText(line, S / 2, y);
    y += 62;
  }
  y += S * 0.015;

  // Body — serif italic, slightly dimmer
  ctx.fillStyle = INK_SOFT;
  ctx.font = 'italic 32px "Cormorant Garamond", "Playfair Display", Georgia, serif';
  const bodyLines = wrapText(ctx, card.body, S - 2 * pad - 20);
  const maxBodyLines = Math.max(4, Math.min(10, bodyLines.length));
  const visibleBody = bodyLines.slice(0, maxBodyLines);
  for (const line of visibleBody) {
    ctx.fillText(line, S / 2, y);
    y += 44;
  }
  if (bodyLines.length > maxBodyLines) {
    // Indicate truncation with an ellipsis line — should rarely trigger
    // since messages are already short, but protects against overflow.
    ctx.fillText('…', S / 2, y);
  }

  // Footer — SoulMD Oracle wordmark + date
  ctx.fillStyle = 'rgba(107,86,70,0.85)';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  ctx.fillText('SOULMD  ·  ORACLE', S / 2, S - 64);
  if (card.date) {
    ctx.fillStyle = 'rgba(107,86,70,0.55)';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.fillText(card.date, S / 2, S - 34);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png', 0.92);
  });
}

/**
 * Renders the card to a PNG and opens the iOS native share sheet.
 * Falls back to a download (desktop browsers without Web Share API Level 2
 * support) so at minimum the user always gets the image.
 */
export async function shareOracleCard(card: ShareableCard): Promise<{ok: boolean; mode: 'share' | 'download' | 'error'; error?: string}> {
  try {
    const blob = await renderOracleCard(card);
    const filename = `soulmd-oracle-${(card.date || new Date().toISOString().slice(0,10))}.png`;
    const file = new File([blob], filename, { type: 'image/png' });

    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: card.title,
        text: `${card.title}\n\n${card.body}\n\n— SoulMD Oracle`,
      });
      return { ok: true, mode: 'share' };
    }

    // Download fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, mode: 'download' };
  } catch (e: any) {
    // AbortError from the share sheet when the user cancels — not an error.
    if (e && e.name === 'AbortError') return { ok: false, mode: 'share', error: 'canceled' };
    return { ok: false, mode: 'error', error: e?.message || 'share failed' };
  }
}
