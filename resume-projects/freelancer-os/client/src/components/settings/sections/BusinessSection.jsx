import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Building, AlertCircle, Loader2 } from 'lucide-react';
import { FormField, TextInput, SelectInput } from '../FormField';
import { ChecklistBanner } from '../ChecklistBanner';
import { COUNTRY_OPTIONS, INDIAN_STATES, US_STATES } from '../settingsConstants';
import { optimizeImageFile } from '../../../utils/imageUtils';

export function BusinessSection({
  formData,
  errors,
  onChange,
  onBlur,
  onRequestCountryChange,
  onNavigateSection,
}) {
  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isProcessingSignature, setIsProcessingSignature] = useState(false);

  // Handle Logo Upload (Client-side optimization, up to 10MB input -> crisp compact DataURL)
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers change event again
    e.target.value = '';

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    const hasValidExt = /\.(png|jpe?g|svg|webp)$/i.test(file.name || '');

    if (!validTypes.includes(file.type?.toLowerCase()) && !hasValidExt) {
      alert('Please upload a PNG, JPG, SVG, or WebP image.');
      return;
    }

    try {
      setIsProcessingLogo(true);
      const optimizedUrl = await optimizeImageFile(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.85,
        maxFileSizeMb: 10,
        outputType: file.type === 'image/svg+xml' ? 'auto' : 'image/png',
      });
      onChange('logoUrl', optimizedUrl);
    } catch (err) {
      alert(err.message || 'Failed to process logo image.');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  // Handle Signature Upload (PNG with transparent background, up to 10MB input -> compact DataURL)
  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers change event again
    e.target.value = '';

    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name || '');
    if (!isPng) {
      alert('Signature must be a PNG image with a transparent background.');
      return;
    }

    try {
      setIsProcessingSignature(true);
      const optimizedUrl = await optimizeImageFile(file, {
        maxWidth: 800,
        maxHeight: 300,
        quality: 0.9,
        maxFileSizeMb: 10,
        outputType: 'image/png',
      });
      onChange('signatureUrl', optimizedUrl);
    } catch (err) {
      alert(err.message || 'Failed to process signature image.');
    } finally {
      setIsProcessingSignature(false);
    }
  };

  const currentCountry = COUNTRY_OPTIONS.find((c) => c.code === formData.country) || COUNTRY_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Setup Checklist Banner */}
      <ChecklistBanner formData={formData} onNavigateSection={onNavigateSection} />

      {/* Brand & Identity Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Studio identity
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Your studio branding and public letterhead details.
          </p>
        </div>

        {/* Visual Assets Row (Logo & Signature) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          {/* Logo Upload */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#0E1A2B] block">
              Business logo
            </label>
            <div className="flex items-center gap-4">
              {formData.logoUrl ? (
                <div className="relative w-24 h-24 rounded-xl border border-[#E8E0CF] bg-[#FAF5EA]/40 p-2 flex items-center justify-center group">
                  <img
                    src={formData.logoUrl}
                    alt="Logo preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => onChange('logoUrl', '')}
                    aria-label="Remove logo"
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-[#B42318] text-white shadow-xs hover:bg-[#912018] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isProcessingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-[#E8E0CF] hover:border-[#0047AB] bg-[#FAF5EA]/30 hover:bg-[#E8F0FB]/30 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer group disabled:opacity-60"
                >
                  {isProcessingLogo ? (
                    <Loader2 className="w-5 h-5 text-[#0047AB] animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-[#5B6676] group-hover:text-[#0047AB]" />
                  )}
                  <span className="text-[11px] font-bold text-[#5B6676] group-hover:text-[#0047AB]">
                    {isProcessingLogo ? 'Optimizing...' : 'Upload'}
                  </span>
                </button>
              )}

              <div className="text-xs text-[#5B6676] space-y-1">
                <p className="font-medium text-[#0E1A2B]">PNG, JPG, SVG, or WebP</p>
                <p>Rendered on invoice headers and proposal title pages.</p>
                <button
                  type="button"
                  disabled={isProcessingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="text-xs font-bold text-[#0047AB] hover:underline cursor-pointer disabled:opacity-60"
                >
                  {formData.logoUrl ? 'Change logo image' : 'Choose logo file'}
                </button>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* Signature Upload */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#0E1A2B] block">
              Authorized signature image
            </label>
            <div className="flex items-center gap-4">
              {formData.signatureUrl ? (
                <div className="relative w-28 h-20 rounded-xl border border-[#E8E0CF] bg-[#FAF5EA]/40 p-2 flex items-center justify-center">
                  <img
                    src={formData.signatureUrl}
                    alt="Signature preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => onChange('signatureUrl', '')}
                    aria-label="Remove signature"
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-[#B42318] text-white shadow-xs hover:bg-[#912018] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isProcessingSignature}
                  onClick={() => signatureInputRef.current?.click()}
                  className="w-28 h-20 rounded-xl border-2 border-dashed border-[#E8E0CF] hover:border-[#0047AB] bg-[#FAF5EA]/30 hover:bg-[#E8F0FB]/30 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer group disabled:opacity-60"
                >
                  {isProcessingSignature ? (
                    <Loader2 className="w-5 h-5 text-[#0047AB] animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-[#5B6676] group-hover:text-[#0047AB]" />
                  )}
                  <span className="text-[11px] font-bold text-[#5B6676] group-hover:text-[#0047AB]">
                    {isProcessingSignature ? 'Optimizing...' : 'Upload PNG'}
                  </span>
                </button>
              )}

              <div className="text-xs text-[#5B6676] space-y-1">
                <p className="font-medium text-[#0E1A2B]">PNG with transparent background</p>
                <p>Stamped on proposal approval acceptance blocks.</p>
                <button
                  type="button"
                  disabled={isProcessingSignature}
                  onClick={() => signatureInputRef.current?.click()}
                  className="text-xs font-bold text-[#0047AB] hover:underline cursor-pointer disabled:opacity-60"
                >
                  {formData.signatureUrl ? 'Change signature PNG' : 'Choose signature PNG'}
                </button>
              </div>
            </div>
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png"
              onChange={handleSignatureUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Primary Contact Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <FormField
            id="name"
            label="Your full name"
            value={formData.name}
            error={errors.name}
            required
            helperText="The contracting freelancer or primary representative"
          >
            <TextInput
              id="name"
              value={formData.name}
              onChange={(e) => onChange('name', e.target.value)}
              onBlur={() => onBlur('name')}
              placeholder="e.g. Alex Morgan"
              error={Boolean(errors.name)}
              autoComplete="name"
            />
          </FormField>

          <FormField
            id="businessName"
            label="Business or studio name"
            value={formData.businessName}
            error={errors.businessName}
            required
            helperText="Appears on proposal headers and legal invoices"
          >
            <TextInput
              id="businessName"
              value={formData.businessName}
              onChange={(e) => onChange('businessName', e.target.value)}
              onBlur={() => onBlur('businessName')}
              placeholder="e.g. Studio Vertex Ltd"
              error={Boolean(errors.businessName)}
              autoComplete="organization"
            />
          </FormField>

          <FormField
            id="businessEmail"
            label="Billing email"
            value={formData.businessEmail}
            error={errors.businessEmail}
            required
            helperText="Invoices and client correspondence will reference this"
          >
            <TextInput
              id="businessEmail"
              type="email"
              value={formData.businessEmail}
              onChange={(e) => onChange('businessEmail', e.target.value)}
              onBlur={() => onBlur('businessEmail')}
              placeholder="billing@yourstudio.com"
              error={Boolean(errors.businessEmail)}
              autoComplete="email"
            />
          </FormField>

          <FormField
            id="businessPhone"
            label="Phone number"
            value={formData.businessPhone}
            error={errors.businessPhone}
            requiredForInvoice
            helperText="Country code aware (e.g. +1 555-0199 or +91 98765 43210)"
          >
            <TextInput
              id="businessPhone"
              type="tel"
              value={formData.businessPhone}
              onChange={(e) => onChange('businessPhone', e.target.value)}
              onBlur={() => onBlur('businessPhone')}
              placeholder="+1 (555) 0199"
              error={Boolean(errors.businessPhone)}
              autoComplete="tel"
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField
              id="website"
              label="Website"
              value={formData.website}
              error={errors.website}
              helperText="Optional link displayed on proposal documents"
            >
              <TextInput
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => onChange('website', e.target.value)}
                onBlur={() => onBlur('website')}
                placeholder="https://yourstudio.com"
                error={Boolean(errors.website)}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Physical Location & Address Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Business address
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Legal tax domicile and physical address printed on invoices.
          </p>
        </div>

        <div className="space-y-4">
          {/* Country Selection (Drives defaults) */}
          <FormField
            id="country"
            label="Country"
            value={formData.country}
            error={errors.country}
            required
            helperText="Drives tax rules, currency conventions, and paper sizes"
          >
            <SelectInput
              id="country"
              value={formData.country}
              onChange={(e) => {
                const target = COUNTRY_OPTIONS.find((c) => c.code === e.target.value);
                if (target && target.code !== formData.country) {
                  onRequestCountryChange(target);
                } else {
                  onChange('country', e.target.value);
                }
              }}
              onBlur={() => onBlur('country')}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.currency})
                </option>
              ))}
            </SelectInput>
          </FormField>

          {/* Address Line 1 */}
          <FormField
            id="addressLine1"
            label="Address line 1"
            value={formData.addressLine1}
            error={errors.addressLine1}
            requiredForInvoice
            helperText="Street address, P.O. box, or company building"
          >
            <TextInput
              id="addressLine1"
              value={formData.addressLine1}
              onChange={(e) => onChange('addressLine1', e.target.value)}
              onBlur={() => onBlur('addressLine1')}
              placeholder="e.g. 100 Innovation Way, Suite 400"
              error={Boolean(errors.addressLine1)}
              autoComplete="address-line1"
            />
          </FormField>

          {/* Address Line 2 */}
          <FormField
            id="addressLine2"
            label="Address line 2"
            value={formData.addressLine2}
            helperText="Apartment, suite, unit, building, floor, etc. (Optional)"
          >
            <TextInput
              id="addressLine2"
              value={formData.addressLine2}
              onChange={(e) => onChange('addressLine2', e.target.value)}
              onBlur={() => onBlur('addressLine2')}
              placeholder="Floor 4 / Unit B"
              autoComplete="address-line2"
            />
          </FormField>

          {/* City, State/Region, Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              id="city"
              label="City"
              value={formData.city}
              error={errors.city}
              requiredForInvoice
            >
              <TextInput
                id="city"
                value={formData.city}
                onChange={(e) => onChange('city', e.target.value)}
                onBlur={() => onBlur('city')}
                placeholder="e.g. Austin"
                error={Boolean(errors.city)}
                autoComplete="address-level2"
              />
            </FormField>

            <FormField
              id="state"
              label={formData.country === 'IN' ? 'State' : formData.country === 'US' ? 'State' : 'State / Province / Region'}
              value={formData.state}
              error={errors.state}
              requiredForInvoice
            >
              {formData.country === 'IN' ? (
                <SelectInput
                  id="state"
                  value={formData.state}
                  onChange={(e) => onChange('state', e.target.value)}
                  onBlur={() => onBlur('state')}
                  error={Boolean(errors.state)}
                >
                  <option value="">Select state...</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </SelectInput>
              ) : formData.country === 'US' ? (
                <SelectInput
                  id="state"
                  value={formData.state}
                  onChange={(e) => onChange('state', e.target.value)}
                  onBlur={() => onBlur('state')}
                  error={Boolean(errors.state)}
                >
                  <option value="">Select state...</option>
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </SelectInput>
              ) : (
                <TextInput
                  id="state"
                  value={formData.state}
                  onChange={(e) => onChange('state', e.target.value)}
                  onBlur={() => onBlur('state')}
                  placeholder="e.g. Ontario / London"
                  error={Boolean(errors.state)}
                  autoComplete="address-level1"
                />
              )}
            </FormField>

            <FormField
              id="postalCode"
              label="Postal / ZIP code"
              value={formData.postalCode}
              error={errors.postalCode}
              requiredForInvoice
            >
              <TextInput
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => onChange('postalCode', e.target.value)}
                onBlur={() => onBlur('postalCode')}
                placeholder="e.g. 78701 or 560001"
                error={Boolean(errors.postalCode)}
                autoComplete="postal-code"
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );
}
