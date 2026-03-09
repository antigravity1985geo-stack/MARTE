import Barcode from 'react-barcode';

interface BarcodeDisplayProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
}

export function BarcodeDisplay({ value, width = 1.5, height = 40, fontSize = 12 }: BarcodeDisplayProps) {
  if (!value) return null;
  return (
    <div className="inline-flex">
      <Barcode
        value={value}
        width={width}
        height={height}
        fontSize={fontSize}
        margin={0}
        background="transparent"
        lineColor="currentColor"
      />
    </div>
  );
}
