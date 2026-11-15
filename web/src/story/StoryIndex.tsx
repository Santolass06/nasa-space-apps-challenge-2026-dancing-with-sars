import { useEffect, useRef, useState } from "react";

type Props = {
  acts: Array<{ id: string; title: string }>;
  /** The act the reader is in, marked in the list. */
  activeAct?: string;
  /** In the phone's sheet: a small button in the sheet's header, the list as a panel above it. */
  inline?: boolean;
};

/**
 * A fixed button that opens a list of the story's acts and a shortcut to the explorer.
 * The links are plain anchors (`#act-<id>`, `#step-explore-the-map`), so the browser does
 * the scrolling and Back returns to where the reader was.
 */
export default function StoryIndex({ acts, activeAct, inline }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  // While the list is open, Escape and a press outside it close it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onPress = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPress);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={`story__index${inline ? " story__index--inline" : ""}`} ref={root}>
      <button
        ref={toggle}
        type="button"
        className="story__index-toggle"
        aria-label="Story index"
        aria-expanded={open}
        aria-controls="story-index"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <nav id="story-index" aria-label="Story index" hidden={!open}>
        {acts.map((act) => (
          <a
            key={act.id}
            href={`#act-${act.id}`}
            aria-current={act.id === activeAct ? "location" : undefined}
            onClick={close}
          >
            {act.title}
          </a>
        ))}
        <a href="#step-explore-the-map" onClick={close}>
          Explore the map
        </a>
      </nav>
    </div>
  );
}
