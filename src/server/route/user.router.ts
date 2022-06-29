import {
  createUserOutputSchema,
  createUserSchema,
} from "../../schema/user.schema";
import { createRouter } from "../createRouter";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import * as trpc from "@trpc/server";

export const userRouter = createRouter().mutation("register-user", {
  input: createUserSchema,
  async resolve({ ctx, input }) {
    const { email, name } = input;

    try {
      const user = ctx.prisma.user.create({
        data: {
          email,
          name,
        },
      });

      return user;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P202") {
          throw new trpc.TRPCError({
            code: "CONFLICT",
            message: "User already exists",
          });
        }
      }

      throw new trpc.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Somethint went wrong",
      });
    }
  },
});
