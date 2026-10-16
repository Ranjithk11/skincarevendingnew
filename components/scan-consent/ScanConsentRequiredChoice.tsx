"use client";

import ScanConsentChoiceRow from "./ScanConsentChoiceRow";

type Props = {
  checked: boolean;
  onToggle: () => void;
};

export default function ScanConsentRequiredChoice({ checked, onToggle }: Props) {
  return (
    <ScanConsentChoiceRow
      checked={checked}
      onToggle={onToggle}
      required
      title="I agree to a skin scan"
      description="Leaf Water may capture my photo to analyse my skin and show product recommendations for this visit."
    />
  );
}
