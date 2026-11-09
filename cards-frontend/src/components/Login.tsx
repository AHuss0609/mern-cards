import { useState, type FormEvent, type ChangeEvent } from "react";
import { apiFetch, type AuthResponse } from "../utils/api";
import { saveSession } from "../utils/session";

// Saves the token and user returned by login or registration
function startSession({ token, user }: AuthResponse): void {
  saveSession({
    token,
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
  });
}

function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setPassword] = useState("");

  // Registration form state
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regLoginName, setRegLoginName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  function handleSetLoginName(e: ChangeEvent<HTMLInputElement>): void {
    setLoginName(e.target.value);
  }

  function handleSetPassword(e: ChangeEvent<HTMLInputElement>): void {
    setPassword(e.target.value);
  }

  async function doLogin(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const res = await apiFetch<AuthResponse>("api/auth/login", {
        method: "POST",
        body: { login: loginName, password: loginPassword },
      });

      if (!res.ok) {
        setMessage(res.error ?? "Login failed");
      } else {
        startSession(res.data);
        window.location.href = "/cards";
      }
    } catch (error: unknown) {
      setMessage((error as Error).toString());
    } finally {
      setIsLoading(false);
    }
  }

  async function doRegister(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const res = await apiFetch<AuthResponse>("api/users", {
        method: "POST",
        body: {
          firstName: regFirstName,
          lastName: regLastName,
          login: regLoginName,
          email: regEmail,
          password: regPassword,
        },
      });

      if (!res.ok) {
        setMessage(res.error ?? "Registration failed. Please try again.");
      } else {
        // Registering also logs the new user in
        startSession(res.data);
        setSuccessMessage("Account created successfully! Logging you in...");
        setTimeout(() => {
          window.location.href = "/cards";
        }, 1000);
      }
    } catch (error: unknown) {
      setMessage((error as Error).toString());
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="container d-flex justify-content-center align-items-center my-4">
      <div
        id="loginDiv"
        className="card shadow-lg border-0 rounded-4 p-4 p-md-5 w-100"
        style={{ maxWidth: "480px" }}
      >
        <div className="text-center mb-4">
          <div
            className="bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: "64px", height: "64px" }}
          >
            <i
              className={`bi ${isRegisterMode ? "bi-person-plus-fill" : "bi-shield-lock-fill"} fs-2`}
              aria-hidden="true"
            ></i>
          </div>
          <h2 className="h4 fw-bold text-body-emphasis mb-2">
            {isRegisterMode ? "Create Account" : "Account Login"}
          </h2>
          <span
            id="inner-title"
            className="badge bg-primary-subtle text-primary-emphasis fw-semibold px-3 py-2"
          >
            {isRegisterMode ? "NEW USER REGISTRATION" : `PLEASE LOG IN: ${import.meta.env.PROD ? "Production" : "Dev"}`}
          </span>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="nav nav-pills nav-fill bg-light-subtle rounded-3 p-1 mb-4 border">
          <button
            type="button"
            className={`nav-link fw-semibold rounded-2 py-2 ${!isRegisterMode ? "active" : ""}`}
            onClick={() => {
              setIsRegisterMode(false);
              setMessage("");
              setSuccessMessage("");
            }}
          >
            <i className="bi bi-box-arrow-in-right me-2"></i>Log In
          </button>
          <button
            type="button"
            id="toggleRegisterButton"
            className={`nav-link fw-semibold rounded-2 py-2 ${isRegisterMode ? "active" : ""}`}
            onClick={() => {
              setIsRegisterMode(true);
              setMessage("");
              setSuccessMessage("");
            }}
          >
            <i className="bi bi-person-plus me-2"></i>Register
          </button>
        </div>

        {!isRegisterMode ? (
          /* Login Form */
          <form onSubmit={doLogin}>
            <div className="form-floating mb-3">
              <input
                type="text"
                className="form-control"
                id="loginName"
                placeholder="Username"
                value={loginName}
                onChange={handleSetLoginName}
                required
                autoComplete="username"
              />
              <label htmlFor="loginName">
                <i className="bi bi-person me-2" aria-hidden="true"></i>Username
              </label>
            </div>

            <div className="form-floating mb-4">
              <input
                type="password"
                className="form-control"
                id="loginPassword"
                placeholder="Password"
                value={loginPassword}
                onChange={handleSetPassword}
                required
                autoComplete="current-password"
              />
              <label htmlFor="loginPassword">
                <i className="bi bi-key me-2" aria-hidden="true"></i>Password
              </label>
            </div>

            <button
              type="submit"
              id="loginButton"
              className="btn btn-primary btn-lg w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right" aria-hidden="true"></i>
                  <span>Do It</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Registration Form */
          <form onSubmit={doRegister}>
            <div className="row g-2 mb-3">
              <div className="col-6 form-floating">
                <input
                  type="text"
                  className="form-control"
                  id="regFirstName"
                  placeholder="First Name"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  autoComplete="given-name"
                />
                <label htmlFor="regFirstName">First Name</label>
              </div>
              <div className="col-6 form-floating">
                <input
                  type="text"
                  className="form-control"
                  id="regLastName"
                  placeholder="Last Name"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  autoComplete="family-name"
                />
                <label htmlFor="regLastName">Last Name</label>
              </div>
            </div>

            <div className="form-floating mb-3">
              <input
                type="text"
                className="form-control"
                id="regLoginName"
                placeholder="Choose Username"
                value={regLoginName}
                onChange={(e) => setRegLoginName(e.target.value)}
                required
                autoComplete="username"
              />
              <label htmlFor="regLoginName">
                <i className="bi bi-person me-2" aria-hidden="true"></i>Username *
              </label>
            </div>

            <div className="form-floating mb-3">
              <input
                type="email"
                className="form-control"
                id="regEmail"
                placeholder="Email Address"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
              />
              <label htmlFor="regEmail">
                <i className="bi bi-envelope me-2" aria-hidden="true"></i>Email Address
              </label>
            </div>

            <div className="form-floating mb-4">
              <input
                type="password"
                className="form-control"
                id="regPassword"
                placeholder="Choose Password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <label htmlFor="regPassword">
                <i className="bi bi-key me-2" aria-hidden="true"></i>Password *
              </label>
            </div>

            <button
              type="submit"
              id="registerButton"
              className="btn btn-success btn-lg w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-person-check-fill" aria-hidden="true"></i>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Feedback Messages */}
        <span
          id="loginResult"
          className={
            message
              ? "alert alert-danger mt-4 mb-0 d-block text-center fw-medium"
              : "d-none"
          }
          role={message ? "alert" : undefined}
          aria-live="polite"
        >
          {message}
        </span>

        {successMessage && (
          <div
            id="registerResult"
            className="alert alert-success mt-4 mb-0 text-center fw-medium"
            role="status"
            aria-live="polite"
          >
            <i className="bi bi-check-circle-fill me-2"></i>
            {successMessage}
          </div>
        )}
      </div>
    </main>
  );
}

export default Login;
