import {
  priceTypeSelectOptionsGerman,
  type StoredPriceType,
} from '../../lib/pricing/servicePricing';

interface ServicePriceTypeSelectProps {
  value: StoredPriceType;
  onChange: (value: StoredPriceType) => void;
  disabled?: boolean;
  className?: string;
}

export default function ServicePriceTypeSelect({
  value,
  onChange,
  disabled,
  className = 'input w-36 text-sm shrink-0',
}: ServicePriceTypeSelectProps) {
  return (
    <select
      className={className}
      value={value}
      onChange={e => onChange(e.target.value as StoredPriceType)}
      disabled={disabled}
    >
      {priceTypeSelectOptionsGerman().map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
