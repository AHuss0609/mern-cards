describe("02 - Navigation, Routing & Session Management", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    // The cards page loads the user's cards as soon as it opens
    cy.intercept("GET", "**/api/users/*/cards*", { statusCode: 200, body: [] });
  });

  it("should display user session details in LoggedInName component", () => {
    cy.setSession({
      id: "60c72b2f9b1d8b2bad000001",
      firstName: "John",
      lastName: "Aedo",
    });

    cy.visit("/cards");

    cy.get("#loggedInDiv").should("be.visible");
    cy.get("#userName")
      .should("be.visible")
      .and("contain.text", "Logged In As John Aedo");

    cy.get("#cardUIDiv h1").should("contain.text", "Welcome John Aedo");
  });

  it("should redirect to the login page when visiting /cards without a session", () => {
    cy.visit("/cards");

    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    cy.get("#loginDiv").should("be.visible");
  });

  it("should persist session across page reload", () => {
    cy.setSession({
      id: "60c72b2f9b1d8b2bad000001",
      firstName: "John",
      lastName: "Aedo",
    });

    cy.visit("/cards");
    cy.get("#userName").should("contain.text", "Logged In As John Aedo");

    cy.reload();

    cy.get("#userName").should("contain.text", "Logged In As John Aedo");
    cy.url().should("include", "/cards");
  });

  it("should send the saved token with API requests", () => {
    cy.intercept("GET", "**/api/users/*/cards*", { statusCode: 200, body: [] }).as("loadCards");

    cy.setSession({ token: "abc123", id: "60c72b2f9b1d8b2bad000001" });
    cy.visit("/cards");

    cy.wait("@loadCards").then((interception) => {
      expect(interception.request.headers.authorization).to.eq("Bearer abc123");
      expect(interception.request.url).to.include("/api/users/60c72b2f9b1d8b2bad000001/cards");
    });
  });

  it("should log out when the API rejects the token", () => {
    cy.intercept("GET", "**/api/users/*/cards*", {
      statusCode: 401,
      body: { error: "Invalid or expired token" },
    }).as("expired");

    cy.setSession();
    cy.visit("/cards");
    cy.wait("@expired");

    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    cy.window().then((win) => {
      expect(win.localStorage.getItem("user_data")).to.be.null;
    });
  });

  it("should log out, clear localStorage, and redirect to login page", () => {
    cy.setSession({
      id: "60c72b2f9b1d8b2bad000001",
      firstName: "John",
      lastName: "Aedo",
    });

    cy.visit("/cards");
    cy.get("#logoutButton").should("be.visible").click();

    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    cy.get("#loginDiv").should("be.visible");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("user_data")).to.be.null;
    });
  });

  it("should redirect unknown routes back to home / login page", () => {
    cy.visit("/arbitrary/nonexistent/path");
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    cy.get("#loginDiv").should("be.visible");
  });
});
