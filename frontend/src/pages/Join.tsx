import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Radio } from "lucide-react";
import { Header, Footer } from "../components/Shared";
import { getTicket, ticketKey } from "../data";

export default function Join() {
  const [params] = useSearchParams();
  const [pin, setPin] = useState(
    (params.get("pin") ?? "").replace(/\D/g, "").slice(0, 6),
  );
  const [name, setName] = useState("");
  const navigate = useNavigate();
  return (
    <>
      <Header />
      <main className="join-page wrap">
        <div className="join-copy">
          <span className="eyebrow">
            <span className="live-dot" /> ΤΟ ΠΑΙΧΝΙΔΙ ΑΡΧΙΖΕΙ ΜΕ ΕΣΕΝΑ
          </span>
          <h1>
            Πάρε θέση.
            <br />
            Δώσε το <em>σήμα.</em>
          </h1>
          <p>
            Βάλε το PIN που εμφανίζεται στην οθόνη και το όνομα με το οποίο
            θέλεις να παίξεις.
          </p>
          <div className="join-illustration" aria-hidden="true">
            <span>✳</span>
            <span>↗</span>
            <span>✦</span>
          </div>
        </div>
        <section className="join-card">
          <span className="square-icon">
            <Radio size={27} />
          </span>
          <h2>Μπες στο παιχνίδι</h2>
          <p>Μόνο δύο μικρά βήματα και είσαι μέσα.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const existing = getTicket(pin, "player");
              sessionStorage.setItem(
                ticketKey(pin, "player"),
                JSON.stringify(
                  existing ?? { role: "player", token: "", name: name.trim() },
                ),
              );
              navigate(`/play/${pin}`);
            }}
          >
            <label className="field">
              PIN παιχνιδιού
              <input
                className="pin-input"
                autoFocus
                required
                pattern="[0-9]{6}"
                inputMode="numeric"
                maxLength={6}
                placeholder="000 000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="field">
              Το όνομά σου
              <input
                required
                maxLength={24}
                placeholder="Πώς να σε φωνάζουμε;"
                value={name}
                onChange={(e) => setName(e.target.value)}
                pattern=".*\S.*"
                autoComplete="nickname"
              />
            </label>
            <button className="button button-dark w-full" type="submit">
              Είμαι μέσα <ArrowRight size={18} />
            </button>
          </form>
          <small>
            <CheckCircle2 size={14} /> Χωρίς λογαριασμό. Χωρίς εγκατάσταση.
          </small>
        </section>
      </main>
      <Footer />
    </>
  );
}
