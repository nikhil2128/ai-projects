interface MicButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled: boolean;
}

export function MicButton({ isListening, onClick, disabled }: MicButtonProps) {
  return (
    <button
      className={`cvc-mic-btn${isListening ? ' cvc-mic-listening' : ''}`}
      onClick={onClick}
      disabled={disabled || isListening}
      type="button"
      aria-label={isListening ? 'Listening...' : 'Start reading'}
    >
      {isListening && (
        <>
          <span className="cvc-mic-pulse cvc-mic-pulse-1" />
          <span className="cvc-mic-pulse cvc-mic-pulse-2" />
          <span className="cvc-mic-pulse cvc-mic-pulse-3" />
        </>
      )}
      <svg
        className="cvc-mic-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        width="40"
        height="40"
      >
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    </button>
  );
}
