import { z } from "zod";
import { router, procedure } from "./trpc.js";
import { analyzeBreastImage } from "./gemini.js";

export const appRouter = router({
  imageAnalysis: router({
    analyze: procedure
      .input(
        z.object({
          fileBase64: z.string(),
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const result = await analyzeBreastImage({
          data: buffer,
          mimeType: input.mimeType,
        });
        return result;
      }),
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
