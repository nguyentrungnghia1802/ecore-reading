interface LoadingStateProps {
  message: string;
  sourceName?: string | null;
}

export function LoadingState({ message, sourceName }: LoadingStateProps) {
  return (
    <div className="loading-state" data-testid="workspace-loading" role="status" aria-live="polite">
      <div className="loading-state__spinner" aria-hidden="true" />
      <h2 className="loading-state__title">
        {sourceName ? `Loading ${sourceName}` : 'Processing metamodel…'}
      </h2>
      <p className="loading-state__message">{message}</p>
    </div>
  );
}
