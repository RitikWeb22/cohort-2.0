import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function FormField({
  id,
  label,
  value,
  error,
  warning,
  helperText,
  requiredForInvoice = false,
  required = false,
  children,
  className = '',
  suffix = null,
}) {
  const isFilled = value !== undefined && value !== null && String(value).trim().length > 0;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Label Row */}
      <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
        <label
          htmlFor={id}
          className="text-sm font-semibold text-[#0E1A2B] leading-none select-none flex items-center gap-1.5"
          style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
        >
          <span>{label}</span>
          {required && <span className="text-[#B42318] text-xs font-bold leading-none" aria-hidden="true">*</span>}
        </label>

        {/* Required for invoices notice: ONLY appears while empty. Green check or nothing when filled */}
        {requiredForInvoice && (
          <div className="flex items-center gap-1 text-[11px] font-medium leading-none">
            {isFilled ? (
              <span className="text-[#067647] flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-[#067647]" />
                <span>Ready for invoices</span>
              </span>
            ) : (
              <span className="text-[#B54708] bg-[#FFF4CC] px-1.5 py-0.5 rounded font-semibold text-[10px]">
                Required for invoices
              </span>
            )}
          </div>
        )}
      </div>

      {/* Input Slot */}
      <div className="relative">
        {children}
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold text-[#5B6676]">
            {suffix}
          </div>
        )}
      </div>

      {/* Fixed slot for helper / error text so inputs in grid columns remain strictly aligned */}
      <div className="min-h-[20px] mt-1 text-[12px] leading-tight flex items-center">
        {error ? (
          <p id={errorId} role="alert" className="text-[#B42318] font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#B42318]" />
            <span>{error}</span>
          </p>
        ) : warning ? (
          <p className="text-[#B54708] font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#B54708]" />
            <span>{warning}</span>
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-[#5B6676]">
            {helperText}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TextInput({
  id,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder = '',
  disabled = false,
  error = false,
  className = '',
  autoComplete,
  ...props
}) {
  return (
    <input
      id={id}
      type={type}
      value={value ?? ''}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={`${id}-error ${id}-helper`}
      className={`w-full h-[44px] px-3.5 bg-white text-[#0E1A2B] text-[15px] placeholder:text-[#5B6676]/60 rounded-xl border transition-colors outline-none font-sans ${
        error
          ? 'border-[#B42318] focus-visible:ring-2 focus-visible:ring-[#B42318] focus-visible:border-[#B42318]'
          : 'border-[#E8E0CF] hover:border-[#0E1A2B]/40 focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:border-[#0047AB]'
      } ${disabled ? 'bg-[#FAF5EA]/50 text-[#5B6676] cursor-not-allowed border-[#E8E0CF]' : ''} ${className}`}
      style={{
        fontFamily: "'Instrument Sans', system-ui, -apple-system, sans-serif",
      }}
      {...props}
    />
  );
}

export function SelectInput({
  id,
  value,
  onChange,
  onBlur,
  disabled = false,
  error = false,
  children,
  className = '',
  ...props
}) {
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={`${id}-error ${id}-helper`}
      className={`w-full h-[44px] px-3.5 bg-white text-[#0E1A2B] text-[15px] rounded-xl border transition-colors outline-none cursor-pointer font-sans appearance-none pr-8 bg-no-repeat bg-[right_12px_center] ${
        error
          ? 'border-[#B42318] focus-visible:ring-2 focus-visible:ring-[#B42318]'
          : 'border-[#E8E0CF] hover:border-[#0E1A2B]/40 focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:border-[#0047AB]'
      } ${disabled ? 'bg-[#FAF5EA]/50 text-[#5B6676] cursor-not-allowed' : ''} ${className}`}
      style={{
        fontFamily: "'Instrument Sans', system-ui, -apple-system, sans-serif",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235B6676' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="space-y-0.5">
        <label
          htmlFor={id}
          className="text-sm font-semibold text-[#0E1A2B] block cursor-pointer select-none leading-tight"
          style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-[#5B6676] leading-normal">{description}</p>
        )}
      </div>

      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:ring-offset-2 ${
          checked ? 'bg-[#0047AB]' : 'bg-[#E8E0CF]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
