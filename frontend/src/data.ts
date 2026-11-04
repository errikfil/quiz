import axios from "axios";
import type { SavedQuiz, Ticket } from "./types";
export const api = axios.create({ baseURL: "/api", timeout: 15000 });
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error))
    return (
      error.response?.data?.message ??
      (error.response?.status === 401
        ? "Δεν έχεις πρόσβαση σε αυτό το quiz."
        : "Δεν ήταν δυνατή η επικοινωνία με τον server.")
    );
  if (error instanceof Error)
    return error.message.replace(/^.*HubException: /, "");
  return "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
}
// Η βιβλιοθήκη κρατά μόνο αναφορές και κλειδιά. Τα ίδια τα quiz βρίσκονται στη βάση.
// Χωρίς λογαριασμούς, τα κλειδιά ανήκουν σε αυτόν τον browser: μην τα κοινοποιείς.
export function library(): SavedQuiz[] {
  try {
    return JSON.parse(localStorage.getItem("sima-library") ?? "[]");
  } catch {
    return [];
  }
}
export function remember(quiz: SavedQuiz) {
  localStorage.setItem(
    "sima-library",
    JSON.stringify([quiz, ...library().filter((q) => q.id !== quiz.id)]),
  );
}
export function ticketKey(pin: string, role: string) {
  return `sima-room-${pin}-${role}`;
}
export function getTicket(pin: string, role: string): Ticket | null {
  try {
    return JSON.parse(sessionStorage.getItem(ticketKey(pin, role)) ?? "null");
  } catch {
    return null;
  }
}
export const blankQuestion = () => ({
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  seconds: 20,
});
