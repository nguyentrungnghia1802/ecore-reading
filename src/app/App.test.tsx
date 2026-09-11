import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { LoadingState } from './components/LoadingState';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { WorkspaceStatusBar } from './components/WorkspaceStatusBar';
import { buildEcoreModel } from '../ecore/model';
import { parseRawEcore } from '../ecore/parser';

describe('Workspace UI components', () => {
  it('renders EmptyState with privacy notice and drop zone', () => {
    const markup = renderToStaticMarkup(
      <EmptyState onOpenFile={() => {}} onLoadSample={() => {}} />,
    );

    expect(markup).toContain('Ecore Visualizer');
    expect(markup).toContain('Processed locally in your browser.');
    expect(markup).toContain('data-testid="drop-zone"');
    expect(markup).toContain('data-testid="open-file-button"');
  });

  it('renders LoadingState with actionable message', () => {
    const markup = renderToStaticMarkup(
      <LoadingState message="Computing diagram layout…" sourceName="workflow.ecore" />,
    );

    expect(markup).toContain('Loading workflow.ecore');
    expect(markup).toContain('Computing diagram layout…');
    expect(markup).toContain('data-testid="workspace-loading"');
  });

  it('renders ErrorState with diagnostic messages and recovery button', () => {
    const markup = renderToStaticMarkup(
      <ErrorState
        sourceName="broken.ecore"
        error={{
          message: 'XML parsing failed',
          diagnostics: [
            {
              id: 'diag:parse-error',
              code: 'XML_PARSE_ERROR',
              severity: 'error',
              message: 'Unclosed tag: eClassifiers',
            },
          ],
        }}
        onOpenFile={() => {}}
      />,
    );

    expect(markup).toContain('Unable to load metamodel');
    expect(markup).toContain('broken.ecore');
    expect(markup).toContain('[XML_PARSE_ERROR]');
    expect(markup).toContain('Unclosed tag: eClassifiers');
    expect(markup).toContain('data-testid="error-open-another-file"');
  });

  it('renders WorkspaceHeader with safe file name', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceHeader sourceName="test<safe>&name.ecore" onOpenFile={() => {}} />,
    );

    expect(markup).toContain('test&lt;safe&gt;&amp;name.ecore');
    expect(markup).toContain('data-testid="header-open-file"');
  });

  it('renders WorkspaceStatusBar with model statistics', () => {
    const raw = parseRawEcore(`
      <ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="pkg">
        <eClassifiers xsi:type="ecore:EClass" name="A" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <eStructuralFeatures xsi:type="ecore:EAttribute" name="id" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString" />
        </eClassifiers>
      </ecore:EPackage>
    `, { sourceName: 'test.ecore' });
    const model = buildEcoreModel(raw);

    const markup = renderToStaticMarkup(
      <WorkspaceStatusBar model={model} layoutStatus="Ready" />,
    );

    expect(markup).toContain('1</strong> class');
    expect(markup).toContain('1</strong> attribute');
    expect(markup).toContain('0 warnings');
    expect(markup).toContain('Ready');
  });
});
