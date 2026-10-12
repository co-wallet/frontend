import { useIonRouter } from '@ionic/react'

/** Preserve the Ionic view stack; direct links return to the page's parent. */
export function usePageBack(backHref: string) {
  const router = useIonRouter()
  return () => {
    if (router.canGoBack()) router.goBack()
    else router.push(backHref, 'back', 'replace')
  }
}
