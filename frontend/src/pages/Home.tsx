import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Edit3,
  Radio,
  Trophy,
  Users,
} from "lucide-react";
import { Header, Footer, PinForm } from "../components/Shared";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> Η ΤΑΞΗ ΣΟΥ, ΣΕ ΠΡΑΓΜΑΤΙΚΟ ΧΡΟΝΟ
            </div>
            <h1>
              Μια ερώτηση.
              <br />
              Όλοι <span className="underlined">μέσα.</span>
            </h1>
            <p className="hero-description">
              Μετέτρεψε το «το καταλάβαμε;» σε μια στιγμή συμμετοχής. Φτιάξε ένα
              quiz, μοιράσου το PIN και δώσε τον λόγο σε όλους.
            </p>
            <div className="hero-actions">
              <Link to="/quizzes/new" className="button button-dark">
                Δημιούργησε ένα quiz <ArrowRight size={18} />
              </Link>
              <a href="#how" className="text-link">
                Πώς λειτουργεί <ArrowDown size={16} />
              </a>
            </div>
            <div className="hero-note">
              <span className="tiny-avatars">
                <i>Μ</i>
                <i>Α</i>
                <i>Ν</i>
              </span>
              <span>Χωρίς εγκατάσταση. Μόνο ένας browser.</span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Ενδεικτική προεπισκόπηση παιχνιδιού"
          >
            <div className="art-grid" />
            <span className="floating-note note-top">
              <span className="live-dot" /> LIVE ΑΠΟ ΤΗΝ ΤΑΞΗ
            </span>
            <div className="preview-card">
              <div className="preview-header">
                <span>
                  <Radio size={15} /> ΓΥΡΟΣ ΠΕΡΙΕΡΓΕΙΑΣ
                </span>
                <span>01 / 04</span>
              </div>
              <div className="preview-question">
                Οι καλύτερες ιδέες
                <br />
                ξεκινούν με…
              </div>
              <div className="preview-options">
                <div>
                  <span>Α</span> μία ερώτηση <Check size={18} />
                </div>
                <div>
                  <span>Β</span> μια έτοιμη απάντηση
                </div>
                <div>
                  <span>Γ</span> λίγο περισσότερο καφέ
                </div>
                <div>
                  <span>Δ</span> όλα τα παραπάνω
                </div>
              </div>
              <div className="preview-bottom">
                <Users size={15} /> 24 συμμετοχές <span>18″</span>
              </div>
            </div>
            <div className="floating-result">
              <span className="result-star">✦</span>
              <div>
                <strong>Αυτό είναι το σήμα σου.</strong>
                <small>Η συμμετοχή μόλις ανέβηκε.</small>
              </div>
              <span className="result-points">+1000</span>
            </div>
            <span className="art-caption">
              ΜΙΚΡΕΣ ΕΡΩΤΗΣΕΙΣ. ΜΕΓΑΛΗ ΣΥΜΜΕΤΟΧΗ.
            </span>
          </div>
        </section>
        <section className="join-strip wrap">
          <div>
            <span className="square-icon">
              <Radio size={22} />
            </span>
            <div>
              <h2>Έχεις ήδη PIN;</h2>
              <p>Η παρέα σου σε περιμένει.</p>
            </div>
          </div>
          <PinForm compact />
        </section>
        <section id="how" className="how wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ΑΠΛΟ ΑΠΟ ΤΗΝ ΠΡΩΤΗ ΣΤΙΓΜΗ</p>
              <h2>Τρία βήματα. Μία ζωντανή τάξη.</h2>
            </div>
            <span className="hand-note">
              λιγότερη προετοιμασία,
              <br />
              περισσότερη αλληλεπίδραση ↴
            </span>
          </div>
          <div className="steps">
            {[
              {
                number: "01",
                title: "Φτιάξε την αφορμή.",
                description:
                  "Γράψε τις ερωτήσεις σου, διάλεξε απαντήσεις και βάλε τον δικό σου ρυθμό.",
                Icon: Edit3,
              },
              {
                number: "02",
                title: "Μάζεψε την παρέα.",
                description:
                  "Άνοιξε το παιχνίδι και μοιράσου το εξαψήφιο PIN. Όλοι μπαίνουν από το κινητό τους.",
                Icon: Users,
              },
              {
                number: "03",
                title: "Δες τη γνώση να κινείται.",
                description:
                  "Απαντήσεις, αποτελέσματα και κατάταξη εμφανίζονται ζωντανά. Η συζήτηση ξεκινά εδώ.",
                Icon: Trophy,
              },
            ].map(({ number, title, description, Icon }) => (
              <article key={number}>
                <div className="step-top">
                  <span>{number}</span>
                  <Icon size={23} strokeWidth={1.5} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="bottom-cta wrap">
          <div>
            <span className="eyebrow">ΚΑΘΕ ΤΑΞΗ ΕΧΕΙ ΚΑΤΙ ΝΑ ΠΕΙ</span>
            <h2>Δώσε της το σήμα.</h2>
          </div>
          <Link to="/quizzes" className="button button-dark">
            Ας ξεκινήσουμε <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
