import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8000",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    defaultCommandTimeout: 6000,
    requestTimeout: 6000,
    responseTimeout: 6000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      return config;
    },
  },
});
