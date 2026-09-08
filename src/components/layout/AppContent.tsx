import { forwardRef, type ComponentProps, type ReactNode } from 'react'
import { IonContent } from '@ionic/react'
import './AppContent.css'

type AppContentProps = ComponentProps<typeof IonContent> & {
  withFab?: boolean
  fixed?: ReactNode
}

/** Shared page and modal spacing. Keep fixed-slot children directly in IonContent. */
export const AppContent = forwardRef<HTMLIonContentElement, AppContentProps>(
  function AppContent({ className, withFab = false, fixed, children, ...props }, ref) {
    return (
      <IonContent
        {...props}
        ref={ref}
        className={['app-content', withFab && 'app-content--with-fab', className].filter(Boolean).join(' ')}
      >
        <div className="app-content-body">{children}</div>
        {fixed}
      </IonContent>
    )
  },
)
