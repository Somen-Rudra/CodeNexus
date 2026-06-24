// Shared crimson token rules — same hues look great on both dark and light bases
const CRIMSON_RULES_DARK = [
  { token: "keyword",                  foreground: "#ff355e", fontStyle: "bold" },
  { token: "keyword.js",               foreground: "#ff355e", fontStyle: "bold" },
  { token: "storage.js",               foreground: "#ff355e", fontStyle: "bold" },
  { token: "storage.type.js",          foreground: "#ff355e", fontStyle: "bold" },

  { token: "string",                   foreground: "#ff9e64" },
  { token: "string.js",                foreground: "#ff9e64" },
  { token: "string.escape",            foreground: "#ff5370" },

  { token: "number",                   foreground: "#ff5370" },
  { token: "regexp",                   foreground: "#ff9e64" },

  { token: "comment",                  foreground: "#6b7280", fontStyle: "italic" },
  { token: "comment.js",               foreground: "#6b7280", fontStyle: "italic" },

  { token: "entity.name.function",     foreground: "#ff6b81" },
  { token: "entity.name.function.js",  foreground: "#ff6b81" },
  { token: "support.function",         foreground: "#ff6b81" },

  { token: "variable.js",              foreground: "#F3F4F6" },
  { token: "variable.predefined.js",   foreground: "#ff6b81", fontStyle: "bold" },
  { token: "support.class.js",         foreground: "#ff6b81" },

  { token: "identifier",               foreground: "#F3F4F6" },
  { token: "type.identifier",          foreground: "#ff6b81" },

  { token: "keyword.operator.js",      foreground: "#ff355e" },
  { token: "delimiter",                foreground: "#ff355e" },
  { token: "delimiter.bracket.js",     foreground: "#ff355e" },
  { token: "delimiter.parenthesis.js", foreground: "#ff355e" },
];

// Light variants — same palette, darkened so they're readable on a white bg
const CRIMSON_RULES_LIGHT = [
  { token: "keyword",                  foreground: "#c11235", fontStyle: "bold" },
  { token: "keyword.js",               foreground: "#c11235", fontStyle: "bold" },
  { token: "storage.js",               foreground: "#c11235", fontStyle: "bold" },
  { token: "storage.type.js",          foreground: "#c11235", fontStyle: "bold" },

  { token: "string",                   foreground: "#b45309" },
  { token: "string.js",                foreground: "#b45309" },
  { token: "string.escape",            foreground: "#dc2626" },

  { token: "number",                   foreground: "#be185d" },
  { token: "regexp",                   foreground: "#b45309" },

  { token: "comment",                  foreground: "#94a3b8", fontStyle: "italic" },
  { token: "comment.js",               foreground: "#94a3b8", fontStyle: "italic" },

  { token: "entity.name.function",     foreground: "#7c3aed" },
  { token: "entity.name.function.js",  foreground: "#7c3aed" },
  { token: "support.function",         foreground: "#7c3aed" },

  { token: "variable.js",              foreground: "#1e293b" },
  { token: "variable.predefined.js",   foreground: "#7c3aed", fontStyle: "bold" },
  { token: "support.class.js",         foreground: "#7c3aed" },

  { token: "identifier",               foreground: "#1e293b" },
  { token: "type.identifier",          foreground: "#7c3aed" },

  { token: "keyword.operator.js",      foreground: "#c11235" },
  { token: "delimiter",                foreground: "#c11235" },
  { token: "delimiter.bracket.js",     foreground: "#c11235" },
  { token: "delimiter.parenthesis.js", foreground: "#c11235" },
];

export function defineEditorThemes(monaco) {
  // "crimson" — inherits vs-dark chrome, only token colors are overridden
  monaco.editor.defineTheme("crimson", {
    base: "vs-dark",
    inherit: true,       // keeps all vs-dark UI colors (bg, gutter, scrollbar…)
    rules: CRIMSON_RULES_DARK,
    colors: {},          // empty → pure vs-dark chrome, zero overrides
  });

  // "daybreak" — inherits vs (light) chrome, only token colors are overridden
  monaco.editor.defineTheme("daybreak", {
    base: "vs",
    inherit: true,       // keeps all vs UI colors (bg, gutter, scrollbar…)
    rules: CRIMSON_RULES_LIGHT,
    colors: {},          // empty → pure vs chrome, zero overrides
  });
}