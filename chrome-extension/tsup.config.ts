import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export default defineConfig({
  entry: {
    "background/index": "src/background/index.ts",
    "content/index": "src/content/index.ts",
    "popup/popup": "src/popup/popup.ts",
  },
  format: ["iife"],
  outExtension: () => ({ js: ".js" }),
  splitting: false,
  clean: true,
  outDir: "dist",
  noExternal: [/.*/],
  onSuccess: async () => {
    const copies: [string, string][] = [
      ["manifest.json", "manifest.json"],
      ["src/popup/popup.html", "popup/popup.html"],
      ["src/popup/popup.css", "popup/popup.css"],
      ["src/content/styles.css", "content/styles.css"],
    ];

    for (const [src, dest] of copies) {
      const destDir = join("dist", dest, "..");
      if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
      if (existsSync(src)) copyFileSync(src, join("dist", dest));
    }

    // Copy icons
    const iconsDir = "dist/icons";
    if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
    if (existsSync("icons/logo.png")) copyFileSync("icons/logo.png", join(iconsDir, "logo.png"));
    for (const size of ["16", "32", "48", "128"]) {
      const src = "icons/icon-" + size + ".png";
      if (existsSync(src)) {
        copyFileSync(src, join(iconsDir, "icon-" + size + ".png"));
      } else if (existsSync("icons/logo.png")) {
        // Use logo as fallback for all sizes
        copyFileSync("icons/logo.png", join(iconsDir, "icon-" + size + ".png"));
      }
    }

    console.log("Static files copied to dist/");
  },
});
