import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Library from "./pages/Library";
import Editor from "./pages/Editor";
import Join from "./pages/Join";
import Game from "./pages/Game";
import NotFound from "./pages/NotFound";
import "./styles.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quizzes" element={<Library />} />
        <Route path="/quizzes/new" element={<Editor />} />
        <Route path="/quizzes/:id/edit" element={<Editor />} />
        <Route path="/join" element={<Join />} />
        <Route path="/host/:pin" element={<Game key="host" role="host" />} />
        <Route
          path="/play/:pin"
          element={<Game key="player" role="player" />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
