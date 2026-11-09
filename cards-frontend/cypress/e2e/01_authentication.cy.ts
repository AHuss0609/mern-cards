describe("01 - Authentication & User Registration Flows", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    // The cards page loads the user's cards as soon as it opens
    cy.intercept("GET", "**/api/users/*/cards*", { statusCode: 200, body: [] });
    cy.visit("/");
  });

  it("should render the login page with all expected UI components and branding", () => {
    // Header check
    cy.get("#title")
      .should("be.visible")
      .and("contain.text", "COP 4331 MERN Stack Demo");

    // Login card container
    cy.get("#loginDiv").should("be.visible");
    cy.get("h2").should("contain.text", "Account Login");
    cy.get("#inner-title").should("contain.text", "PLEASE LOG IN");

    // Form inputs and buttons
    cy.get("#loginName")
      .should("be.visible")
      .and("have.attr", "placeholder", "Username")
      .and("have.attr", "required");

    cy.get("#loginPassword")
      .should("be.visible")
      .and("have.attr", "type", "password")
      .and("have.attr", "required");

    cy.get("#loginButton")
      .should("be.visible")
      .and("contain.text", "Do It")
      .and("not.be.disabled");

    // Feedback message should initially be hidden
    cy.get("#loginResult").should("have.class", "d-none");
  });

  it("should enforce required form validation on empty login submit", () => {
    cy.get("#loginButton").click();
    // HTML5 validation prevents form submission
    cy.get("#loginName:invalid").should("exist");
  });

  it("should show an error message when login credentials are invalid", () => {
    cy.fixture("users.json").then((users) => {
      cy.intercept("POST", "**/api/auth/login", {
        statusCode: 401,
        body: { error: "Invalid login or password" },
      }).as("loginFailed");

      cy.loginByUI(users.invalidUser.login, users.invalidUser.password);
      cy.wait("@loginFailed");

      cy.get("#loginResult")
        .should("be.visible")
        .and("not.have.class", "d-none")
        .and("contain.text", "Invalid login or password");

      // Verify user was not logged in
      cy.url().should("not.include", "/cards");
      cy.window().then((win) => {
        expect(win.localStorage.getItem("user_data")).to.be.null;
      });
    });
  });

  it("should log in successfully, save the token, and redirect to /cards", () => {
    cy.fixture("users.json").then((users) => {
      cy.intercept("POST", "**/api/auth/login", {
        statusCode: 200,
        body: {
          token: users.validUser.token,
          user: {
            _id: users.validUser.id,
            firstName: users.validUser.firstName,
            lastName: users.validUser.lastName,
            login: users.validUser.login,
          },
        },
      }).as("loginSuccess");

      cy.loginByUI(users.validUser.login, users.validUser.password);
      cy.wait("@loginSuccess")
        .its("request.body")
        .should("deep.equal", {
          login: users.validUser.login,
          password: users.validUser.password,
        });

      cy.url().should("include", "/cards");

      // Verify the session was saved
      cy.window().then((win) => {
        const stored = win.localStorage.getItem("user_data");
        expect(stored).to.not.be.null;
        const parsed = JSON.parse(stored!);
        expect(parsed.token).to.eq(users.validUser.token);
        expect(parsed.id).to.eq(users.validUser.id);
        expect(parsed.firstName).to.eq(users.validUser.firstName);
        expect(parsed.lastName).to.eq(users.validUser.lastName);
      });
    });
  });

  it("should toggle between Login and Registration modes cleanly", () => {
    // Switch to Register
    cy.get("#toggleRegisterButton").click();
    cy.get("h2").should("contain.text", "Create Account");
    cy.get("#inner-title").should("contain.text", "NEW USER REGISTRATION");

    // Check registration form elements
    cy.get("#regFirstName").should("be.visible");
    cy.get("#regLastName").should("be.visible");
    cy.get("#regLoginName").should("be.visible").and("have.attr", "required");
    cy.get("#regEmail").should("be.visible").and("have.attr", "type", "email");
    cy.get("#regPassword").should("be.visible").and("have.attr", "required");
    cy.get("#registerButton").should("be.visible").and("contain.text", "Create Account");

    // Switch back to Login
    cy.contains("button", "Log In").click();
    cy.get("h2").should("contain.text", "Account Login");
    cy.get("#loginName").should("be.visible");
    cy.get("#loginButton").should("be.visible");
  });

  it("should register a new user successfully, show confirmation, and auto-redirect", () => {
    cy.fixture("users.json").then((users) => {
      cy.intercept("POST", "**/api/users", {
        statusCode: 201,
        body: {
          token: "new-user-token",
          user: {
            _id: "60c72b2f9b1d8b2bad000999",
            firstName: users.newUser.firstName,
            lastName: users.newUser.lastName,
            login: users.newUser.login,
          },
        },
      }).as("registerSuccess");

      cy.registerByUI(users.newUser);
      cy.wait("@registerSuccess");

      // Verify success message
      cy.get("#registerResult")
        .should("be.visible")
        .and("contain.text", "Account created successfully! Logging you in...");

      // Wait for the timeout redirection
      cy.url({ timeout: 4000 }).should("include", "/cards");

      cy.window().then((win) => {
        const stored = win.localStorage.getItem("user_data");
        expect(stored).to.not.be.null;
        const parsed = JSON.parse(stored!);
        expect(parsed.token).to.eq("new-user-token");
        expect(parsed.firstName).to.eq(users.newUser.firstName);
        expect(parsed.lastName).to.eq(users.newUser.lastName);
      });
    });
  });

  it("should handle registration error when username already exists", () => {
    cy.intercept("POST", "**/api/users", {
      statusCode: 409,
      body: { error: "A user with that login already exists" },
    }).as("registerConflict");

    cy.registerByUI({
      login: "johnaedo",
      password: "password123",
    });
    cy.wait("@registerConflict");

    cy.get("#loginResult")
      .should("be.visible")
      .and("contain.text", "A user with that login already exists");

    cy.url().should("not.include", "/cards");
  });
});
