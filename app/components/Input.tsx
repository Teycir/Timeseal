'use client';

interface InputProps {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  testId?: string;
}

export function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  error,
  testId,
}: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-neon-green font-mono text-sm tracking-wide">{label}</label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className={`cyber-input ${error ? 'border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}`}
      />
      {error && (
        <span className="text-red-500 text-xs font-mono tracking-wider">{error}</span>
      )}
    </div>
  );
}
