module.exports = {
  basePath: "",
  assetPrefix: "",
  trailingSlash: true, // Ensures paths end with a trailing slash for GitHub Pages compatibility
  output: "export", // Enables static export
  images: {
    unoptimized: true, // Required for static export (no Image Optimization)
  },
};
