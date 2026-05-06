import { csvEscape } from "./format";

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadElementPng(elementId, filename) {
  const element = document.getElementById(elementId);
  const svg = element?.querySelector("svg");
  if (!svg) return false;

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const image = new Image();
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(svg.clientWidth * 2, 1200);
    canvas.height = Math.max(svg.clientHeight * 2, 700);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#080A1E";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = pngUrl;
    anchor.download = filename;
    anchor.click();
  };
  image.src = url;
  return true;
}

