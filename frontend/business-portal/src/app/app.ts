import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonComponent } from '@/components/ui/button.component';
import { CardComponent } from '@/components/ui/card.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonComponent, CardComponent],
  template: `
    <main class="min-h-screen p-6 bg-muted/30">
      <ui-card
        class="max-w-xl mx-auto"
        title="Business Portal"
        description="Angular app configured with shadcn/ui (Angular port)."
        content="Baseline components are now ready for feature implementation."
      >
        <div class="px-6 pb-6">
          <ui-button label="Open Dashboard" />
        </div>
      </ui-card>
      <router-outlet />
    </main>
  `,
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('business-portal');
}
