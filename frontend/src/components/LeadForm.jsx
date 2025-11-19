import { useState } from 'react';

// For Vercel, use relative paths (API routes are at root level via rewrites)
// For local dev, default to localhost:3000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000');

function LeadForm() {
  const [formValues, setFormValues] = useState({
    name: '',
    phone: '',
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    const nextErrors = {};
    const digits = formValues.phone.replace(/\D/g, '');
    if (!formValues.phone) {
      nextErrors.phone = 'Phone number is required.';
    } else if (digits.length < 10 || digits.length > 15) {
      nextErrors.phone = 'Enter a valid phone number (10–15 digits).';
    }

    if (!formValues.consent) {
      nextErrors.consent = 'We need your consent to place a call.';
    }
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setStatus({ type: 'pending', message: 'Submitting enquiry...' });
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/enquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setStatus({
        type: 'success',
        message: data.message || 'Call queued — we will try to reach you in a few minutes.',
      });
      setFormValues({ name: '', phone: '', consent: false });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to submit. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-brand-peach bg-white/70 p-6 shadow-sm backdrop-blur"
    >
      <div>
        <label htmlFor="name" className="text-sm font-semibold text-brand-brown">
          Name <span className="font-normal text-brand-olive">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formValues.name}
          onChange={handleChange}
          className="mt-2 w-full rounded-xl border border-brand-peach bg-brand-cream/60 px-4 py-3 text-brand-brown focus:border-brand-brown focus:outline-none"
          placeholder="Ananya"
        />
      </div>
      <div>
        <label htmlFor="phone" className="text-sm font-semibold text-brand-brown">
          Phone number<span className="text-red-700">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={formValues.phone}
          onChange={handleChange}
          className="mt-2 w-full rounded-xl border border-brand-peach bg-brand-cream/60 px-4 py-3 text-brand-brown focus:border-brand-brown focus:outline-none"
          placeholder="+91XXXXXXXXXX"
          required
        />
        <p className="mt-1 text-xs text-brand-olive">
          Please share a reachable number so Maya can call you. Prices quoted exclude GST.
        </p>
        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
      </div>
      <div className="flex items-start gap-3">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          checked={formValues.consent}
          onChange={handleChange}
          className="mt-1 h-5 w-5 rounded border-brand-peach accent-brand-brown"
          required
        />
        <label htmlFor="consent" className="text-sm text-brand-brown">
          I consent to receive a call from Candle &amp; Co regarding offers.
        </label>
      </div>
      {errors.consent && <p className="text-sm text-red-600">{errors.consent}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-brown py-3 text-lg font-semibold text-brand-cream transition hover:bg-brand-olive disabled:cursor-not-allowed disabled:bg-brand-olive/70"
      >
        {isSubmitting ? 'Submitting...' : 'Submit enquiry'}
      </button>
      {status.message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'bg-green-50 text-green-900'
              : status.type === 'error'
              ? 'bg-red-50 text-red-700'
              : 'bg-brand-peach/40 text-brand-brown'
          }`}
        >
          {status.message}
        </div>
      )}
    </form>
  );
}

export default LeadForm;


