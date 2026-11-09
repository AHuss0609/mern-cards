const USER_ID = "60c72b2f9b1d8b2bad000001";

describe("03 - Card Creation & Management", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.fixture("cards.json").then((data) => {
      // The cards page loads the user's cards as soon as it opens
      cy.intercept("GET", "**/api/users/*/cards*", {
        statusCode: 200,
        body: data.mockCardList,
      }).as("loadCards");
    });
    cy.setSession({ id: USER_ID, firstName: "John", lastName: "Aedo" });
    cy.visit("/cards");
    cy.wait("@loadCards");
  });

  it("should render all Add Card form inputs with proper labels and icons", () => {
    cy.contains("h2", "Add New Card").should("be.visible");

    cy.get("#cardText")
      .should("be.visible")
      .and("have.attr", "placeholder", "Player Name");

    cy.get("#teamName")
      .should("be.visible")
      .and("have.attr", "placeholder", "Team Name");

    cy.get("#cardValue")
      .should("be.visible")
      .and("have.attr", "placeholder", "0.00")
      .and("have.attr", "type", "number");

    cy.get("#publisher")
      .should("be.visible")
      .and("have.attr", "placeholder", "Publisher");

    cy.get("#addCardButton")
      .should("be.visible")
      .and("contain.text", "Add Card");

    cy.get("#cardAddResult").should("have.class", "d-none");
  });

  it("should successfully add a new card and reset form inputs", () => {
    cy.fixture("cards.json").then((data) => {
      cy.intercept("POST", `**/api/users/${USER_ID}/cards`, {
        statusCode: 201,
        body: { _id: "card_99", ...data.newCard, userId: USER_ID },
      }).as("addCardRequest");

      cy.addCardByUI(data.newCard);

      cy.wait("@addCardRequest").then((interception) => {
        expect(interception.request.headers.authorization).to.eq("Bearer test-token");
        expect(interception.request.body).to.deep.equal(data.newCard);
      });

      // Verify success badge
      cy.get("#cardAddResult")
        .should("be.visible")
        .and("not.have.class", "d-none")
        .and("contain.text", "Card has been added");

      // Verify form fields were cleared
      cy.get("#cardText").should("have.value", "");
      cy.get("#teamName").should("have.value", "");
      cy.get("#cardValue").should("have.value", "");
      cy.get("#publisher").should("have.value", "");

      // The new card joins the list (8 cards + 1)
      cy.contains("of 9 card(s)").should("be.visible");
    });
  });

  it("should show the API's error when a card can't be added", () => {
    cy.intercept("POST", `**/api/users/${USER_ID}/cards`, {
      statusCode: 409,
      body: { error: "You already have a card with that name" },
    }).as("duplicate");

    cy.addCardByUI({ playerName: "Bugs Bunny" });
    cy.wait("@duplicate");

    cy.get("#cardAddResult")
      .should("be.visible")
      .and("contain.text", "You already have a card with that name");
  });

  it("should successfully delete a card", () => {
    cy.intercept("DELETE", "**/api/cards/card_01", { statusCode: 204 }).as("deleteCard");

    cy.get("#cardListContainer .card").first().within(() => {
      cy.get("button[aria-label='Delete Card']").click();
    });

    cy.wait("@deleteCard");
    cy.get("#cardListContainer").should("not.contain", "Bugs Bunny");
    cy.get("#cardAddResult").should("contain.text", "Card deleted successfully");
  });

  it("should successfully edit a card", () => {
    cy.intercept("PATCH", "**/api/cards/card_01", {
      statusCode: 200,
      body: {
        _id: "card_01",
        playerName: "Bugs Bunny (Updated)",
        teamName: "Tune Squad",
        cardValue: 15000,
        publisher: "Warner Collectibles",
        userId: USER_ID,
      },
    }).as("updateCard");

    cy.get("#cardListContainer .card").first().within(() => {
      cy.get("button[aria-label='Edit Card']").click();
    });

    // Clicking Edit loads the card into the form
    cy.contains("h2", "Edit Card").should("be.visible");
    cy.get("#cardText").should("have.value", "Bugs Bunny");
    cy.get("#cardText").clear().type("Bugs Bunny (Updated)");
    cy.get("#addCardButton").should("contain.text", "Update Card").click();

    cy.wait("@updateCard")
      .its("request.body.playerName")
      .should("eq", "Bugs Bunny (Updated)");
    cy.get("#cardAddResult").should("contain.text", "Card updated successfully!");
    cy.contains("h3", "Bugs Bunny (Updated)").should("be.visible");
    cy.contains("h2", "Add New Card").should("be.visible");
  });

  it("should cancel an edit without saving", () => {
    cy.get("#cardListContainer .card").first().within(() => {
      cy.get("button[aria-label='Edit Card']").click();
    });

    cy.get("#cancelEditButton").click();
    cy.contains("h2", "Add New Card").should("be.visible");
    cy.get("#cardText").should("have.value", "");
  });
});
