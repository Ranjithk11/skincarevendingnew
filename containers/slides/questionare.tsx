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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [email, setEmail] = useState("");
  const [activeField, setActiveField] = useState<"name" | "phone" | "email">("name");
  const [cursorPosition, setCursorPosition] = useState<number | null>(null); // null = end of text
  const [isShift, setIsShift] = useState(true);
  const [isNumeric, setIsNumeric] = useState(false);
  const [selectedSkinType, setSelectedSkinType] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const [machineLocation, setMachineLocation] = useState<string>("vendingMachine_Default");

  const totalSlides = 2;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLocation = localStorage.getItem("kiosk_machine_location");
      if (storedLocation) {
        setMachineLocation(storedLocation);
      }
    }
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    const setValue = activeField === "name" ? setName : activeField === "phone" ? setPhone : setEmail;
    const currentValue = activeField === "name" ? name : activeField === "phone" ? phone : email;
    
    // Get effective cursor position (null means end of text)
    const pos = cursorPosition !== null ? cursorPosition : currentValue.length;

    if (key === "backspace") {
      if (activeField === "phone") {
        // For phone, just remove last character
        setValue(currentValue.slice(0, -1));
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
        // Extract country code and national number from phone
        // Phone format: "+91 XXXXX" or "+1 XXX XXX XXXX"
        const allDigits = phone.replace(/\D/g, '');
        
        // Determine country code length and max national number length
        let countryCodeLength = 2; // Default for India (91)
        let maxNationalLength = 10; // Default for India
        
        if (phone.startsWith('+1')) {
          countryCodeLength = 1; // US/Canada
          maxNationalLength = 10;
        } else if (phone.startsWith('+44')) {
          countryCodeLength = 2;
          maxNationalLength = 11; // UK
        } else if (phone.startsWith('+61')) {
          countryCodeLength = 2;
          maxNationalLength = 9; // Australia
        } else if (phone.startsWith('+86')) {
          countryCodeLength = 2;
          maxNationalLength = 11; // China
        }
        
        const nationalDigits = allDigits.length - countryCodeLength;
        if (nationalDigits >= maxNationalLength) return;
        setPhone(phone + key);
      } else {
        // Email: allow all characters
        const char = isShift && !isNumeric ? key.toUpperCase() : key.toLowerCase();
        const newValue = currentValue.slice(0, pos) + char + currentValue.slice(pos);
        setValue(newValue);
        setCursorPosition(pos + 1);
        if (isShift && !isNumeric) setIsShift(false);
      }
    }
  }, [activeField, name, phone, email, isShift, isNumeric, cursorPosition]);

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
        setTimeout(() => setValidationError(""), 3000);
        return;
      }
      // Phone validation using isValidatePhone
      const phoneValidation = isValidatePhone(phone);
      if (phoneValidation !== true) {
        setValidationError(phoneValidation as string);
        setTimeout(() => setValidationError(""), 3000);
        return;
      }
      if (!email.trim()) {
        setValidationError("Please enter your email address");
        setTimeout(() => setValidationError(""), 3000);
        return;
      }

      const emailValidation = isValidateEmail(email.trim());
      if (emailValidation !== true) {
        setValidationError(emailValidation as string);
        setTimeout(() => setValidationError(""), 3000);
        return;
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

    if (!email.trim()) {
      setValidationError("Please enter your email address");
      setTimeout(() => setValidationError(""), 3000);
      return;
    }

    const emailValidation = isValidateEmail(email.trim());
    if (emailValidation !== true) {
      setValidationError(emailValidation as string);
      setTimeout(() => setValidationError(""), 3000);
      return;
    }

    // MuiTelInput already includes country code in the phone value (e.g., "+91 98765 43210")
    // Remove spaces and format for API
    const formattedPhoneNumber = phone.replace(/\s/g, "");

    const skinTypeIdByOption: Record<string, string> = {
      normal: "NORMAL_SKIN",
      dry: "DRY_SKIN",
      oily: "OILY_SKIN",
      combination: "COMBINATION_SKIN",
      sensitive: "SENSITIVE_SKIN",
    };

    const skinTypeId = skinTypeIdByOption[skinType] ?? skinType;

    try {
      await signOut({ redirect: false });
      // Use signIn which handles both user save and session creation (single API call)
      const authResponse = await signIn("credentials", {
        redirect: false,
        actionType: "register",
        phoneNumber: formattedPhoneNumber,
        name,
        email,
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

      // Store skinType in Redux
      dispatch(setSkinType(skinTypeId));

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
            activeField={activeField}
            cursorPosition={cursorPosition}
            isNumeric={isNumeric}
            setActiveField={setActiveField}
            setCursorPosition={setCursorPosition}
            setIsNumeric={setIsNumeric}
            setPhone={setPhone}
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
