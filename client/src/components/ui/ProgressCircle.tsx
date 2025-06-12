import React from "react";

const ProgressCircle = ({ number = 7 }) => {
  const radius = 60;
  const strokeWidth = 10;
  const viewBoxSize = 150;
  const center = viewBoxSize / 2;

  const totalArcSpan = 240;
  const arcCount = 4;
  const arcLength = 40;
  const arcGap = (totalArcSpan - arcLength * arcCount) / (arcCount - 1);

  const startOffset = -120; // start from -120° for top-left

  const arcColors = ["#FFD700", "#FF7F50", "#F4A6A6", "#4169E1"];

  const createArc = (startAngle, color) => {
    const endAngle = startAngle + arcLength;
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return (
      <path
        d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        key={color + startAngle}
      />
    );
  };

  const polarToCartesian = (cx, cy, r, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const arcStartAngles = Array.from({ length: arcCount }, (_, i) =>
    startOffset + i * (arcLength + arcGap)
  );

  return (
    <svg width={viewBoxSize} height={viewBoxSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
      {/* Center Circle */}
      <circle cx={center} cy={center} r={radius - 15} fill="#FBF5D5" />

      {/* Arcs */}
      {arcStartAngles.map((startAngle, i) => createArc(startAngle, arcColors[i]))}

      {/* Number */}
      <text
        className="font-montserrat"
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".35em"
        fontSize="36"
        fill="#FF8C00"
        fontWeight="bold"
      >
        {number}
      </text>
    </svg>
  );
};

export default ProgressCircle;
