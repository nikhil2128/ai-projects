import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import { QuestionnaireView } from "./components/QuestionnaireView.tsx";
import { ResponsesViewer } from "./components/ResponsesViewer.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/questionnaire/:id" element={<QuestionnaireView />} />
        <Route path="/responses/:id" element={<ResponsesViewer />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
