# 15 — Glossary

## Ecore

EMF's metamodeling language/model used to define model structure. `.ecore` is commonly serialized as XMI/XML.

## EPackage

Namespace/container for EClassifiers. May contain nested subpackages.

## EClassifier

Common category containing EClass and EDataType; EEnum is a kind of EDataType.

## EClass

Metaclass describing objects in an instance model. Owns attributes, references, and operations and may inherit from multiple EClasses.

## EAttribute

Typed structural feature whose type is an EDataType.

## EReference

Typed structural feature that points from an owning EClass to another EClass. It is navigable in the owned direction.

## containment

EReference property indicating compositional ownership of the referenced object in an instance model.

## eOpposite

Link from one EReference to the opposite EReference representing reverse navigation. A bidirectional association requires two EReferences paired as opposites.

## multiplicity

Allowed number of values for an ETypedElement, represented by lower and upper bounds. In Ecore, `upperBound=-1` means unbounded.

## EOperation

Behavioral feature owned by an EClass. May have parameters, return type, exceptions, type parameters, and multiplicity metadata.

## EParameter

Typed parameter owned by an EOperation.

## EDataType

Classifier representing values rather than model objects.

## EEnum

EDataType with a finite set of EEnumLiterals.

## EAnnotation

Extensible metadata attached to Ecore elements using a source plus detail entries/content/references.

## Raw Ecore AST

Project-specific unresolved representation extracted directly from XML/XMI before URI/type resolution.

## EcoreModel

Project's canonical resolved semantic representation. It contains no layout coordinates or React Flow types.

## DiagramModel

Presentation-semantic graph derived from EcoreModel. It decides concepts such as merged opposite associations and detail rows but has no coordinates.

## LayoutModel

DiagramModel plus node geometry and routed relation sections.

## semantic ID

Deterministic project-owned identity of an Ecore element. It is independent of display name and viewport state.

## unresolved external reference

Reference targeting another resource that the single-file viewer intentionally does not fetch. It remains explicit instead of being guessed.

## React Flow

Interactive React canvas/graph rendering library used as the viewport and interaction host.

## ELK / elkjs

Eclipse Layout Kernel and its JavaScript distribution used to compute automatic graph layouts and edge routes.

## detail mode

Viewer presentation level: Overview, Standard, Detailed, or Ecore.

## focus neighborhood

Subgraph around a selected semantic node limited by relation-hop depth.

## stable mental map

UX principle that avoids unnecessary node movement so users can keep spatial orientation while exploring.
