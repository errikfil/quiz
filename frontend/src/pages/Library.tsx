import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  LayoutGrid,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import { Header, Footer, ErrorNotice, Busy } from "../components/Shared";
import {
  api,
  errorMessage,
  library,
  remember,
  sampleQuiz,
  ticketKey,
} from "../data";
import type { SavedQuiz } from "../types";

export default function Library() {
  const [items, setItems] = useState(library);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();
  async function createSample() {
    setBusy("sample");
    setError("");
    try {
      const { data } = await api.post<SavedQuiz>("/quizzes", sampleQuiz);
      remember(data);
      setItems(library());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }
  async function start(quiz: SavedQuiz) {
    setBusy(quiz.id);
    setError("");
    try {
      const { data } = await api.post(
        `/quizzes/${quiz.id}/sessions`,
        {},
        { headers: { "X-Quiz-Key": quiz.ownerKey } },
      );
      sessionStorage.setItem(
        ticketKey(data.pin, "host"),
        JSON.stringify({ role: "host", token: data.hostToken }),
      );
      navigate(`/host/${data.pin}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <Header />
      <main className="wrap page-main">
        <div className="breadcrumbs">
          <LayoutGrid size={15} /> Ο ΧΩΡΟΣ ΣΟΥ
        </div>
        <div className="page-title">
          <div>
            <h1>
              Τα quiz μου<span className="small-dot">.</span>
            </h1>
            <p>Οι ιδέες σου, έτοιμες να γίνουν παιχνίδι.</p>
          </div>
          <Link className="button button-dark" to="/quizzes/new">
            <Plus size={19} /> Νέο quiz
          </Link>
        </div>
        <ErrorNotice message={error} />
        <div className="library-info">
          <span>
            <span className="live-dot" /> {items.length}{" "}
            {items.length === 1 ? "quiz" : "quiz"} στη βιβλιοθήκη σου
          </span>
          <span>Αποθηκευμένα για αυτόν τον browser</span>
        </div>
        <div className="quiz-grid">
          {items.map((quiz, index) => (
            <article className="quiz-card" key={quiz.id}>
              <div className={`quiz-cover cover-${index % 3}`}>
                <span>ΣΗΜΑ / QUIZ</span>
                <div>{["✳", "↗", "✦"][index % 3]}</div>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </div>
              <div className="quiz-card-body">
                <span className="eyebrow">{quiz.questionCount} ΕΡΩΤΗΣΕΙΣ</span>
                <h2>{quiz.title}</h2>
                <div className="quiz-card-actions">
                  <Link
                    to={`/quizzes/${quiz.id}/edit`}
                    className="icon-button"
                    aria-label={`Επεξεργασία: ${quiz.title}`}
                  >
                    <Edit3 size={18} />
                  </Link>
                  <button
                    className="button button-dark button-small"
                    disabled={busy !== null}
                    onClick={() => void start(quiz)}
                  >
                    {busy === quiz.id ? (
                      <Busy label="Άνοιγμα…" />
                    ) : (
                      <>
                        <Play size={15} /> Παίξε live
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          ))}
          <button
            disabled={busy !== null}
            className="sample-card"
            onClick={() => void createSample()}
          >
            <span className="sample-icon">
              <Sparkles size={28} />
            </span>
            <h2>
              {items.length ? "Ένα quiz για δοκιμή;" : "Ξεκίνα με κάτι έτοιμο."}
            </h2>
            <p>
              Τέσσερις ερωτήσεις για το web και τη σχεδίαση. Για να γνωρίσεις το
              Σήμα στην πράξη.
            </p>
            <span className="text-link">
              {busy === "sample" ? (
                <Busy label="Δημιουργία…" />
              ) : (
                <>
                  Πρόσθεσε το δοκιμαστικό <ArrowRight size={17} />
                </>
              )}
            </span>
          </button>
        </div>
        <div className="subtle-note">
          <CheckCircle2 size={17} />
          <p>
            Τα quiz αποθηκεύονται στον server. Η πρόσβασή σου φυλάσσεται σε
            αυτόν τον browser — μην καθαρίσεις τα δεδομένα του πριν κρατήσεις
            αντίγραφο του quiz σου.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
