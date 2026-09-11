import type { Diagnostic } from '../model/diagnostic';
import type { EcoreClass, EcoreClassifier } from '../model/types';

export function addInheritanceCycleDiagnostics(
  classifiers: readonly EcoreClassifier[],
  diagnostics: Diagnostic[],
): void {
  const classes = new Map(
    classifiers.filter((item): item is EcoreClass => item.kind === 'class').map((item) => [item.id, item]),
  );
  const state = new Map<string, 'visiting' | 'visited'>();
  const stack: string[] = [];
  const reported = new Set<string>();

  const visit = (id: string): void => {
    const current = state.get(id);
    if (current === 'visited') return;
    if (current === 'visiting') {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      const key = [...new Set(cycle)].sort().join('|');
      if (!reported.has(key)) {
        reported.add(key);
        diagnostics.push({
          id: `ECORE_INHERITANCE_CYCLE:${key}`,
          code: 'ECORE_INHERITANCE_CYCLE',
          severity: 'error',
          message: `Inheritance cycle detected: ${cycle.join(' -> ')}.`,
          semanticId: id,
        });
      }
      return;
    }
    state.set(id, 'visiting');
    stack.push(id);
    const classifier = classes.get(id);
    for (const superType of classifier?.superTypeRefs ?? []) {
      if (superType.kind === 'local' && classes.has(superType.classifierId)) visit(superType.classifierId);
    }
    stack.pop();
    state.set(id, 'visited');
  };

  classes.forEach((_value, id) => visit(id));
}
