// Image encoding utilities for email templates
import { readFileSync } from 'fs';
import { join } from 'path';

interface EncodedImages {
  headerSvg: string;
  plaidPng: string;
}

function encodeImageToBase64(filePath: string, mimeType: string): string {
  try {
    const imageBuffer = readFileSync(filePath);
    const base64String = imageBuffer.toString('base64');
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    console.error(`Error encoding image ${filePath}:`, error);
    return '';
  }
}

function getEncodedImages(): EncodedImages {
  const publicDir = join(process.cwd(), 'public');
  
  return {
    headerSvg: encodeImageToBase64(join(publicDir, 'header.svg'), 'image/svg+xml'),
    plaidPng: encodeImageToBase64(join(publicDir, 'plaid.png'), 'image/png'),
  };
}

export { getEncodedImages, type EncodedImages };

