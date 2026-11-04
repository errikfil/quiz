import { useState } from "react";
import { BookOpen, Calculator, Check, Globe2, Plus } from "lucide-react";
import {
  categories,
  quizTemplates,
  type CategoryId,
  type QuizTemplate,
} from "../catalog/quizzes";
import type { SavedQuiz } from "../types";
import { Busy } from "./Shared";

const categoryIcons = {
  geography: Globe2,
  history: BookOpen,
  math: Calculator,
};

interface Props {
  items: SavedQuiz[];
  busy: string | null;
  onAdd: (template: QuizTemplate) => void;
}

export default function QuizCatalog({ items, busy, onAdd }: Props) {
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const selected = categories.find((item) => item.id === category);
  const visible = quizTemplates.filter(
    (quiz) => category === "all" || quiz.category === category,
  );

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">ΜΙΑ ΑΦΟΡΜΗ ΓΙΑ ΚΑΘΕ ΜΑΘΗΜΑ</p>
          <h2 id="catalog-title">Έτοιμα quiz, ανά θέμα.</h2>
          <p>
            Διάλεξε ένα quiz, πρόσθεσέ το στη βιβλιοθήκη σου και παίξε. Μπορείς
            να αλλάξεις όλες τις ερωτήσεις του.
          </p>
        </div>
        <span className="catalog-count">
          {quizTemplates.length} quiz ·{" "}
          {quizTemplates.reduce(
            (total, quiz) => total + quiz.questions.length,
            0,
          )}{" "}
          ερωτήσεις
        </span>
      </div>
      <div
        className="category-filters"
        role="group"
        aria-label="Κατηγορίες έτοιμων quiz"
      >
        <button
          aria-pressed={category === "all"}
          onClick={() => setCategory("all")}
        >
          Όλα τα θέματα <span>{quizTemplates.length}</span>
        </button>
        {categories.map((item) => {
          const Icon = categoryIcons[item.id];
          return (
            <button
              key={item.id}
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
            >
              <Icon size={16} />
              {item.name}
              <span>
                {
                  quizTemplates.filter((quiz) => quiz.category === item.id)
                    .length
                }
              </span>
            </button>
          );
        })}
      </div>
      <p className="category-description" role="status">
        {selected
          ? selected.description
          : "Γεωγραφία, Ιστορία, Μαθηματικά. Τρία quiz για κάθε θέμα, πέντε ερωτήσεις σε κάθε quiz."}
      </p>
      <div className="quiz-grid catalog-grid">
        {visible.map((template) => {
          const categoryInfo = categories.find(
            (item) => item.id === template.category,
          )!;
          const Icon = categoryIcons[template.category];
          const added = items.some((item) => item.templateId === template.id);
          return (
            <article
              className={`template-card template-${template.category}`}
              key={template.id}
            >
              <div className="template-heading">
                <span className="template-icon">
                  <Icon size={23} strokeWidth={1.6} />
                </span>
                <span className="eyebrow">{categoryInfo.name}</span>
              </div>
              <h3>{template.title}</h3>
              <p>{template.description}</p>
              <div className="template-meta">
                <span>
                  {template.questions.length} ερωτήσεις ·{" "}
                  {template.questions[0].seconds}″ ανά ερώτηση
                </span>
                {added && (
                  <span className="template-added">
                    <Check size={13} /> Προστέθηκε
                  </span>
                )}
              </div>
              <button
                className="button button-outline button-small"
                disabled={busy !== null}
                aria-label={`${added ? "Πρόσθεσε αντίγραφο" : "Προσθήκη στη βιβλιοθήκη"}: ${template.title}`}
                onClick={() => onAdd(template)}
              >
                {busy === `template:${template.id}` ? (
                  <Busy label="Προσθήκη…" />
                ) : (
                  <>
                    <Plus size={16} />
                    {added ? "Πρόσθεσε αντίγραφο" : "Προσθήκη στη βιβλιοθήκη"}
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
