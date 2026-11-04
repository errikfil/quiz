import { test, expect } from "@playwright/test";
import { categories, quizTemplates } from "../src/catalog/quizzes";
import type { SavedQuiz } from "../src/types";

test("three topics, nine editable copies and a live session", async ({
  page,
}) => {
  await page.goto("/quizzes");
  const catalog = page.getByRole("region", { name: "Έτοιμα quiz, ανά θέμα." });
  const filters = page.getByRole("group", { name: "Κατηγορίες έτοιμων quiz" });
  await expect(catalog.locator(".template-card")).toHaveCount(9);
  expect(new Set(quizTemplates.map((quiz) => quiz.id)).size).toBe(9);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await filters.getByRole("button", { name: /^Μαθηματικά/ }).click();
  await expect(catalog.locator(".template-card")).toHaveCount(3);
  await catalog.screenshot({ path: "/tmp/sima-catalog-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 900 });

  const saved: SavedQuiz[] = [];
  for (const category of categories) {
    await filters
      .getByRole("button", { name: new RegExp(`^${category.name}`) })
      .click();
    await expect(
      filters.getByRole("button", { name: new RegExp(`^${category.name}`) }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(catalog.locator(".template-card")).toHaveCount(3);
    for (const template of quizTemplates.filter(
      (item) => item.category === category.id,
    )) {
      const card = catalog
        .locator(".template-card")
        .filter({
          has: page.getByRole("heading", { name: template.title, exact: true }),
        });
      const created = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/quizzes") &&
          response.request().method() === "POST",
      );
      await card
        .getByRole("button", {
          name: `Προσθήκη στη βιβλιοθήκη: ${template.title}`,
          exact: true,
        })
        .click();
      const response = await created;
      expect(response.status()).toBe(201);
      const quiz: SavedQuiz = await response.json();
      expect(quiz.questionCount).toBe(5);
      saved.push(quiz);
      await expect(card.getByText("Προστέθηκε", { exact: true })).toBeVisible();
      await expect(
        page
          .locator(".quiz-card")
          .getByRole("heading", { name: template.title, exact: true }),
      ).toBeVisible();
      // Ελέγχουμε τα πραγματικά αποθηκευμένα δεδομένα, όχι μόνο την κάρτα στο UI.
      const stored = await page.request.get(`/api/quizzes/${quiz.id}`, {
        headers: { "X-Quiz-Key": quiz.ownerKey },
      });
      expect(stored.ok()).toBe(true);
      const data = await stored.json();
      expect(data.title).toBe(template.title);
      expect(data.questions).toEqual(template.questions);
      for (const question of data.questions) {
        expect(new Set(question.options).size).toBe(4);
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThan(4);
      }
    }
  }
  await page.reload();
  await expect(page.locator(".quiz-card")).toHaveCount(9);
  await expect(catalog.locator(".template-card")).toHaveCount(9);
  const original = quizTemplates[0];
  await page
    .getByRole("link", { name: `Επεξεργασία: ${original.title}`, exact: true })
    .click();
  await page.getByLabel("Τίτλος quiz").fill("Η δική μου γεωγραφία");
  await page.getByLabel("Τι θέλεις να ρωτήσεις;").fill("Η δική μου ερώτηση");
  await page.getByRole("button", { name: "Αποθήκευση quiz" }).click();
  await expect(
    page
      .locator(".quiz-card")
      .getByRole("heading", { name: "Η δική μου γεωγραφία" }),
  ).toBeVisible();

  const originalCard = catalog
    .locator(".template-card")
    .filter({
      has: page.getByRole("heading", { name: original.title, exact: true }),
    });
  const copyCreated = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/quizzes") &&
      response.request().method() === "POST",
  );
  await originalCard
    .getByRole("button", {
      name: `Πρόσθεσε αντίγραφο: ${original.title}`,
      exact: true,
    })
    .click();
  const copy: SavedQuiz = await (await copyCreated).json();
  expect(copy.id).not.toBe(saved[0].id);
  const copyResponse = await page.request.get(`/api/quizzes/${copy.id}`, {
    headers: { "X-Quiz-Key": copy.ownerKey },
  });
  expect((await copyResponse.json()).questions).toEqual(original.questions);
  await expect(page.locator(".quiz-card")).toHaveCount(10);
  await page
    .locator(".quiz-card")
    .filter({
      has: page.getByRole("heading", { name: original.title, exact: true }),
    })
    .getByRole("button", { name: "Παίξε live" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Όλοι έτοιμοι;" }),
  ).toBeVisible();
  await expect(page.getByText("5 ερωτήσεις · έως 100 παίκτες")).toBeVisible();
});

test("failed template save keeps the library unchanged and can be retried", async ({
  page,
}) => {
  await page.goto("/quizzes");
  const add = page.getByRole("button", {
    name: "Προσθήκη στη βιβλιοθήκη: Ελλάδα στον χάρτη",
    exact: true,
  });
  await page.route("**/api/quizzes", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Προσωρινά μη διαθέσιμο." }),
    }),
  );
  await add.click();
  await expect(page.getByRole("alert")).toContainText(
    "Προσωρινά μη διαθέσιμο.",
  );
  await expect(page.locator(".quiz-card")).toHaveCount(0);
  await expect(add).toBeEnabled();
  await page.unroute("**/api/quizzes");
  await add.click();
  await expect(page.locator(".quiz-card")).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
