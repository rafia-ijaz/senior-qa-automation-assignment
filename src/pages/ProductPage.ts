import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async addToCart(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add to cart' }).first().click();
    // The site shows a green notification bar after adding to cart. Wait for it to appear.
    const bar = this.page.locator('#bar-notification');
    await bar.waitFor({ state: 'visible' });
    await bar
      .getByText(/has been added to your shopping cart/i)
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => undefined);
  }

  async goToCartFromNotification(): Promise<void> {
    await this.page.locator('#bar-notification').getByRole('link', { name: /shopping cart/i }).click();
  }

  async continueShoppingFromNotification(): Promise<void> {
    const bar = this.page.locator('#bar-notification');
    await bar.waitFor({ state: 'visible' });

    const close = bar.locator('.close');
    const closeVisible = await close.isVisible().catch(() => false);

    if (closeVisible) {
      await close.click({ timeout: 5_000 }).catch(async () => {
        await close.click({ force: true });
      });
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }

    await bar.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  }
}
