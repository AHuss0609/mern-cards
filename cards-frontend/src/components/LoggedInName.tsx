import type { MouseEvent } from "react";
import { clearSession, getSession } from "../utils/session";

function LoggedInName() {
  const session = getSession();
  const name = `${session?.firstName ?? ""} ${session?.lastName ?? ""}`.trim() || "User";

  function doLogout(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    clearSession();
    window.location.href = "/";
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
        <button
          type="button"
          id="logoutButton"
          className="btn btn-outline-danger btn-sm px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2"
          onClick={doLogout}
        >
          <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
          Log Out
        </button>
      </div>
    </div>
  );
}

export default LoggedInName;
