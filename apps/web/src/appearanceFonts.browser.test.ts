import { describe, expect, it } from "vite-plus/test";

import "~/index.css";
import {
  applyAppearanceFontVariables,
  DEFAULT_CODE_FONT_STACK,
  DEFAULT_SANS_FONT_STACK,
} from "./appearanceFonts";

function renderedFontSize(style: (probe: HTMLElement) => void): string {
  const probe = document.createElement("div");
  style(probe);
  document.body.append(probe);
  try {
    return getComputedStyle(probe).fontSize;
  } finally {
    probe.remove();
  }
}

const composerFontSize = () =>
  renderedFontSize((probe) => {
    // The composer editor's own size class.
    probe.className = "text-(length:--font-size-prompt,var(--text-sm))";
  });

const touchComposerFontSize = () =>
  renderedFontSize((probe) => {
    probe.style.fontSize = "var(--font-size-prompt-touch)";
  });

describe("applyAppearanceFontVariables", () => {
  it("sizes the composer from the interface size until fonts are set separately", () => {
    const root = document.documentElement;
    const style = root.getAttribute("style");
    const preferences = {
      sans: "",
      code: "",
      composer: "",
      fallback: "",
      sizeInterface: 20,
      sizePrompt: 14,
      sizeCode: 13,
      smoothing: true,
    };
    try {
      applyAppearanceFontVariables(root, { ...preferences, separate: false });
      expect(composerFontSize()).toBe("17.5px");
      expect(touchComposerFontSize()).toBe("17.5px");

      applyAppearanceFontVariables(root, { ...preferences, separate: true });
      expect(composerFontSize()).toBe("14px");
      // iOS zooms into inputs under 16px.
      expect(touchComposerFontSize()).toBe("16px");
    } finally {
      if (style === null) root.removeAttribute("style");
      else root.setAttribute("style", style);
    }
  });

  it("widens the numbered-list gutter only when the interface font's marker would clip", () => {
    const root = document.documentElement;
    const style = root.getAttribute("style");
    const gutter = (sans: string) => {
      applyAppearanceFontVariables(root, {
        sans,
        code: "",
        composer: "",
        fallback: "",
        sizeInterface: 16,
        sizePrompt: 14,
        sizeCode: 13,
        smoothing: true,
        separate: false,
      });
      const markdown = document.createElement("div");
      markdown.className = "chat-markdown";
      markdown.style.fontSize = "14px";
      const list = document.createElement("ol");
      markdown.append(list);
      document.body.append(markdown);
      try {
        return Number.parseFloat(getComputedStyle(list).paddingInlineStart);
      } finally {
        markdown.remove();
      }
    };
    try {
      // `0. ` in a 14px monospace font is about 25px, past the 20px default.
      expect(gutter("monospace")).toBeGreaterThan(24);
      expect(gutter("sans-serif")).toBe(20);
    } finally {
      if (style === null) root.removeAttribute("style");
      else root.setAttribute("style", style);
    }
  });

  it("keeps the fallback behind the selected families and ahead of the generic default", () => {
    const root = document.documentElement;
    const style = root.getAttribute("style");
    const preferences = {
      sans: "",
      code: "",
      composer: "Fira Code",
      fallback: "Noto Sans SC",
      sizeInterface: 16,
      sizePrompt: 14,
      sizeCode: 13,
      smoothing: true,
      separate: true,
    };
    try {
      applyAppearanceFontVariables(root, preferences);
      expect(root.style.getPropertyValue("--font-sans")).toBe(
        DEFAULT_SANS_FONT_STACK.replace(/, sans-serif$/, ', "Noto Sans SC", sans-serif'),
      );
      expect(root.style.getPropertyValue("--font-mono")).toBe(
        DEFAULT_CODE_FONT_STACK.replace(/, monospace$/, ', "Noto Sans SC", monospace'),
      );
      expect(root.style.getPropertyValue("--font-composer")).toBe(
        '"Fira Code", "Noto Sans SC", var(--font-sans)',
      );

      applyAppearanceFontVariables(root, { ...preferences, sans: "Inter", code: "JetBrains Mono" });
      expect(root.style.getPropertyValue("--font-sans")).toBe(
        `Inter, "Noto Sans SC", ${DEFAULT_SANS_FONT_STACK}`,
      );
      expect(root.style.getPropertyValue("--font-mono")).toBe(
        `"JetBrains Mono", "Noto Sans SC", ${DEFAULT_CODE_FONT_STACK}`,
      );
    } finally {
      if (style === null) root.removeAttribute("style");
      else root.setAttribute("style", style);
    }
  });
});
