import React from 'react';
import { LucideIcon } from 'lucide-react';
import './CyberCard.css';

interface CyberCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  prefix?: string;
  suffix?: string;
  color?: 'primary' | 'destructive' | 'success' | 'warning' | 'info' | 'accent';
  onClick?: () => void;
}

const colorMap = {
  primary: { glow: 'var(--cyber-glow-primary)', border: 'var(--cyber-border-primary)', text: 'var(--cyber-text-primary)' },
  destructive: { glow: 'var(--cyber-glow-destructive)', border: 'var(--cyber-border-destructive)', text: 'var(--cyber-text-destructive)' },
  success: { glow: 'var(--cyber-glow-success)', border: 'var(--cyber-border-success)', text: 'var(--cyber-text-success)' },
  warning: { glow: 'var(--cyber-glow-warning)', border: 'var(--cyber-border-warning)', text: 'var(--cyber-text-warning)' },
  info: { glow: 'var(--cyber-glow-info)', border: 'var(--cyber-border-info)', text: 'var(--cyber-text-info)' },
  accent: { glow: 'var(--cyber-glow-accent)', border: 'var(--cyber-border-accent)', text: 'var(--cyber-text-accent)' },
};

export const CyberCard: React.FC<CyberCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  prefix = '',
  suffix = '',
  color = 'primary',
  onClick,
}) => {
  const colors = colorMap[color];
  const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;

  return (
    <div
      className="cyber-container noselect"
      onClick={onClick}
      style={{
        '--cyber-active-glow': colors.glow,
        '--cyber-active-border': colors.border,
        '--cyber-active-text': colors.text,
      } as React.CSSProperties}
    >
      <div className="cyber-canvas">
        {/* 3x3 tracker grid for tilt effect */}
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={`cyber-tracker cyber-tr-${i + 1}`} />
        ))}
        <div className="cyber-card">
          <div className="cyber-card-content">
            <div className="cyber-card-glare" />
            <div className="cyber-lines">
              <span /><span /><span /><span />
            </div>

            {/* Icon */}
            {Icon && (
              <div className="cyber-icon-wrapper">
                <Icon className="cyber-icon" />
              </div>
            )}

            {/* Value */}
            <div className="cyber-value-wrapper">
              <span className="cyber-value">
                {prefix}{formattedValue}{suffix}
              </span>
            </div>

            {/* Title */}
            <div className="cyber-title">{title}</div>

            {/* Subtitle */}
            {subtitle && (
              <div className="cyber-subtitle">
                <span>{subtitle}</span>
              </div>
            )}

            {/* Glow elements */}
            <div className="cyber-glowing-elements">
              <div className="cyber-glow-1" />
              <div className="cyber-glow-2" />
            </div>

            {/* Particles */}
            <div className="cyber-particles">
              <span /><span /><span /><span />
            </div>

            {/* Corner elements */}
            <div className="cyber-corners">
              <span /><span /><span /><span />
            </div>

            {/* Scan line */}
            <div className="cyber-scan-line" />
          </div>
        </div>
      </div>
    </div>
  );
};
