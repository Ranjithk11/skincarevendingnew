"use client";

import { useEffect, useState, useRef } from "react";
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

// Phone validation - validates Indian phone numbers (10 digits)
const isValidatePhone = (input: string): boolean | string => {
  // Remove all non-digit characters for validation
  const digitsOnly = input.replace(/\D/g, '');
  // Indian phone numbers should be exactly 10 digits
  if (digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly)) {
    return true;
  }
  return "Please enter a valid 10-digit phone number";
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
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [activeField, setActiveField] = useState<"name" | "phone" | "email">("name");
  const [isShift, setIsShift] = useState(true);
  const [isNumeric, setIsNumeric] = useState(false);
  const [selectedSkinType, setSelectedSkinType] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const [machineLocation, setMachineLocation] = useState<string>("vendingMachine_Default");

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const totalSlides = 2;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLocation = localStorage.getItem("kiosk_machine_location");
      if (storedLocation) {
        setMachineLocation(storedLocation);
      }
    }
  }, []);

  useEffect(() => {
    if (currentSlide !== 0) return;

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const setValue =
        activeField === "name" ? setName : activeField === "phone" ? setPhone : setEmail;
      const currentValue =
        activeField === "name" ? name : activeField === "phone" ? phone : email;

      if (e.key === "Backspace") {
        e.preventDefault();
        setValue(currentValue.slice(0, -1));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (activeField === "name") {
          setActiveField("phone");
          setIsNumeric(true);
          phoneRef.current?.focus();
        } else if (activeField === "phone") {
          setActiveField("email");
          setIsNumeric(false);
          emailRef.current?.focus();
        }
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        // Only allow space for name and email fields
        if (activeField !== "phone") {
          setValue(currentValue + " ");
        }
        return;
      }

      if (e.key.length !== 1) return;

      e.preventDefault();
      
      // Validation based on active field
      if (activeField === "name") {
        // Name: only letters (no special characters or numbers)
        if (!/^[a-zA-Z]$/.test(e.key)) return;
        setValue(currentValue + e.key);
      } else if (activeField === "phone") {
        // Phone: only digits, max 10 characters
        if (!/^[0-9]$/.test(e.key)) return;
        if (currentValue.length >= 10) return;
        setValue(currentValue + e.key);
      } else {
        // Email: allow all characters
        setValue(currentValue + e.key);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeField,
    currentSlide,
    email,
    name,
    phone,
    setActiveField,
    setEmail,
    setIsNumeric,
    setName,
    setPhone,
  ]);

  const handleKeyPress = (key: string) => {
    const setValue = activeField === "name" ? setName : activeField === "phone" ? setPhone : setEmail;
    const currentValue = activeField === "name" ? name : activeField === "phone" ? phone : email;

    if (key === "backspace") {
      setValue(currentValue.slice(0, -1));
    } else if (key === "space") {
      // Only allow space for name and email fields
      if (activeField !== "phone") {
        setValue(currentValue + " ");
      }
    } else if (key === "shift") {
      setIsShift(!isShift);
    } else if (key === "123" || key === "ABC") {
      setIsNumeric(!isNumeric);
    } else if (key === "return") {
      if (activeField === "name") {
        setActiveField("phone");
        setIsNumeric(true);
        phoneRef.current?.focus();
      } else if (activeField === "phone") {
        setActiveField("email");
        setIsNumeric(false);
        emailRef.current?.focus();
      }
    } else {
      // Validation based on active field
      if (activeField === "name") {
        // Name: only letters (no special characters or numbers)
        if (!/^[a-zA-Z]$/.test(key)) return;
        const char = isShift ? key.toUpperCase() : key.toLowerCase();
        setValue(currentValue + char);
        if (isShift) setIsShift(false);
      } else if (activeField === "phone") {
        // Phone: only digits, max 10 characters
        if (!/^[0-9]$/.test(key)) return;
        if (currentValue.length >= 10) return;
        setValue(currentValue + key);
      } else {
        // Email: allow all characters
        const char = isShift && !isNumeric ? key.toUpperCase() : key.toLowerCase();
        setValue(currentValue + char);
        if (isShift && !isNumeric) setIsShift(false);
      }
    }
  };

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

    const countryCode = "91";
    const digitsOnlyPhone = phone.replace(/\D/g, "");
    const formattedPhoneNumber = `+${countryCode}${digitsOnlyPhone}`;

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
        countryCode,
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
            isShift={isShift}
            isNumeric={isNumeric}
            nameRef={nameRef}
            phoneRef={phoneRef}
            emailRef={emailRef}
            setActiveField={setActiveField}
            setIsNumeric={setIsNumeric}
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
