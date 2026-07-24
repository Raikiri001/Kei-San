# kei-san

A browser-based, GPU-accelerated image editor and collage/wallpaper design tool. Drop in photos, arrange them on a canvas alongside styled text, stack up dozens of real-time WebGL effects, and export the result — all client-side, no account or upload to a server required.

## What you can do with it

### Canvas & layout
- Freeform canvas with a configurable background color/opacity (supports transparent PNG export) and adjustable grid (rows/cols).
- Drag, resize, and rotate images and text with corner/edge handles; multi-select and move/resize/rotate together.
- Illustrator/InDesign-style smart alignment guides, snap-to-grid, and shift-axis-locked dragging.
- Rulers and a snap-lattice overlay for precise placement.
- One-click **auto-layout**: tiles any number of images into an even grid/collage sized to the canvas.
- Undo/redo, copy/cut/paste/duplicate, layer reordering (bring to front/forward/backward/send to back), and full keyboard shortcuts.

### Images
- Upload via drag-and-drop or file picker.
- Crop with zoom + pan (double-click into crop mode).
- Per-image opacity, lock (to prevent accidental edits), and resize/reset-size controls.
- Automatic color-suggestion and edge-color extraction on upload, used to power the color tools below.

### Text
- Rich text boxes with wrapping, font family, size, bold/italic/underline, and left/center/right/justify alignment.
- Horizontal or vertical (Japanese-style) orientation.
- Glyph warp (stretch), color with independent alpha, and an optional colored outer glow.

### Effects (65+ real-time WebGL2 shaders)
A large gallery of GPU-rendered image effects, grouped roughly by category:
- **Color grading** — curves, levels, exposure, contrast, white balance, hue/saturation, hue curves, color balance, color grading, color matrix, gradient map, duotone, monochrome, black & white, threshold.
- **Blur & optics** — Gaussian, motion, radial, zoom, circular, and blur/sharpen, plus depth of field, bloom, star glow, and halation.
- **Distortion & warp** — swirl, pinch, ripple, perspective, polar coordinates, elastic grid, cubify, displacement, reeded glass.
- **Retro & print** — halftone, dither, xerox, risograph, thermal, paper scan, ink bleed, wet/thin paper, grunge, vintage print/film, classic film, film grain, emboss.
- **Glitch & broadcast** — RGB shift/gain, glitch, VHS, NTSC, CRT screen, LED screen, modulation, frame drop, motion trails, camera shake, noise, stripe, teleshopping, mixed media.
- **Special** — ASCII-art overlay and a "blob tracker" scan-line overlay (Canvas2D post-processes rather than GPU shaders).
- Every effect ships with a live preview thumbnail before you apply it.

### Layers
- Stack any number of effects on a single image, each independently toggleable, reorderable, and deletable.
- Per-layer **blend modes** (normal, lighten, darken, multiply, screen, overlay, add, subtract, difference, exclusion).
- Per-layer **masks** with region editors — circle, gradient, quad-corner, and mesh-warp — to apply an effect only to part of an image.
- Group layers together, or combine two effect branches with **Layer Mix**.
- **17 built-in presets** (e.g. Halftone Press, Chroma Split, Grunge, Vintage Print, Riso Zine, Old Film Reel, Thermal Scan, Tilt-Shift Miniature) that instantiate a ready-made stack of layers in one click.

### Color tools
- Native browser **eyedropper** to sample any color on screen, not just inside the canvas.
- Color-swatch and color-wheel pickers, with suggestions drawn from the uploaded image's own palette.

### Interaction
- A radial, Illustrator-style context menu for quick access to the relevant tools for whatever's selected (image, text, or a mixed multi-selection).
- An adaptive "liquid dock" toolbar that recedes to a small pill when idle and expands on hover/focus.
- Light and dark themes.

### Saving & export
- Save designs locally (with an auto-generated thumbnail) and reload, browse, or delete them from a designs drawer — all persisted in the browser, no server needed.
- Export/download the finished canvas as a PNG.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev/build tooling, with [Oxlint](https://oxc.rs) for linting
- [Tailwind CSS v4](https://tailwindcss.com/) for styling
- [Zustand](https://github.com/pmndrs/zustand) for state management
- [Radix UI](https://www.radix-ui.com/) primitives and [Motion](https://motion.dev/) for animation
- Hand-written WebGL2 shaders for the effects pipeline

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and build for production
npm run preview   # preview the production build
npm run lint       # lint with Oxlint
```
