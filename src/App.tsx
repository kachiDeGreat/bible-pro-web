import { BrowserRouter, Routes, Route } from "react-router-dom";
import OutputView from "./pages/OutputView";
import ControlPanel from "./pages/ControlPanel";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";

import { Toaster } from "react-hot-toast";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          success: {
            style: {
              background: "green",
            },
          },
          error: {
            style: {
              background: "red",
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/panel" element={<ControlPanel />} />
        <Route path="/output" element={<OutputView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
