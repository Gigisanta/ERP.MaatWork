import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class BenchmarksPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoList() {
    await this.goto('/benchmarks');
  }

  async createBenchmark(name: string, type: 'individual' | 'blended' = 'individual') {
    await this.page.getByRole('button', { name: /nuevo|crear|new|add/i }).first().click();
    await this.page.getByLabel(/nombre|name/i).fill(name);
    // Assuming type selection exists
    const typeSelect = this.page.getByLabel(/tipo|type/i);
    if (await typeSelect.isVisible()) {
         await typeSelect.selectOption(type);
    }
    await this.page.getByRole('button', { name: /guardar|save/i }).first().click();
    await this.expectSuccessToast(/éxito|success|creado/i);
  }

  async openBenchmark(name: string) {
    // Wait for list to load/update
    await this.searchBenchmark(name); 
    const link = this.page.getByRole('link', { name: new RegExp(name, 'i') }).first();
    await link.click();
    await expect(this.page).toHaveURL(/\/benchmarks\/[^/]+$/);
  }

  async searchBenchmark(term: string) {
     const search = this.page.getByPlaceholder(/buscar|search/i);
     if (await search.isVisible()) {
         await search.fill(term);
         await this.page.waitForTimeout(500);
     }
  }

  async addComponent(assetTicker: string, weight: string) {
      await this.page.getByRole('button', { name: /agregar|add|component/i }).click();
      
      const searchInput = this.page.getByPlaceholder(/buscar|search/i);
      await searchInput.fill(assetTicker);
      await this.page.waitForTimeout(1000); // Wait for mock search
      
      await this.page.getByText(new RegExp(assetTicker, 'i')).first().click();
      
      await this.page.getByLabel(/peso|weight/i).fill(weight);
      await this.page.getByRole('button', { name: /guardar|save/i }).click();
      
      // Verify added
      await expect(this.page.getByText(assetTicker)).toBeVisible();
  }
}
