import { toPng, toSvg } from "html-to-image";

const EXPORT_PADDING = 40;
const TARGET_PNG_PIXEL_RATIO = 2;
const MAX_CANVAS_DIMENSION = 16384;
const MAX_CANVAS_PIXELS = 268_435_456;

function getElementSize(element: HTMLElement) {
  const { width: rectWidth, height: rectHeight } = element.getBoundingClientRect();
  const width = Math.max(
    1,
    element.scrollWidth,
    element.clientWidth,
    Math.ceil(rectWidth),
  );
  const height = Math.max(
    1,
    element.scrollHeight,
    element.clientHeight,
    Math.ceil(rectHeight),
  );

  return { width, height };
}

function getSafePixelRatio(element: HTMLElement) {
  const { width, height } = getElementSize(element);
  const exportWidth = width + EXPORT_PADDING * 2;
  const exportHeight = height + EXPORT_PADDING * 2;

  // Keep large charts within browser canvas limits without shrinking them more than needed.
  const maxRatioByDimension = Math.min(
    MAX_CANVAS_DIMENSION / exportWidth,
    MAX_CANVAS_DIMENSION / exportHeight,
  );
  const maxRatioByPixels = Math.sqrt(
    MAX_CANVAS_PIXELS / (exportWidth * exportHeight),
  );

  return Math.max(
    0.5,
    Math.min(TARGET_PNG_PIXEL_RATIO, maxRatioByDimension, maxRatioByPixels),
  );
}

export async function downloadAsPng(
  element: HTMLElement,
  filename = "org-chart.png",
) {
  const pixelRatio = getSafePixelRatio(element);
  const dataUrl = await toPng(element, {
    backgroundColor: "#ffffff",
    pixelRatio,
    skipAutoScale: true,
    style: {
      padding: `${EXPORT_PADDING}px`,
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function downloadAsSvg(
  element: HTMLElement,
  filename = "org-chart.svg",
) {
  const dataUrl = await toSvg(element, {
    backgroundColor: "#ffffff",
    style: {
      padding: `${EXPORT_PADDING}px`,
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
