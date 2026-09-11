import { useEffect, useState } from 'react';
import type { DiagramDetailMode, DiagramModel } from '../../diagram/model';
import { sanitizeExportFilename } from '../../export/filename';
import { downloadBlob, rasterizeSvgToPng } from '../../export/png/rasterize-png';
import { serializeSvg, type SvgExportBackground } from '../../export/svg';
import type { LayoutModel } from '../../layout/model';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceName: string;
  diagram: DiagramModel;
  layout: LayoutModel;
  detailMode: DiagramDetailMode;
  focusDescription?: string | null;
  activeFilterCount: number;
}

export function ExportDialog({
  isOpen,
  onClose,
  sourceName,
  diagram,
  layout,
  detailMode,
  focusDescription,
  activeFilterCount,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'svg' | 'png'>('svg');
  const [background, setBackground] = useState<SvgExportBackground>('light');
  const [scale, setScale] = useState<number>(2);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filename = sanitizeExportFilename(sourceName, format);

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const svgString = serializeSvg(diagram, layout, { background, padding: 32 });

      if (format === 'svg') {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(blob, filename);
      } else {
        const pngBlob = await rasterizeSvgToPng(svgString, { background, scale });
        downloadBlob(pngBlob, filename);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="export-modal-backdrop"
      data-testid="export-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="export-dialog"
        data-testid="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        <div className="export-dialog__header">
          <h2 id="export-dialog-title" className="export-dialog__title">
            Export Metamodel Diagram
          </h2>
          <button
            type="button"
            className="export-dialog__close-btn"
            onClick={onClose}
            aria-label="Close export dialog"
            data-testid="close-export-dialog"
          >
            ✕
          </button>
        </div>

        <div className="export-dialog__content">
          {/* Current view summary */}
          <div className="export-dialog__section">
            <h3 className="export-dialog__section-title">Included in Export</h3>
            <div className="export-dialog__summary-grid">
              <div className="export-dialog__summary-item">
                <span className="export-dialog__summary-label">Detail Mode:</span>
                <span className="export-dialog__summary-val" data-testid="export-summary-mode">
                  {detailMode.charAt(0).toUpperCase() + detailMode.slice(1)}
                </span>
              </div>
              <div className="export-dialog__summary-item">
                <span className="export-dialog__summary-label">Elements:</span>
                <span className="export-dialog__summary-val">
                  {diagram.nodes.length} nodes, {diagram.relations.length} relations
                </span>
              </div>
              <div className="export-dialog__summary-item">
                <span className="export-dialog__summary-label">Filters:</span>
                <span className="export-dialog__summary-val">
                  {activeFilterCount > 0 ? `${activeFilterCount} custom active` : 'Default (all enabled)'}
                </span>
              </div>
              <div className="export-dialog__summary-item">
                <span className="export-dialog__summary-label">Scope / Focus:</span>
                <span className="export-dialog__summary-val">
                  {focusDescription || 'Full diagram (All nodes)'}
                </span>
              </div>
            </div>
          </div>

          {/* Format selection */}
          <div className="export-dialog__section">
            <h3 className="export-dialog__section-title">Format</h3>
            <div className="export-dialog__format-group" role="radiogroup" aria-label="Export format">
              <label
                className={`export-dialog__radio-option ${format === 'svg' ? 'export-dialog__radio-option--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="export-format"
                  value="svg"
                  checked={format === 'svg'}
                  onChange={() => setFormat('svg')}
                  data-testid="export-format-svg"
                />
                <div>
                  <strong>SVG (Vector)</strong>
                  <p>Crisp standalone vector graphic. Best for papers, LaTeX, and high-res print.</p>
                </div>
              </label>
              <label
                className={`export-dialog__radio-option ${format === 'png' ? 'export-dialog__radio-option--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="export-format"
                  value="png"
                  checked={format === 'png'}
                  onChange={() => setFormat('png')}
                  data-testid="export-format-png"
                />
                <div>
                  <strong>PNG (High-Resolution)</strong>
                  <p>Rasterized image via canonical SVG. Best for slides, messaging, and docs.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Background options */}
          <div className="export-dialog__section">
            <h3 className="export-dialog__section-title">Background</h3>
            <div className="export-dialog__chip-group" role="radiogroup" aria-label="Export background">
              {(['light', 'dark', 'transparent'] as const).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  className={`export-dialog__chip ${background === bg ? 'export-dialog__chip--active' : ''}`}
                  onClick={() => setBackground(bg)}
                  data-testid={`export-bg-${bg}`}
                  role="radio"
                  aria-checked={background === bg}
                >
                  {bg.charAt(0).toUpperCase() + bg.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* PNG Scale option */}
          {format === 'png' && (
            <div className="export-dialog__section">
              <h3 className="export-dialog__section-title">Image Resolution</h3>
              <div className="export-dialog__chip-group" role="radiogroup" aria-label="PNG resolution">
                {[
                  { value: 1, label: '1× (Standard)' },
                  { value: 2, label: '2× (Recommended)' },
                  { value: 3, label: '3× (Ultra High-DPI)' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`export-dialog__chip ${scale === value ? 'export-dialog__chip--active' : ''}`}
                    onClick={() => setScale(value)}
                    data-testid={`export-scale-${value}`}
                    role="radio"
                    aria-checked={scale === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filename preview */}
          <div className="export-dialog__section">
            <span className="export-dialog__summary-label">Download File:</span>
            <code className="export-dialog__filename-preview" data-testid="export-filename-preview">
              {filename}
            </code>
          </div>

          {errorMessage && (
            <div className="export-dialog__error" role="alert">
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        <div className="export-dialog__footer">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            data-testid="cancel-export-btn"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              void handleExport();
            }}
            data-testid="confirm-export-btn"
            disabled={isExporting}
          >
            {isExporting ? 'Exporting…' : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
