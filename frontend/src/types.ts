export interface QuestionInput {
  text: string;
  options: string[];
  correctIndex: number;
  seconds: number;
}
export interface QuizInput {
  title: string;
  questions: QuestionInput[];
}
export interface SavedQuiz {
  id: string;
  title: string;
  ownerKey: string;
  questionCount: number;
}
export interface Player {
  id: string;
  name: string;
  score: number;
  rank: number;
  connected: boolean;
  hasAnswered: boolean;
  lastPoints: number;
}
export interface RoomState {
  pin: string;
  title: string;
  phase: "lobby" | "question" | "results" | "finished";
  revision: number;
  questionNumber: number;
  totalQuestions: number;
  serverTime: string;
  deadline: string | null;
  question: {
    text: string;
    options: string[];
    seconds: number;
    correctIndex: number | null;
  } | null;
  answerCount: number;
  distribution: number[] | null;
  players: Player[];
}
export interface JoinResponse {
  state: RoomState;
  playerId: string | null;
  playerToken: string | null;
  answer: number | null;
}
export interface Ticket {
  role: "host" | "player";
  token: string;
  name?: string;
}
