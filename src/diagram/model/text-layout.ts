export interface TextLayout {
  fullText: string;
  displayText: string;
  truncated: boolean;
}

export interface RowTextLayout {
  rowId: string;
  primary: TextLayout;
  secondary?: TextLayout;
}

export interface NodeTextLayout {
  title: TextLayout;
  stereotype?: TextLayout;
  rows: RowTextLayout[];
}
