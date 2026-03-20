import PptxGenJS from "pptxgenjs";
import type { TrainingModule } from "../types";

const C = {
  bgDark: "0F172A",
  bgMed: "1E293B",
  white: "FFFFFF",
  text1: "F1F5F9",
  text2: "94A3B8",
  text3: "64748B",
  dim: "475569",
  divider: "334155",
  blue: "3B82F6",
  violet: "8B5CF6",
  emerald: "10B981",
  amber: "F59E0B",
  cyan: "06B6D4",
  rose: "F43F5E",
  indigo: "6366F1",
  pink: "EC4899",
};

const FONT = "Calibri";

const ACCENTS = [
  { fill: C.blue, bg: "0C1A3D" },
  { fill: C.violet, bg: "1A0C3D" },
  { fill: C.cyan, bg: "0C2D3D" },
  { fill: C.emerald, bg: "0C3D2D" },
  { fill: C.amber, bg: "3D2D0C" },
  { fill: C.rose, bg: "3D0C1A" },
  { fill: C.indigo, bg: "1C1A4D" },
  { fill: C.pink, bg: "3D0C2D" },
];

function accent(i: number) {
  return ACCENTS[i % ACCENTS.length]!;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 16807 + 12345) % 2147483647;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function generateAbstractArt(topic: string, color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext("2d")!;

  const { r, g, b } = hexToRgb(color);

  const grad = ctx.createLinearGradient(0, 0, 800, 800);
  grad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
  grad.addColorStop(
    1,
    `rgb(${Math.max(0, r - 70)}, ${Math.max(0, g - 70)}, ${Math.max(0, b - 70)})`
  );
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 800);

  const rand = makeRng(hashStr(topic));

  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.arc(rand() * 800, rand() * 800, rand() * 200 + 30, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.1 + 0.02})`;
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(rand() * 800, rand() * 800);
    ctx.bezierCurveTo(
      rand() * 800, rand() * 800,
      rand() * 800, rand() * 800,
      rand() * 800, rand() * 800
    );
    ctx.stroke();
  }

  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.arc(rand() * 800, rand() * 800, rand() * 3 + 1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.25 + 0.1})`;
    ctx.fill();
  }

  return canvas.toDataURL("image/png");
}

function stripMd(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decoCircle(
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  size: number,
  color: string,
  tp: number
) {
  slide.addShape("ellipse", {
    x,
    y,
    w: size,
    h: size,
    fill: { type: "solid", color, transparency: tp },
  });
}

function accentBar(
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  slide.addShape("rect", {
    x,
    y,
    w,
    h,
    fill: { type: "solid", color },
  });
}

// ─── Slide Builders ──────────────────────────────────────────

function buildCover(pres: PptxGenJS, modules: TrainingModule[]) {
  const slide = pres.addSlide();
  slide.background = { color: C.bgDark };

  decoCircle(slide, 9, -2, 6, C.blue, 88);
  decoCircle(slide, -1.5, 5, 5, C.violet, 88);
  decoCircle(slide, 7, 0.5, 2, C.cyan, 92);
  decoCircle(slide, 11, 4, 3, C.indigo, 90);

  accentBar(slide, 1, 3.35, 2.5, 0.06, C.blue);

  slide.addText("Training\nMaterials", {
    x: 1,
    y: 1.2,
    w: 8,
    h: 2.2,
    fontSize: 52,
    fontFace: FONT,
    color: C.white,
    bold: true,
    lineSpacingMultiple: 1.05,
  });

  slide.addText(
    `${modules.length} Module${modules.length !== 1 ? "s" : ""} · AI-Generated Training Content`,
    {
      x: 1,
      y: 3.7,
      w: 8,
      h: 0.6,
      fontSize: 18,
      fontFace: FONT,
      color: C.text2,
    }
  );

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  slide.addText(dateStr, {
    x: 1,
    y: 6.5,
    w: 5,
    h: 0.5,
    fontSize: 14,
    fontFace: FONT,
    color: C.dim,
  });
}

function buildAgenda(pres: PptxGenJS, modules: TrainingModule[]) {
  const slide = pres.addSlide();
  slide.background = { color: C.bgDark };

  accentBar(slide, 0, 0, 0.07, 7.5, C.violet);
  decoCircle(slide, 11, 5, 3.5, C.violet, 92);

  slide.addText("Agenda", {
    x: 0.8,
    y: 0.5,
    w: 5,
    h: 0.9,
    fontSize: 34,
    fontFace: FONT,
    color: C.white,
    bold: true,
  });
  accentBar(slide, 0.8, 1.4, 1.5, 0.04, C.blue);

  const items: PptxGenJS.TextProps[] = modules.map((m, i) => ({
    text: `${String(i + 1).padStart(2, "0")}    ${m.topic}`,
    options: {
      fontSize: 17,
      fontFace: FONT,
      color: C.text1,
      bullet: false,
      paraSpaceBefore: 12,
      paraSpaceAfter: 12,
    } as PptxGenJS.TextPropsOptions,
  }));

  slide.addText(items, {
    x: 0.8,
    y: 1.9,
    w: 10,
    h: 5,
    valign: "top",
  });
}

function buildModuleTitle(
  pres: PptxGenJS,
  mod: TrainingModule,
  idx: number,
  total: number,
  ac: { fill: string; bg: string },
  artImage: string
) {
  const slide = pres.addSlide();
  slide.background = { color: ac.bg };

  slide.addImage({
    data: artImage,
    x: 7.83,
    y: 0,
    w: 5.5,
    h: 7.5,
    transparency: 30,
  });

  decoCircle(slide, 9, -2.5, 7, ac.fill, 85);
  decoCircle(slide, 10.5, 4, 4.5, ac.fill, 90);

  accentBar(slide, 0, 0, 0.07, 7.5, ac.fill);

  slide.addText(`MODULE ${idx + 1} OF ${total}`, {
    x: 1,
    y: 1,
    w: 8,
    h: 0.5,
    fontSize: 13,
    fontFace: FONT,
    color: ac.fill,
    bold: true,
    charSpacing: 3,
  });

  accentBar(slide, 1, 1.7, 2, 0.05, ac.fill);

  slide.addText(mod.topic, {
    x: 1,
    y: 2,
    w: 7,
    h: 1.8,
    fontSize: 40,
    fontFace: FONT,
    color: C.white,
    bold: true,
    lineSpacingMultiple: 1.1,
  });

  slide.addText(mod.overview, {
    x: 1,
    y: 4.1,
    w: 7,
    h: 1.8,
    fontSize: 15,
    fontFace: FONT,
    color: C.text2,
    lineSpacingMultiple: 1.5,
  });

  slide.addShape("roundRect", {
    x: 1,
    y: 6.3,
    w: 2.4,
    h: 0.5,
    fill: { type: "solid", color: ac.fill, transparency: 65 },
    rectRadius: 0.15,
  });
  slide.addText(`⏱  ${mod.estimatedDuration}`, {
    x: 1,
    y: 6.3,
    w: 2.4,
    h: 0.5,
    fontSize: 12,
    fontFace: FONT,
    color: C.text1,
    align: "center",
    valign: "middle",
  });
}

function buildObjectives(
  pres: PptxGenJS,
  mod: TrainingModule,
  _ac: { fill: string; bg: string }
) {
  const slide = pres.addSlide();
  slide.background = { color: C.bgDark };

  accentBar(slide, 0, 0, 13.33, 0.06, C.emerald);
  decoCircle(slide, 11, 4.5, 4, C.emerald, 93);

  slide.addText("LEARNING OBJECTIVES", {
    x: 0.8,
    y: 0.4,
    w: 6,
    h: 0.5,
    fontSize: 12,
    fontFace: FONT,
    color: C.emerald,
    bold: true,
    charSpacing: 3,
  });

  slide.addText(mod.topic, {
    x: 0.8,
    y: 0.9,
    w: 10,
    h: 0.7,
    fontSize: 24,
    fontFace: FONT,
    color: C.white,
    bold: true,
  });
  accentBar(slide, 0.8, 1.65, 1.5, 0.04, C.emerald);

  const items: PptxGenJS.TextProps[] = mod.learningObjectives.map((obj) => ({
    text: obj,
    options: {
      fontSize: 15,
      fontFace: FONT,
      color: C.text1,
      bullet: { type: "number" as const },
      paraSpaceBefore: 10,
      paraSpaceAfter: 10,
      lineSpacingMultiple: 1.4,
    },
  }));

  slide.addText(items, {
    x: 0.8,
    y: 2,
    w: 10.5,
    h: 4.8,
    valign: "top",
  });
}

function buildContentSlides(
  pres: PptxGenJS,
  mod: TrainingModule,
  section: { title: string; body: string },
  sIdx: number,
  ac: { fill: string; bg: string }
) {
  const clean = stripMd(section.body);
  const MAX_CHARS = 1100;
  const chunks: string[] = [];

  if (clean.length <= MAX_CHARS) {
    chunks.push(clean);
  } else {
    const paragraphs = clean.split("\n\n");
    let cur = "";
    for (const p of paragraphs) {
      if (cur.length + p.length > MAX_CHARS && cur.length > 0) {
        chunks.push(cur.trim());
        cur = p;
      } else {
        cur += (cur ? "\n\n" : "") + p;
      }
    }
    if (cur.trim()) chunks.push(cur.trim());
  }

  chunks.forEach((chunk, ci) => {
    const slide = pres.addSlide();
    slide.background = { color: C.bgDark };

    accentBar(slide, 0, 0, 0.05, 7.5, ac.fill);
    decoCircle(slide, 12, 0, 1.2, ac.fill, 92);

    slide.addShape("roundRect", {
      x: 0.5,
      y: 0.4,
      w: 0.55,
      h: 0.48,
      fill: { type: "solid", color: ac.fill },
      rectRadius: 0.08,
    });
    slide.addText(`${sIdx + 1}`, {
      x: 0.5,
      y: 0.4,
      w: 0.55,
      h: 0.48,
      fontSize: 16,
      fontFace: FONT,
      color: C.white,
      bold: true,
      align: "center",
      valign: "middle",
    });

    const pageSuffix = chunks.length > 1 ? `  (${ci + 1}/${chunks.length})` : "";
    slide.addText(section.title + pageSuffix, {
      x: 1.2,
      y: 0.35,
      w: 10,
      h: 0.6,
      fontSize: 22,
      fontFace: FONT,
      color: C.white,
      bold: true,
    });

    slide.addText(mod.topic, {
      x: 1.2,
      y: 0.95,
      w: 10,
      h: 0.35,
      fontSize: 11,
      fontFace: FONT,
      color: C.text3,
    });

    accentBar(slide, 0.5, 1.4, 12, 0.01, C.divider);

    const lines = chunk.split("\n");
    const textItems: PptxGenJS.TextProps[] = [];

    for (const line of lines) {
      if (line.startsWith("• ")) {
        textItems.push({
          text: line.substring(2),
          options: {
            fontSize: 13,
            fontFace: FONT,
            color: C.text1,
            bullet: { type: "bullet" as const, characterCode: "2022" },
            paraSpaceBefore: 4,
            paraSpaceAfter: 4,
            lineSpacingMultiple: 1.4,
          },
        });
      } else if (line.trim() === "") {
        textItems.push({
          text: " ",
          options: { fontSize: 6, paraSpaceBefore: 2, paraSpaceAfter: 2 },
        });
      } else {
        textItems.push({
          text: line,
          options: {
            fontSize: 13,
            fontFace: FONT,
            color: C.text1,
            paraSpaceBefore: 4,
            paraSpaceAfter: 4,
            lineSpacingMultiple: 1.4,
          },
        });
      }
    }

    slide.addText(textItems, {
      x: 0.5,
      y: 1.55,
      w: 12,
      h: 5.3,
      valign: "top",
    });

    slide.addText(mod.topic, {
      x: 0.5,
      y: 7,
      w: 8,
      h: 0.3,
      fontSize: 9,
      fontFace: FONT,
      color: C.dim,
    });
  });
}

function buildTakeaways(
  pres: PptxGenJS,
  mod: TrainingModule,
  _ac: { fill: string; bg: string }
) {
  const slide = pres.addSlide();
  slide.background = { color: C.bgDark };

  accentBar(slide, 0, 0, 0.07, 7.5, C.amber);
  decoCircle(slide, 10.5, -1.5, 5, C.amber, 93);

  slide.addText("KEY TAKEAWAYS", {
    x: 0.8,
    y: 0.4,
    w: 6,
    h: 0.5,
    fontSize: 12,
    fontFace: FONT,
    color: C.amber,
    bold: true,
    charSpacing: 3,
  });

  slide.addText(mod.topic, {
    x: 0.8,
    y: 0.9,
    w: 10,
    h: 0.7,
    fontSize: 24,
    fontFace: FONT,
    color: C.white,
    bold: true,
  });
  accentBar(slide, 0.8, 1.65, 1.5, 0.04, C.amber);

  const items: PptxGenJS.TextProps[] = mod.keyTakeaways.map((t) => ({
    text: t,
    options: {
      fontSize: 15,
      fontFace: FONT,
      color: C.text1,
      bullet: { type: "bullet" as const, characterCode: "2714" },
      paraSpaceBefore: 10,
      paraSpaceAfter: 10,
      lineSpacingMultiple: 1.4,
    },
  }));

  slide.addText(items, {
    x: 0.8,
    y: 2,
    w: 10.5,
    h: 4.8,
    valign: "top",
  });
}

function buildQuizSlides(
  pres: PptxGenJS,
  mod: TrainingModule,
  _ac: { fill: string; bg: string }
) {
  const PER_SLIDE = 2;

  for (
    let qi = 0;
    qi < mod.assessmentQuestions.length;
    qi += PER_SLIDE
  ) {
    const batch = mod.assessmentQuestions.slice(qi, qi + PER_SLIDE);
    const slide = pres.addSlide();
    slide.background = { color: C.bgDark };

    accentBar(slide, 0, 0, 13.33, 0.06, C.cyan);
    decoCircle(slide, 12, 5.5, 2.5, C.cyan, 93);

    slide.addText("KNOWLEDGE CHECK", {
      x: 0.8,
      y: 0.3,
      w: 6,
      h: 0.45,
      fontSize: 12,
      fontFace: FONT,
      color: C.cyan,
      bold: true,
      charSpacing: 3,
    });

    slide.addText(mod.topic, {
      x: 0.8,
      y: 0.8,
      w: 10,
      h: 0.55,
      fontSize: 20,
      fontFace: FONT,
      color: C.white,
      bold: true,
    });

    let yPos = 1.65;

    batch.forEach((q, bi) => {
      const qNum = qi + bi + 1;

      slide.addText(`Q${qNum}. ${q.question}`, {
        x: 0.8,
        y: yPos,
        w: 11,
        h: 0.5,
        fontSize: 14,
        fontFace: FONT,
        color: C.text1,
        bold: true,
      });
      yPos += 0.6;

      q.options.forEach((opt, oi) => {
        const letter = String.fromCharCode(65 + oi);
        const correct = oi === q.correctAnswer;
        slide.addText(`${letter})  ${opt}`, {
          x: 1.3,
          y: yPos,
          w: 10.5,
          h: 0.38,
          fontSize: 12,
          fontFace: FONT,
          color: correct ? C.emerald : C.text2,
          bold: correct,
        });
        yPos += 0.38;
      });

      yPos += 0.35;
    });

    slide.addText("✓ Correct answers highlighted in green", {
      x: 0.8,
      y: 6.85,
      w: 8,
      h: 0.35,
      fontSize: 10,
      fontFace: FONT,
      color: C.emerald,
      italic: true,
    });
  }
}

function buildClosing(pres: PptxGenJS) {
  const slide = pres.addSlide();
  slide.background = { color: C.bgDark };

  decoCircle(slide, 3, -2.5, 9, C.blue, 93);
  decoCircle(slide, 6, 2, 7, C.violet, 93);
  decoCircle(slide, -1, 4.5, 5, C.cyan, 94);
  decoCircle(slide, 10, 5, 4, C.indigo, 94);

  slide.addText("Thank You!", {
    x: 0,
    y: 2.3,
    w: 13.33,
    h: 1.6,
    fontSize: 52,
    fontFace: FONT,
    color: C.white,
    bold: true,
    align: "center",
  });

  slide.addText("Training session complete", {
    x: 0,
    y: 3.9,
    w: 13.33,
    h: 0.8,
    fontSize: 20,
    fontFace: FONT,
    color: C.text2,
    align: "center",
  });

  accentBar(slide, 5.67, 5, 2, 0.04, C.blue);

  slide.addText("Generated with AI · Training Content Generator", {
    x: 0,
    y: 6.5,
    w: 13.33,
    h: 0.5,
    fontSize: 11,
    fontFace: FONT,
    color: C.dim,
    align: "center",
  });
}

// ─── Main Export ─────────────────────────────────────────────

export async function exportToPPT(modules: TrainingModule[]): Promise<void> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "Training Content Generator";
  pres.title = "Training Materials";

  buildCover(pres, modules);
  buildAgenda(pres, modules);

  modules.forEach((mod, idx) => {
    const ac = accent(idx);
    const art = generateAbstractArt(mod.topic, ac.fill);

    buildModuleTitle(pres, mod, idx, modules.length, ac, art);
    buildObjectives(pres, mod, ac);

    mod.content.forEach((section, sIdx) => {
      buildContentSlides(pres, mod, section, sIdx, ac);
    });

    buildTakeaways(pres, mod, ac);

    if (mod.assessmentQuestions.length > 0) {
      buildQuizSlides(pres, mod, ac);
    }
  });

  buildClosing(pres);

  await pres.writeFile({ fileName: "Training-Materials.pptx" });
}
