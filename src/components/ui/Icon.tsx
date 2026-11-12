import React from "react";

interface IconProps {
  name: string;
  size?: number | string;
  className?: string;
  filled?: boolean;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  className = "",
  filled = false,
}) => {
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      className={`material-symbols-rounded select-none inline-flex items-center justify-center ${className}`}
      style={{
        fontSize: pixelSize,
        width: pixelSize,
        height: pixelSize,
        fontVariationSettings: filled ? "'FILL' 1, 'wght' 450, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
};
