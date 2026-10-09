import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  external: ["react", "react-dom", "motion"],
  injectStyle: false,
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
  },
  onSuccess: async () => {
    // Copy CSS tokens/bundle to dist/index.css
    const fs = await import("fs");
    const path = await import("path");
    const stylesDir = path.resolve(__dirname, "src/styles");
    const files = ["tokens.css", "navbar.css", "overlay.css", "themes.css"];
    let bundledCss = "/* VantaNav Overlay Navigation UI Styles */\n";
    for (const file of files) {
      const filePath = path.join(stylesDir, file);
      if (fs.existsSync(filePath)) {
        bundledCss += `\n/* --- ${file} --- */\n` + fs.readFileSync(filePath, "utf-8");
      }
    }
    const distDir = path.resolve(__dirname, "dist");
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.writeFileSync(path.join(distDir, "index.css"), bundledCss, "utf-8");
    console.log("Successfully bundled styles to dist/index.css");
  },
});
