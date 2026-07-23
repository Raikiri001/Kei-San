import { useEffect } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { saveCurrentProject } from "@/store/persistence";
import type { ImageElement, TextElement } from "@/store/types";

type ClipboardEntry = { kind: "image"; data: ImageElement } | { kind: "text"; data: TextElement };

/** Module-level, not store state — nothing in the UI displays "what's copied,"
 * so this doesn't need to be reactive, just persistent across the hook's
 * (single, app-lifetime) mount. `pasteCount` cascades repeated pastes of the
 * same clipboard entry outward instead of stacking them exactly on top of
 * each other, and resets whenever a fresh Copy/Cut replaces the entry. */
let clipboard: ClipboardEntry | null = null;
let pasteCount = 0;

const PASTE_OFFSET_PX = 24;
const NUDGE_STEP_PX = 1;
const NUDGE_STEP_LARGE_PX = 10;

/** True for any element a Cmd/Ctrl+C/X/V should defer to the browser's own
 * text-clipboard handling on — the project name field, the inline text
 * editor, any other input — so copying/cutting/pasting the *element itself*
 * never fights with copying/cutting/pasting the *text inside* one. Also used
 * to gate Undo/Redo/Select All/Duplicate/arrow-nudge/Escape for the same
 * reason: those all have a native, expected meaning inside a text field that
 * a canvas-level shortcut must not steal. */
function isTextEntryElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

/** Narrower than isTextEntryElement: excludes only bare inputs/textareas
 * (e.g. the project name field), NOT the inline text editor's contentEditable
 * box — Cmd+B/I/U must keep working while actively typing so it overrides the
 * browser's own native contentEditable bold/italic/underline instead of
 * losing to it. */
function isPlainInput(el: Element | null): boolean {
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA";
}

/**
 * Global keyboard shortcuts for the currently selected canvas element(s) —
 * mount once at the canvas root:
 *  - Delete/Backspace remove every selected, unlocked element (a multi-select
 *    friendly bulk delete). Arrow keys nudge every selected, unlocked element
 *    by 1px (Shift: 10px). Escape clears the selection and closes any open
 *    radial menu.
 *  - Cmd/Ctrl+Z / Shift+Z (or +Y) undo/redo the project's edit history.
 *    Cmd/Ctrl+A selects every element. Cmd/Ctrl+D duplicates the current
 *    selection (multi-select aware, unlike Copy/Paste below). Cmd/Ctrl+]/[
 *    (Shift: to front/back) reorder the selection. Cmd/Ctrl+S saves.
 *  - Cmd/Ctrl+C / X / V (and Shift+V, identical to plain paste since copying
 *    an element already preserves every style property) act on whichever
 *    single image or text element is selected.
 *  - Cmd/Ctrl+B / I / U toggle bold/italic/underline on a selected text
 *    element, whether it's just selected or actively being edited inline.
 */
export function useElementShortcuts() {
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const setSelectedElementIds = useUIStore((s) => s.setSelectedElementIds);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);
  const markClean = useUIStore((s) => s.markClean);
  const project = useProjectStore((s) => s.project);
  const images = useProjectStore((s) => s.project.images);
  const texts = useProjectStore((s) => s.project.texts);
  const addImage = useProjectStore((s) => s.addImage);
  const addText = useProjectStore((s) => s.addText);
  const updateText = useProjectStore((s) => s.updateText);
  const deleteMany = useProjectStore((s) => s.deleteMany);
  const moveElementsBy = useProjectStore((s) => s.moveElementsBy);
  const bringForwardMany = useProjectStore((s) => s.bringForwardMany);
  const sendBackwardMany = useProjectStore((s) => s.sendBackwardMany);
  const bringToFrontMany = useProjectStore((s) => s.bringToFrontMany);
  const sendToBackMany = useProjectStore((s) => s.sendToBackMany);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;

      // Delete/Backspace remove every selected element that isn't locked —
      // gated on the same isTextEntryElement guard as Copy/Cut/Paste below so
      // Backspace inside the inline text editor (or the project name field)
      // still just deletes characters instead of the whole element.
      if ((e.key === "Delete" || e.key === "Backspace") && !isTextEntryElement(activeEl)) {
        const selectedImages = images.filter((i) => selectedElementIds.includes(i.id));
        const selectedTexts = texts.filter((t) => selectedElementIds.includes(t.id));
        if (selectedImages.length + selectedTexts.length === 0) return;
        e.preventDefault();
        const deletableIds = [...selectedImages, ...selectedTexts].filter((el) => !el.locked).map((el) => el.id);
        if (deletableIds.length > 0) {
          closeRadialMenu();
          deleteMany(deletableIds);
          setSelectedElementIds(selectedElementIds.filter((id) => !deletableIds.includes(id)));
        }
        return;
      }

      // Arrow keys nudge every selected, unlocked element by 1px (Shift: 10px)
      // — no modifier required, so this must not fire while typing anywhere.
      if (e.key.startsWith("Arrow") && !isTextEntryElement(activeEl)) {
        const nudgeImages = images.filter((i) => selectedElementIds.includes(i.id) && !i.locked);
        const nudgeTexts = texts.filter((t) => selectedElementIds.includes(t.id) && !t.locked);
        if (nudgeImages.length + nudgeTexts.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? NUDGE_STEP_LARGE_PX : NUDGE_STEP_PX;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        moveElementsBy(
          nudgeImages.map((i) => i.id),
          nudgeTexts.map((t) => t.id),
          dx,
          dy,
        );
        return;
      }

      // Escape backs out of the current selection/menu — not while typing,
      // where it should just blur the field (TextElementView/ImageElementView
      // already handle that locally) without also wiping canvas selection.
      if (e.key === "Escape" && !isTextEntryElement(activeEl)) {
        closeRadialMenu();
        setSelectedElementIds([]);
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      const soleId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

      if ((key === "b" || key === "i" || key === "u") && !isPlainInput(activeEl)) {
        const text = texts.find((t) => t.id === soleId);
        if (text) {
          e.preventDefault();
          if (key === "b") updateText(text.id, { bold: !text.bold });
          else if (key === "i") updateText(text.id, { italic: !text.italic });
          else updateText(text.id, { underline: !text.underline });
          return;
        }
      }

      // Cmd/Ctrl+S saves regardless of focus (matches every other app's save
      // shortcut) — always preventDefault so the browser's own "Save Page"
      // dialog never appears underneath it.
      if (key === "s") {
        e.preventDefault();
        saveCurrentProject(project).then(markClean);
        return;
      }

      if (key === "z" && !isTextEntryElement(activeEl)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (key === "y" && !isTextEntryElement(activeEl)) {
        e.preventDefault();
        redo();
        return;
      }

      if (key === "a" && !isTextEntryElement(activeEl)) {
        if (images.length + texts.length === 0) return;
        e.preventDefault();
        setSelectedElementIds([...images.map((i) => i.id), ...texts.map((t) => t.id)]);
        return;
      }

      if (key === "d" && !isTextEntryElement(activeEl)) {
        const selectedImages = images.filter((i) => selectedElementIds.includes(i.id));
        const selectedTexts = texts.filter((t) => selectedElementIds.includes(t.id));
        if (selectedImages.length + selectedTexts.length === 0) return;
        e.preventDefault();
        closeRadialMenu();
        const newIds: string[] = [];
        for (const img of selectedImages) {
          const { id: _id, zIndex: _zIndex, x, y, ...rest } = img;
          newIds.push(addImage({ ...rest, x: x + PASTE_OFFSET_PX, y: y + PASTE_OFFSET_PX }));
        }
        for (const txt of selectedTexts) {
          const { id: _id, zIndex: _zIndex, x, y, ...rest } = txt;
          newIds.push(addText({ ...rest, x: x + PASTE_OFFSET_PX, y: y + PASTE_OFFSET_PX }));
        }
        setSelectedElementIds(newIds);
        return;
      }

      if ((key === "]" || key === "[") && !isTextEntryElement(activeEl)) {
        if (selectedElementIds.length === 0) return;
        e.preventDefault();
        if (key === "]") {
          if (e.shiftKey) bringToFrontMany(selectedElementIds);
          else bringForwardMany(selectedElementIds);
        } else {
          if (e.shiftKey) sendToBackMany(selectedElementIds);
          else sendBackwardMany(selectedElementIds);
        }
        return;
      }

      if (key !== "c" && key !== "x" && key !== "v") return;
      if (isTextEntryElement(activeEl)) return;

      if (key === "c" || key === "x") {
        const image = images.find((i) => i.id === soleId);
        const text = texts.find((t) => t.id === soleId);
        if (!image && !text) return;
        e.preventDefault();
        // A locked element can't be cut (mirrors it not being deletable) —
        // treated as a true no-op, not even populating the clipboard.
        if (key === "x" && (image?.locked || text?.locked)) return;
        clipboard = image ? { kind: "image", data: image } : { kind: "text", data: text! };
        pasteCount = 0;
        if (key === "x") {
          closeRadialMenu();
          if (image) deleteMany([image.id]);
          else deleteMany([text!.id]);
          setSelectedElementId(null);
        }
        return;
      }

      if (!clipboard) return;
      e.preventDefault();
      pasteCount += 1;
      const offset = PASTE_OFFSET_PX * pasteCount;
      if (clipboard.kind === "image") {
        const { id: _id, zIndex: _zIndex, x, y, ...rest } = clipboard.data;
        setSelectedElementId(addImage({ ...rest, x: x + offset, y: y + offset }));
      } else {
        const { id: _id, zIndex: _zIndex, x, y, ...rest } = clipboard.data;
        setSelectedElementId(addText({ ...rest, x: x + offset, y: y + offset }));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedElementIds,
    images,
    texts,
    project,
    addImage,
    addText,
    updateText,
    deleteMany,
    moveElementsBy,
    bringForwardMany,
    sendBackwardMany,
    bringToFrontMany,
    sendToBackMany,
    undo,
    redo,
    markClean,
    setSelectedElementId,
    setSelectedElementIds,
    closeRadialMenu,
  ]);
}
