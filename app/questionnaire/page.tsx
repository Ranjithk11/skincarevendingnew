import { Suspense } from "react";
import Questionnaire from "@/containers/slides/questionare";

export default function QuestionnairePage() {
  return (
    <Suspense fallback={null}>
      <Questionnaire />
    </Suspense>
  );
}
