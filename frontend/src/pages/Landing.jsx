import { Link } from 'react-router-dom';

const highlights = [
  {
    title: 'Hand-poured batches',
    copy: 'Small runs ensure perfect scent throw and a clean, even burn.',
  },
  {
    title: 'Thoughtful gifting',
    copy: 'Discovery trios and custom notes for weddings, retreats, or client delight.',
  },
  {
    title: 'Conscious materials',
    copy: 'Coconut-soy wax, lead-free wicks, and IFRA-compliant aromas.',
  },
];

function Landing() {
  return (
    <div className="space-y-16 pb-12">
      <section className="section-container grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.4em] text-brand-olive">Candle &amp; Co</p>
          <h1 className="font-display text-4xl leading-tight text-brand-brown sm:text-5xl">
            Candle &amp; Co — Handcrafted scented candles
          </h1>
          <p className="text-lg text-brand-olive">
            Our atelier in Indiranagar pours every jar in micro-batches using coconut-soy wax,
            perfume-grade botanicals, and slow-curing techniques. Request a call to explore the
            scents that fit your home, gifting plan, or corporate experience.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/enquiry"
              className="rounded-full bg-brand-brown px-6 py-3 text-lg font-semibold text-brand-cream transition hover:bg-brand-olive"
            >
              Request a Call
            </Link>
            <Link
              to="/enquiry"
              className="rounded-full border border-brand-brown px-6 py-3 text-lg font-semibold text-brand-brown transition hover:bg-brand-brown/10"
            >
              View enquiry form
            </Link>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-peach/70 via-brand-cream to-brand-olive/40 p-8 shadow-lg">
          <div className="rounded-2xl bg-white/80 p-6 text-brand-brown shadow-inner">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-olive">Featured pour</p>
            <h2 className="mt-4 font-display text-3xl">Monsoon Vetiver</h2>
            <p className="mt-2 text-brand-olive">
              Damp earth, lemongrass zest, and Mysuru sandal curl through the air like the first
              rain on warm stone.
            </p>
            <p className="mt-6 text-sm text-brand-olive">
              220g jar · ₹1,450 (GST additional) · 45 hr burn
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-brand-brown/20 blur-3xl" />
        </div>
      </section>

      <section className="section-container rounded-3xl bg-white/70 p-10 shadow-sm">
        <div className="grid gap-8 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="space-y-2">
              <h3 className="font-display text-2xl text-brand-brown">{item.title}</h3>
              <p className="text-brand-olive">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Landing;


