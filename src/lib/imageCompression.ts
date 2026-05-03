import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

const defaultOptions: CompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export async function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  // If it's not an image, return original file
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // PNGs can sometimes get larger when compressed if they have transparency or specific patterns,
  // but generally, we want to optimize them.
  // We'll use the provided options or defaults.
  const finalOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    const compressedFile = await imageCompression(file, finalOptions);
    console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails as a fallback
    return file;
  }
}
