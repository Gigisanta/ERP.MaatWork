import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PipelinePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoPipeline() {
    await this.goto('/pipeline');
  }

  get stageColumns(): Locator {
    // Looks for typical Kanban column identifiers
    return this.page.locator('[data-testid*="stage"], [class*="stage"], [class*="column"]');
  }

  get contactCards(): Locator {
    return this.page.locator(
      '[draggable="true"], [data-testid*="contact"], [class*="contact-card"]'
    );
  }

  async expectPipelineVisible() {
    await expect(this.page.getByText(/pipeline|kanban|etapas/i)).toBeVisible();
    await expect(this.stageColumns.first()).toBeVisible();
  }

  async dragContactToStage(cardIndex: number, stageIndex: number) {
    const card = this.contactCards.nth(cardIndex);
    const targetStage = this.stageColumns.nth(stageIndex);

    await expect(card).toBeVisible();
    await expect(targetStage).toBeVisible();

    await card.dragTo(targetStage);

    // Wait for any animation or network request to complete
    await this.page.waitForTimeout(500);
  }

  async expectStagesCount(min: number) {
    // Strict assertion: must be at least 'min'
    await expect(async () => {
      const count = await this.stageColumns.count();
      expect(count).toBeGreaterThanOrEqual(min);
    }).toPass();
  }

  async expectContactCountInStage(stageIndex: number, min: number = 1) {
    const stage = this.stageColumns.nth(stageIndex);
    const cardsInStage = stage.locator(
      '[draggable="true"], [data-testid*="contact"], [class*="contact-card"]'
    );

    await expect(async () => {
      const count = await cardsInStage.count();
      expect(count).toBeGreaterThanOrEqual(min);
    }).toPass();
  }
}
