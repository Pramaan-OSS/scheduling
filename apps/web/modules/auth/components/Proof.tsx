export default function ChallengeNotice(_props: Record<string, unknown>) {
  return process.env.NEXT_PUBLIC_BOT_CHECK_ENABLED === "1" ? <p>Challenge verification is not available yet.</p> : null;
}
