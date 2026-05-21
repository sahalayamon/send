export interface SharePayload {
  type: 'text' | 'image';
  data: string;
  filename?: string;
  timestamp: number;
}

/**
 * Compresses a text or image payload using native Gzip via CompressionStream
 * and returns a URL-safe Base64 encoded string.
 */
export async function compressPayload(type: 'text' | 'image', data: string, filename?: string): Promise<string> {
  const payload: SharePayload = {
    type,
    data,
    filename,
    timestamp: Date.now(),
  };
  
  const jsonStr = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonStr);

  // Compress bytes using Gzip CompressionStream
  const stream = new Blob([bytes]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  const response = new Response(compressedStream);
  const compressedBuffer = await response.arrayBuffer();

  // Convert compressed ArrayBuffer to standard base64 string
  const uint8Array = new Uint8Array(compressedBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  
  // Convert standard base64 to base64url (RFC 4648)
  // Replace + with -, / with _, and remove trailing padding =
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decompresses a URL-safe Base64 string back to the original SharePayload object
 * using native DecompressionStream.
 */
export async function decompressPayload(base64Url: string): Promise<SharePayload> {
  // Convert base64url back to standard base64
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }

  // Convert base64 string to Uint8Array
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // Decompress Gzip bytes using DecompressionStream
  const stream = new Blob([bytes]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(decompressedStream);
  const decompressedBuffer = await response.arrayBuffer();

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decompressedBuffer);
  
  return JSON.parse(jsonStr) as SharePayload;
}

interface ImageCompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

/**
 * Compresses an uploaded image on the client side using HTML5 Canvas.
 * Resizes the image to a maximum dimension while maintaining the aspect ratio,
 * and outputs a JPEG representation at the specified compression quality.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.72
): Promise<ImageCompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Apply scale factors keeping aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to acquire canvas 2D rendering context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas contents to JPEG base64 data url
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Calculate estimated compressed byte size
        const base64Content = dataUrl.split(',')[1];
        const compressedSize = Math.round((base64Content.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize,
          width,
          height,
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to parse uploaded image resource'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read uploaded image file stream'));
    };
  });
}

/**
 * Format bytes into human readable format (e.g. KB, MB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
