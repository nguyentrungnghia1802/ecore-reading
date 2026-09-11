import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import type { UmlFlowNode } from '../canvas/react-flow-adapter';
import { NodeCard } from './NodeCard';

export const UmlNode = memo(function UmlNode({ data }: NodeProps<UmlFlowNode>) {
  return (
    <>
      <Handle className="uml-node__handle" position={Position.Left} type="target" />
      <NodeCard data={data} />
      <Handle className="uml-node__handle" position={Position.Right} type="source" />
    </>
  );
});
