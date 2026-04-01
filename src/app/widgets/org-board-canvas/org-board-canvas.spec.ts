import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrgBoardCanvasComponent } from './org-board-canvas';

// Foblex uses ResizeObserver internally (FResizeChannel) — jsdom doesn't include it
(window as any)['ResizeObserver'] = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
import { FCreateConnectionEvent, FReassignConnectionEvent } from '@foblex/flow';
import type { BoardEdge, BoardNode } from '@features/org-board';
import type { User } from '@entities/user';

const makeUser = (id: string, overrides: Partial<User> = {}): User => ({
  id,
  username: `user${id}`,
  firstName: 'First',
  lastName: 'Last',
  email: `user${id}@test.com`,
  age: 30,
  country: 'US',
  department: 'engineering',
  jobTitle: 'senior-frontend',
  role: 'editor',
  active: true,
  bio: '',
  managerId: null,
  ...overrides,
});

const mockNodes: BoardNode[] = [
  { userId: '1', user: makeUser('1'), x: 100, y: 100, positionId: 'bp1', directReportsCount: 0 },
  { userId: '2', user: makeUser('2'), x: 300, y: 100, positionId: 'bp2', directReportsCount: 0 },
  { userId: '3', user: makeUser('3'), x: 200, y: 300, positionId: 'bp3', directReportsCount: 0 },
];

const mockEdges: BoardEdge[] = [
  { id: 'edge-1-2', managerId: '1', subordinateId: '2', outputId: 'out-1', inputId: 'in-2' },
  { id: 'edge-1-3', managerId: '1', subordinateId: '3', outputId: 'out-1', inputId: 'in-3' },
];

describe('OrgBoardCanvasComponent', () => {
  let fixture: ComponentFixture<OrgBoardCanvasComponent>;
  let component: OrgBoardCanvasComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgBoardCanvasComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgBoardCanvasComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('nodes', mockNodes);
    fixture.componentRef.setInput('edges', mockEdges);
    fixture.componentRef.setInput('validTargetsByUser', new Map());
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('creates without error', () => {
    expect(component).toBeTruthy();
  });

  describe('node rendering', () => {
    it('renders an fNode for each BoardNode', () => {
      const nodes = el.querySelectorAll('[fNode]');
      expect(nodes).toHaveLength(3);
    });

    it('every fNode has fDragHandle so cards are individually draggable', () => {
      const nodes = el.querySelectorAll('[fNode]');
      nodes.forEach((node) => {
        expect(node.hasAttribute('fDragHandle')).toBe(true);
      });
    });

    it('every fNode has position: relative for absolute connectors', () => {
      const nodes = el.querySelectorAll('[fNode]');
      nodes.forEach((node) => {
        expect(node.classList.contains('relative')).toBe(true);
      });
    });

    it('renders an fNodeOutput connector for each node', () => {
      const outputs = el.querySelectorAll('[fNodeOutput]');
      expect(outputs).toHaveLength(3);
    });

    it('renders an fNodeInput connector for each node', () => {
      const inputs = el.querySelectorAll('[fNodeInput]');
      expect(inputs).toHaveLength(3);
    });

    it('renders a UserBoardCard for each node', () => {
      const cards = el.querySelectorAll('app-user-board-card');
      expect(cards).toHaveLength(3);
    });
  });

  describe('edge rendering', () => {
    it('renders an f-connection for each BoardEdge', () => {
      const connections = el.querySelectorAll('f-connection');
      expect(connections).toHaveLength(2);
    });

    it('renders zero f-connection elements when edges is empty', () => {
      fixture.componentRef.setInput('edges', []);
      fixture.detectChanges();

      expect(el.querySelectorAll('f-connection')).toHaveLength(0);
    });
  });

  describe('selection', () => {
    it('passes selected=true to the card matching selectedUserId', () => {
      fixture.componentRef.setInput('selectedUserId', '2');
      fixture.detectChanges();

      const cards = el.querySelectorAll('app-user-board-card');
      // Card for user '2' should have ring classes (selected)
      const cardEl2 = cards[1] as HTMLElement;
      const ringDiv = cardEl2.querySelector('.ring-2');
      expect(ringDiv).toBeTruthy();
    });

    it('passes selected=false to cards NOT matching selectedUserId', () => {
      fixture.componentRef.setInput('selectedUserId', '2');
      fixture.detectChanges();

      const cards = el.querySelectorAll('app-user-board-card');
      // Card for user '1' should NOT have ring classes
      const cardEl1 = cards[0] as HTMLElement;
      expect(cardEl1.querySelector('.ring-2')).toBeFalsy();
    });
  });

  describe('nodeClicked output', () => {
    it('emits userId when a card is clicked', () => {
      const emitted: string[] = [];
      component.nodeClicked.subscribe((id) => emitted.push(id));

      const cards = el.querySelectorAll('app-user-board-card');
      (cards[1] as HTMLElement).click();

      expect(emitted).toEqual(['2']);
    });
  });

  describe('onConnectionCreated', () => {
    it('emits connectionCreated with parsed managerId and subordinateId', () => {
      const emitted: Array<{ managerId: string; subordinateId: string }> = [];
      component.connectionCreated.subscribe((e) => emitted.push(e));

      const event = new FCreateConnectionEvent('out-1', 'in-2', { x: 0, y: 0 });
      (component as any).onConnectionCreated(event);

      expect(emitted).toEqual([{ managerId: '1', subordinateId: '2' }]);
    });

    it('does NOT emit when targetId is undefined (dropped to empty space)', () => {
      const emitted: unknown[] = [];
      component.connectionCreated.subscribe((e) => emitted.push(e));

      const event = new FCreateConnectionEvent('out-1', undefined, { x: 0, y: 0 });
      (component as any).onConnectionCreated(event);

      expect(emitted).toEqual([]);
    });
  });

  describe('onConnectionReassigned', () => {
    it('emits connectionRemoved when target is dropped to nowhere', () => {
      const emitted: Array<{ subordinateId: string }> = [];
      component.connectionRemoved.subscribe((e) => emitted.push(e));

      const event = new FReassignConnectionEvent(
        'conn-1', 'target', 'out-1', 'out-1', 'in-2', undefined, { x: 0, y: 0 },
      );
      (component as any).onConnectionReassigned(event);

      expect(emitted).toEqual([{ subordinateId: '2' }]);
    });

    it('does NOT emit connectionRemoved when endpoint is source', () => {
      const emitted: unknown[] = [];
      component.connectionRemoved.subscribe((e) => emitted.push(e));

      const event = new FReassignConnectionEvent(
        'conn-1', 'source', 'out-1', undefined, 'in-2', 'in-2', { x: 0, y: 0 },
      );
      (component as any).onConnectionReassigned(event);

      expect(emitted).toEqual([]);
    });

    it('does NOT emit connectionRemoved when nextTargetId is defined (reassign, not remove)', () => {
      const emitted: unknown[] = [];
      component.connectionRemoved.subscribe((e) => emitted.push(e));

      const event = new FReassignConnectionEvent(
        'conn-1', 'target', 'out-1', 'out-1', 'in-2', 'in-3', { x: 0, y: 0 },
      );
      (component as any).onConnectionReassigned(event);

      expect(emitted).toEqual([]);
    });
  });

  describe('nodePositionChanged output', () => {
    it('emits position data when onPositionChange is called', () => {
      const emitted: Array<{ userId: string; positionId: string; x: number; y: number }> = [];
      component.nodePositionChanged.subscribe((e) => emitted.push(e));

      (component as any).onPositionChange(mockNodes[0], { x: 555, y: 666 });

      expect(emitted).toEqual([{ userId: '1', positionId: 'bp1', x: 555, y: 666 }]);
    });
  });
});
