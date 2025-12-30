import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AutomationsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoAutomations() {
    await this.goto('/automations');
  }

  async verifyCardsVisible() {
    await expect(this.page.getByRole('heading', { name: /Emails Automáticos/i })).toBeVisible();
    await expect(this.page.getByText('Email Segunda Reunión')).toBeVisible();
    await expect(this.page.getByText('Email de Bienvenida (Cliente)')).toBeVisible();
  }

  async configureEmail(name: string, subject: string, body: string) {
    const card = this.page.locator('.rounded-lg').filter({ hasText: name });

    const connectButton = card.getByRole('button', { name: /Conectar cuenta de Google/i });
    if (await connectButton.isVisible()) {
      console.log('Google account not connected, skipping configuration save.');
      return; // Skip if not connected
    }

    await card.getByLabel('Habilitar automatización').check();
    await card.getByPlaceholder('Asunto del correo').fill(subject);
    await card.getByPlaceholder(/contenido del correo/i).fill(body);

    await card.getByRole('button', { name: 'Guardar Configuración' }).click();
    await this.expectSuccessToast(/actualizada correctamente/i);
  }
}
