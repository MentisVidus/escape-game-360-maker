import type { CSSProperties } from "react";

type ButtonVariant = {
  kind: "button";
  label: string;
};

type InputVariant = {
  kind: "input";
  buttonLabel: string;
};

type SelectorButtonsVariant = {
  kind: "selector-buttons";
  choices: string[];
};

type SelectorDropdownVariant = {
  kind: "selector-dropdown";
  choices: string[];
};

type PreviewVariant = ButtonVariant | InputVariant | SelectorButtonsVariant | SelectorDropdownVariant;

type Props = {
  viewportStyle: CSSProperties;
  panelStyle: CSSProperties;
  closeBtnStyle: CSSProperties;
  buttonStyle: CSSProperties;
  closeAriaLabel: string;
  html: string;
  titleText?: string;
  variant: PreviewVariant;
};

export function PlayerPopupPreview({
  viewportStyle,
  panelStyle,
  closeBtnStyle,
  buttonStyle,
  closeAriaLabel,
  html,
  titleText,
  variant,
}: Props) {
  return (
    <div style={viewportStyle}>
      <div className="nodal-msg-preview-chrome" style={panelStyle}>
        <button type="button" aria-label={closeAriaLabel} disabled style={closeBtnStyle}>
          ✕
        </button>
        {titleText ? (
          <p>
            <strong>{titleText}</strong>
          </p>
        ) : null}
        <div className="play-html-rich" dangerouslySetInnerHTML={{ __html: html }} />
        <br />
        {variant.kind === "button" ? (
          <button type="button" disabled style={buttonStyle}>
            {variant.label}
          </button>
        ) : null}
        {variant.kind === "input" ? (
          <>
            <input type="text" value="" disabled style={{ width: "100%", marginTop: "8px", boxSizing: "border-box" }} />
            <button type="button" disabled style={buttonStyle}>
              {variant.buttonLabel}
            </button>
          </>
        ) : null}
        {variant.kind === "selector-buttons" ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {variant.choices.map((choice, index) => (
              <button key={`${index}-${choice}`} type="button" disabled style={buttonStyle}>
                {choice}
              </button>
            ))}
          </div>
        ) : null}
        {variant.kind === "selector-dropdown" ? (
          <select disabled style={{ width: "100%", padding: "6px 8px", boxSizing: "border-box" }}>
            {variant.choices.map((choice, index) => (
              <option key={`${index}-${choice}`}>{choice}</option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}
