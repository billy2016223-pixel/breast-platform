import { initTRPC, TRPCError } from "@trpc/server";
import type { Request } from "express";
import superjson from "superjson";

export interface Context {
  adminToken: string | undefined;
}

export function createContext({ req }: { req: Request }): Context {
  const header = req.headers["x-admin-token"];
  return { adminToken: typeof header === "string" ? header : undefined };
}

export function isAdminToken(token: string | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return !!expected && token === expected;
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const procedure = t.procedure;
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!process.env.ADMIN_PASSWORD) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "ADMIN_PASSWORD 未設定" });
  }
  if (!isAdminToken(ctx.adminToken)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "後台密碼錯誤" });
  }
  return next();
});
