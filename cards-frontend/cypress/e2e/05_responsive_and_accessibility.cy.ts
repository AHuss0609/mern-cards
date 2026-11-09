describe("05 - Responsive Layout & Accessibility Testing", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    // The cards page loads the user's cards as soon as it opens
    cy.intercept("GET", "**/api/users/*/cards*", { statusCode: 200, body: [] });
  });

  describe("Responsive Layouts across Devices", () => {
    const viewports: Cypress.ViewportPreset[] = [
      "iphone-se2", // 375 x 667
      "ipad-2",     // 768 x 1024
      "macbook-13", // 1280 x 800
    ];

    viewports.forEach((preset) => {
      it(`should render login screen cleanly on ${preset}`, () => {
        cy.viewport(preset);
        cy.visit("/");

        cy.get("#loginDiv").should("be.visible");
        cy.get("#loginName").should("be.visible");
        cy.get("#loginPassword").should("be.visible");
        cy.get("#loginButton").should("be.visible");
      });

      it(`should render cards dashboard cleanly on ${preset}`, () => {
        cy.viewport(preset);
        cy.setSession();
        cy.visit("/cards");

        cy.get("#loggedInDiv").should("be.visible");
        cy.get("#cardUIDiv").should("be.visible");
        cy.get("#searchText").should("be.visible");
        cy.get("#cardText").should("be.visible");
      });
    });
  });

  describe("Accessibility (A11y) & Semantic Structure", () => {
    it("should include proper semantic elements and headings hierarchy", () => {
      cy.visit("/");

      // Main and header landmarks
      cy.get("header").should("exist");
      cy.get("main").should("exist");

      // Heading 1 for brand
      cy.get("h1#title").should("exist");

      // Form labels association
      cy.get('label[for="loginName"]').should("exist");
      cy.get('label[for="loginPassword"]').should("exist");
    });

    it("should have ARIA live regions for dynamic alerts and status badges", () => {
      cy.visit("/");
      cy.get("#loginResult")
        .should("have.attr", "aria-live", "polite");

      cy.setSession();
      cy.visit("/cards");

      cy.get("#cardSearchResult").should("have.attr", "aria-live", "polite");
      cy.get("#cardAddResult").should("have.attr", "aria-live", "polite");
    });

    it("should support keyboard navigation and form submission via Enter key", () => {
      cy.intercept("POST", "**/api/auth/login", {
        statusCode: 200,
        body: {
          token: "test-token",
          user: { _id: "60c72b2f9b1d8b2bad000001", firstName: "John", lastName: "Aedo" },
        },
      }).as("enterLogin");

      cy.visit("/");
      cy.get("#loginName").type("johnaedo");
      cy.get("#loginPassword").type("ucf123!{enter}");

      cy.wait("@enterLogin");
      cy.url().should("include", "/cards");
    });
  });
});
