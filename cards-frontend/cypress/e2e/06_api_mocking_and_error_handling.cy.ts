describe("06 - Network Edge Cases, Error Handling & Loading States", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it("should show error alert when the server returns 500 on login", () => {
    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 500,
      body: { error: "Internal server error" },
    }).as("serverErrorLogin");

    cy.visit("/");
    cy.loginByUI("johnaedo", "password");
    cy.wait("@serverErrorLogin");

    cy.get("#loginResult")
      .should("be.visible")
      .and("contain.text", "Internal server error");
  });

  it("should show error alert on network failure / disconnection during search", () => {
    cy.intercept("GET", "**/api/users/*/cards", { statusCode: 200, body: [] }).as("loadCards");
    cy.setSession();
    cy.visit("/cards");
    cy.wait("@loadCards");

    cy.intercept("GET", "**/api/users/*/cards?search=*", {
      forceNetworkError: true,
    }).as("networkErrorSearch");

    cy.searchCardByUI("Test");

    cy.get("#cardSearchResult")
      .should("be.visible")
      .and("contain.text", "TypeError");
  });

  it("should display loading spinner during login request", () => {
    cy.intercept("GET", "**/api/users/*/cards*", { statusCode: 200, body: [] });
    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 200,
      delay: 800,
      body: {
        token: "test-token",
        user: { _id: "60c72b2f9b1d8b2bad000001", firstName: "John", lastName: "Aedo" },
      },
    }).as("slowLogin");

    cy.visit("/");
    cy.get("#loginName").type("johnaedo");
    cy.get("#loginPassword").type("ucf123!");
    cy.get("#loginButton").click();

    // While request is pending, button should show loading state and spinner
    cy.get("#loginButton")
      .should("be.disabled")
      .and("contain.text", "Logging in...");
    cy.get("#loginButton .spinner-border").should("be.visible");

    cy.wait("@slowLogin");
    cy.url().should("include", "/cards");
  });

  it("should display loading spinner during card search request", () => {
    cy.intercept("GET", "**/api/users/*/cards", { statusCode: 200, body: [] }).as("loadCards");
    cy.setSession();
    cy.visit("/cards");
    cy.wait("@loadCards");

    cy.intercept("GET", "**/api/users/*/cards?search=*", {
      statusCode: 200,
      delay: 600,
      body: [{ _id: "card_01", playerName: "Bugs Bunny", teamName: "Tune Squad" }],
    }).as("slowSearch");

    cy.get("#searchText").type("Bugs");
    cy.get("#searchCardButton").click();

    // Verify search button shows spinner while in progress
    cy.get("#searchCardButton")
      .should("be.disabled")
      .find(".spinner-border")
      .should("be.visible");

    cy.wait("@slowSearch");
    cy.get("#searchCardButton").should("not.be.disabled");
    cy.get("#cardSearchResult").should("contain.text", "1 card(s) found");
  });
});
