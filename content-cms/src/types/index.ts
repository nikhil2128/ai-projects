export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "dropdown"
  | "toggle"
  | "richtext";

export interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ContentModel {
  id: string;
  name: string;
  slug: string;
  description: string;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentEntry {
  id: string;
  modelId: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type AppView =
  | "models"
  | "model-builder"
  | "model-edit"
  | "entries"
  | "entry-form";

export const FIELD_TYPE_META: Record<
  FieldType,
  { label: string; icon: string; description: string }
> = {
  text: {
    label: "Text Input",
    icon: "Aa",
    description: "Single-line text field",
  },
  textarea: {
    label: "Text Area",
    icon: "¶",
    description: "Multi-line plain text",
  },
  number: {
    label: "Number",
    icon: "#",
    description: "Numeric value",
  },
  date: {
    label: "Date",
    icon: "📅",
    description: "Date picker",
  },
  dropdown: {
    label: "Dropdown",
    icon: "▾",
    description: "Select from predefined options",
  },
  toggle: {
    label: "Toggle",
    icon: "◉",
    description: "Boolean on/off switch",
  },
  richtext: {
    label: "Rich Text",
    icon: "✎",
    description: "Rich text editor with formatting",
  },
};
