# Terminal Tab - Build Instructions for Mozilla Add-ons

## Requirements

### System Requirements
- **Operating System**: Windows, macOS, or Linux
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (included with Node.js)

### Installation Instructions

1. **Install Node.js and npm**:
   - Download from https://nodejs.org/
   - Verify installation:
     ```bash
     node --version  # Should output v18.x.x or higher
     npm --version   # Should output 9.x.x or higher
     ```

## Build Steps

### Step 1: Clone or Extract Source Code
```bash
# If cloning from GitHub:
git clone https://github.com/nyas1/terminal-tab.git
cd terminal-tab

# Or extract from provided source archive and navigate to directory
cd terminal-tab
```

### Step 2: Install Dependencies
```bash
npm install
```
This installs all packages listed in `package.json` and `package-lock.json`.

### Step 3: Build the Firefox Extension
```bash
npm run package:extension
```

This command:
1. Runs TypeScript type-checking (`tsc`)
2. Builds the extension with Vite (`vite build --mode extension`)
3. Syncs built files to `firefox_addon/`
4. Packages the extension into a `.xpi` file

### Step 4: Locate the Built Package
The Firefox extension package will be created at:
```
./terminal-tab-2.0.2.xpi
```

## Output Files

- **`terminal-tab-2.0.2.xpi`** — The packaged Firefox extension (ready to submit)
- **`firefox_addon/`** — Extracted extension directory structure
- **`dist/`** — Built web assets (included in .xpi)

## Verification

To verify the build was successful:
```bash
# On Windows PowerShell:
Get-ChildItem -Filter "terminal-tab-*.xpi"

# On macOS/Linux:
ls -lh terminal-tab-*.xpi
```

The `.xpi` file should be approximately 1.3 MB in size.

## Source Code Structure

- **`src/` equivalent**: Root-level TypeScript/React files
  - `index.tsx` — Application entry point
  - `App.tsx` — Main component
  - `components/` — React components (including `settings/SettingsShortcutsTab.tsx`)
  - `contexts/` — State management (AppContext)
  - `hooks/` — Custom React hooks
  - `utils/` — Utility functions
  - `types.ts` — TypeScript type definitions

- **`firefox_addon/`** — Firefox extension manifest and assets
  - `manifest.firefox.json` — Firefox-specific manifest (manifest v2)
  - `manifest.chrome.json` — Chrome-compatible manifest (manifest v3)
  - `newtab.html` — New Tab page entry point
  - `service-worker.js` — Service worker for background tasks

- **`scripts/`** — Build automation scripts
  - `render-extension-icons.mjs` — Icon generation
  - `set-extension-manifest.mjs` — Manifest switching (Firefox/Chrome)
  - `sync-firefox-addon-from-dist.mjs` — Sync dist to firefox_addon
  - `run-package-addon.mjs` — Package into .xpi

- **Configuration files**:
  - `vite.config.js` — Vite bundler configuration
  - `tsconfig.json` — TypeScript configuration
  - `tailwind.config.js` — Tailwind CSS configuration
  - `postcss.config.js` — PostCSS configuration

## Build Tools Used

This project uses the following tools to process and bundle code:

1. **TypeScript** — Transpiles TypeScript to JavaScript
2. **Vite** — Modern bundler combining multiple files into optimized bundles
3. **React** — UI framework (JSX template engine)
4. **TailwindCSS** — CSS framework with PostCSS processor
5. **PostCSS** — CSS transformation tool

All source files (aside from `node_modules/` which contains open-source third-party libraries) remain untranspiled in this repository until the build process.

## Reproducibility

The build is fully reproducible:
1. Same source files → same TypeScript version → same JavaScript
2. `package-lock.json` locks all dependency versions
3. Vite produces deterministic output for the same input

Running `npm run package:extension` twice with the same source will produce functionally identical `.xpi` files.

## Troubleshooting

### "tsc not found"
```bash
npm install  # Reinstall dependencies
```

### "Vite not found"
```bash
npm install  # Reinstall dependencies
```

### Build takes too long
This is normal on first build. Subsequent builds are faster with Vite's caching.

## Support

- GitHub: https://github.com/nyas1/terminal-tab
- Issues: https://github.com/nyas1/terminal-tab/issues
