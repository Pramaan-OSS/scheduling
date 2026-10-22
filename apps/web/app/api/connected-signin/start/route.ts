import { signInConfiguration, startConnectedSignIn } from "@scheduling/features/auth/lib/connected-signin";
import { WEBAPP_URL } from "@scheduling/lib/constants";

export async function GET(request: Request) {
  try {
    const target = await startConnectedSignIn(
      signInConfiguration(WEBAPP_URL),
      new URL(request.url).searchParams
    );
    return Response.redirect(target);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Sign-in is not available yet.", {
      status: 422,
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  }
}
