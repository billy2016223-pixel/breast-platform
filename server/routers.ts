import { z } from "zod";
import { router, procedure, adminProcedure } from "./trpc.js";
import { analyzeBreastImage } from "./gemini.js";
import { saveImage, insertAnalysis, listAnalyses, listBatches } from "./db.js";

export const appRouter = router({
  imageAnalysis: router({
    analyze: procedure
      .input(
        z.object({
          fileBase64: z.string(),
          mimeType: z.string(),
          fileName: z.string().max(255).default("未命名"),
          batchId: z.string().max(64),
        })
      )
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { id, imageFile } = saveImage(buffer, input.mimeType);
        const base = {
          id,
          batchId: input.batchId,
          fileName: input.fileName,
          mimeType: input.mimeType,
          imageFile,
        };
        try {
          const result = await analyzeBreastImage({
            data: buffer,
            mimeType: input.mimeType,
          });
          insertAnalysis({ ...base, status: result.parseFailed ? "parse_failed" : "ok", result });
          return { id, ...result };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          insertAnalysis({ ...base, status: "error", error: message });
          throw err;
        }
      }),
  }),

  admin: router({
    login: procedure
      .input(z.object({ password: z.string() }))
      .mutation(({ input }) => {
        if (!process.env.ADMIN_PASSWORD || input.password !== process.env.ADMIN_PASSWORD) {
          return { ok: false };
        }
        return { ok: true };
      }),

    list: adminProcedure
      .input(
        z.object({
          batchId: z.string().optional(),
          grade: z.enum(["A", "B", "C", "D"]).optional(),
          status: z.enum(["ok", "parse_failed", "error"]).optional(),
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(({ input }) => listAnalyses(input)),

    batches: adminProcedure.query(() => listBatches()),
  }),

  calculator: router({
    calculate: procedure
      .input(
        z.object({
          positioningAccuracy: z.number().min(0).max(100),
          repeatRate: z.number().min(0).max(100),
        })
      )
      .query(({ input }) => {
        const { positioningAccuracy, repeatRate } = input;
        let grade: "A" | "B" | "C" | "D";
        let techniqueFeePercentage: number;

        if (positioningAccuracy > 95 && repeatRate < 2) {
          grade = "A";
          techniqueFeePercentage = 15;
        } else if (positioningAccuracy >= 85 && repeatRate <= 3) {
          grade = "B";
          techniqueFeePercentage = 10;
        } else if (positioningAccuracy >= 80 && repeatRate <= 5) {
          grade = "C";
          techniqueFeePercentage = 0;
        } else {
          grade = "D";
          techniqueFeePercentage = 0;
        }

        const baseAmount = 1245;
        const techniqueFeeAmount = Math.round(baseAmount * (techniqueFeePercentage / 100));

        return { grade, techniqueFeePercentage, baseAmount, techniqueFeeAmount };
      }),
  }),
});

export type AppRouter = typeof appRouter;
