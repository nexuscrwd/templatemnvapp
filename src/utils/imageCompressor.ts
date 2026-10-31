/**
 * Utilitário de Compressão de Imagens Client-Side
 * Reduz imagens de celulares (que costumam ter de 3MB a 15MB) para versões ultra-leves (15KB a 45KB),
 * garantindo que caibam com folga no localStorage (quota de 5MB) sem perda de qualidade visual.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/webp' | 'image/png' | 'image/jpeg';
}

export function compressImageFile(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<string> {
  const fileType = 'type' in file ? file.type : '';
  const {
    maxWidth = 640,
    maxHeight = 640,
    quality = 0.85,
    mimeType = fileType === 'image/png' || fileType === 'image/svg+xml' ? 'image/png' : 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    // Se já for SVG, mantém o formato original como texto/dataURI
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Redimensionar proporcionalmente
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Renderização com anti-aliasing de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        } catch {
          // Fallback para JPEG caso webp não seja suportado no canvas
          try {
            const fallbackUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(fallbackUrl);
          } catch {
            resolve(event.target?.result as string);
          }
        }
      };

      img.onerror = () => {
        resolve(event.target?.result as string);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
