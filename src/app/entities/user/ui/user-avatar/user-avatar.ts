import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <div class="avatar avatar-placeholder">
      <div [class]="containerClasses()">
        <span [class]="textClass()">{{ initials() }}</span>
      </div>
    </div>
  `,
})
export class UserAvatarComponent {
  readonly firstName = input.required<string>();
  readonly lastName = input.required<string>();
  readonly size = input<'xs' | 'sm' | 'md'>('sm');
  readonly colorScheme = input<'neutral' | 'primary' | 'base'>('neutral');

  protected readonly initials = computed(
    () => (this.firstName()[0] ?? '') + (this.lastName()[0] ?? ''),
  );

  protected readonly containerClasses = computed(() => {
    const sizeClass = { xs: 'w-7', sm: 'w-8', md: 'w-12' }[this.size()];
    const colorClass = {
      neutral: 'bg-neutral text-neutral-content',
      primary: 'bg-primary text-primary-content',
      base: 'bg-base-300 text-base-content',
    }[this.colorScheme()];
    return `${sizeClass} rounded-full ${colorClass}`;
  });

  protected readonly textClass = computed(() =>
    this.size() === 'md' ? 'text-lg font-bold' : 'text-xs',
  );
}
