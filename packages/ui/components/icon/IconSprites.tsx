import SVG from "react-inlinesvg";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const hostingCommitHash = process.env.NEXT_PUBLIC_HOSTING_GIT_COMMIT_SHA;
const commitHash = hostingCommitHash ? `-${hostingCommitHash.slice(0, 7)}` : "";

export function IconSprites() {
  return (
    <SVG
      src={`${process.env.NEXT_PUBLIC_WEBAPP_URL}/icons/sprite.svg?v=${process.env.NEXT_PUBLIC_SCHEDULING_VERSION}-${commitHash}`}
    />
  );
}

export default IconSprites;
