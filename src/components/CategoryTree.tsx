import { IonButton, IonButtons, IonIcon, IonItem, IonLabel } from '@ionic/react'
import {
  addOutline,
  chevronDownOutline,
  chevronForwardOutline,
  createOutline,
  trashOutline,
} from 'ionicons/icons'

import type { CategoryNode } from '@/api/categories'
import { CategoryIcon } from './CategoryIcon'

import './CategoryTree.css'

export function CategoryTree({
  nodes,
  expanded,
  onToggle,
  onAddChild,
  onEdit,
  onDelete,
}: {
  nodes: CategoryNode[]
  expanded: Set<string>
  onToggle: (id: string) => void
  onAddChild: (category: CategoryNode) => void
  onEdit: (category: CategoryNode) => void
  onDelete: (category: CategoryNode) => void
}) {
  function renderNodes(items: CategoryNode[], depth: number) {
    return items.map((node) => {
      const hasChildren = Boolean(node.children?.length)
      const isExpanded = expanded.has(node.id)

      return (
        <div key={node.id}>
          <IonItem
            className="category-tree-row"
            style={{ '--padding-start': `${8 + depth * 24}px` }}
          >
            <span slot="start" className="category-tree-row__leading">
              {hasChildren ? (
                <IonButton
                  className="category-tree-row__expand"
                  fill="clear"
                  color="medium"
                  aria-label={`${isExpanded ? 'Свернуть' : 'Развернуть'} «${node.name}»`}
                  title={isExpanded ? 'Свернуть подкатегории' : 'Показать подкатегории'}
                  onClick={() => onToggle(node.id)}
                >
                  <IonIcon
                    slot="icon-only"
                    icon={isExpanded ? chevronDownOutline : chevronForwardOutline}
                  />
                </IonButton>
              ) : (
                <span className="category-tree-row__expand-spacer" aria-hidden="true" />
              )}
              <CategoryIcon value={node.icon} type={node.type} size={32} />
            </span>

            <IonLabel className="category-tree-row__label">{node.name}</IonLabel>

            <IonButtons slot="end" className="category-tree-row__actions">
              <IonButton
                fill="clear"
                color="primary"
                aria-label={`Добавить подкатегорию к «${node.name}»`}
                title="Добавить подкатегорию"
                onClick={() => onAddChild(node)}
              >
                <IonIcon slot="icon-only" icon={addOutline} />
              </IonButton>
              <IonButton
                fill="clear"
                color="primary"
                aria-label={`Редактировать «${node.name}»`}
                title="Редактировать категорию"
                onClick={() => onEdit(node)}
              >
                <IonIcon slot="icon-only" icon={createOutline} />
              </IonButton>
              <IonButton
                fill="clear"
                color="danger"
                aria-label={`Удалить «${node.name}»`}
                title="Удалить категорию"
                onClick={() => onDelete(node)}
              >
                <IonIcon slot="icon-only" icon={trashOutline} />
              </IonButton>
            </IonButtons>
          </IonItem>

          {hasChildren && isExpanded && renderNodes(node.children, depth + 1)}
        </div>
      )
    })
  }

  return <>{renderNodes(nodes, 0)}</>
}
