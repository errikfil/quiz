import { test, expect } from "@playwright/test";

test("home, responsive layout, and quiz editor", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Μια ερώτηση. Όλοι μέσα." }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/sima-home-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("link", { name: "Δημιούργησε ένα quiz" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/sima-home-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Δημιούργησε ένα quiz" }).click();
  await page.getByLabel("Τίτλος quiz").fill("Το πρώτο μου quiz");
  await page
    .getByLabel("Τι θέλεις να ρωτήσεις;")
    .fill("Ποια είναι η σωστή απάντηση;");
  for (const [i, letter] of [..."ΑΒΓΔ"].entries())
    await page
      .getByLabel(`Απάντηση ${letter}`, { exact: true })
      .fill(`Επιλογή ${i + 1}`);
  await page.getByRole("button", { name: "Όρισε την Β ως σωστή" }).click();
  await expect(
    page.getByRole("button", { name: "Όρισε την Β ως σωστή" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "/tmp/sima-editor-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Αποθήκευση quiz" }).click();
  await expect(
    page.getByRole("heading", { name: "Το πρώτο μου quiz" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Επεξεργασία: Το πρώτο μου quiz" })
    .click();
  await expect(page.getByLabel("Τίτλος quiz")).toHaveValue("Το πρώτο μου quiz");
  await expect(
    page.getByRole("button", { name: "Όρισε την Β ως σωστή" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Τίτλος quiz").fill("Το ενημερωμένο quiz");
  await page.getByRole("button", { name: "Αποθήκευση quiz" }).click();
  await expect(
    page.getByRole("heading", { name: "Το ενημερωμένο quiz" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("host and mobile player complete a real live quiz", async ({
  browser,
}) => {
  const hostContext = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const playerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const host = await hostContext.newPage();
  const player = await playerContext.newPage();
  try {
    await host.goto("/quizzes/new");
    await host.getByLabel("Τίτλος quiz").fill("Ζωντανή δοκιμή");
    await host
      .getByLabel("Τι θέλεις να ρωτήσεις;")
      .fill("Ποια τεχνολογία στέλνει live ενημερώσεις;");
    const options = ["SignalR", "CSS", "MySQL", "Git"];
    for (const [i, letter] of [..."ΑΒΓΔ"].entries())
      await host
        .getByLabel(`Απάντηση ${letter}`, { exact: true })
        .fill(options[i]);
    await host.getByRole("button", { name: "Αποθήκευση quiz" }).click();
    await host.getByRole("button", { name: "Παίξε live" }).click();
    await expect(
      host.getByRole("heading", { name: "Όλοι έτοιμοι;" }),
    ).toBeVisible();
    const pin = host.url().split("/").pop()!;
    await player.goto(`/join?pin=${pin}`);
    await player.getByLabel("Το όνομά σου").fill("Μαρία");
    await player.getByRole("button", { name: "Είμαι μέσα" }).click();
    await expect(
      player.getByRole("heading", { name: "Είσαι μέσα, Μαρία!" }),
    ).toBeVisible();
    await expect(host.locator(".player-chip")).toHaveCount(1);
    await host.screenshot({ path: "/tmp/sima-lobby.png", fullPage: true });
    // Ανανέωση σελίδας: η ταυτότητα και το δωμάτιο πρέπει να διατηρηθούν.
    await player.reload();
    await expect(
      player.getByRole("heading", { name: "Είσαι μέσα, Μαρία!" }),
    ).toBeVisible();
    await expect(host.locator(".player-chip")).toHaveCount(1);
    await host.getByRole("button", { name: "Ξεκίνα το quiz" }).click();
    await expect(
      player.getByRole("heading", {
        name: "Ποια τεχνολογία στέλνει live ενημερώσεις;",
      }),
    ).toBeVisible();
    expect(
      await player.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await player.screenshot({
      path: "/tmp/sima-question-mobile.png",
      fullPage: true,
    });
    await player
      .getByRole("button", { name: "Α SignalR", exact: true })
      .click();
    await expect(host.getByText("Οι απαντήσεις έκλεισαν")).toBeVisible();
    await expect(player.locator(".revealed-correct")).toContainText("SignalR");
    await expect(player.getByText(/Σωστά! \+/)).toBeVisible();
    await host.getByRole("button", { name: "Τελική κατάταξη" }).click();
    await expect(
      host.getByRole("heading", { name: "Μπράβο, Μαρία!" }),
    ).toBeVisible();
    await expect(
      player.getByRole("heading", { name: "Μπράβο, Μαρία!" }),
    ).toBeVisible();
    await host.screenshot({ path: "/tmp/sima-results.png", fullPage: true });
    const downloadPromise = host.waitForEvent("download");
    await host.getByRole("button", { name: "Εξαγωγή αποτελεσμάτων" }).click();
    expect((await downloadPromise).suggestedFilename()).toBe(`sima-${pin}.csv`);
  } finally {
    await hostContext.close();
    await playerContext.close();
  }
});
