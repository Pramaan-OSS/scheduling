import dayjs from "@scheduling/dayjs";
import { validateAndGetCorrectedUsernameInTeam } from "@scheduling/features/auth/signup/utils/validateUsername";
import { HttpError } from "@scheduling/lib/http-error";
import { prisma } from "@scheduling/prisma";

export async function findTokenByToken({ token }: { token: string }) {
  const foundToken = await prisma.verificationToken.findUnique({
    where: {
      token,
    },
    select: {
      id: true,
      expires: true,
      teamId: true,
    },
  });

  if (!foundToken) {
    throw new HttpError({
      statusCode: 401,
      message: "Invalid Token",
    });
  }

  return foundToken;
}

export function throwIfTokenExpired(expires?: Date) {
  if (!expires) return;
  if (dayjs(expires).isBefore(dayjs())) {
    throw new HttpError({
      statusCode: 401,
      message: "Token expired",
    });
  }
}

export async function validateAndGetCorrectedUsernameForTeam({
  username,
  email,
  teamId,
  isSignup,
}: {
  username: string;
  email: string;
  teamId: number | null;
  isSignup: boolean;
}) {
  if (!teamId) return username;

  const teamUserValidation = await validateAndGetCorrectedUsernameInTeam(username, email, teamId, isSignup);
  if (!teamUserValidation.isValid) {
    throw new HttpError({
      statusCode: 409,
      message: "Username or email is already taken",
    });
  }
  if (!teamUserValidation.username) {
    throw new HttpError({
      statusCode: 422,
      message: "Invalid username",
    });
  }
  return teamUserValidation.username;
}
