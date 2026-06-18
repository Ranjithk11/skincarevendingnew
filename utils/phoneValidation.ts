import {
  validatePhoneNumberLength,
  isValidPhoneNumber,
  getExampleNumber,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

export function toCountryCode(iso2: string): CountryCode | undefined {
  const code = iso2?.trim().toUpperCase();
  if (!code || code.length !== 2) return undefined;
  return code as CountryCode;
}

export function extractNationalDigits(phone: string, callingCode: string): string {
  const code = callingCode.replace(/\D/g, "");
  const rawDigits = phone.replace(/\D/g, "");
  return rawDigits.startsWith(code) ? rawDigits.slice(code.length) : rawDigits;
}

export function getNationalDisplayPart(phone: string, callingCode: string): string {
  const code = callingCode.replace(/\D/g, "");
  if (!code) return phone.replace(/^\+\d+\s*/, "");
  return phone.replace(new RegExp(`^\\+${code}\\s*`), "");
}

export function maskPhoneDigits(text: string): string {
  return text.replace(/\d/g, "X");
}

export function formatPhoneWithNational(
  callingCode: string,
  nationalDigits: string
): string {
  const code = callingCode.replace(/\D/g, "") || "91";
  return nationalDigits ? `+${code} ${nationalDigits}` : `+${code}`;
}

/** True if adding this digit would exceed the country's mobile national length. */
export function wouldNationalDigitsBeTooLong(
  phone: string,
  country: string,
  callingCode: string,
  nextDigit: string
): boolean {
  const nationalDigits = extractNationalDigits(phone, callingCode);
  return nationalDigits.length + 1 > getMaxNationalLength(country);
}

/** Max national digits for mobile entry (from libphonenumber mobile examples). */
export function getMaxNationalLength(country: string): number {
  const countryCode = toCountryCode(country);
  if (!countryCode) return 15;
  const example = getExampleNumber(countryCode, examples);
  return example?.nationalNumber.length ?? 15;
}

export function getExampleNationalLength(country: string): number {
  return getMaxNationalLength(country);
}

export function isNationalLengthAtMax(
  phone: string,
  country: string,
  callingCode: string
): boolean {
  return (
    extractNationalDigits(phone, callingCode).length >= getMaxNationalLength(country)
  );
}

/** First national digit count that is no longer TOO_SHORT for this country. */
export function getMinNationalLength(country: string, callingCode: string): number {
  const countryCode = toCountryCode(country);
  if (!countryCode) return 7;

  for (let len = 1; len <= 15; len++) {
    const testPhone = formatPhoneWithNational(callingCode, "9".repeat(len));
    if (validatePhoneNumberLength(testPhone, countryCode) !== "TOO_SHORT") {
      return len;
    }
  }
  return 7;
}

export function isPhoneValidForCountry(phone: string, country: string): boolean {
  const countryCode = toCountryCode(country);
  if (!countryCode) return isValidPhoneNumber(phone);
  return isValidPhoneNumber(phone, countryCode);
}

export function getPhoneLengthError(phone: string, country: string): string | null {
  const countryCode = toCountryCode(country);
  if (!countryCode) return null;

  const result = validatePhoneNumberLength(phone, countryCode);
  if (result === "TOO_SHORT") return "Phone number is too short for this country";
  if (result === "TOO_LONG") return "Phone number is too long for this country";
  return null;
}

/**
 * Junk / fake number pattern checks (fixed thresholds, same for all countries).
 * - All identical digits: blocked at 7+ digits (777777 ok, 7777777 not)
 * - Alternating pairs: blocked at 8+ digits (1212121 ok, 12121212 not)
 * - Sequential substrings: blocked when a known run appears (8+ digit strings)
 * - Heavy repetition: any digit 8+ times when total length ≤ 12
 */
export function isIndianMobileCountry(country: string, callingCode?: string): boolean {
  if (toCountryCode(country) === "IN") return true;
  return (callingCode || "").replace(/\D/g, "") === "91";
}

/** Indian mobile numbers must start with 6, 7, 8, or 9 — not 1–5. */
export function getIndianMobileStartError(
  nationalDigits: string,
  country: string,
  callingCode?: string
): string | null {
  if (!nationalDigits || !isIndianMobileCountry(country, callingCode)) return null;
  const firstDigit = nationalDigits[0];
  if (firstDigit >= "1" && firstDigit <= "5") {
    return "Indian mobile numbers must start with 6, 7, 8, or 9";
  }
  return null;
}

export function validatePhonePattern(
  nationalDigits: string,
  _country?: string,
  _callingCode?: string
): string | null {
  if (!nationalDigits) {
    return "Please enter a phone number";
  }

  const indianStartError = getIndianMobileStartError(
    nationalDigits,
    _country || "IN",
    _callingCode
  );
  if (indianStartError) return indianStartError;

  const len = nationalDigits.length;

  if (len >= 7 && /^(\d)\1+$/.test(nationalDigits)) {
    return "Phone number cannot contain all identical digits";
  }

  if (len >= 8 && /^(\d\d)\1{3,}$/.test(nationalDigits)) {
    return "Phone number pattern is invalid";
  }

  if (len >= 8) {
    const invalidPatterns = [
      "0123456789",
      "1234567890",
      "9876543210",
      "0987654321",
    ];
    if (invalidPatterns.some((pattern) => nationalDigits.includes(pattern))) {
      return "Sequential phone numbers are not allowed";
    }
  }

  if (len <= 12) {
    const digitCounts: Record<string, number> = {};
    let maxCount = 0;
    for (const char of nationalDigits) {
      digitCounts[char] = (digitCounts[char] || 0) + 1;
      if (digitCounts[char] > maxCount) {
        maxCount = digitCounts[char];
      }
    }
    if (maxCount >= 8) {
      return "Phone number contains too many repeated digits";
    }
  }

  return null;
}

export function validatePhone(
  phone: string,
  country: string,
  callingCode: string
): string | null {
  const nationalDigits = extractNationalDigits(phone, callingCode);
  const maxLen = getMaxNationalLength(country);

  if (nationalDigits.length > maxLen) {
    return `Phone number must be ${maxLen} digits for this country`;
  }

  if (!isPhoneValidForCountry(phone, country)) {
    return getPhoneLengthError(phone, country) ?? "Please enter a valid phone number";
  }

  return validatePhonePattern(nationalDigits, country, callingCode);
}

/** Reject MuiTelInput updates that exceed length or use invalid Indian mobile prefixes. */
export function shouldAcceptPhoneValue(
  nationalNumber: string,
  country: string,
  callingCode?: string
): boolean {
  if (getIndianMobileStartError(nationalNumber, country, callingCode)) {
    return false;
  }
  return nationalNumber.length <= getMaxNationalLength(country);
}
