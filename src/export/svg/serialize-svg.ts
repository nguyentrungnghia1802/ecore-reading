import type {
  DiagramModel,
  DiagramNode,
  DiagramRelation,
  DiagramRow,
  TextLayout,
} from '../../diagram/model';
import {
  EDGE_LABEL_FONT_SIZE,
  edgeEndLabels,
  edgeMarkerShapes,
  edgePresentation,
  pointsToSvg,
  sectionsToSvgPath,
} from '../../diagram/notation';
import type { EdgeMarker } from '../../diagram/notation';
import { DEFAULT_DIAGRAM_METRICS } from '../../diagram/sizing';
import type { LayoutModel, LayoutNode, LayoutRelation, Point } from '../../layout/model';

export type SvgExportBackground = 'transparent' | 'light' | 'dark';

export interface SvgExportOptions {
  background?: SvgExportBackground;
  padding?: number;
}

export const SVG_FONT_FAMILY = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface SvgPalette {
  canvas: string;
  node: string;
  text: string;
  mutedText: string;
  stroke: string;
  compartmentStroke: string;
  hollowMarker: string;
  diagnostic: string;
}

interface ExportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const DEFAULT_EXPORT_PADDING = 32;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function paletteFor(background: SvgExportBackground): SvgPalette {
  if (background === 'dark') {
    return {
      canvas: '#0f172a',
      node: '#1e293b',
      text: '#f8fafc',
      mutedText: '#cbd5e1',
      stroke: '#cbd5e1',
      compartmentStroke: '#94a3b8',
      hollowMarker: '#0f172a',
      diagnostic: '#fbbf24',
    };
  }
  return {
    canvas: '#f8fafc',
    node: '#ffffff',
    text: '#172033',
    mutedText: '#475569',
    stroke: '#334155',
    compartmentStroke: '#94a3b8',
    hollowMarker: '#f8fafc',
    diagnostic: '#b45309',
  };
}

/** Escapes both SVG text and quoted attribute values from the Ecore model. */
export function escapeSvgText(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return character;
    }
  });
}

function numberText(value: number, context: string): string {
  if (!Number.isFinite(value)) {
    throw new Error(`SVG export requires finite ${context}.`);
  }
  return Object.is(value, -0) ? '0' : String(value);
}

function pointText(point: Point, context: string): string {
  return `${numberText(point.x, `${context}.x`)},${numberText(point.y, `${context}.y`)}`;
}

function escapedAttribute(value: string): string {
  return escapeSvgText(value);
}

function textLayoutFor(value: string): TextLayout {
  return { fullText: value, displayText: value, truncated: false };
}

function textForRow(layoutNode: LayoutNode, row: DiagramRow): { primary: TextLayout; secondary?: TextLayout } {
  const layout = layoutNode.text.rows.find((item) => item.rowId === row.id);
  return {
    primary: layout?.primary ?? textLayoutFor(row.primaryText),
    ...(row.secondaryText === undefined
      ? {}
      : { secondary: layout?.secondary ?? textLayoutFor(row.secondaryText) }),
  };
}

function textForTitle(layoutNode: LayoutNode): TextLayout {
  return layoutNode.text.title ?? textLayoutFor(layoutNode.title);
}

function textForStereotype(layoutNode: LayoutNode, node: DiagramNode): TextLayout | undefined {
  if (node.stereotype === undefined) return undefined;
  return layoutNode.text.stereotype ?? textLayoutFor(node.stereotype);
}

function renderText(
  layout: TextLayout,
  x: number,
  y: number,
  attributes: string,
): string {
  const title = layout.fullText === layout.displayText
    ? ''
    : `<title>${escapeSvgText(layout.fullText)}</title>`;
  return `<text x="${numberText(x, 'text x')}" y="${numberText(y, 'text y')}" ${attributes}>${title}${escapeSvgText(layout.displayText)}</text>`;
}

function groupedRows(rows: readonly DiagramRow[]): DiagramRow[][] {
  const groups = new Map<'feature' | 'operation', DiagramRow[]>();
  for (const row of rows) {
    const key = row.kind === 'operation' ? 'operation' : 'feature';
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function nodeShapeAttributes(node: DiagramNode, palette: SvgPalette): string {
  const radius = node.kind === 'enum' ? 12 : node.kind === 'datatype' ? 999 : 7;
  const dash = node.kind === 'external' ? ' stroke-dasharray="6 4"' : '';
  return `fill="${palette.node}" stroke="${palette.stroke}" stroke-width="1.5" rx="${radius}"${dash}`;
}

function renderBadge(node: DiagramNode, badgeIndex: number, palette: SvgPalette, layoutNode: LayoutNode): string {
  const badge = node.badges[badgeIndex];
  if (badge === undefined) return '';
  const centerX = layoutNode.position.x + layoutNode.size.width - 12 - badgeIndex * 15;
  const centerY = layoutNode.position.y + 12;
  const symbol = badge.tone === 'warning' || badge.tone === 'error' ? '!' : 'i';
  return [
    `<g data-badge-id="${escapedAttribute(badge.id)}" data-tone="${badge.tone}">`,
    `<title>${escapeSvgText(badge.label)}</title>`,
    `<circle cx="${numberText(centerX, 'badge x')}" cy="${numberText(centerY, 'badge y')}" r="6" fill="${palette.node}" stroke="${palette.diagnostic}" stroke-width="1.5" />`,
    renderText(
      { fullText: symbol, displayText: symbol, truncated: false },
      centerX,
      centerY + 3.5,
      `fill="${palette.diagnostic}" font-family="${escapedAttribute(SVG_FONT_FAMILY)}" font-size="9" font-weight="700" text-anchor="middle"`,
    ),
    '</g>',
  ].join('');
}

function renderNode(node: DiagramNode, layoutNode: LayoutNode, palette: SvgPalette): string {
  const { x, y } = layoutNode.position;
  const { width, height } = layoutNode.size;
  const title = textForTitle(layoutNode);
  const stereotype = textForStereotype(layoutNode, node);
  const headerBottom = y + DEFAULT_DIAGRAM_METRICS.headerHeight;
  const titleY = stereotype === undefined ? y + 31 : y + 40;
  const children: string[] = [
    `<g data-node-id="${escapedAttribute(node.id)}" data-semantic-id="${escapedAttribute(node.semanticId)}">`,
    `<title>${escapeSvgText(node.title)}</title>`,
    `<rect x="${numberText(x, 'node x')}" y="${numberText(y, 'node y')}" width="${numberText(width, 'node width')}" height="${numberText(height, 'node height')}" ${nodeShapeAttributes(node, palette)} />`,
    `<line x1="${numberText(x, 'header line x1')}" y1="${numberText(headerBottom, 'header line y')}" x2="${numberText(x + width, 'header line x2')}" y2="${numberText(headerBottom, 'header line y')}" stroke="${palette.stroke}" stroke-width="1" />`,
  ];

  if (stereotype !== undefined) {
    children.push(renderText(
      stereotype,
      x + width / 2,
      y + 19,
      `fill="${palette.mutedText}" font-family="${escapedAttribute(SVG_FONT_FAMILY)}" font-size="11" text-anchor="middle"`,
    ));
  }
  children.push(renderText(
    title,
    x + width / 2,
    titleY,
    `fill="${palette.text}" font-family="${escapedAttribute(SVG_FONT_FAMILY)}" font-size="14" font-weight="700" text-anchor="middle"`,
  ));

  let rowY = headerBottom;
  for (const [groupIndex, rows] of groupedRows(node.rows).entries()) {
    if (groupIndex === 0) {
      rowY += DEFAULT_DIAGRAM_METRICS.compartmentPadding;
    } else {
      children.push(
        `<line x1="${numberText(x + 8, 'compartment line x1')}" y1="${numberText(rowY, 'compartment line y')}" x2="${numberText(x + width - 8, 'compartment line x2')}" y2="${numberText(rowY, 'compartment line y')}" stroke="${palette.compartmentStroke}" stroke-width="1" />`,
      );
    }
    for (const row of rows) {
      const text = textForRow(layoutNode, row);
      children.push(renderText(
        text.primary,
        x + DEFAULT_DIAGRAM_METRICS.horizontalPadding,
        rowY + 15,
        `fill="${palette.text}" font-family="${escapedAttribute(SVG_FONT_FAMILY)}" font-size="12"`,
      ));
      if (text.secondary !== undefined) {
        children.push(renderText(
          text.secondary,
          x + DEFAULT_DIAGRAM_METRICS.horizontalPadding,
          rowY + 33,
          `fill="${palette.mutedText}" font-family="${escapedAttribute(SVG_FONT_FAMILY)}" font-size="11"`,
        ));
      }
      rowY += DEFAULT_DIAGRAM_METRICS.rowHeight + (text.secondary === undefined
        ? 0
        : DEFAULT_DIAGRAM_METRICS.secondaryRowHeight);
    }
  }

  for (let badgeIndex = 0; badgeIndex < node.badges.length; badgeIndex += 1) {
    children.push(renderBadge(node, badgeIndex, palette, layoutNode));
  }
  children.push('</g>');
  return children.join('');
}

function markerId(marker: EdgeMarker): string {
  if (marker === 'uml-filled-diamond') {
    throw new Error('Composition markers use explicit SVG diamond geometry.');
  }
  return marker === 'uml-hollow-triangle'
    ? 'ecore-svg-generalization'
    : 'ecore-svg-reference';
}

function renderMarkers(palette: SvgPalette): string {
  return [
    '<defs>',
    `<marker id="ecore-svg-generalization" viewBox="0 0 12 14" refX="12" refY="7" markerWidth="12" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto-start-reverse" overflow="visible">`,
    `<path d="M 0 0 L 12 7 L 0 14 z" fill="${palette.hollowMarker}" stroke="${palette.stroke}" stroke-linejoin="round" stroke-width="1.6" />`,
    '</marker>',
    `<marker id="ecore-svg-reference" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse" overflow="visible">`,
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.stroke}" stroke="${palette.stroke}" stroke-linejoin="round" />`,
    '</marker>',
    '</defs>',
  ].join('');
}

function relationPath(relation: LayoutRelation): string {
  if (relation.sections.length === 0) {
    throw new Error(`SVG export cannot render relation ${relation.id} without route sections.`);
  }
  for (const section of relation.sections) {
    numberText(section.start.x, `relation ${relation.id} start x`);
    numberText(section.start.y, `relation ${relation.id} start y`);
    for (const point of section.bendPoints) {
      numberText(point.x, `relation ${relation.id} bend point x`);
      numberText(point.y, `relation ${relation.id} bend point y`);
    }
    numberText(section.end.x, `relation ${relation.id} end x`);
    numberText(section.end.y, `relation ${relation.id} end y`);
  }
  return sectionsToSvgPath(relation.sections);
}

function renderRelation(layoutRelation: LayoutRelation, semanticRelation: DiagramRelation, palette: SvgPalette): string {
  const relation: LayoutRelation = { ...semanticRelation, sections: layoutRelation.sections };
  const presentation = edgePresentation(relation);
  const markerStart = presentation.markerStart === 'uml-navigable-arrow'
    ? ` marker-start="url(#${markerId(presentation.markerStart)})"`
    : '';
  const markerEnd = presentation.markerEnd === undefined
    ? ''
    : ` marker-end="url(#${markerId(presentation.markerEnd)})"`;
  const dash = presentation.dash === undefined ? '' : ` stroke-dasharray="${presentation.dash}"`;
  const path = relationPath(relation);
  const diamonds = edgeMarkerShapes(relation)
    .filter((shape) => shape.marker === 'uml-filled-diamond')
    .map((shape) => `<polygon data-marker="composition" data-marker-end="${shape.end}" points="${pointText(shape.points[0] ?? { x: 0, y: 0 }, 'diamond first')} ${pointsToSvg(shape.points.slice(1))}" fill="${palette.stroke}" stroke="${palette.stroke}" stroke-linejoin="round" stroke-width="1.6" />`)
    .join('');
  const labels = edgeEndLabels({ ...relation, ...semanticRelation })
    .map((label) => renderText(
      { fullText: label.fullText, displayText: label.text, truncated: label.truncated },
      label.point.x,
      label.point.y,
      `data-relation-label-end="${label.end}" fill="${palette.text}" font-family="${escapedAttribute(SVG_FONT_FAMILY)}" font-size="${EDGE_LABEL_FONT_SIZE}" paint-order="stroke" stroke="${palette.canvas}" stroke-linejoin="round" stroke-width="4"`,
    ))
    .join('');
  return [
    `<g data-relation-id="${escapedAttribute(relation.id)}" data-relation-kind="${relation.kind}" aria-label="${escapedAttribute(relation.kind)}">`,
    `<path d="${escapedAttribute(path)}" fill="none" stroke="${palette.stroke}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"${dash}${markerStart}${markerEnd} />`,
    diamonds,
    labels,
    '</g>',
  ].join('');
}

function includePoint(bounds: ExportBounds, point: Point, context: string): void {
  const x = Number(numberText(point.x, `${context}.x`));
  const y = Number(numberText(point.y, `${context}.y`));
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function includeRect(bounds: ExportBounds, x: number, y: number, width: number, height: number, context: string): void {
  if (width < 0 || height < 0) {
    throw new Error(`SVG export requires non-negative ${context} dimensions.`);
  }
  includePoint(bounds, { x, y }, context);
  includePoint(bounds, { x: x + width, y: y + height }, context);
}

function includeRelationBounds(bounds: ExportBounds, relation: LayoutRelation, semanticRelation: DiagramRelation): void {
  const authoritativeRelation: LayoutRelation = {
    ...semanticRelation,
    sections: relation.sections,
  };
  for (const section of authoritativeRelation.sections) {
    includePoint(bounds, section.start, `relation ${relation.id} start`);
    for (const point of section.bendPoints) includePoint(bounds, point, `relation ${relation.id} bend`);
    includePoint(bounds, section.end, `relation ${relation.id} end`);
  }
  for (const marker of edgeMarkerShapes(authoritativeRelation)) {
    for (const point of marker.points) includePoint(bounds, point, `relation ${relation.id} marker`);
  }
  for (const label of edgeEndLabels(authoritativeRelation)) {
    const estimatedWidth = Math.max(1, Array.from(label.text).length) * EDGE_LABEL_FONT_SIZE;
    includeRect(bounds, label.point.x - 1, label.point.y - 13, estimatedWidth + 2, 18, `relation ${relation.id} label`);
  }
}

function exportBounds(
  layout: LayoutModel,
  semanticRelations: ReadonlyMap<string, DiagramRelation>,
  padding: number,
): ExportBounds {
  const bounds: ExportBounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
  includeRect(bounds, layout.bounds.x, layout.bounds.y, layout.bounds.width, layout.bounds.height, 'layout bounds');
  for (const node of layout.nodes) {
    includeRect(bounds, node.position.x, node.position.y, node.size.width, node.size.height, `node ${node.id}`);
  }
  for (const relation of layout.relations) {
    const semanticRelation = semanticRelations.get(relation.id);
    if (semanticRelation === undefined) {
      throw new Error(`SVG export is missing semantic relation ${relation.id}.`);
    }
    includeRelationBounds(bounds, relation, semanticRelation);
  }
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
}

function indexed<T extends { id: string }>(items: readonly T[], kind: string): ReadonlyMap<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    if (result.has(item.id)) {
      throw new Error(`SVG export cannot use duplicate ${kind} ID ${item.id}.`);
    }
    result.set(item.id, item);
  }
  return result;
}

function matchingModel(
  diagram: DiagramModel,
  layout: LayoutModel,
): { nodes: ReadonlyMap<string, DiagramNode>; relations: ReadonlyMap<string, DiagramRelation> } {
  const nodes = indexed(diagram.nodes, 'diagram node');
  const relations = indexed(diagram.relations, 'diagram relation');
  const layoutNodes = indexed(layout.nodes, 'layout node');
  const layoutRelations = indexed(layout.relations, 'layout relation');
  for (const id of nodes.keys()) {
    if (!layoutNodes.has(id)) throw new Error(`SVG export is missing layout node ${id}.`);
  }
  for (const id of layoutNodes.keys()) {
    if (!nodes.has(id)) throw new Error(`SVG export received layout-only node ${id}.`);
  }
  for (const id of relations.keys()) {
    if (!layoutRelations.has(id)) throw new Error(`SVG export is missing layout relation ${id}.`);
  }
  for (const id of layoutRelations.keys()) {
    if (!relations.has(id)) throw new Error(`SVG export received layout-only relation ${id}.`);
  }
  return { nodes, relations };
}

function optionPadding(options: SvgExportOptions): number {
  const padding = options.padding ?? DEFAULT_EXPORT_PADDING;
  if (!Number.isFinite(padding) || padding < 0) {
    throw new Error('SVG export padding must be a finite non-negative number.');
  }
  return padding;
}

/**
 * Serializes the semantic diagram and its calculated layout into a standalone,
 * data-only SVG. It deliberately accepts no DOM, URL, or callback input.
 */
export function serializeSvg(
  diagram: DiagramModel,
  layout: LayoutModel,
  options: SvgExportOptions = {},
): string {
  const background = options.background ?? 'transparent';
  const padding = optionPadding(options);
  const palette = paletteFor(background);
  const semantic = matchingModel(diagram, layout);
  const bounds = exportBounds(layout, semantic.relations, padding);
  const viewBoxWidth = bounds.maxX - bounds.minX;
  const viewBoxHeight = bounds.maxY - bounds.minY;
  const backgroundRect = background === 'transparent'
    ? ''
    : `<rect data-export-background="${background}" x="${numberText(bounds.minX, 'background x')}" y="${numberText(bounds.minY, 'background y')}" width="${numberText(viewBoxWidth, 'background width')}" height="${numberText(viewBoxHeight, 'background height')}" fill="${palette.canvas}" />`;
  const relations = layout.relations.map((relation) => {
    const source = semantic.relations.get(relation.id);
    if (source === undefined) throw new Error(`SVG export is missing semantic relation ${relation.id}.`);
    return renderRelation(relation, source, palette);
  }).join('');
  const nodes = layout.nodes.map((layoutNode) => {
    const source = semantic.nodes.get(layoutNode.id);
    if (source === undefined) throw new Error(`SVG export is missing semantic node ${layoutNode.id}.`);
    return renderNode(source, layoutNode, palette);
  }).join('');

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="${SVG_NAMESPACE}" role="img" aria-label="Ecore diagram" viewBox="${numberText(bounds.minX, 'viewBox x')} ${numberText(bounds.minY, 'viewBox y')} ${numberText(viewBoxWidth, 'viewBox width')} ${numberText(viewBoxHeight, 'viewBox height')}">`,
    '<title>Ecore diagram</title>',
    renderMarkers(palette),
    backgroundRect,
    relations,
    nodes,
    '</svg>',
  ].join('\n');
}
