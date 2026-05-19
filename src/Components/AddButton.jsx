import "./AddButton/addButton.css";

export default function AddButton({
    onClick,
    children = "+ Add",
    type = "button",
    className = "",
    size = "short",
    disabled = false,
    ariaLabel,
}) {
    const classes = ["addButton", size, className].filter(Boolean).join(" ");

    return (
        <button
            type={type}
            onClick={onClick}
            className={classes}
            disabled={disabled}
            aria-label={ariaLabel}
        >
            {children}
        </button>
    );
}
