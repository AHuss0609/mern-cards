import { useState } from "react";
import { apiFetch } from "../utils/api";
import { clearSession, getSession } from "../utils/session";

function LoggedInName() {
  const session = getSession();
  const name = `${session?.firstName ?? ""} ${session?.lastName ?? ""}`.trim() || "User";
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  function doLogout(): void {
    clearSession();
    window.location.href = "/";
  }

  async function doDeleteAccount(): Promise<void> {
    if (!session || !window.confirm("Permanently delete your account and all its cards?")) return;

    setError("");
    setIsDeleting(true);
    try {
      const response = await apiFetch<null>(`api/users/${session.id}`, { method: "DELETE" });
      if (response.ok) {
        doLogout();
        return;
      }
      setError(response.error ?? "Could not delete your account. Please try again.");
    } catch {
      setError("Could not delete your account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      id="loggedInDiv"
      className="card shadow-sm border-0 rounded-4 mb-4 p-3 bg-white"
    >
      <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2">
          <div
            className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold fs-5"
            style={{ width: "42px", height: "42px" }}
          >
            <i className="bi bi-person-fill" aria-hidden="true"></i>
          </div>
          <div>
            <span className="text-secondary small d-block">Current Session</span>
            <span id="userName" className="fw-semibold text-body-emphasis">
              Logged In As {name}
            </span>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {session && session.login !== "johnaedo" && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm px-3 py-2 fw-semibold"
              disabled={isDeleting}
              onClick={doDeleteAccount}
            >
              {isDeleting ? "Deleting Account…" : "Delete My Account"}
            </button>
          )}
          <button
            type="button"
            id="logoutButton"
            className="btn btn-outline-danger btn-sm px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2"
            disabled={isDeleting}
            onClick={doLogout}
          >
            <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
            Log Out
          </button>
        </div>
      </div>
      {error && <p className="text-danger small mt-2 mb-0" role="alert">{error}</p>}
    </div>
  );
}

export default LoggedInName;
