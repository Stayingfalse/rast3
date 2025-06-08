import { createChildLogger } from "./logger";
import { clientLogger, type ClientErrorData } from "./client-logger";

// Create a unified logger interface that works for both client and server
const isClient = typeof window !== "undefined";
const serverLogger = isClient ? null : createChildLogger('image-utils');

const logger = {
  error: (error: Error | string, context?: string, data?: ClientErrorData) => {
    if (isClient) {
      // Client-side logging
      clientLogger.error(
        error instanceof Error ? error : new Error(error),
        context ?? "Image utils error",
        data
      );
    } else if (serverLogger) {
      // Server-side logging with Pino signature
      const errorMessage = error instanceof Error ? error.message : error;
      serverLogger.error({ ...data, error: errorMessage }, context ?? "Image utils error");
    }
  }
};

/**
 * Converts an e2 bucket URL to a proxy URL that can be accessed through our API
 * @param originalUrl - The original e2 bucket URL
 * @returns Proxy URL that routes through our API
 */
export function getProxyImageUrl(originalUrl: string): string {
  try {
    const url = new URL(originalUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Remove bucket name from path if present (first segment after domain)
    const imagePath = pathParts.slice(1).join("/");    return `/api/images/${imagePath}`;
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      "Failed to parse image URL",
      { originalUrl }
    );
    return originalUrl; // Fallback to original if parsing fails
  }
}

/**
 * Handles image loading errors by hiding the image element
 * @param event - The error event from the img element
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement>,
) {
  const target = event.currentTarget;
  logger.error(
    new Error("Failed to load image"),
    "Image loading error",
    { src: target.src, alt: target.alt || undefined }
  );
  target.style.display = "none";
}
