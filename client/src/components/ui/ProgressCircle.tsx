const ProgressCircle = ({ number }) => {
  const viewBoxSize = 120;
  const radius = 48;
  const strokeWidth = 8;
  const center = viewBoxSize / 2;

  const totalArcSpan = 240;
  const arcCount = 4;
  const arcLength = 40;
  const arcGap = (totalArcSpan - arcLength * arcCount) / (arcCount - 1);
  const startOffset = -120;

  const arcColors = ["#FFD700", "#FF7F50", "#F4A6A6", "#4169E1"];

  const polarToCartesian = (cx, cy, r, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

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

  const arcStartAngles = Array.from({ length: arcCount }, (_, i) =>
    startOffset + i * (arcLength + arcGap)
  );

  return (
    <div className="flex flex-col items-center">
      <svg width={viewBoxSize} height={viewBoxSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        <circle cx={center} cy={center} r={radius - 12} fill="#FBF5D5" />
        {arcStartAngles.map((startAngle, i) => createArc(startAngle, arcColors[i]))}
        <text
          className="font-montserrat"
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".35em"
          fontSize="30"
          fill="#FF8C00"
          fontWeight="bold"
        >
          {number}
        </text>
      </svg>
      {/* <p className="font-montserrat text-brand-teal">Non encrypted device{number > 1 ? 's' : ''}</p> */}
    </div>
  );
};
export default ProgressCircle