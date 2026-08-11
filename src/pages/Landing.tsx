import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div
      className="container"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        textAlign: "center",
      }}
    >
      <h1 className="animate-fade-in" style={{ marginBottom: "1rem" }}>
        Bible Song Pro
      </h1>
      <p
        className="text-secondary animate-fade-in"
        style={{ marginBottom: "2rem", fontSize: "1.25rem", maxWidth: "600px" }}
      >
        The ultimate web-based projection software for your church. Sync lyrics
        instantly anywhere.
      </p>

      <div
        className="glass-card animate-fade-in"
        style={{ display: "flex", gap: "1rem" }}
      >
        <Link to="/dashboard" className="btn btn-primary">
          Go to Dashboard
        </Link>
        <Link to="/panel" className="btn btn-secondary">
          Open Control Panel
        </Link>
      </div>
    </div>
  );
};

export default Landing;
