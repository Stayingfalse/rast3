import {
    DeleteObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { createChildLogger } from "~/utils/logger";

const logger = createChildLogger('server');

const E2_BUCKET = process.env.E2_BUCKET!;
const E2_ACCESS_KEY = process.env.E2_ACCESS_KEY!;
const E2_SECRET_KEY = process.env.E2_SECRET_KEY!;
const E2_ENDPOINT = process.env.E2_ENDPOINT!; // e.g. https://xxxx.idrivee2-xx.com

export const e2Client = new S3Client({
  region: "us-east-1", // E2 is S3-compatible, region is arbitrary
  endpoint: E2_ENDPOINT,
  credentials: {
    accessKeyId: E2_ACCESS_KEY,
    secretAccessKey: E2_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function uploadToE2(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  const key = `kudos/${uuidv4()}`;
  await e2Client.send(
    new PutObjectCommand({
      Bucket: E2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: "public-read",
    }),
  );
  return `${E2_ENDPOINT.replace(/\/$/, "")}/${E2_BUCKET}/${key}`;
}

export async function deleteFromE2(url: string): Promise<void> {
  try {    // Extract the key from the URL
    const key = url.split(`/${E2_BUCKET}/`)[1];
    if (!key) {
      logger.warn({ 
        url, 
        bucket: E2_BUCKET,
        expectedFormat: `https://[endpoint]/${E2_BUCKET}/[file-key]`,
        urlLength: url.length,
        actionNeeded: 'Check URL format for E2 bucket extraction'
      }, `Could not extract file key from E2 URL. Expected format: https://[endpoint]/${E2_BUCKET}/[file-key], got: ${url}`);
      return;
    }

    await e2Client.send(
      new DeleteObjectCommand({
        Bucket: E2_BUCKET,
        Key: key,
      }),    );
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      url,
      bucket: E2_BUCKET,
      key: url.split(`/${E2_BUCKET}/`)[1] ?? 'unknown',
      operation: 'delete_file_from_e2',
      actionSuggested: 'Check E2 credentials and bucket permissions'
    }, `Error deleting file from E2 bucket '${E2_BUCKET}': ${error instanceof Error ? error.message : String(error)}`);
    // Don't throw - we don't want to fail the entire operation if file cleanup fails
  }
}
