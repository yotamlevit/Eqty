import type { NextConfig } from "next";

// Deployed to GitHub Pages as a project site at https://yotamlevit.github.io/Eqty/,
// so the app is served under the `/Eqty` sub-path. The prefix is only applied in
// CI (GITHUB_ACTIONS is set by the runner) so local `next dev`/`next build` stay
// at the root. `output: "export"` emits a fully static `out/` for Pages, and
// `images.unoptimized` is required because the default image optimizer needs a server.
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repoBasePath = isGithubActions ? "/Eqty" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: repoBasePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
