import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.E2_ENDPOINT!,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.E2_ACCESS_KEY!,
    secretAccessKey: process.env.E2_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = params.path.join('/');
    
    const command = new GetObjectCommand({
      Bucket: process.env.E2_BUCKET!,
      Key: imagePath,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    const buffer = Buffer.concat(chunks);    // Set appropriate headers with extended caching (1 year)
    const headers = new Headers();
    headers.set('Content-Type', response.ContentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    headers.set('ETag', response.ETag || '');
    headers.set('Content-Length', buffer.length.toString());

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error('Error fetching image from e2 bucket:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
