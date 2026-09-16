import dynamic from "next/dynamic";

const Questionnaire = dynamic(() => import("@/containers/slides/questionare"), {
  loading: () => (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#f8faf9",
        color: "#2F5D46",
        fontSize: 18,
      }}
    >
      Loading…
    </div>
  ),
});

export default function QuestionnairePage() {
  return <Questionnaire />;
}
