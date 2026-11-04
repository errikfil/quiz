import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ArrowRight, Signal, LoaderCircle } from "lucide-react";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Σήμα, αρχική">
      <span className="brand-icon">
        <Signal size={23} strokeWidth={2.5} />
      </span>
      σήμα<span className="brand-dot">.</span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Κύρια πλοήγηση">
        <NavLink to="/" end>
          Αρχική
        </NavLink>
        <NavLink to="/quizzes">Τα quiz μου</NavLink>
      </nav>
      <Link className="button button-small button-outline" to="/join">
        Μπες σε παιχνίδι <ArrowRight size={15} />
      </Link>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <Brand />
      <span>Λίγη περιέργεια. Πολλές καλές ερωτήσεις.</span>
      <span>Μαθαίνουμε μαζί ↗</span>
    </footer>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="notice error">
      <span>{message}</span>
    </div>
  ) : null;
}
export function Busy({ label = "Φόρτωση…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LoaderCircle className="spin" size={17} />
      {label}
    </span>
  );
}
export function PinForm({ compact = false }: { compact?: boolean }) {
  const [pin, setPin] = useState("");
  const navigate = useNavigate();
  return (
    <form
      className={compact ? "pin-form compact" : "pin-form"}
      onSubmit={(e) => {
        e.preventDefault();
        if (pin.length === 6) navigate(`/join?pin=${pin}`);
      }}
    >
      <label className="sr-only" htmlFor="home-pin">
        PIN παιχνιδιού
      </label>
      <input
        id="home-pin"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="PIN παιχνιδιού"
        required
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
      />
      <button className="button button-dark" type="submit">
        Πάμε <ArrowRight size={18} />
      </button>
    </form>
  );
}
