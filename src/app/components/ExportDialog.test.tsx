import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DiagramModel } from '../../diagram/model';
import type { LayoutModel } from '../../layout/model';
import { ExportDialog } from './ExportDialog';

describe('ExportDialog component', () => {
  const dummyDiagram: DiagramModel = {
    nodes: [],
    relations: [],
    sourceSemanticIds: new Set(),
    diagnostics: [],
  };

  const dummyLayout: LayoutModel = {
    nodes: [],
    relations: [],
    bounds: { x: 0, y: 0, width: 800, height: 600 },
    profileId: 'hierarchy-down',
  };

  it('renders summary information and export options', () => {
    const markup = renderToStaticMarkup(
      <ExportDialog
        isOpen={true}
        onClose={() => {}}
        sourceName="workflow.ecore"
        diagram={dummyDiagram}
        layout={dummyLayout}
        detailMode="standard"
        focusDescription="Focused: NodeA (depth 1)"
        activeFilterCount={1}
      />,
    );

    expect(markup).toContain('Export Metamodel Diagram');
    expect(markup).toContain('data-testid="export-dialog"');
    expect(markup).toContain('data-testid="export-format-svg"');
    expect(markup).toContain('data-testid="export-format-png"');
    expect(markup).toContain('workflow-ecore-diagram.svg');
    expect(markup).toContain('Focused: NodeA (depth 1)');
    expect(markup).toContain('1 custom active');
  });

  it('returns null when closed', () => {
    const markup = renderToStaticMarkup(
      <ExportDialog
        isOpen={false}
        onClose={() => {}}
        sourceName="workflow.ecore"
        diagram={dummyDiagram}
        layout={dummyLayout}
        detailMode="standard"
        activeFilterCount={0}
      />,
    );

    expect(markup).toBe('');
  });
});
