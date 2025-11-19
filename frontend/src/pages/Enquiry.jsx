import LeadForm from '../components/LeadForm';

function Enquiry() {
  return (
    <section className="section-container grid gap-10 lg:grid-cols-2 lg:items-center">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.4em] text-brand-olive">Enquiry</p>
        <h1 className="font-display text-4xl text-brand-brown">Share your details</h1>
        <p className="text-brand-olive">
          Tell us how we can help—wedding favors, corporate gifting, studio décor, or a personal
          ritual upgrade. Maya from Candle &amp; Co will call you back within the next few minutes
          during business hours. Please keep your phone handy and remember that prices are quoted
          exclusive of GST.
        </p>
        <div className="rounded-2xl bg-brand-peach/40 p-4 text-sm text-brand-brown">
          <p className="font-semibold">Need help faster?</p>
          <p>
            Email hello@candleandco.in with your requirements or visit our Indiranagar studio by
            appointment (Tue–Sat, 11am–6pm).
          </p>
        </div>
      </div>
      <LeadForm />
    </section>
  );
}

export default Enquiry;


