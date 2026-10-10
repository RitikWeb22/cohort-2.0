/**
 * Client-side image optimization utility
 * 
 * - Automatically resizes raster images (PNG, JPG, WebP) to fit max dimensions while preserving aspect ratio.
 * - Compresses output to lightweight DataURL (<150KB typically), preventing server payload limits and database bloat.
 * - Handles SVGs safely without rasterization.
 */
export function optimizeImageFile(file, options = {}) {
  const {
    maxWidth = 600,
    maxHeight = 600,
    quality = 0.85,
    maxFileSizeMb = 10,
    outputType = 'auto', // 'auto', 'image/png', 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided.'));
    }

    if (file.size > maxFileSizeMb * 1024 * 1024) {
      return reject(new Error(`File size must be under ${maxFileSizeMb} MB.`));
    }

    const isSvg = file.type === 'image/svg+xml' || file.name?.toLowerCase().endsWith('.svg');
    if (isSvg) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read SVG file.'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result);
        }

        ctx.drawImage(img, 0, 0, width, height);

        let mimeType = 'image/png';
        if (outputType === 'image/jpeg') {
          mimeType = 'image/jpeg';
        } else if (outputType === 'auto') {
          mimeType = file.type === 'image/png' || file.type === 'image/webp' ? 'image/png' : 'image/jpeg';
        }

        try {
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        } catch {
          resolve(reader.result);
        }
      };
      img.onerror = () => reject(new Error('Invalid image file format.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
