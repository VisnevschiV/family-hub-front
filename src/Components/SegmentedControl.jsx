import { useLayoutEffect, useRef } from "react";
import "./SegmentedControl/segmentedControl.css";

/**
 * @param {{ options: string[], value: string, onChange: (value: string) => void }} props
 */
export default function SegmentedControl({ options, value, onChange }) {
    const containerRef = useRef(null);
    const thumbRef = useRef(null);
    const optionRefs = useRef([]);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const thumb = thumbRef.current;
        if (!container || !thumb) return;

        const selectedIndex = options.indexOf(value);
        const selectedButton = optionRefs.current[selectedIndex];
        if (!selectedButton) return;

        const containerRect = container.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();

        thumb.style.width = `${buttonRect.width}px`;
        thumb.style.transform = `translateX(${buttonRect.left - containerRect.left - 3}px)`;
    }, [value, options]);

    return (
        <div ref={containerRef} className="segmentedControl" role="group">
            <div ref={thumbRef} className="segmentedControl__thumb" aria-hidden="true" />
            {options.map((option, index) => (
                <button
                    key={option}
                    ref={(el) => { optionRefs.current[index] = el; }}
                    type="button"
                    className={`segmentedControl__option${value === option ? " segmentedControl__option--selected" : ""}`}
                    onClick={() => onChange(option)}
                    aria-pressed={value === option}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}
