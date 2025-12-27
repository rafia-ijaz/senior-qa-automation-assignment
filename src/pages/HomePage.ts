import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async search(productName: string): Promise<void> {
    await this.page.locator('#small-searchterms').fill(productName);
    await this.page.locator('form[action="/search"] input[type="submit"], .search-box-button').click();
  }

  async openCart(): Promise<void> {
    await this.page.locator('a.ico-cart[href="/cart"]').first().click();
  }
}
