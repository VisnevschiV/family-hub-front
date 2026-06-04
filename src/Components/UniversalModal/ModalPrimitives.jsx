export function ModalHeader({
    title,
    subtitle,
    className = "",
    titleClassName = "",
    subtitleClassName = "",
    titleAs = "h2",
}) {
    const HeadingTag = titleAs;

    return (
        <div className={`universalModal__header ${className}`.trim()}>
            <div className="universalModal__headerContent">
                {title ? (
                    <HeadingTag className={`universalModal__title ${titleClassName}`.trim()}>
                        {title}
                    </HeadingTag>
                ) : null}
                {subtitle ? (
                    <p className={`universalModal__subtitle ${subtitleClassName}`.trim()}>
                        {subtitle}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

export function ModalField({
    label,
    htmlFor,
    className = "",
    labelClassName = "",
    children,
}) {
    return (
        <label className={`universalModal__field ${className}`.trim()} htmlFor={htmlFor}>
            {label ? (
                <span className={`universalModal__fieldLabel ${labelClassName}`.trim()}>{label}</span>
            ) : null}
            {children}
        </label>
    );
}

export function ModalActions({ className = "", children }) {
    return <div className={`universalModal__actions ${className}`.trim()}>{children}</div>;
}

export function ModalTitle({ as = "h2", className = "", children }) {
    const Component = as;
    return <Component className={`universalModal__title ${className}`.trim()}>{children}</Component>;
}
