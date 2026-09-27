import { IonInput, IonItem } from '@ionic/react'

interface TransactionDescriptionInputProps {
  value: string
  onChange: (value: string) => void
}

export function TransactionDescriptionInput({
  value,
  onChange,
}: TransactionDescriptionInputProps) {
  return (
    <IonItem>
      <IonInput
        label="Описание"
        labelPlacement="stacked"
        type="text"
        value={value}
        placeholder="Необязательно"
        autocapitalize="sentences"
        onIonInput={(event) => onChange(event.detail.value ?? '')}
      />
    </IonItem>
  )
}
