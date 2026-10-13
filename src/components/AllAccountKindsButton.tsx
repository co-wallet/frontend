import { IonIcon, IonItem, IonLabel } from '@ionic/react'
import { checkmark } from 'ionicons/icons'
import type { AccountKind } from '@/api/accounts'
import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'

interface AllAccountKindsButtonProps {
  selectedKinds: AccountKind[]
  onChange: (kinds: AccountKind[]) => void
  className: string
}

export function AllAccountKindsButton({
  selectedKinds, onChange, className,
}: AllAccountKindsButtonProps) {
  const selected = ACCOUNT_KIND_OPTIONS.every((option) => selectedKinds.includes(option.value))
  return (
    <IonItem button detail={false}
      className={className}
      role="checkbox"
      aria-label="Все типы средств"
      aria-checked={selected}
      onClick={() => onChange(selected ? [] : ACCOUNT_KIND_OPTIONS.map((option) => option.value))}
    >
      <IonLabel>Все</IonLabel>
      {selected && <IonIcon slot="end" icon={checkmark} color="primary" aria-hidden="true" />}
    </IonItem>
  )
}
