import { forwardRef, type ComponentProps, type ReactNode } from 'react'
import { IonContent } from '@ionic/react'
import { PageBackFab } from './PageBackFab'
import './AppContent.css'

type AppContentProps = ComponentProps<typeof IonContent> & {
  withFab?: boolean
  fixed?: ReactNode
  backHref?: string
}

/** Shared page and modal spacing. Keep fixed-slot children directly in IonContent. */
export const AppContent = forwardRef<HTMLIonContentElement, AppContentProps>(
  function AppContent({ className, withFab = false, fixed, backHref, children, ...props }, ref) {
    return (
      <IonContent
        {...props}
        ref={ref}
        fixedSlotPlacement={backHref ? 'before' : (props.fixedSlotPlacement ?? 'after')}
        className={['app-content', (withFab || backHref) && 'app-content--with-fab', className].filter(Boolean).join(' ')}
      >
        {backHref && <PageBackFab backHref={backHref} />}
        <div className="app-content-body">{children}</div>
        {fixed}
      </IonContent>
    )
  },
)
