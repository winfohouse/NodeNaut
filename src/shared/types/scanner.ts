export enum FieldType {
  TEXT = 'TEXT',
  PASSWORD = 'PASSWORD',
  EMAIL = 'EMAIL',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  BUTTON = 'BUTTON',
  SUBMIT = 'SUBMIT',
  UNKNOWN = 'UNKNOWN'
}

export interface ScannedField {
  id: string;
  label: string;
  type: FieldType;
  tagName: string;
  placeholder?: string;
  value?: string;
  mappedValue?: string; // New: For auto-mapping preview
  isRequired: boolean;
  isVisible: boolean;
  selectors: SelectorScore[];
  metadata?: {
    name?: string;
    ariaLabel?: string;
    options?: { label: string; value: string }[];
    isWorkflowOpportunity?: boolean;
  };
}

export interface SelectorScore {
  selector: string;
  index?: number;
  type: 'ID' | 'NAME' | 'LABEL' | 'ARIA' | 'PLACEHOLDER' | 'CLASS' | 'XPATH' | 'RELATIVE' | 'HYBRID';
  confidence: number;
}

export const SELECTOR_CONFIDENCE = {
  ID: 100,
  HYBRID: 90,
  NAME: 80,
  LABEL: 75,
  ARIA: 70,
  PLACEHOLDER: 60,
  CLASS: 40,
  RELATIVE: 20,
  XPATH: 10
};
