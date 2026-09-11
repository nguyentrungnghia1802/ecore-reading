export interface StressEcoreOptions {
  classCount: number;
  referencesPerClass: number;
}

function nonNegativeInteger(value: number, name: string, allowZero: boolean): void {
  if (!Number.isInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${name} must be ${allowZero ? 'a non-negative' : 'a positive'} integer.`);
  }
}

function classifierName(index: number): string {
  return `Entity${String(index).padStart(3, '0')}`;
}

/** Builds a deterministic, local-only graph fixture without committing a huge XML file. */
export function generateStressEcore(options: StressEcoreOptions): string {
  nonNegativeInteger(options.classCount, 'classCount', false);
  nonNegativeInteger(options.referencesPerClass, 'referencesPerClass', true);

  const classifiers = Array.from({ length: options.classCount }, (_, index) => {
    const name = classifierName(index);
    const superType = index === 0 ? '' : ` eSuperTypes="#//${classifierName(0)}"`;
    const target = classifierName((index + 1) % options.classCount);
    const features = [
      `    <eStructuralFeatures xsi:type="ecore:EAttribute" name="code" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>`,
      ...Array.from({ length: options.referencesPerClass }, (_, referenceIndex) => {
        const containment = referenceIndex === 0 && index % 10 === 0
          ? ' containment="true"'
          : '';
        const upperBound = referenceIndex === 0 ? ' upperBound="-1"' : '';
        return `    <eStructuralFeatures xsi:type="ecore:EReference" name="link${referenceIndex}" eType="#//${target}"${upperBound}${containment}/>`;
      }),
    ];
    return [
      `  <eClassifiers xsi:type="ecore:EClass" name="${name}"${superType}>`,
      ...features,
      '  </eClassifiers>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ecore:EPackage xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="stress" nsURI="urn:ecore-visualizer:stress" nsPrefix="stress">',
    ...classifiers,
    '</ecore:EPackage>',
  ].join('\n');
}
