import { IonButton } from '@ionic/react'
import type { AccountKind } from '@/api/accounts'
import { ACCOUNT_KIND_OPTIONS } from '@/lib/accountKind'

interface AllAccountKindsButtonProps {
  selectedKinds: AccountKind[]
  onChange: (kinds: AccountKind[]) => void
  className: string
  unselectedFill?: 'clear' | 'outline'
}

export function AllAccountKindsButton({
  selectedKinds, onChange, className, unselectedFill = 'outline',
}: AllAccountKindsButtonProps) {
  const selected = ACCOUNT_KIND_OPTIONS.every((option) => selectedKinds.includes(option.value))
  return (
    <IonButton
      className={className}
      fill={selected ? 'solid' : unselectedFill}
      color={selected ? 'primary' : undefined}
      aria-label="Все типы средств"
      aria-pressed={selected}
      onClick={() => onChange(ACCOUNT_KIND_OPTIONS.map((option) => option.value))}
    >
      <span>Все</span>
    </IonButton>
  )
}
