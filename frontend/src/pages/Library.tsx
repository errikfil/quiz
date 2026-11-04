import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Edit3, LayoutGrid, Play, Plus } from "lucide-react";
import { Header, Footer, ErrorNotice, Busy } from "../components/Shared";
import { api, errorMessage, library, remember, ticketKey } from "../data";
import type { SavedQuiz } from "../types";
import {
  categories,
  quizTemplates,
  type QuizTemplate,
} from "../catalog/quizzes";
import QuizCatalog from "../components/QuizCatalog";

// Τα quiz που δημιουργήθηκαν από το μηδέν δεν έχουν αναφορά σε έτοιμη κατηγορία.
function categoryName(templateId?: string) {
  const template = quizTemplates.find((item) => item.id === templateId);
  return (
    categories.find((item) => item.id === template?.category)?.name ??
    "ΣΗΜΑ / QUIZ"
  );
}

export default function Library() {
  const [items, setItems] = useState(library);
  const [error, setError] = useState("");
  const [addedTitle, setAddedTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();
  async function addTemplate(template: QuizTemplate) {
    setBusy(`template:${template.id}`);
    setError("");
    setAddedTitle("");
    try {
      // Στέλνουμε μόνο το περιεχόμενο. Ο server δημιουργεί νέο id και δικό σου owner key.
      const { data } = await api.post<SavedQuiz>("/quizzes", {
        title: template.title,
        questions: template.questions,
      });
      remember({ ...data, templateId: template.id });
      setAddedTitle(template.title);
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
        {addedTitle && (
          <div className="notice catalog-success" role="status">
            <CheckCircle2 size={18} />
            <span>
              Το «{addedTitle}» προστέθηκε στη βιβλιοθήκη σου. Είναι έτοιμο για
              επεξεργασία ή live παιχνίδι.
            </span>
          </div>
        )}
        <div className="library-info" id="my-library">
          <span>
            <span className="live-dot" /> {items.length} quiz στη βιβλιοθήκη σου
          </span>
          <span>Αποθηκευμένα για αυτόν τον browser</span>
        </div>
        {items.length === 0 && (
          <div className="library-empty">
            <p>Η βιβλιοθήκη σου περιμένει την πρώτη ιδέα.</p>
            <a className="text-link" href="#catalog-title">
              Διάλεξε ένα έτοιμο quiz παρακάτω ↓
            </a>
          </div>
        )}
        <div className="quiz-grid">
          {items.map((quiz, index) => (
            <article className="quiz-card" key={quiz.id}>
              <div className={`quiz-cover cover-${index % 3}`}>
                <span>{categoryName(quiz.templateId)}</span>
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
        </div>
        <div className="subtle-note">
          <CheckCircle2 size={17} />
          <p>
            Τα quiz αποθηκεύονται στον server. Η πρόσβασή σου φυλάσσεται σε
            αυτόν τον browser — μην καθαρίσεις τα δεδομένα του πριν κρατήσεις
            αντίγραφο του quiz σου.
          </p>
        </div>
        <QuizCatalog
          items={items}
          busy={busy}
          onAdd={(template) => void addTemplate(template)}
        />
      </main>
      <Footer />
    </>
  );
}
