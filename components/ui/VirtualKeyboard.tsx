"use client";

import { useRef, useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { Box } from "@mui/material";

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  layout?: "default" | "numeric" | "email";
  visible?: boolean;
}

export default function VirtualKeyboard({
  onKeyPress,
  layout = "default",
  visible = true,
}: VirtualKeyboardProps) {
  const keyboardRef = useRef<any>(null);
  const lastEditableRef = useRef<HTMLElement | null>(null);
  const lastKeyEventRef = useRef<{ key: string; ts: number } | null>(null);
  const [layoutName, setLayoutName] = useState(layout === "numeric" ? "numeric" : "default");

  const handlePointerKeyFallback = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.type !== "pointerdown") return;
    const t = e.target as HTMLElement | null;
    if (!t) return;

    const btn = t.closest?.(".hg-button") as HTMLElement | null;
    if (!btn) return;

    const raw = btn.getAttribute?.("data-skbtn") || btn.textContent || "";
    let button = raw.trim();
    if (!button) return;

    if (!button.startsWith("{")) {
      if (button === "⌫") button = "{bksp}";
      else if (button.toLowerCase() === "space") button = "{space}";
      else if (button.toLowerCase() === "return") button = "{enter}";
      else if (button === "⇧") button = "{shift}";
      else if (button === "123") button = "{numbers}";
      else if (button.toLowerCase() === "abc") button = "{abc}";
      else if (button === "←") button = "{arrowleft}";
      else if (button === "→") button = "{arrowright}";
    }

    e.preventDefault();
    handleKeyPress(button);
  };

  const setNativeValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor?.set) {
      descriptor.set.call(el, value);
    } else {
      (el as any).value = value;
    }
  };

  const applyToActiveElement = (key: string) => {
    if (typeof document === "undefined") return;
    const active = (document.activeElement as any) || null;
    const candidate = active || lastEditableRef.current;
    const target = candidate || null;
    if (!target) return;

    const isInput =
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    const isEditable =
      !isInput &&
      typeof (target as any).isContentEditable === "boolean" &&
      (target as any).isContentEditable;

    if (!isInput && !isEditable) return;

    if (key === "return") {
      try {
        (target as any).dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
        );
      } catch {}
      return;
    }

    if (isEditable) {
      try {
        document.execCommand(
          key === "backspace" ? "delete" : "insertText",
          false,
          key === "space" ? " " : key
        );
      } catch {}
      return;
    }

    const el = target as HTMLInputElement | HTMLTextAreaElement;
    const start = typeof el.selectionStart === "number" ? el.selectionStart : el.value.length;
    const end = typeof el.selectionEnd === "number" ? el.selectionEnd : el.value.length;
    const prev = el.value ?? "";

    if (key === "backspace") {
      if (start !== end) {
        const next = prev.slice(0, start) + prev.slice(end);
        setNativeValue(el, next);
        try {
          el.setSelectionRange(start, start);
        } catch {}
      } else if (start > 0) {
        const next = prev.slice(0, start - 1) + prev.slice(end);
        setNativeValue(el, next);
        try {
          el.setSelectionRange(start - 1, start - 1);
        } catch {}
      }
    } else {
      const insert = key === "space" ? " " : key;
      const next = prev.slice(0, start) + insert + prev.slice(end);
      const caret = start + insert.length;
      setNativeValue(el, next);
      try {
        el.setSelectionRange(caret, caret);
      } catch {}
    }

    try {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } catch {}
    try {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {}
  };

  useEffect(() => {
    if (layout === "numeric") {
      setLayoutName("numeric");
    } else if (layout === "email") {
      setLayoutName("email");
    } else {
      setLayoutName("default");
    }
  }, [layout]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as any;
      if (!t) return;
      const isInput = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
      const isEditable = !isInput && typeof t.isContentEditable === "boolean" && t.isContentEditable;
      if (isInput || isEditable) {
        lastEditableRef.current = t as HTMLElement;
      }
    };
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, []);

  const handleKeyPress = (button: string) => {
    const now = Date.now();
    const last = lastKeyEventRef.current;
    if (last && last.key === button && now - last.ts < 250) return;
    lastKeyEventRef.current = { key: button, ts: now };

    if (button === "{shift}" || button === "{lock}") {
      setLayoutName(layoutName === "default" ? "shift" : "default");
      onKeyPress("shift");
    } else if (button === "{bksp}") {
      onKeyPress("backspace");
      applyToActiveElement("backspace");
    } else if (button === "{space}") {
      onKeyPress("space");
      applyToActiveElement("space");
    } else if (button === "{enter}") {
      onKeyPress("return");
      applyToActiveElement("return");
    } else if (button === "{numbers}") {
      setLayoutName("numeric");
      onKeyPress("123");
    } else if (button === "{abc}") {
      setLayoutName("default");
      onKeyPress("ABC");
    } else if (button === "{email}") {
      setLayoutName("email");
    } else if (button === "{arrowleft}") {
      onKeyPress("arrowleft");
    } else if (button === "{arrowright}") {
      onKeyPress("arrowright");
    } else {
      onKeyPress(button);
      applyToActiveElement(button);
    }
  };

  if (!visible) return null;

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      onClickCapture={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerDownCapture={(e) => {
        handlePointerKeyFallback(e);
        e.stopPropagation();
      }}
      onPointerUpCapture={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEndCapture={(e) => e.stopPropagation()}
      sx={{
        width: "100%",
        bgcolor: "#d1d5db",
        px: 1,
        py: 2,
        pb: 4,
        touchAction: "manipulation",
        "& .simple-keyboard": {
          backgroundColor: "transparent",
          borderRadius: 0,
          fontFamily: "Roboto, sans-serif",
        },
        "& .hg-button": {
          height: "70px",
          fontSize: "24px",
          fontWeight: 500,
          backgroundColor: "#f3f4f6",
          color: "#1a1a1a",
          borderRadius: "8px",
          border: "none",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          touchAction: "manipulation",
          "&:active": {
            backgroundColor: "#e5e7eb",
          },
        },
        "& .hg-button-bksp, & .hg-button-shift, & .hg-button-enter, & .hg-button-numbers, & .hg-button-abc": {
          backgroundColor: "#9ca3af",
          color: "#1a1a1a",
          fontWeight: 600,
        },
        "& .hg-button-space": {
          minWidth: "200px",
        },
        "& .hg-row": {
          marginBottom: "8px",
        },
      }}
    >
      <Keyboard
        keyboardRef={(r) => (keyboardRef.current = r)}
        layoutName={layoutName}
        onKeyPress={handleKeyPress}
        useTouchEvents
        disableButtonHold
        preventMouseDownDefault
        stopMouseDownPropagation
        layout={{
          default: [
            "q w e r t y u i o p",
            "a s d f g h j k l",
            "{shift} z x c v b n m {bksp}",
            "{numbers} {arrowleft} {space} {arrowright} {enter}",
          ],
          shift: [
            "Q W E R T Y U I O P",
            "A S D F G H J K L",
            "{shift} Z X C V B N M {bksp}",
            "{numbers} {arrowleft} {space} {arrowright} {enter}",
          ],
          numeric: [
            "1 2 3 4 5 6 7 8 9 0",
            "- / : ; ( ) $ & @ \"",
            ". , ? ! ' {bksp}",
            "{abc} {space} {enter}",
          ],
          email: [
            "q w e r t y u i o p",
            "a s d f g h j k l",
            "{shift} z x c v b n m {bksp}",
            "{numbers} {arrowleft} @ . {space} {arrowright} {enter}",
          ],
        }}
        display={{
          "{bksp}": "⌫",
          "{enter}": "return",
          "{shift}": "⇧",
          "{space}": "space",
          "{numbers}": "123",
          "{abc}": "ABC",
          "{arrowleft}": "←",
          "{arrowright}": "→",
        }}
      />
    </Box>
  );
}
