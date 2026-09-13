import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import type { UmlFlowNode } from '../canvas/react-flow-adapter';
import { NodeCard } from './NodeCard';

export const UmlNode = memo(function UmlNode({ data }: NodeProps<UmlFlowNode>) {
  return (
    <>
      <Handle className="uml-node__handle" id="top" position={Position.Top} type="source" />
      <Handle className="uml-node__handle" id="top-target" position={Position.Top} type="target" />
      <Handle className="uml-node__handle" id="right" position={Position.Right} type="source" />
      <Handle className="uml-node__handle" id="right-target" position={Position.Right} type="target" />
      <Handle className="uml-node__handle" id="bottom" position={Position.Bottom} type="source" />
      <Handle className="uml-node__handle" id="bottom-target" position={Position.Bottom} type="target" />
      <Handle className="uml-node__handle" id="left" position={Position.Left} type="source" />
      <Handle className="uml-node__handle" id="left-target" position={Position.Left} type="target" />
      <NodeCard data={data} />
    </>
  );
});
