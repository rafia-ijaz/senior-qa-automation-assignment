import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SearchResultsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openProductByName(productName: string): Promise<void> {
    await this.page.getByRole('link', { name: productName, exact: true }).click();
  }
}
