import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InfiniteScrollDirective } from './infinite-scroll.directive';
import { vi } from 'vitest';

type IntersectionCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

@Component({
  imports: [InfiniteScrollDirective],
  template: `<div appInfiniteScroll (scrolled)="onScrolled()"></div>`,
})
class TestHost {
  scrolledCount = 0;
  onScrolled() {
    this.scrolledCount++;
  }
}

describe('InfiniteScrollDirective', () => {
  let observerCallback: IntersectionCallback;

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionCallback) {
          observerCallback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );

    TestBed.configureTestingModule({});
  });

  afterEach(() => vi.unstubAllGlobals());

  it('emits scrolled when element enters viewport', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    observerCallback([{ isIntersecting: true }]);

    expect(fixture.componentInstance.scrolledCount).toBe(1);
  });

  it('does not emit when element leaves viewport', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    observerCallback([{ isIntersecting: false }]);

    expect(fixture.componentInstance.scrolledCount).toBe(0);
  });

  it('emits multiple times on repeated intersections', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    observerCallback([{ isIntersecting: true }]);
    observerCallback([{ isIntersecting: true }]);

    expect(fixture.componentInstance.scrolledCount).toBe(2);
  });
});
