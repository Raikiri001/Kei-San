# Kei-San

![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white) ![Zustand](https://img.shields.io/badge/Zustand-433E38?style=flat-square) ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white) ![Motion](https://img.shields.io/badge/Motion-0055FF?style=flat-square&logo=framer&logoColor=white) ![Status](https://img.shields.io/badge/Status-In%20Progress-green?style=flat-square) [![Deployed on GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-222222?style=flat-square&logo=github&logoColor=white)](https://raikiri001.github.io/Kei-San/)

## Description

Kei-San is a browser-based image editor built for making custom wallpapers and collages without the overhead of a full design suite. It's aimed at anyone who wants to drag a few photos onto a canvas, add some text, and apply a striking effect without wading through a steep learning curve. Under the hood it still packs real layering, masking, and colour-grading power via a hand-written WebGL2 effects pipeline, so the results hold up despite the simple workflow. Everything runs client-side in the browser, with designs saved locally, so no account or server is required.

## Features

- Freeform canvas with configurable background colour/opacity, adjustable grid, rulers, and a snap-lattice overlay
- Drag, resize, and rotate images and text with multi-select, smart alignment guides, and snap-to-grid
- One-click auto-layout to tile images into an even grid/collage
- Undo/redo, copy/cut/paste/duplicate, layer reordering, and full keyboard shortcuts
- Image upload via drag-and-drop or file picker, with crop (zoom/pan), opacity, and lock controls
- Automatic colour-suggestion and edge-colour extraction from uploaded images
- Rich text boxes with wrapping, font controls, horizontal/vertical orientation, glyph warp, and colour glow
- 70+ real-time WebGL2 shader effects across blur/glow, distort, glitch, print/halftone, texture/grain, film, colour grading, and more
- Stackable per-image effect layers with blend modes, region masks (circle, gradient, quad-corner, mesh-warp), and layer groups
- 17 built-in presets that apply a ready-made stack of layers in one click
- Native eyedropper, colour-swatch, and colour-wheel pickers with image-derived suggestions
- Radial context menu and an adaptive "liquid dock" toolbar
- Light and dark themes
- Local save/load of designs with thumbnails, plus PNG export

## Technologies Used

- TypeScript
- React 19
- Vite
- Tailwind CSS v4
- Zustand (state management)
- Radix UI (primitives)
- Motion (animation)
- WebGL2 (hand-written shaders for the effects pipeline)
- Oxlint (linting)

## Installation

1. Clone the repository
   ```
   git clone https://github.com/Raikiri001/Kei-San.git
   ```
2. Move into the project directory
   ```
   cd Kei-San
   ```
3. Install dependencies
   ```
   npm install
   ```

## Usage

1. Start the development server
   ```
   npm run dev
   ```
2. Open the local URL printed in the terminal in your browser
3. Upload one or more images (drag-and-drop or the file picker)
4. Arrange images and text on the canvas, then apply and layer effects from the Effects drawer
5. Export the finished design as a PNG, or save it locally to continue later

Other useful scripts:
```
npm run build     # type-check and build for production
npm run preview   # preview the production build locally
npm run lint      # run Oxlint
```

## File Structure

```
Kei-San/
├── src/
│   ├── canvas/            # WebGL2 rendering, shader effects, export engine
│   │   └── gl/             # Low-level GL helpers (shaders, buffers, passes)
│   ├── components/         # UI components (canvas workspace, effects drawer, dock, dialogs)
│   ├── constants/           # Default values and font definitions
│   ├── hooks/               # Reusable React hooks (drag, resize, rotate, uploads, etc.)
│   ├── presets/              # Built-in effect presets
│   ├── store/                 # Zustand stores (project, UI, assets, swatches)
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                   # Helper utilities (layout, grid, sizing, etc.)
│   ├── App.tsx                   # Root application component
│   └── main.tsx                    # Application entry point
├── public/                # Static assets served as-is
├── index.html            # HTML entry point
├── vite.config.ts        # Vite configuration
└── package.json          # Project metadata and scripts
```

## Known Issues / Limitations

- Designs are saved to local browser storage only; there is no account system or cloud sync, so clearing browser data removes saved designs
- Requires a browser with WebGL2 support for the effects pipeline to render
- Large canvases or a large number of stacked effect layers can be demanding on GPU performance

## Future Improvements

N/A

## Author(s)

- [Raikiri001](https://github.com/Raikiri001)
