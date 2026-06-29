/** Query param value: ?flow=free-consultation */
export const FREE_CONSULTATION_FLOW = "free-consultation";

export function isFreeConsultationFlow(
  flow: string | null | undefined
): boolean {
  return flow === FREE_CONSULTATION_FLOW;
}

export function questionnairePathForFlow(flow?: string | null): string {
  return flow && isFreeConsultationFlow(flow)
    ? `/questionnaire?flow=${FREE_CONSULTATION_FLOW}`
    : "/questionnaire";
}

export function selfiePathForFlow(flow?: string | null): string {
  return flow && isFreeConsultationFlow(flow)
    ? `/skinanalysis/selfie?flow=${FREE_CONSULTATION_FLOW}`
    : "/skinanalysis/selfie";
}

export const CONSULTATION_TIME_OPTIONS = [
  { value: "morning", label: "Morning 9am - 12 pm" },
  { value: "afternoon", label: "Afternoon 12 pm - 5 pm" },
  { value: "evening", label: "Evening 5 pm - 8 pm" },
] as const;

export type ConsultationTimeValue =
  (typeof CONSULTATION_TIME_OPTIONS)[number]["value"];

export function getConsultationTimeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return (
    CONSULTATION_TIME_OPTIONS.find((opt) => opt.value === value)?.label || value
  );
}

export function selfiePathForConsultation(preferredTime: string): string {
  const params = new URLSearchParams({
    flow: FREE_CONSULTATION_FLOW,
    preferredTime,
  });
  return `/skinanalysis/selfie?${params.toString()}`;
}
