import { useState } from "react";
import clsx from "clsx";
import { FONTS, getFontStack, type FontId, type FontTag } from "@/constants/fonts";
import { TagIcon } from "@/components/RadialMenu/icons";

const TAG_LABELS: Record<FontTag, string> = {
  "sans-serif": "Sans Serif",
  serif: "Serif",
  "slab-serif": "Slab Serif",
  display: "Display",
  handwriting: "Handwriting",
  monospace: "Monospace",
  condensed: "Condensed",
};

const ALL_TAGS = Object.keys(TAG_LABELS) as FontTag[];

/**
 * Font picker popover for the "Text" radial menu group — a plain scrollable
 * list where every row's own label is rendered in that font's actual
 * font-family, so scanning the list itself previews every style (no separate
 * hover-preview panel needed), plus a togglable row of tag chips to filter it.
 */
export function FontPickerPanel({ value, onChange }: { value: FontId; onChange: (id: FontId) => void }) {
  const [chipsOpen, setChipsOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState<FontTag | null>(null);

  const visible = FONTS.filter((f) => !tagFilter || f.tags.includes(tagFilter));

  return (
    <div className="flex w-56 flex-col gap-2">
      <button
        type="button"
        onClick={() => setChipsOpen((open) => !open)}
        aria-pressed={chipsOpen}
        className={clsx(
          "press-scale flex items-center gap-1.5 self-start rounded border px-2 py-1 text-[9px] uppercase tracking-wide transition-colors duration-150",
          chipsOpen || tagFilter ? "border-accent/70 text-accent" : "border-[rgb(var(--chrome-border)/0.25)] opacity-70 hover:opacity-100",
        )}
      >
        <span className="flex h-3 w-3 items-center justify-center">
          <TagIcon />
        </span>
        {tagFilter ? TAG_LABELS[tagFilter] : "Tags"}
      </button>

      {chipsOpen && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={clsx(
              "press-scale rounded border px-2 py-0.5 text-[9px] uppercase tracking-wide transition-colors duration-150",
              !tagFilter ? "border-accent/70 text-accent" : "border-[rgb(var(--chrome-border)/0.25)] opacity-70 hover:opacity-100",
            )}
          >
            All
          </button>
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tag)}
              className={clsx(
                "press-scale rounded border px-2 py-0.5 text-[9px] uppercase tracking-wide transition-colors duration-150",
                tagFilter === tag ? "border-accent/70 text-accent" : "border-[rgb(var(--chrome-border)/0.25)] opacity-70 hover:opacity-100",
              )}
            >
              {TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {visible.map((font) => (
          <button
            key={font.id}
            type="button"
            onClick={() => onChange(font.id)}
            aria-pressed={font.id === value}
            className={clsx(
              "press-scale rounded px-2 py-1.5 text-left text-[13px] leading-none transition-colors duration-150",
              font.id === value ? "bg-[rgb(var(--color-accent-glow)/0.15)] text-accent" : "hover:bg-[rgb(var(--chrome-border)/0.1)]",
            )}
            style={{ fontFamily: getFontStack(font.id) }}
          >
            {font.name}
          </button>
        ))}
      </div>
    </div>
  );
}
