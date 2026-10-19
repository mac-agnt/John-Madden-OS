import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/base.css";
import "./styles/pulse.css";
import "./styles/interactions.css";
import "./styles/jma.css";

createRoot(document.getElementById("root")!).render(<App />);
