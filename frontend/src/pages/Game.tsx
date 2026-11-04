import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Flag,
  Play,
  Radio,
  Trophy,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { Brand, Busy, ErrorNotice } from "../components/Shared";
import { errorMessage, getTicket } from "../data";
import { useRoom } from "../useRoom";
import type { Player, RoomState, Ticket } from "../types";

function Leaderboard({
  players,
  selfId,
  full = false,
}: {
  players: Player[];
  selfId: string | null;
  full?: boolean;
}) {
  return (
    <div className="leaderboard">
      <div className="leaderboard-title">
        <Trophy size={19} />
        <h2>{full ? "Η τελική κατάταξη" : "Η κατάταξη"}</h2>
        <span>{players.length} παίκτες</span>
      </div>
      {players.map((p) => (
        <div
          className={`leader-row ${p.id === selfId ? "is-me" : ""}`}
          key={p.id}
        >
          <span className={`rank rank-${p.rank}`}>
            {p.rank === 1 ? (
              <Trophy size={17} />
            ) : (
              String(p.rank).padStart(2, "0")
            )}
          </span>
          <span className="player-avatar">
            {p.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="player-name">
            {p.name} {p.id === selfId && <small>εσύ</small>}
            {!p.connected && <small>εκτός σύνδεσης</small>}
          </span>
          <span className="score">
            {p.score.toLocaleString("el-GR")}
            <small> πόντοι</small>
          </span>
          {p.lastPoints > 0 && (
            <span className="points-gain">+{p.lastPoints}</span>
          )}
        </div>
      ))}
    </div>
  );
}
function Timer({
  state,
  offset,
}: {
  state: RoomState;
  offset: React.RefObject<number>;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const seconds = state.deadline
    ? Math.max(
        0,
        Math.ceil((Date.parse(state.deadline) - now - offset.current) / 1000),
      )
    : 0;
  return (
    <div
      className={`timer ${seconds <= 5 ? "urgent" : ""}`}
      aria-label={`Απομένουν ${seconds} δευτερόλεπτα`}
    >
      <Clock3 size={20} />
      <strong>{seconds}</strong>
      <span>δευτ.</span>
    </div>
  );
}
export default function Game({ role }: { role: "host" | "player" }) {
  const { pin = "" } = useParams();
  const [ticket] = useState<Ticket | null>(() => getTicket(pin, role));
  const {
    state,
    playerId,
    answer,
    recordAnswer,
    status,
    error,
    setError,
    invoke,
    offset,
  } = useRoom(pin, role, ticket);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const connected = status === "connected";
  const me = state?.players.find((p) => p.id === playerId);
  async function action(value: string) {
    setPending(true);
    try {
      await invoke("HostAction", value);
      setConfirmEnd(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  async function submit(option: number) {
    if (!state || pending || answer !== null) return;
    setPending(true);
    try {
      await invoke("Answer", state.questionNumber, option);
      recordAnswer(state.questionNumber, option);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/join?pin=${pin}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        "Δεν επιτρέπεται η αντιγραφή εδώ. Μοιράσου το PIN που βλέπεις στην οθόνη.",
      );
    }
  }
  function exportResults() {
    if (!state) return;
    const csv =
      "\uFEFFΘέση,Όνομα,Πόντοι\n" +
      state.players
        .map(
          (p) =>
            `${p.rank},"${p.name.replace(/"/g, '""').replace(/^[=+@\-\t\r]/, "'$&")}",${p.score}`,
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `sima-${pin}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="game-shell">
      <header className="game-header">
        <Brand />
        <span className="game-role">
          {role === "host" ? "ΟΘΟΝΗ ΚΑΘΗΓΗΤΗ" : "ΠΑΙΖΕΙΣ ΖΩΝΤΑΝΑ"}
        </span>
        <span className={`connection-badge ${connected ? "" : "offline"}`}>
          {connected ? <span className="live-dot" /> : <WifiOff size={14} />}{" "}
          {connected
            ? "Συνδεδεμένος"
            : status === "reconnecting"
              ? "Επανασύνδεση…"
              : "Χωρίς σύνδεση"}
        </span>
      </header>
      <main className="game-main wrap">
        <ErrorNotice message={error} />
        {!connected && state && (
          <div className="notice">
            Οι ενέργειες είναι προσωρινά κλειστές. Αν η σύνδεση δεν επανέλθει,
            ανανέωσε τη σελίδα.
          </div>
        )}
        {!ticket ? (
          <div className="center-state">
            <Radio size={40} />
            <h1>Πρώτα, μια σύνδεση.</h1>
            <p>
              {role === "host"
                ? "Άνοιξε ένα παιχνίδι από τη βιβλιοθήκη σου."
                : "Βάλε το PIN και το όνομά σου για να μπεις."}
            </p>
            <Link
              className="button button-dark"
              to={role === "host" ? "/quizzes" : `/join?pin=${pin}`}
            >
              Συνέχεια <ArrowRight size={18} />
            </Link>
          </div>
        ) : !state ? (
          <div className="center-state">
            {status === "connecting" ? (
              <Busy label="Σύνδεση με την παρέα…" />
            ) : (
              <>
                <h1>Δεν καταφέραμε να μπούμε.</h1>
                <Link
                  className="button button-dark"
                  to={role === "host" ? "/quizzes" : `/join?pin=${pin}`}
                >
                  Πίσω <ArrowLeft size={18} />
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="game-meta">
              <span>{state.title}</span>
              <span>
                PIN <strong>{pin}</strong>
              </span>
            </div>
            {state.phase === "lobby" && (
              <>
                <section className="lobby-intro">
                  <span className="eyebrow">
                    <span className="live-dot" /> Η ΠΑΡΕΑ ΜΑΖΕΥΕΤΑΙ
                  </span>
                  <h1>
                    {role === "host"
                      ? "Όλοι έτοιμοι;"
                      : `Είσαι μέσα, ${me?.name ?? ticket.name}!`}
                  </h1>
                  <p>
                    {role === "host"
                      ? "Μοιράσου το PIN. Το παιχνίδι ξεκινά με το δικό σου σήμα."
                      : "Περίμενε το σήμα του καθηγητή. Σε λίγο ξεκινάμε."}
                  </p>
                </section>
                <div className="lobby-grid">
                  <section className="pin-card">
                    <span className="eyebrow">PIN ΠΑΙΧΝΙΔΙΟΥ</span>
                    <div className="big-pin">
                      {pin.slice(0, 3)}
                      <span> </span>
                      {pin.slice(3)}
                    </div>
                    <span>Άνοιξε το Σήμα → Μπες σε παιχνίδι</span>
                    <button
                      className="button button-outline button-small"
                      onClick={() => void copyInvite()}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                      {copied ? "Αντιγράφηκε!" : "Αντιγραφή πρόσκλησης"}
                    </button>
                    <small>
                      {state.totalQuestions} ερωτήσεις · έως 100 παίκτες
                    </small>
                  </section>
                  <section className="players-card">
                    <div className="players-heading">
                      <Users size={20} />
                      <h2>Η παρέα μας</h2>
                      <span>{state.players.length}</span>
                    </div>
                    {state.players.length === 0 ? (
                      <div className="waiting-empty">
                        <Radio size={32} />
                        <p>Περιμένουμε τις πρώτες συμμετοχές…</p>
                      </div>
                    ) : (
                      <div className="player-chips">
                        {state.players.map((p) => (
                          <div
                            key={p.id}
                            className={`player-chip ${!p.connected ? "disconnected" : ""}`}
                          >
                            <span>{p.name.slice(0, 1).toUpperCase()}</span>
                            {p.name}
                            {p.id === playerId && <small>εσύ</small>}
                            {p.connected && <span className="live-dot" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
                {role === "host" && (
                  <div className="lobby-controls">
                    <span>
                      Κανείς δεν χρειάζεται λογαριασμό για να συμμετέχει.
                    </span>
                    <button
                      className="button button-dark"
                      disabled={
                        pending ||
                        !connected ||
                        !state.players.some((p) => p.connected)
                      }
                      onClick={() => void action("start")}
                    >
                      Ξεκίνα το quiz <Play size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
            {(state.phase === "question" || state.phase === "results") &&
              state.question && (
                <>
                  <div className="question-progress">
                    <span className="eyebrow">
                      ΕΡΩΤΗΣΗ {String(state.questionNumber).padStart(2, "0")} /{" "}
                      {String(state.totalQuestions).padStart(2, "0")}
                    </span>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${(state.questionNumber / state.totalQuestions) * 100}%`,
                        }}
                      />
                    </div>
                    {state.phase === "question" ? (
                      <Timer state={state} offset={offset} />
                    ) : (
                      <span className="result-label">
                        <CheckCircle2 size={17} /> Οι απαντήσεις έκλεισαν
                      </span>
                    )}
                  </div>
                  <h1 className="live-question">{state.question.text}</h1>
                  {role === "player" &&
                    state.phase === "question" &&
                    answer !== null && (
                      <div role="status" className="answer-confirmation">
                        <CheckCircle2 size={24} />
                        <div>
                          <strong>Η απάντησή σου καταχωρήθηκε.</strong>
                          <span>
                            Κράτα την περιέργειά σου. Τα αποτελέσματα έρχονται!
                          </span>
                        </div>
                      </div>
                    )}
                  <div className="live-options">
                    {state.question.options.map((option, i) => {
                      const revealed = state.phase === "results";
                      const correct =
                        revealed && state.question!.correctIndex === i;
                      return (
                        <button
                          key={`${state.questionNumber}-${i}`}
                          className={`live-option option-${i} ${revealed ? (correct ? "revealed-correct" : "revealed-wrong") : ""} ${answer === i ? "my-answer" : ""}`}
                          disabled={
                            role === "host" ||
                            revealed ||
                            answer !== null ||
                            pending ||
                            !connected
                          }
                          onClick={() => void submit(i)}
                        >
                          <span className="option-letter">{"ΑΒΓΔ"[i]}</span>
                          <span>{option}</span>
                          {correct && <CheckCircle2 size={24} />}
                          <span className="option-detail">
                            {revealed && (
                              <>{state.distribution?.[i] ?? 0} ψήφοι</>
                            )}
                            {answer === i && <small>η επιλογή σου</small>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="answer-progress">
                    <span>
                      <Users size={17} /> {state.answerCount} /{" "}
                      {state.players.length} απαντήσεις
                    </span>
                    {role === "player" && me && (
                      <span>
                        {state.phase === "results"
                          ? me.lastPoints > 0
                            ? `Σωστά! +${me.lastPoints} πόντοι`
                            : answer === null
                              ? "Δεν καταχωρήθηκε απάντηση."
                              : "Αυτή τη φορά δεν ήταν σωστό. Πάμε στην επόμενη!"
                          : "Η σωστή απάντηση και η ταχύτητα μετράνε."}
                      </span>
                    )}
                    {role === "host" && (
                      <button
                        className="button button-dark button-small"
                        disabled={pending || !connected}
                        onClick={() =>
                          void action(
                            state.phase === "question" ? "reveal" : "next",
                          )
                        }
                      >
                        {state.phase === "question"
                          ? "Κλείσε την ερώτηση"
                          : state.questionNumber === state.totalQuestions
                            ? "Τελική κατάταξη"
                            : "Επόμενη ερώτηση"}
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                  {state.phase === "results" && (
                    <>
                      <Leaderboard players={state.players} selfId={playerId} />
                      {role === "player" && (
                        <p className="waiting-note">
                          Περιμένουμε τον καθηγητή για το επόμενο βήμα…
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            {state.phase === "finished" && (
              <>
                <section className="finished-intro">
                  <span className="winner-spark">✦</span>
                  <span className="eyebrow">
                    ΤΟ ΠΑΙΧΝΙΔΙ ΤΕΛΕΙΩΣΕ. Η ΠΕΡΙΕΡΓΕΙΑ ΟΧΙ.
                  </span>
                  <h1>
                    {state.players[0]
                      ? `Μπράβο, ${state.players[0].name}!`
                      : "Μέχρι το επόμενο σήμα!"}
                  </h1>
                  <p>Κάθε απάντηση ήταν μια μικρή ευκαιρία να μάθουμε κάτι.</p>
                </section>
                <Leaderboard players={state.players} selfId={playerId} full />
                <div className="finish-actions">
                  {role === "host" && (
                    <button
                      className="button button-outline"
                      onClick={exportResults}
                    >
                      <Download size={17} /> Εξαγωγή αποτελεσμάτων
                    </button>
                  )}
                  <Link
                    className="button button-dark"
                    to={role === "host" ? "/quizzes" : "/"}
                  >
                    Μέχρι το επόμενο quiz <ArrowRight size={17} />
                  </Link>
                </div>
              </>
            )}
            {role === "host" && state.phase !== "finished" && (
              <div className="end-game">
                {confirmEnd ? (
                  <>
                    <span>Να τελειώσει τώρα το παιχνίδι;</span>
                    <button
                      className="text-link danger"
                      disabled={pending || !connected}
                      onClick={() => void action("end")}
                    >
                      Ναι, ολοκλήρωση
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => setConfirmEnd(false)}
                      aria-label="Ακύρωση"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    className="text-link"
                    onClick={() => setConfirmEnd(true)}
                  >
                    <Flag size={14} /> Ολοκλήρωση παιχνιδιού
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <div className="game-footer">Σήμα · Η γνώση είναι ομαδικό παιχνίδι.</div>
    </div>
  );
}
