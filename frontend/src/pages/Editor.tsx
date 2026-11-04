import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Plus,
  Trash2,
} from "lucide-react";
import { Header, Footer, ErrorNotice, Busy } from "../components/Shared";
import { api, blankQuestion, errorMessage, library, remember } from "../data";
import type { QuizInput, SavedQuiz } from "../types";

export default function Editor() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<QuizInput>({
    title: "",
    questions: [blankQuestion()],
  });
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!id) return;
    const saved = library().find((q) => q.id === id);
    if (!saved) {
      setError("Το κλειδί αυτού του quiz δεν υπάρχει σε αυτόν τον browser.");
      setLoading(false);
      return;
    }
    void api
      .get<QuizInput>(`/quizzes/${id}`, {
        headers: { "X-Quiz-Key": saved.ownerKey },
      })
      .then(({ data }) => setQuiz(data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);
  const q = quiz.questions[active];
  function updateQuestion(patch: Partial<typeof q>) {
    setQuiz((previous) => ({
      ...previous,
      questions: previous.questions.map((item, i) =>
        i === active ? { ...item, ...patch } : item,
      ),
    }));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // Ελέγχουμε όλες τις ερωτήσεις, ακόμη κι εκείνες που δεν εμφανίζονται τώρα στον editor.
    const invalid = quiz.questions.findIndex(
      (question) =>
        !question.text.trim() || question.options.some((o) => !o.trim()),
    );
    if (!quiz.title.trim()) {
      setError("Δώσε έναν τίτλο στο quiz.");
      return;
    }
    if (invalid >= 0) {
      setActive(invalid);
      setError(
        `Συμπλήρωσε την ερώτηση ${invalid + 1} και τις τέσσερις απαντήσεις της.`,
      );
      return;
    }
    setSaving(true);
    try {
      if (id) {
        const saved = library().find((item) => item.id === id);
        if (!saved) throw new Error("Δεν βρέθηκε το κλειδί επεξεργασίας.");
        const { data } = await api.put(`/quizzes/${id}`, quiz, {
          headers: { "X-Quiz-Key": saved.ownerKey },
        });
        remember({ ...saved, ...data });
      } else {
        const { data } = await api.post<SavedQuiz>("/quizzes", quiz);
        remember(data);
      }
      navigate("/quizzes");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(quiz, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "sima-quiz.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000)
        throw new Error("Το αρχείο πρέπει να είναι μικρότερο από 100 KB.");
      const data: QuizInput = JSON.parse(await file.text());
      if (
        typeof data.title !== "string" ||
        data.title.length > 100 ||
        !Array.isArray(data.questions) ||
        data.questions.length < 1 ||
        data.questions.length > 30 ||
        data.questions.some(
          (item) =>
            typeof item.text !== "string" ||
            item.text.length > 300 ||
            !Array.isArray(item.options) ||
            item.options.length !== 4 ||
            item.options.some((o) => typeof o !== "string" || o.length > 160) ||
            !Number.isInteger(item.correctIndex) ||
            item.correctIndex < 0 ||
            item.correctIndex > 3 ||
            !Number.isInteger(item.seconds) ||
            item.seconds < 10 ||
            item.seconds > 120,
        )
      )
        throw new Error("Το αρχείο δεν έχει την αναμενόμενη μορφή quiz.");
      setQuiz(data);
      setActive(0);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <>
      <Header />
      <main className="wrap page-main editor-page">
        <Link className="back-link" to="/quizzes">
          <ArrowLeft size={16} /> Πίσω στα quiz
        </Link>
        <div className="page-title">
          <div>
            <p className="eyebrow">ΤΟ ΕΡΓΑΣΤΗΡΙΟ ΣΟΥ</p>
            <h1>{id ? "Μια μικρή βελτίωση." : "Κάθε ιδέα, μια ερώτηση."}</h1>
          </div>
        </div>
        {loading ? (
          <Busy />
        ) : (
          <form onSubmit={(e) => void save(e)} noValidate>
            <ErrorNotice message={error} />
            <div className="editor-toolbar">
              <label className="field title-field">
                Τίτλος quiz
                <input
                  maxLength={100}
                  value={quiz.title}
                  onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                  placeholder="π.χ. Πόσο καλά ξέρουμε το web;"
                />
              </label>
              <div className="import-actions">
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  ref={fileInput}
                  onChange={(e) => {
                    void importFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="text-link"
                  onClick={() => fileInput.current?.click()}
                >
                  Εισαγωγή JSON
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Εξαγωγή JSON"
                  aria-label="Εξαγωγή JSON"
                  onClick={download}
                >
                  <Download size={19} />
                </button>
              </div>
            </div>
            <div className="editor-layout">
              <aside className="question-list">
                <div className="list-heading">
                  ΕΡΩΤΗΣΕΙΣ <span>{quiz.questions.length}/30</span>
                </div>
                {quiz.questions.map((question, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setActive(index)}
                    className={`question-tab ${active === index ? "selected" : ""}`}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{question.text || "Νέα ερώτηση"}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
                <button
                  type="button"
                  className="add-question"
                  disabled={quiz.questions.length >= 30}
                  onClick={() => {
                    setQuiz({
                      ...quiz,
                      questions: [...quiz.questions, blankQuestion()],
                    });
                    setActive(quiz.questions.length);
                  }}
                >
                  <Plus size={18} /> Πρόσθεσε ερώτηση
                </button>
              </aside>
              <section className="question-editor">
                <div className="question-editor-top">
                  <span className="eyebrow">
                    ΕΡΩΤΗΣΗ {String(active + 1).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label="Διαγραφή ερώτησης"
                    disabled={quiz.questions.length === 1}
                    onClick={() => {
                      setQuiz({
                        ...quiz,
                        questions: quiz.questions.filter(
                          (_, i) => i !== active,
                        ),
                      });
                      setActive(Math.max(0, active - 1));
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                <label className="field">
                  Τι θέλεις να ρωτήσεις;
                  <textarea
                    maxLength={300}
                    rows={3}
                    placeholder="Μια καλή ερώτηση ξεκινά εδώ…"
                    value={q.text}
                    onChange={(e) => updateQuestion({ text: e.target.value })}
                  />
                </label>
                <div className="answer-label">
                  Απαντήσεις <span>Πάτησε τον κύκλο δίπλα στη σωστή.</span>
                </div>
                <div className="editor-options">
                  {q.options.map((option, i) => (
                    <div
                      className={`editor-option option-${i} ${q.correctIndex === i ? "correct-option" : ""}`}
                      key={i}
                    >
                      <button
                        type="button"
                        className="correct-toggle"
                        onClick={() => updateQuestion({ correctIndex: i })}
                        aria-label={`Όρισε την ${"ΑΒΓΔ"[i]} ως σωστή`}
                        aria-pressed={q.correctIndex === i}
                      >
                        {q.correctIndex === i ? <Check size={16} /> : "ΑΒΓΔ"[i]}
                      </button>
                      <label className="sr-only" htmlFor={`option-${i}`}>
                        Απάντηση {"ΑΒΓΔ"[i]}
                      </label>
                      <input
                        id={`option-${i}`}
                        maxLength={160}
                        placeholder={`Απάντηση ${"ΑΒΓΔ"[i]}`}
                        value={option}
                        onChange={(e) =>
                          updateQuestion({
                            options: q.options.map((o, n) =>
                              n === i ? e.target.value : o,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="time-setting">
                  <Clock3 size={18} />
                  <label htmlFor="seconds">Χρόνος απάντησης</label>
                  <select
                    id="seconds"
                    value={q.seconds}
                    onChange={(e) =>
                      updateQuestion({ seconds: Number(e.target.value) })
                    }
                  >
                    {[10, 15, 20, 30, 45, 60, 90, 120].map((s) => (
                      <option key={s} value={s}>
                        {s} δευτερόλεπτα
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            </div>
            <div className="editor-footer">
              <span>
                <CheckCircle2 size={16} /> Οι αλλαγές αποθηκεύονται όταν
                πατήσεις το κουμπί.
              </span>
              <button
                className="button button-dark"
                disabled={saving}
                type="submit"
              >
                {saving ? (
                  <Busy label="Αποθήκευση…" />
                ) : (
                  <>
                    Αποθήκευση quiz <Check size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
