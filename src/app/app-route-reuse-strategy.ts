import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

/**
 * When :appId changes, force Angular to destroy and recreate the entire
 * child component subtree instead of reusing it. This way every page gets
 * a fresh ngOnInit → data reload, without per-component paramMap subscriptions.
 */
@Injectable()
export class AppRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    if (
      future.routeConfig === curr.routeConfig &&
      future.paramMap.get('appId') !== curr.paramMap.get('appId')
    ) {
      return false;
    }
    return super.shouldReuseRoute(future, curr);
  }
}
