"use client";

import ScanConsentChoiceRow from "./ScanConsentChoiceRow";

type Props = {
  checked: boolean;
  onToggle: () => void;
};

export default function ScanConsentMarketingChoice({ checked, onToggle }: Props) {
  return (
    <ScanConsentChoiceRow
      checked={checked}
      onToggle={onToggle}
      title="Send me offers and skincare tips"
      description="Optional. Not required to start the scan. You can shop either way."
    />
  );
}
