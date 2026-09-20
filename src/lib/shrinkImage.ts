export const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.8;

export function targetSize(width: number, height: number): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_EDGE) return { width, height };
  const scale = MAX_EDGE / longEdge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function encodeJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not process the photo"));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export async function shrinkImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = targetSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not process the photo");
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return encodeJpeg(canvas);
}
