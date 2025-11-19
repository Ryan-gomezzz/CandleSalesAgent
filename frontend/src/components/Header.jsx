import { Link, NavLink } from 'react-router-dom';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Enquiry', to: '/enquiry' },
];

function Header() {
  return (
    <header className="border-b border-brand-peach/60 bg-brand-cream/95 backdrop-blur">
      <div className="section-container flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="text-3xl font-semibold font-display text-brand-brown">
          Candle &amp; Co
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-brand-olive">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `transition-colors ${isActive ? 'text-brand-brown' : 'hover:text-brand-brown'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/enquiry"
            className="rounded-full bg-brand-brown px-4 py-2 text-brand-cream transition hover:bg-brand-olive"
          >
            Request a Call
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;


