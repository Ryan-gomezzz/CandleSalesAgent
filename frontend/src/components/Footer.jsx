import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-brand-brown text-brand-cream">
      <div className="section-container flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Candle &amp; Co. All handcrafted with care in Bengaluru.</p>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-6">
          <span>Studio: Indiranagar, Tue–Sat 11am–6pm</span>
          <Link to="/admin" className="text-brand-peach underline underline-offset-4">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;


