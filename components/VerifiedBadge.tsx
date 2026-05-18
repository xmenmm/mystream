'use client';

type Props = {
  size?: number;
  className?: string;
  title?: string;
};

/** Centang biru — Twitter/Instagram style verified badge.
 *  Pure SVG (no image), inherits size & color via CSS. */
export function VerifiedBadge({ size = 16, className = '', title = 'Verified' }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center align-middle ${className}`}
      title={title}
      aria-label={title}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))' }}
      >
        {/* Star-shaped blue background */}
        <path
          d="M12 1.5c-.5 0-1 .2-1.4.6L9 3.7l-2.4-.5c-.5-.1-1 0-1.4.4-.4.4-.5.9-.4 1.4l.5 2.4-1.6 1.7c-.4.4-.6.9-.6 1.4 0 .5.2 1 .6 1.4l1.6 1.7-.5 2.4c-.1.5 0 1 .4 1.4.4.4.9.5 1.4.4l2.4-.5 1.7 1.6c.4.4.9.6 1.4.6.5 0 1-.2 1.4-.6l1.7-1.6 2.4.5c.5.1 1 0 1.4-.4.4-.4.5-.9.4-1.4l-.5-2.4 1.6-1.7c.4-.4.6-.9.6-1.4 0-.5-.2-1-.6-1.4L19.7 7.4l.5-2.4c.1-.5 0-1-.4-1.4-.4-.4-.9-.5-1.4-.4L16 3.7l-1.7-1.6c-.4-.4-.9-.6-1.4-.6z"
          fill="#1d9bf0"
        />
        {/* White checkmark */}
        <path
          d="M9.5 12.5l2 2 4-4.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
