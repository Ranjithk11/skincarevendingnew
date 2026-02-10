"use client";

import { useRef, useEffect, useState } from "react";
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
  const [layoutName, setLayoutName] = useState(layout === "numeric" ? "numeric" : "default");

  useEffect(() => {
    if (layout === "numeric") {
      setLayoutName("numeric");
    } else if (layout === "email") {
      setLayoutName("email");
    } else {
      setLayoutName("default");
    }
  }, [layout]);

  const handleKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName(layoutName === "default" ? "shift" : "default");
      onKeyPress("shift");
    } else if (button === "{bksp}") {
      onKeyPress("backspace");
    } else if (button === "{space}") {
      onKeyPress("space");
    } else if (button === "{enter}") {
      onKeyPress("return");
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
    }
  };

  if (!visible) return null;

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "#d1d5db",
        px: 1,
        py: 2,
        pb: 4,
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
