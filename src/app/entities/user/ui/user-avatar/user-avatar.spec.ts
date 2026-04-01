import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserAvatarComponent } from './user-avatar';

describe('UserAvatarComponent', () => {
  let fixture: ComponentFixture<UserAvatarComponent>;
  let el: HTMLElement;

  async function create(
    firstName: string,
    lastName: string,
    size?: 'xs' | 'sm' | 'md',
    colorScheme?: 'neutral' | 'primary' | 'base',
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [UserAvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserAvatarComponent);
    fixture.componentRef.setInput('firstName', firstName);
    fixture.componentRef.setInput('lastName', lastName);
    if (size) fixture.componentRef.setInput('size', size);
    if (colorScheme) fixture.componentRef.setInput('colorScheme', colorScheme);
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  it('renders initials from firstName and lastName', async () => {
    await create('John', 'Doe');
    expect(el.querySelector('.avatar span')?.textContent?.trim()).toBe('JD');
  });

  it('defaults to w-8 and bg-neutral text-neutral-content', async () => {
    await create('Alice', 'Smith');
    const inner = el.querySelector('.avatar div') as HTMLElement;
    expect(inner.className).toContain('w-8');
    expect(inner.className).toContain('bg-neutral');
    expect(inner.className).toContain('text-neutral-content');
  });

  it('size="md" + colorScheme="primary" → w-12 + bg-primary text-primary-content', async () => {
    await create('Bob', 'Jones', 'md', 'primary');
    const inner = el.querySelector('.avatar div') as HTMLElement;
    expect(inner.className).toContain('w-12');
    expect(inner.className).toContain('bg-primary');
    expect(inner.className).toContain('text-primary-content');
  });

  it('size="xs" → w-7', async () => {
    await create('Carol', 'Black', 'xs');
    const inner = el.querySelector('.avatar div') as HTMLElement;
    expect(inner.className).toContain('w-7');
  });

  it('colorScheme="base" → bg-base-300 text-base-content', async () => {
    await create('Dan', 'White', undefined, 'base');
    const inner = el.querySelector('.avatar div') as HTMLElement;
    expect(inner.className).toContain('bg-base-300');
    expect(inner.className).toContain('text-base-content');
  });
});
