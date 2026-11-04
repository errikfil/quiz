import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Header } from "../components/Shared";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="wrap center-state">
        <h1>Χάσαμε το σήμα.</h1>
        <p>Αυτή η σελίδα δεν υπάρχει.</p>
        <Link className="button button-dark" to="/">
          Στην αρχική <ArrowRight size={18} />
        </Link>
      </main>
    </>
  );
}
