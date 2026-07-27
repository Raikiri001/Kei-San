# kei-san

A simple, browser-based image editor built for one thing: making cool, custom wallpapers without the hassle. Full design tools can feel like overkill or too complex when all you want is to slap a few photos together, add some text, and throw a nice effect on top. kei-san skips the learning curve, everything is drag, drop, click, and done, while still packing enough real effects and layering power to make something that actually looks great.

## What you can do with it

### Canvas & layout
- Freeform canvas with a configurable background color/opacity (supports transparent PNG export) and adjustable grid (rows/cols).
- Drag, resize, and rotate images and text with corner/edge handles; multi-select and move/resize/rotate together.
- Illustrator/InDesign-style smart alignment guides, snap-to-grid, and shift-axis-locked dragging so things just line up on their own.
- Rulers and a snap-lattice overlay for precise placement.
- One-click **auto-layout**: tiles any number of images into an even grid/collage sized to the canvas, no manual arranging needed.
- Undo/redo, copy/cut/paste/duplicate, layer reordering (bring to front/forward/backward/send to back), and full keyboard shortcuts.

### Images
- Upload via drag-and-drop or file picker.
- Crop with zoom and pan (double-click into crop mode).
- Per-image opacity, lock (to prevent accidental edits), and resize/reset-size controls.
- Automatic color-suggestion and edge-color extraction on upload, used to power the color tools below.

### Text
- Rich text boxes with wrapping, font family, size, bold/italic/underline, and left/center/right/justify alignment.
- Horizontal or vertical (Japanese-style) orientation.
- Glyph warp (stretch), color with independent alpha, and an optional colored outer glow.

### Effects (70+ real-time WebGL2 shaders)
A big gallery of GPU-rendered image effects, all previewed live before you commit to them, grouped exactly as they are in the app's own Effects gallery:
- **Blur & Glow**: Gaussian Blur, Motion Blur, Camera Shake, Bloom, Glow, Edge Blend, Circular Blur, Radial Blur, Zoom Blur, Blur/Sharp, Depth of Field.
- **Distort**: Swirl, Pinch, Perspective, Ripple, Emboss, Polar Warp, Warp Grid.
- **Glitch & Signal**: RGB Shift, Glitch, VHS, NTSC, Modulation, LED, Stripe, Noise, Frame Drop, CRT.
- **Print & Halftone**: Halftone, Dither, Xerox, Pocket LCD, ASCII Art.
- **Texture & Grain**: Grunge, Vintage Print, Mixed Media, Newsprint, Damp Ink, Teleshopping, Blob Tracker, Ink Bleed, Flatbed Scan.
- **Film**: Black & White, Classic Film, Vintage Film, Displacement, Film Grain, Halation.
- **Color Grading**: Curves, Levels, Exposure, Brightness/Contrast, White Balance, Hue/Saturation, Color Balance, Gradient Map, Duotone, Monochrome, Thermal, Color Matrix, RGB Gain, Hue Curves, Color Grading.
- **Effects**: Motion Trails, Vignette, Threshold, Fluted Glass, Faceted, Transform, Risograph.

### Layers
- Stack any number of effects on a single image, each independently toggleable, reorderable, and deletable.
- Per-layer **blend modes** (normal, lighten, darken, multiply, screen, overlay, add, subtract, difference, exclusion).
- Per-layer **masks** with region editors (circle, gradient, quad-corner, and mesh-warp) to apply an effect only to part of an image.
- Group layers together, or combine two effect branches with **Layer Mix**.
- **17 built-in presets** (like Halftone Press, Chroma Split, Grunge, Vintage Print, Riso Zine, Old Film Reel, Thermal Scan, Tilt-Shift Miniature) that drop in a ready-made stack of layers with one click, no fiddling required.

### Color tools
- Native browser **eyedropper** to sample any color on screen, not just inside the canvas.
- Color-swatch and color-wheel pickers, with suggestions pulled straight from the uploaded image's own palette.

### Interaction
- A radial, Illustrator-style context menu that surfaces the relevant tools for whatever's selected (image, text, or a mixed multi-selection), so you're never digging through menus.
- An adaptive "liquid dock" toolbar that recedes to a small pill when idle and expands on hover/focus.
- Light and dark themes.

### Saving & export
- Save designs locally (with an auto-generated thumbnail) and reload, browse, or delete them from a designs drawer, all persisted in the browser, no account or server needed.
- Export/download the finished canvas as a PNG.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev/build tooling, with [Oxlint](https://oxc.rs) for linting
- [Tailwind CSS v4](https://tailwindcss.com/) for styling
- [Zustand](https://github.com/pmndrs/zustand) for state management
- [Radix UI](https://www.radix-ui.com/) primitives and [Motion](https://motion.dev/) for animation
- Hand-written WebGL2 shaders for the effects pipeline
