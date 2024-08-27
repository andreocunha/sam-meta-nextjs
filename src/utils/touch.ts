export const toggleScrollAndTouchBehavior = (isEnabled: boolean) => {
    const preventDefault = (e: Event) => e.preventDefault();
    
    if (isEnabled) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('touchmove', preventDefault, { passive: false });
    } else {
      document.body.style.overflow = 'auto';
      window.removeEventListener('touchmove', preventDefault);
    }
  };
  