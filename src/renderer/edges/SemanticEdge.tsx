import { BaseEdge, type EdgeProps } from '@xyflow/react';
import { memo, type CSSProperties } from 'react';
import {
  edgeEndLabels,
  edgeMarkerShapes,
  edgePresentation,
  pointsToSvg,
  sectionsToSvgPath,
} from '../../diagram/notation';
import type { SemanticFlowEdge } from '../canvas/react-flow-adapter';
import { computeOrthogonalBendPoints, type PortSide } from './edge-geometry';

export const SemanticEdge = memo(function SemanticEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps<SemanticFlowEdge>) {
  if (data === undefined) return null;

  const { relation, selectedState } = data;
  const presentation = edgePresentation(relation);
  const pathStyle: CSSProperties = {
    ...style,
    ...(presentation.dash === undefined ? {} : { strokeDasharray: presentation.dash }),
  };

  // Determine effective sections:
  // If data already contains dynamic sections from DiagramCanvas, use them directly.
  // In standalone/testing mode where only sourceX/sourceY are provided without data.sourceNode,
  // adapt the endpoints to sourceX/targetX.
  let sections = relation.sections;
  if (
    data.sourceNode === undefined &&
    sourceX !== undefined &&
    sourceY !== undefined &&
    targetX !== undefined &&
    targetY !== undefined &&
    sections.length > 0
  ) {
    const initialStart = sections[0]!.start;
    const initialEnd = sections.at(-1)!.end;
    if (
      Math.abs(sourceX - initialStart.x) > 1 ||
      Math.abs(sourceY - initialStart.y) > 1 ||
      Math.abs(targetX - initialEnd.x) > 1 ||
      Math.abs(targetY - initialEnd.y) > 1
    ) {
      const srcSide = (sourcePosition as PortSide) ?? 'right';
      const tgtSide = (targetPosition as PortSide) ?? 'left';
      const bendPoints = computeOrthogonalBendPoints(
        { x: sourceX, y: sourceY },
        srcSide,
        { x: targetX, y: targetY },
        tgtSide,
      );
      sections = [
        {
          start: { x: sourceX, y: sourceY },
          bendPoints,
          end: { x: targetX, y: targetY },
        },
      ];
    }
  }

  const activeRelation = sections === relation.sections ? relation : { ...relation, sections };
  const path = sectionsToSvgPath(activeRelation.sections);

  return (
    <>
      <BaseEdge
        className={`semantic-edge__path semantic-edge__path--${relation.kind} semantic-edge__path--${selectedState}`}
        interactionWidth={20}
        path={path}
        style={pathStyle}
      />
      {edgeMarkerShapes(activeRelation).map((shape) => (
        <polygon
          aria-hidden="true"
          className={`semantic-edge__marker semantic-edge__marker--${shape.marker} semantic-edge__marker--${shape.end}`}
          key={`${shape.end}:${shape.marker}`}
          points={pointsToSvg(shape.points)}
        />
      ))}
      {edgeEndLabels(activeRelation).map((label) => (
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
});
