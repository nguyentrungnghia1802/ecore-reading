import { BaseEdge, type EdgeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import {
  edgeEndLabels,
  edgeMarkerShapes,
  edgePresentation,
  pointsToSvg,
  sectionsToSvgPath,
} from '../../diagram/notation';
import type { SemanticFlowEdge } from '../canvas/react-flow-adapter';

export function SemanticEdge({ data, style }: EdgeProps<SemanticFlowEdge>) {
  if (data === undefined) return null;

  const { relation, selectedState } = data;
  const presentation = edgePresentation(relation);
  const pathStyle: CSSProperties = {
    ...style,
    ...(presentation.dash === undefined ? {} : { strokeDasharray: presentation.dash }),
  };
  const path = sectionsToSvgPath(relation.sections);

  return (
    <>
      <BaseEdge
        className={`semantic-edge__path semantic-edge__path--${relation.kind} semantic-edge__path--${selectedState}`}
        interactionWidth={20}
        path={path}
        style={pathStyle}
      />
      {edgeMarkerShapes(relation).map((shape) => (
        <polygon
          aria-hidden="true"
          className={`semantic-edge__marker semantic-edge__marker--${shape.marker} semantic-edge__marker--${shape.end}`}
          key={`${shape.end}:${shape.marker}`}
          points={pointsToSvg(shape.points)}
        />
      ))}
      {edgeEndLabels(relation).map((label) => (
        <text
          aria-hidden="true"
          className={`semantic-edge__label semantic-edge__label--${label.end}`}
          key={label.end}
          x={label.point.x}
          y={label.point.y}
        >
          {label.truncated ? <title>{label.fullText}</title> : null}
          {label.text}
        </text>
      ))}
    </>
  );
}
