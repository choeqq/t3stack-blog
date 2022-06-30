import {
  createUserOutputSchema,
  createUserSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from "../../schema/user.schema";
import { createRouter } from "../createRouter";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import * as trpc from "@trpc/server";
import { sendLoginEmail } from "../../utils/mailer";
import { baseUrl } from "../../constants";
import { decode, encode } from "../../utils/base64";
import { signJwft } from "../../utils/jwt";
import { serialize } from "cookie";

export const userRouter = createRouter()
  .mutation("register-user", {
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
  })
  .mutation("request-otp", {
    input: requestOtpSchema,
    async resolve({ input, ctx }) {
      const { email, redirect } = input;

      const user = await ctx.prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        throw new trpc.TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const token = await ctx.prisma.loginToken.create({
        data: {
          redirect,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      await sendLoginEmail({
        token: encode(`${token.id}:${user.email}`),
        url: baseUrl,
        email: user.email,
      });

      // send email to user

      return true;
    },
  })
  .query("verfiy-otp", {
    input: verifyOtpSchema,
    async resolve({ input, ctx }) {
      const decoded = decode(input.hash).split(":");

      const [id, email] = decoded;

      const token = await ctx.prisma.loginToken.findFirst({
        where: {
          id,
          user: {
            email,
          },
        },
        include: {
          user: true,
        },
      });

      if (!token) {
        throw new trpc.TRPCError({
          code: "FORBIDDEN",
          message: "Invalid token",
        });
      }

      const jwt = signJwft({
        email: token.user.email,
        id: token.user.id,
      });

      ctx.res.setHeader("set-cookie", serialize("token", jwt, { path: "/" }));

      return {
        redirect: token.redirect,
      };
    },
  })
  .query("me", {
    resolve({ ctx }) {
      return ctx.user;
    },
  });
