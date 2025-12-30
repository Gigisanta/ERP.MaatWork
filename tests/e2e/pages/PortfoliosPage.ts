import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PortfoliosPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoList() {
    await this.goto('/portfolios');
  }

  async createTemplate(name: string, description?: string) {
    await this.gotoList();
    await this.page.getByRole('button', { name: /nuevo|new|crear/i }).click();

    await this.page.getByLabel(/nombre|name/i).fill(name);
    if (description) {
      await this.page.getByLabel(/descripción|description/i).fill(description);
    }

    await this.page.getByRole('button', { name: /guardar|save/i }).click();
    await this.expectSuccessToast();
  }

  async openPortfolio(name: string) {
    const link = this.page.getByRole('link', { name: new RegExp(name, 'i') }).first();
    await link.click();
    await expect(this.page).toHaveURL(/\/portfolios\//);
  }

  async addComponent(assetTicker: string, weight: string) {
    await this.page.getByRole('button', { name: /agregar|add|component/i }).click();
    const search = this.page.getByPlaceholder(/buscar|search/i);
    await search.fill(assetTicker);
    await this.page.waitForTimeout(500);
    await this.page.getByText(new RegExp(assetTicker, 'i')).first().click();

    await this.page.getByLabel(/peso|weight/i).fill(weight);
    await this.page.getByRole('button', { name: /guardar|save/i }).click();
  }

  async deletePortfolio() {
    await this.page.getByRole('button', { name: /eliminar|delete/i }).click();
    await this.confirmDialog();
    await this.expectSuccessToast(/eliminado|deleted/i);
  }

  async assignTemplateToClient(clientName: string, templateName: string) {
    // This flow depends on whether we assign from client detail or portfolio list
    // Assuming from Portfolio list for now (assign to client action)

    // Find template row
    const row = this.page.getByRole('row', { name: new RegExp(templateName, 'i') });
    await row.getByRole('button', { name: /asignar|assign/i }).click();

    // Select client in modal
    await this.page.getByLabel(/cliente|client/i).fill(clientName);
    await this.page.getByText(clientName).first().click(); // Select from dropdown

    await this.page.getByRole('button', { name: /confirmar|save/i }).click();
    await this.expectSuccessToast(/asignado|assigned/i);
  }
}
