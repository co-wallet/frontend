import { createAnimation, iosTransitionAnimation, isPlatform, type TransitionOptions } from '@ionic/react'

/** WebKit animates browser history itself, including in installed iOS PWAs. */
export function iosWebTransition(baseEl: HTMLElement, opts: TransitionOptions) {
  if (opts.direction === 'back') {
    return createAnimation().addElement(opts.enteringEl).duration(0)
  }
  return iosTransitionAnimation(baseEl, opts)
}

export function ionicNavigationConfig() {
  const nativeBrowserBack = isPlatform('ios') && !isPlatform('hybrid')
  return {
    swipeBackEnabled: !nativeBrowserBack,
    ...(nativeBrowserBack ? { navAnimation: iosWebTransition } : {}),
  }
}
