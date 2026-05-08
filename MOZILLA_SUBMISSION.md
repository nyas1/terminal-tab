# Mozilla Add-ons Submission Notes

## For Reviewer: Build Instructions

### Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

Install from: https://nodejs.org/

### Build Steps

#### Option 1: Automated Build Script
```bash
# On Windows (PowerShell):
.\build.ps1

# On macOS/Linux:
chmod +x build.sh
./build.sh
```

#### Option 2: Manual Build
```bash
npm install
npm run package:extension
```

### Output
The Firefox extension package will be created as: `terminal-tab-2.0.2.xpi`

### Verification
The build process:
1. Runs TypeScript type-checking to ensure code correctness
2. Bundles the application with Vite (including all source files)
3. Syncs the built files to the Firefox add-on structure
4. Packages the add-on into a `.xpi` file

## Code Overview

### Source Structure
- **TypeScript/React source files** (root level + `components/`, `contexts/`, `hooks/`, `utils/`)
- **Firefox manifest** (`firefox_addon/manifest.firefox.json`)
- **Extension entry point** (`firefox_addon/newtab.html`)
- **Build configuration** (Vite, TypeScript, Tailwind)

### Tools Used
This extension uses standard web development tools:
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast bundler that combines multiple source files
- **React**: UI framework
- **TailwindCSS**: CSS framework

All source files remain human-readable and unchanged in the repository. The build process transpiles and bundles them into the final `.xpi` package.

### No Minification
The built code is not minified—reviewers can read the bundled output to verify it matches the source files.

## Key Files

- `BUILD.md` — Detailed build documentation
- `build.ps1` — Windows PowerShell build script
- `build.sh` — Unix/macOS build script
- `package.json` — npm dependencies and scripts
- `vite.config.js` — Bundler configuration
- `tsconfig.json` — TypeScript configuration

## Repository
Full source code available at: https://github.com/nyas1/terminal-tab

---

**Extension Version**: 2.0.2  
**Build Date**: May 9, 2026  
**Build Determinism**: Yes (identical builds from same source guaranteed)
