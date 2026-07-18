import { useEffect } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
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

/** True for any element a Cmd/Ctrl+C/X/V should defer to the browser's own
 * text-clipboard handling on — the project name field, the inline text
 * editor, any other input — so copying/cutting/pasting the *element itself*
 * never fights with copying/cutting/pasting the *text inside* one. */
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
 *    friendly bulk delete). Copy/Cut/Paste and the style toggles below stay
 *    scoped to a single selected element — multi-select's contract is move +
 *    the shared radial menu + bulk delete, not multi-element clipboard.
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
  const images = useProjectStore((s) => s.project.images);
  const texts = useProjectStore((s) => s.project.texts);
  const addImage = useProjectStore((s) => s.addImage);
  const addText = useProjectStore((s) => s.addText);
  const updateText = useProjectStore((s) => s.updateText);
  const deleteMany = useProjectStore((s) => s.deleteMany);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Delete/Backspace remove every selected element that isn't locked —
      // gated on the same isTextEntryElement guard as Copy/Cut/Paste below so
      // Backspace inside the inline text editor (or the project name field)
      // still just deletes characters instead of the whole element.
      if ((e.key === "Delete" || e.key === "Backspace") && !isTextEntryElement(document.activeElement)) {
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

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      const soleId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

      if ((key === "b" || key === "i" || key === "u") && !isPlainInput(document.activeElement)) {
        const text = texts.find((t) => t.id === soleId);
        if (text) {
          e.preventDefault();
          if (key === "b") updateText(text.id, { bold: !text.bold });
          else if (key === "i") updateText(text.id, { italic: !text.italic });
          else updateText(text.id, { underline: !text.underline });
          return;
        }
      }

      if (key !== "c" && key !== "x" && key !== "v") return;
      if (isTextEntryElement(document.activeElement)) return;

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
    addImage,
    addText,
    updateText,
    deleteMany,
    setSelectedElementId,
    setSelectedElementIds,
    closeRadialMenu,
  ]);
}
