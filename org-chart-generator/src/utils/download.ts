import { toPng, toSvg } from "html-to-image";

export async function downloadAsPng(
  element: HTMLElement,
  filename = "org-chart.png",
) {
  const dataUrl = await toPng(element, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    style: {
      padding: "40px",
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
      padding: "40px",
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
