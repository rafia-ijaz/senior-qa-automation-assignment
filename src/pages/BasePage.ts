import type { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;

  protected constructor(page: Page) {
    this.page = page;
  }

  protected byText(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
