import { useState } from "react";

function App() {
  const [name] = useState("");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="p-8">
        <h1 className="text-xl font-semibold">Noted</h1>
        <p className="text-sm text-[var(--text-muted)]">Personal Writing Application</p>
      </div>
    </div>
  );
}

export default App;
