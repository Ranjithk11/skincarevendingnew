"use client";

import { useRef, useEffect, useState } from "react";
import Keyboard from "react-simple-keyboard";
// Side-effect stylesheet for react-simple-keyboard key chrome.
import "react-simple-keyboard/build/css/index.css";
import { Box, IconButton, Typography } from "@mui/material";
import { Icon } from "@iconify/react";

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  layout?: "default" | "numeric" | "email";
  visible?: boolean;
  /** When true, only call onKeyPress — parent owns the input value (avoids double characters). */
  skipApplyToActiveElement?: boolean;
  /** Optional close control shown above the keys. */
  onClose?: () => void;
}

export default function VirtualKeyboard({
  onKeyPress,
  layout = "default",
  visible = true,
  skipApplyToActiveElement = false,
  onClose,
}: VirtualKeyboardProps) {
  const keyboardRef = useRef<any>(null);
  const lastEditableRef = useRef<HTMLElement | null>(null);
  const lastKeyEventRef = useRef<{ key: string; ts: number } | null>(null);
  const onKeyPressRef = useRef(onKeyPress);
  const skipApplyRef = useRef(skipApplyToActiveElement);
  const [layoutName, setLayoutName] = useState(layout === "numeric" ? "numeric" : "default");

  onKeyPressRef.current = onKeyPress;
  skipApplyRef.current = skipApplyToActiveElement;

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
    const active = (document.activeElement as HTMLElement | null) || null;
    const activeIsEditable =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (!!active && (active as HTMLElement).isContentEditable);

    // Prefer the focused field; if a key stole focus, fall back to last focused input.
    const target = (activeIsEditable ? active : lastEditableRef.current) || null;
    if (!target) return;

    const isInput =
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    const isEditable =
      !isInput &&
      typeof (target as HTMLElement).isContentEditable === "boolean" &&
      (target as HTMLElement).isContentEditable;

    if (!isInput && !isEditable) return;

    // Re-focus so caret/selection APIs work after a key tap.
    try {
      if (document.activeElement !== target) {
        (target as HTMLElement).focus({ preventScroll: true });
      }
    } catch {
      /* ignore */
    }

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

  const handleKeyPress = (button: string) => {
    const now = Date.now();
    const last = lastKeyEventRef.current;
    // Coalesce only near-simultaneous duplicate events (pointer + library).
    // Keep the window short so intentional repeats (e.g. phone "99") still work.
    if (last) {
      const dt = now - last.ts;
      if (dt < 80) return;
      if (last.key === button && dt < 140) return;
    }
    lastKeyEventRef.current = { key: button, ts: now };

    const emit = onKeyPressRef.current;
    const skipApply = skipApplyRef.current;

    if (button === "{shift}" || button === "{lock}") {
      setLayoutName((prev) => (prev === "default" ? "shift" : "default"));
      emit("shift");
    } else if (button === "{bksp}") {
      emit("backspace");
      if (!skipApply) applyToActiveElement("backspace");
    } else if (button === "{space}") {
      emit("space");
      if (!skipApply) applyToActiveElement("space");
    } else if (button === "{enter}") {
      emit("return");
      if (!skipApply) applyToActiveElement("return");
    } else if (button === "{numbers}") {
      setLayoutName("numeric");
      emit("123");
    } else if (button === "{abc}") {
      setLayoutName("default");
      emit("ABC");
    } else if (button === "{email}") {
      setLayoutName("email");
    } else if (button === "{arrowleft}") {
      emit("arrowleft");
    } else if (button === "{arrowright}") {
      emit("arrowright");
    } else {
      emit(button);
      if (!skipApply) applyToActiveElement(button);
    }
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

  if (!visible) return null;

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      sx={{
        width: "100%",
        bgcolor: "#d1d5db",
        px: 1,
        pt: onClose ? 1 : 2,
        pb: 4,
        touchAction: "manipulation",
        WebkitUserSelect: "none",
        userSelect: "none",
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
      {onClose ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1,
            pb: 1,
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>
            Keyboard
          </Typography>
          <IconButton
            aria-label="Close keyboard"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            size="large"
            sx={{
              bgcolor: "#9ca3af",
              color: "#111827",
              borderRadius: 2,
              px: 1.5,
              "&:hover": { bgcolor: "#6b7280", color: "#fff" },
            }}
          >
            <Icon icon="mdi:keyboard-close" width={28} />
            <Typography component="span" sx={{ ml: 1, fontSize: 16, fontWeight: 600 }}>
              Close
            </Typography>
          </IconButton>
        </Box>
      ) : null}
      <Keyboard
        keyboardRef={(r) => (keyboardRef.current = r)}
        layoutName={layoutName}
        onKeyPress={handleKeyPress}
        // Kiosk touchscreens often emit pointer/mouse, not reliable touch events.
        // Touch-only mode makes keys look clickable but never update the field.
        useTouchEvents={false}
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
