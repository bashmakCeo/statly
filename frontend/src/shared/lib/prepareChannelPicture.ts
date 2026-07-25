const MAX_DIMENSION = 1920;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const JPEG_QUALITIES = [0.92, 0.85, 0.75, 0.65];

export async function prepareChannelPictureFile(file: File): Promise<File> {
  const image = await loadImageFromFile(file);
  const { width, height } = fitInside(image.width, image.height, MAX_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Canvas is unavailable");
  }

  context.drawImage(image, 0, 0, width, height);

  for (const quality of JPEG_QUALITIES) {
    const blob = await canvasToJpegBlob(canvas, quality);

    if (blob.size <= MAX_OUTPUT_BYTES) {
      return new File([blob], "channel-picture.jpg", { type: "image/jpeg" });
    }
  }

  throw new Error("Channel picture is too large");
}

function fitInside(width: number, height: number, maxDimension: number) {
  const maxSide = Math.max(width, height);

  if (maxSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / maxSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");

      if (context === null) {
        throw new Error("Canvas is unavailable");
      }

      context.drawImage(bitmap, 0, 0);
      bitmap.close();

      return await loadImageFromUrl(canvas.toDataURL("image/jpeg", 0.92));
    } catch {
      // Fallback for formats that createImageBitmap cannot decode.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await loadImageFromUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error("Failed to encode image"));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}
