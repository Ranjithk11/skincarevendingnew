"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { saveUser as saveUserApi } from "@/redux/api/authApi";
import Slide1 from "./Slide1";
import Slide2 from "./Slide2";
import { PageBackground } from "@/components/ui";
import { APP_ROUTES } from "@/utils/routes";
import { useAppDispatch } from "@/redux/store/store";
import { setSkinType } from "@/redux/reducers/analysisSlice";
import { clearCart } from "@/redux/reducers/cartSlice";
import { useVoiceMessages } from "@/contexts/VoiceContext";

// Email validation - same as Skincare project
const isValidateEmail = (input: string): boolean | string => {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (pattern.test(input)) {
    return true;
  }
  return "Please enter a valid email address";
};

// Phone validation - validates phone numbers from MuiTelInput (includes country code)
const isValidatePhone = (input: string): boolean | string => {
  // MuiTelInput format: "+91 98765 43210" or "+1 555 123 4567"
  // Remove spaces for validation
  const cleanPhone = input.replace(/\s/g, '');
  // Extract digits only (without the +)
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  // Must have at least 10 digits (country code + phone number)
  // e.g., +91 9876543210 = 12 digits, +1 5551234567 = 11 digits
  if (digitsOnly.length >= 10) {
    return true;
  }
  return "Please enter a valid phone number";
};

const skinTypeOptions = [
  {
    id: "normal",
    title: "Normal",
    description: "a well-balanced skin type that isn't excessively oily or dry, featuring a healthy oil-to-water ratio.",
  },
  {
    id: "dry",
    title: "Dry",
    description: "a skin type characterized by insufficient sebum (oil) production, leading to a lack of moisture and lipids.",
  },
  {
    id: "oily",
    title: "Oily",
    description: "characterized by excess sebum (oil) production, resulting in a shiny, greasy appearance, especially in the T-zone.",
  },
  {
    id: "combination",
    title: "Combination",
    description: "a common skin type that features both oily and dry or normal areas on the face, most typically an oily T-zone with drier cheeks.",
  },
  {
    id: "sensitive",
    title: "Sensitive",
    description: "a common skin type that features both oily and dry or normal areas on the face, most typically an oily T-zone with drier cheeks.",
  },
];

export default function Questionnaire() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { speakMessage } = useVoiceMessages();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [country, setCountry] = useState<string>("IN");
  const [callingCode, setCallingCode] = useState<string>("91");
  const [email, setEmail] = useState("");
  const [activeField, setActiveField] = useState<"name" | "phone" | "email">("name");
  const [cursorPosition, setCursorPosition] = useState<number | null>(null); // null = end of text
  const [isShift, setIsShift] = useState(true);
  const [isNumeric, setIsNumeric] = useState(false);
  const [selectedSkinType, setSelectedSkinType] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const [machineLocation, setMachineLocation] = useState<string>("leafterwater_vendingmachine02");

  const totalSlides = 2;

  // Fetch machine name: priority is API (env var -> db) -> localStorage -> default
  useEffect(() => {
    const fetchMachineName = async () => {
      try {
        // First try API (which checks env var, then database)
        const response = await fetch("/api/admin/machine-name");
        const data = await response.json();
        if (data.success && data.machineName) {
          setMachineLocation(data.machineName);
          return;
        }
      } catch (err) {
        console.warn("[Questionnaire] Failed to fetch machine name from API:", err);
      }

      // Fallback to localStorage (set via URL param)
      if (typeof window !== "undefined") {
        const storedLocation = localStorage.getItem("kiosk_machine_location");
        if (storedLocation) {
          setMachineLocation(storedLocation);
        }
      }
    };

    fetchMachineName();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      speakMessage("questionnaireIntro");
      if (currentSlide === 0) speakMessage("questionnaireSlide1");
      if (currentSlide === 1) speakMessage("questionnaireSlide2");
    }, 500);

    return () => window.clearTimeout(t);
  }, [currentSlide, speakMessage]);

  const handleKeyPress = useCallback((key: string) => {
    const setValue = activeField === "name" ? setName : activeField === "phone" ? setPhone : setEmail;
    const currentValue = activeField === "name" ? name : activeField === "phone" ? phone : email;
    
    // Get effective cursor position (null means end of text)
    const pos = cursorPosition !== null ? cursorPosition : currentValue.length;

    if (key === "backspace") {
      if (activeField === "phone") {
        // For phone, remove the last digit from the national number, but keep the calling code.
        // This avoids corrupting the MuiTelInput formatting (spaces) and keeps the selected country code stable.
        const digitsOnly = String(currentValue).replace(/\D/g, "");
        const code = String(callingCode || "").replace(/\D/g, "");
        const nationalDigits = digitsOnly.slice(code.length);
        const nextNational = nationalDigits.slice(0, -1);
        setPhone(nextNational ? `+${code} ${nextNational}` : `+${code}`);
      } else {
        // For name/email, remove character at cursor position
        if (pos > 0) {
          const newValue = currentValue.slice(0, pos - 1) + currentValue.slice(pos);
          setValue(newValue);
          setCursorPosition(pos - 1);
        }
      }
    } else if (key === "arrowleft") {
      // Move cursor left (only for name/email)
      if (activeField !== "phone" && pos > 0) {
        setCursorPosition(pos - 1);
      }
    } else if (key === "arrowright") {
      // Move cursor right (only for name/email)
      if (activeField !== "phone" && pos < currentValue.length) {
        setCursorPosition(pos + 1);
      }
    } else if (key === "space") {
      // Only allow space for name and email fields
      if (activeField !== "phone") {
        const newValue = currentValue.slice(0, pos) + " " + currentValue.slice(pos);
        setValue(newValue);
        setCursorPosition(pos + 1);
      }
    } else if (key === "shift") {
      setIsShift(!isShift);
    } else if (key === "123" || key === "ABC") {
      setIsNumeric(!isNumeric);
    } else if (key === "return") {
      if (activeField === "name") {
        setActiveField("phone");
        setIsNumeric(true);
        setCursorPosition(null); // Reset cursor for new field
      } else if (activeField === "phone") {
        setActiveField("email");
        setIsNumeric(false);
        setCursorPosition(null); // Reset cursor for new field
      }
    } else {
      // Validation based on active field
      if (activeField === "name") {
        // Name: only letters (no special characters or numbers)
        if (!/^[a-zA-Z]$/.test(key)) return;
        const char = isShift ? key.toUpperCase() : key.toLowerCase();
        const newValue = currentValue.slice(0, pos) + char + currentValue.slice(pos);
        setValue(newValue);
        setCursorPosition(pos + 1);
        if (isShift) setIsShift(false);
      } else if (activeField === "phone") {
        // Phone: only digits
        if (!/^[0-9]$/.test(key)) return;

        const code = String(callingCode || "91").replace(/\D/g, "") || "91";
        const digitsOnly = String(phone).replace(/\D/g, "");
        const nationalDigits = digitsOnly.slice(code.length);

        // Determine max national number length based on calling code
        const maxLengthByCountry: { [key: string]: number } = {
          "91": 10,
          "1": 10,
          "44": 11,
          "61": 9,
          "86": 11,
        };
        const maxNationalLength = maxLengthByCountry[code] || 15;
        if (nationalDigits.length >= maxNationalLength) return;

        // Keep an explicit separator after calling code so partial values don't become ambiguous
        // (e.g. '+1 9' instead of '+19'), which can cause MuiTelInput to switch countries.
        const nextNational = `${nationalDigits}${key}`;
        setPhone(`+${code} ${nextNational}`);
      } else {
        // Email: allow all characters
        const char = isShift && !isNumeric ? key.toUpperCase() : key.toLowerCase();
        const newValue = currentValue.slice(0, pos) + char + currentValue.slice(pos);
        setValue(newValue);
        setCursorPosition(pos + 1);
        if (isShift && !isNumeric) setIsShift(false);
      }
    }
  }, [activeField, name, phone, email, isShift, isNumeric, cursorPosition, callingCode]);

  // Physical keyboard support
  useEffect(() => {
    if (currentSlide !== 0) return;

    const handlePhysicalKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        handleKeyPress("backspace");
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleKeyPress("return");
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        handleKeyPress("space");
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleKeyPress("arrowleft");
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleKeyPress("arrowright");
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    window.addEventListener("keydown", handlePhysicalKeyboard);
    return () => window.removeEventListener("keydown", handlePhysicalKeyboard);
  }, [currentSlide, handleKeyPress]);

  const handleNext = async (overrideSkinType?: string) => {
    // Validate fields on Slide 1
    if (currentSlide === 0) {
      if (!name.trim()) {
        setValidationError("Please enter your name");
        speakMessage('invalidInput');
        setTimeout(() => setValidationError(""), 3000);
        return;
      }
      // Phone validation using isValidatePhone
      const phoneValidation = isValidatePhone(phone);
      if (phoneValidation !== true) {
        setValidationError(phoneValidation as string);
        speakMessage('invalidInput');
        setTimeout(() => setValidationError(""), 3000);
        return;
      }
      // Email is optional - if not provided, use machine location default
      if (email.trim()) {
        const emailValidation = isValidateEmail(email.trim());
        if (emailValidation !== true) {
          setValidationError(emailValidation as string);
          speakMessage('invalidInput');
          setTimeout(() => setValidationError(""), 3000);
          return;
        }
      }
      setValidationError("");
    }

    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
      return;
    }

    // Use override skin type if provided, otherwise use state
    const skinType = overrideSkinType || selectedSkinType;

    // Validate skin type is selected on Slide 2
    if (!skinType) {
      setValidationError("Please select your skin type");
      speakMessage('invalidInput');
      setTimeout(() => setValidationError(""), 2000);
      return;
    }

    if (!name.trim()) {
      setValidationError("Please enter your name");
      setTimeout(() => setValidationError(""), 3000);
      return;
    }

    const phoneValidation = isValidatePhone(phone);
    if (phoneValidation !== true) {
      setValidationError(phoneValidation as string);
      setTimeout(() => setValidationError(""), 3000);
      return;
    }

    // Email is optional - if not provided, use machine location default
    if (email.trim()) {
      const emailValidation = isValidateEmail(email.trim());
      if (emailValidation !== true) {
        setValidationError(emailValidation as string);
        setTimeout(() => setValidationError(""), 3000);
        return;
      }
    }

    // MuiTelInput already includes country code in the phone value (e.g., "+91 98765 43210")
    // Remove spaces and format for API
    const formattedPhoneNumber = phone.replace(/\s/g, "");

    // Use default email based on machine location if not provided
    const finalEmail = email.trim() || `${machineLocation.replace(/-/g, '_')}@gmail.com`;

    const skinTypeIdByOption: Record<string, string> = {
      normal: "NORMAL_SKIN",
      dry: "DRY_SKIN",
      oily: "OILY_SKIN",
      combination: "COMBINATION_SKIN",
      sensitive: "SENSITIVE_SKIN",
    };

    const skinTypeId = skinTypeIdByOption[skinType] ?? skinType;

    try {
      // Clear cart before signing out to ensure new user gets empty cart
      dispatch(clearCart());
      await signOut({ redirect: false });
      // Use signIn which handles both user save and session creation (single API call)
      const authResponse = await signIn("credentials", {
        redirect: false,
        actionType: "register",
        phoneNumber: formattedPhoneNumber,
        name,
        email: finalEmail,
        location: machineLocation,
        skinType: skinTypeId,
        onBoardingQuestions: JSON.stringify([]),
      });

      if (authResponse?.error) {
        console.error("Failed to register user", authResponse.error);
        setValidationError("Registration failed. Please try again.");
        setTimeout(() => setValidationError(""), 3000);
        return;
      }

      // Save user to local SQLite database for tracking
      try {
        await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: formattedPhoneNumber, // Use phone as unique ID
            name,
            phone: formattedPhoneNumber,
            email: finalEmail,
          }),
        });
      } catch (localDbError) {
        console.warn('Failed to save user to local DB:', localDbError);
        // Don't block registration if local save fails
      }

      // Store skinType in Redux
      dispatch(setSkinType(skinTypeId));

      // Announce completion
      speakMessage('success');
      
      router.push(APP_ROUTES.SELFIE);
    } catch (err) {
      const e: any = err;
      console.error("Failed to save user", {
        status: e?.status,
        data: e?.data,
        error: e?.error,
        original: e,
      });
      setValidationError("Registration failed. Please try again.");
      setTimeout(() => setValidationError(""), 3000);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    } else {
      router.back();
    }
  };

  return (
    
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          
          }}
        >
          <IconButton onClick={handleBack} sx={{ color: "#1a1a1a" }}>
            {/* <ArrowBack /> */}
            <img src="/images/back.svg" alt="Back" />
          </IconButton>
          <Box
            sx={{
              position: "relative",
              width: 250,
              height: 120,
              flexShrink: 0,
            }}
          >
            <Image
              src="/wending/goldlog.svg"
              alt="Leaf Water Logo"
              fill
              priority
              style={{
                objectFit: "contain",
              }}
            />
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ display: "flex", gap: 1, px: 3,}}>
          {Array.from({ length: totalSlides }).map((_, index) => (
            <Box
              key={index}
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                bgcolor: index <= currentSlide ? "#2d5a3d" : "#e0e0e0",
                transition: "background-color 0.3s ease",
              }}
            />
          ))}
        </Box>

        {/* Slide Content */}
        <Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <Slide1
            name={name}
            phone={phone}
            email={email}
            country={country}
            callingCode={callingCode}
            activeField={activeField}
            cursorPosition={cursorPosition}
            isNumeric={isNumeric}
            setActiveField={setActiveField}
            setCursorPosition={setCursorPosition}
            setIsNumeric={setIsNumeric}
            setPhone={setPhone}
            setCountry={setCountry}
            setCallingCode={setCallingCode}
            handleKeyPress={handleKeyPress}
            handleNext={handleNext}
            currentSlide={currentSlide}
            validationError={validationError}
          />
          <Slide2
            currentSlide={currentSlide}
            selectedSkinType={selectedSkinType}
            setSelectedSkinType={setSelectedSkinType}
            handleNext={handleNext}
            skinTypeOptions={skinTypeOptions}
          />
        </Box>
      </Box>
  );
}
