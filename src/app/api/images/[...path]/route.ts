import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createChildLogger } from "~/utils/logger";

const logger = createChildLogger('storage');

const s3Client = new S3Client({
  endpoint: process.env.E2_ENDPOINT!,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.E2_ACCESS_KEY!,
    secretAccessKey: process.env.E2_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const imagePath = resolvedParams.path.join("/");

    const command = new GetObjectCommand({
      Bucket: process.env.E2_BUCKET!,
      Key: imagePath,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return new NextResponse("Image not found", { status: 404 });
    } // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      if (result.value) chunks.push(result.value as Uint8Array);
    }

    const buffer = Buffer.concat(chunks); // Set appropriate headers with extended caching (1 year)
    const headers = new Headers();
    headers.set("Content-Type", response.ContentType ?? "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable"); // Cache for 1 year
    headers.set("ETag", response.ETag ?? "");
    headers.set("Content-Length", buffer.length.toString());    return new NextResponse(buffer, { headers });
  } catch (error) {    logger.error({
      error: error instanceof Error ? error.message : String(error),
      imagePath: (await params).path.join("/"),
      bucket: process.env.E2_BUCKET
    }, "Error fetching image from e2 bucket");
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
