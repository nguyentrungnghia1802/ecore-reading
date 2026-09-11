export interface PngExportOptions {
  scale?: number;
  background?: 'transparent' | 'light' | 'dark';
}

export function parseSvgViewBox(svgString: string): { width: number; height: number } {
  const viewBoxMatch = /viewBox="([^"]+)"/.exec(svgString);
  if (viewBoxMatch?.[1]) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] !== undefined && parts[3] !== undefined && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const widthMatch = /width="([^"]+)"/.exec(svgString);
  const heightMatch = /height="([^"]+)"/.exec(svgString);
  if (widthMatch?.[1] && heightMatch?.[1]) {
    const w = parseFloat(widthMatch[1]);
    const h = parseFloat(heightMatch[1]);
    if (w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }

  return { width: 800, height: 600 };
}

export function calculatePngDimensions(
  viewBoxWidth: number,
  viewBoxHeight: number,
  scale: number = 2,
): { width: number; height: number } {
  const safeScale = Math.max(1, Math.min(scale, 4));
  return {
    width: Math.round(viewBoxWidth * safeScale),
    height: Math.round(viewBoxHeight * safeScale),
  };
}

export async function rasterizeSvgToPng(
  svgString: string,
  options: PngExportOptions = {},
): Promise<Blob> {
  const scale = options.scale ?? 2;
  const { width, height } = parseSvgViewBox(svgString);
  const dimensions = calculatePngDimensions(width, height, scale);

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PNG rasterization requires a browser environment.');
  }

  return new Promise<Blob>((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to create canvas 2d context for PNG rasterization.'));
          return;
        }

        // Fill background if specified
        if (options.background === 'light') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (options.background === 'dark') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob failed.'));
          }
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG into Image element for rasterization.'));
    };

    img.src = url;
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
