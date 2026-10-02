/**
 * Helpers for image files picked by the user, e.g. a photo for the AI search.
 */

// Longer side of the resized photo in px. Enough for Claude to recognize the item.
const MAX_SIZE = 1024;
const JPEG_QUALITY = 0.85;

/**
 * Resize an image file in the browser and turn it into a base64 JPEG.
 * Photos from phone cameras are several MB, after resizing they are ~100-200 KB.
 *
 * @param {File} file image file from <input type="file">
 * @param {number} maxSize max width and height in px
 * @returns {Promise<{ mediaType: string, data: string, previewUrl: string }>}
 *   data is the base64 JPEG without the "data:image/jpeg;base64," prefix,
 *   previewUrl is the whole data URL for an <img> preview
 */
export const resizeImageFile = (file, maxSize = MAX_SIZE) =>
  new Promise((resolve, reject) => {
    const fileUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Scale down so that the longer side is at most maxSize px (small images stay as they are)
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const context = canvas.getContext('2d');
      // White background, so transparent PNGs don't turn black in JPEG
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(fileUrl);

      const previewUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      resolve({ mediaType: 'image/jpeg', data: previewUrl.split(',')[1], previewUrl });
    };

    // E.g. not an image, or a format the browser can't open (HEIC in some browsers)
    img.onerror = () => {
      URL.revokeObjectURL(fileUrl);
      reject(new Error('The image could not be read'));
    };

    img.src = fileUrl;
  });
