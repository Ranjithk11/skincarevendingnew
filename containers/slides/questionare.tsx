"use client";

import { useEffect, useState, useRef } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { saveUser as saveUserApi } from "@/redux/api/authApi";
import Slide1 from "./Slide1";
import Slide2 from "./Slide2";
import { PageBackground } from "@/components/ui";
import { APP_ROUTES } from "@/utils/routes";

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [activeField, setActiveField] = useState<"name" | "phone" | "email">("name");
  const [isShift, setIsShift] = useState(true);
  const [isNumeric, setIsNumeric] = useState(false);
  const [selectedSkinType, setSelectedSkinType] = useState<string>("");

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const totalSlides = 2;

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
        setValue(currentValue + " ");
        return;
      }

      if (e.key.length !== 1) return;

      if (activeField === "phone") {
        if (!/^[0-9+\-() ]$/.test(e.key)) return;
      }

      e.preventDefault();
      setValue(currentValue + e.key);
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
      setValue(currentValue + " ");
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
      const char = isShift && !isNumeric ? key.toUpperCase() : key.toLowerCase();
      setValue(currentValue + char);
      if (isShift && !isNumeric) setIsShift(false);
    }
  };

  const handleNext = async () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
      return;
    }

    const countryCode = "91";
    const formattedPhoneNumber = phone.trim().startsWith("+")
      ? phone.trim()
      : `+${countryCode} ${phone.trim()}`;

    const skinTypeIdByOption: Record<string, string> = {
      normal: "NORMAL_SKIN",
      dry: "DRY_SKIN",
      oily: "OILY_SKIN",
      combination: "COMBINATION_SKIN",
      sensitive: "SENSITIVE_SKIN",
    };

    const skinTypeId = skinTypeIdByOption[selectedSkinType] ?? selectedSkinType;

    try {
      const resp = await saveUserApi({
        phoneNumber: formattedPhoneNumber,
        name,
        email,
        location: "Vending machine",
        countryCode,
        isValidated: true,
        skinType: skinTypeId,
        onBoardingQuestions: [
          {
            questionId: "skinType",
            responseId: [skinTypeId],
          },
        ],
      });

      try {
        const resolvedUserId =
          resp?.data?.userId ||
          resp?.data?._id ||
          resp?.data?.id ||
          resp?.userId ||
          resp?._id ||
          resp?.id ||
          null;
        if (resolvedUserId) {
          localStorage.setItem("leafwater_userId", String(resolvedUserId));
        }
        localStorage.setItem("leafwater_skinType", String(skinTypeId));
      } catch {}

      // Create NextAuth session (so /api/auth/session is populated on live)
      try {
        await signIn("credentials", {
          redirect: false,
          actionType: "register",
          phoneNumber: formattedPhoneNumber,
          name,
          email,
          countryCode,
          location: "Vending machine",
          onBoardingQuestions: JSON.stringify([
            {
              questionId: "skinType",
              responseId: [skinTypeId],
            },
          ]),
        });
      } catch (e) {
        console.error("Failed to create NextAuth session", e);
      }

      router.push(APP_ROUTES.SELFIE);
    } catch (err) {
      const e: any = err;
      console.error("Failed to save user", {
        status: e?.status,
        data: e?.data,
        error: e?.error,
        original: e,
      });
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
            <ArrowBack />
          </IconButton>
          <Box
            sx={{
              position: "relative",
              width: 140,
              height: 140,
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
