import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "~/server/db";
import sharp from "sharp";
import { uploadToE2 } from "~/server/utils/e2-upload";

export const kudosRouter = createTRPCRouter({
  createKudos: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(500),
        purchaseId: z.string().optional(),
        images: z.array(z.string()).max(5), // base64 strings
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Optimize and upload images to iDrive E2
      const imageUrls: string[] = [];
      for (const img of input.images) {
        const buffer = Buffer.from(img, "base64");
        const optimized = await sharp(buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        const url = await uploadToE2(optimized, "image/jpeg");
        imageUrls.push(url);
      }
      // Save Kudos post
      const kudos = await db.kudos.create({
        data: {
          userId: ctx.session.user.id,
          purchaseId: input.purchaseId,
          message: input.message,
          images: JSON.stringify(imageUrls),
        },
      });
      return kudos;
    }),
});
