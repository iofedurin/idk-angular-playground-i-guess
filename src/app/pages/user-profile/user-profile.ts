import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsersStore } from '@entities/user';
import { UserCardComponent } from '@widgets/user-card';
import { SpinnerComponent } from '@shared/ui';

@Component({
  selector: 'app-user-profile-page',
  imports: [RouterLink, UserCardComponent, SpinnerComponent],
  templateUrl: './user-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfilePage implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(UsersStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly appId = this.route.snapshot.paramMap.get('appId')!;
  protected readonly userId = this.route.snapshot.paramMap.get('id')!;

  protected readonly store$ = this.store;

  async ngOnInit() {
    if (!this.store.entityMap()[this.userId]) {
      await this.store.loadAll();
    }
    if (!this.store.entityMap()[this.userId]) {
      await this.router.navigate(['/app', this.appId, 'users']);
    }
  }
}
