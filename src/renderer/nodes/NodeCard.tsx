import { memo, type MouseEvent } from 'react';
import type { UmlNodeData } from '../canvas/react-flow-adapter';

export interface NodeCardProps {
  data: UmlNodeData;
}

function accessibleKind(data: UmlNodeData): string {
  if (data.kind === 'external') {
    return 'external unresolved';
  }
  if (data.kind === 'enum') {
    return 'enumeration';
  }
  return data.kind;
}

export const NodeCard = memo(function NodeCard({ data }: NodeCardProps) {
  const selectRow = (event: MouseEvent<HTMLButtonElement>, semanticId: string) => {
    event.stopPropagation();
    data.onSelectRow?.(semanticId);
  };
  const rowText = new Map(data.text.rows.map((row) => [row.rowId, row]));

  const compartments = data.rows.reduce<Map<string, typeof data.rows>>((groups, row) => {
    const group = row.kind === 'operation' ? 'operation' : 'feature';
    const rows = groups.get(group) ?? [];
    rows.push(row);
    groups.set(group, rows);
    return groups;
  }, new Map());

  return (
    <article
      aria-label={`${accessibleKind(data)} ${data.title}`}
      className={`uml-node uml-node--${data.kind} uml-node--${data.selectedState}`}
      data-semantic-id={data.semanticId}
      data-selection-state={data.selectedState}
      style={{ width: data.size.width, height: data.size.height }}
      title={data.title}
    >
      <header className="uml-node__header">
        {data.stereotype === undefined ? null : (
          <span className="uml-node__stereotype" title={data.text.stereotype?.fullText}>
            {data.text.stereotype?.displayText ?? data.stereotype}
          </span>
        )}
        <strong className="uml-node__title" title={data.text.title.fullText}>
          {data.text.title.displayText}
        </strong>
      </header>
      {[...compartments.entries()].map(([kind, rows]) => (
        <section className={`uml-node__compartment uml-node__compartment--${kind}`} key={kind}>
          {rows.map((row) => (
            (() => {
              const text = rowText.get(row.id);
              return (
                <button
                  aria-label={`Select ${text?.primary.fullText ?? row.primaryText}`}
                  className={`uml-node__row uml-node__row--${row.kind} ${row.secondaryText === undefined ? '' : 'uml-node__row--secondary'} nodrag`}
                  key={row.id}
                  onClick={(event) => selectRow(event, row.semanticId)}
                  title={text?.secondary?.fullText ?? text?.primary.fullText ?? row.secondaryText ?? row.primaryText}
                  type="button"
                >
                  <span>{text?.primary.displayText ?? row.primaryText}</span>
                  {row.secondaryText === undefined ? null : (
                    <small>{text?.secondary?.displayText ?? row.secondaryText}</small>
                  )}
                </button>
              );
            })()
          ))}
        </section>
      ))}
      {data.badges.length === 0 ? null : (
        <div className="uml-node__badges" aria-label="Diagnostics">
          {data.badges.map((badge) => (
            <span className={`uml-node__badge uml-node__badge--${badge.tone}`} key={badge.id}>
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </article>
  );
});
