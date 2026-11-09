describe("04 - Card Search, Filtering & Pagination", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.fixture("cards.json").then((data) => {
      // The cards page loads the user's whole collection as soon as it opens
      cy.intercept("GET", "**/api/users/*/cards", {
        statusCode: 200,
        body: data.mockCardList,
      }).as("loadCards");
    });
    cy.setSession({
      id: "60c72b2f9b1d8b2bad000001",
      firstName: "John",
      lastName: "Aedo",
    });
    cy.visit("/cards");
    cy.wait("@loadCards");
  });

  it("should show the user's whole collection when the page opens", () => {
    cy.get("#cardSearchResult").should("contain.text", "8 card(s) found");
    cy.contains("Showing 1–4 of 8 card(s)").should("be.visible");
  });

  it("should perform a card search and render the card grid", () => {
    cy.fixture("cards.json").then((data) => {
      cy.intercept("GET", "**/api/users/*/cards?search=Bugs", {
        statusCode: 200,
        body: data.singleSearchResult,
      }).as("searchBugs");

      cy.searchCardByUI("Bugs");
      cy.wait("@searchBugs");

      // Verify status badge
      cy.get("#cardSearchResult")
        .should("be.visible")
        .and("contain.text", "1 card(s) found");

      // Verify card grid
      cy.get("#cardListContainer").should("be.visible");
      cy.get("#cardListContainer .card")
        .should("have.length", 1)
        .within(() => {
          cy.contains("h3", "Bugs Bunny").should("be.visible");
          cy.contains(".badge", "Tune Squad").should("be.visible");
          cy.contains("Publisher: Warner Collectibles").should("be.visible");
          cy.contains("Value: $15000.00").should("be.visible");
        });
    });
  });

  it("should paginate results and allow switching items per page", () => {
    // Total 8 cards in mockCardList, default per page is 4
    cy.get("#cardListContainer").should("be.visible");
    cy.contains("Showing 1–4 of 8 card(s)").should("be.visible");

    // Verify 4 cards are currently shown
    cy.get("#cardListContainer .row .col").should("have.length", 4);
    cy.contains("h3", "Bugs Bunny").should("be.visible");
    cy.contains("h3", "Daffy Duck").should("be.visible");
    cy.contains("h3", "Porky Pig").should("be.visible");
    cy.contains("h3", "Yosemite Sam").should("be.visible");

    // Go to page 2
    cy.get(".pagination").contains("button", "2").click();
    cy.contains("Showing 5–8 of 8 card(s)").should("be.visible");
    cy.contains("h3", "Elmer Fudd").should("be.visible");
    cy.contains("h3", "Tasmanian Devil").should("be.visible");

    // Test "Prev" button
    cy.get(".pagination").contains("button", "Prev").click();
    cy.contains("Showing 1–4 of 8 card(s)").should("be.visible");

    // Change items per page to 2
    cy.get("#itemsPerPageSelect").select("2");
    cy.contains("Showing 1–2 of 8 card(s)").should("be.visible");
    cy.get("#cardListContainer .row .col").should("have.length", 2);

    // Verify pagination pages count updated to 4 pages (8 / 2 = 4)
    cy.get(".pagination .page-item").should("have.length", 6); // Prev + 4 numbers + Next
  });

  it("should handle empty search results gracefully", () => {
    cy.fixture("cards.json").then((data) => {
      cy.intercept("GET", "**/api/users/*/cards?search=Nonexistent", {
        statusCode: 200,
        body: data.emptyResult,
      }).as("searchEmpty");

      cy.searchCardByUI("Nonexistent");
      cy.wait("@searchEmpty");

      cy.get("#cardSearchResult")
        .should("be.visible")
        .and("contain.text", "0 card(s) found");

      // Grid shouldn't display any cards
      cy.get("#cardListContainer").should("not.exist");
    });
  });
});
