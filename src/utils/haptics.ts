export const hapticLight = () => {
  try {
    if (window.navigator && typeof window.navigator.vibrate === 'function') {
      window.navigator.vibrate(10);
    }
  } catch {}
};

export const hapticMedium = () => {
  try {
    if (window.navigator && typeof window.navigator.vibrate === 'function') {
      window.navigator.vibrate(25);
    }
  } catch {}
};

export const hapticSuccess = () => {
  try {
    if (window.navigator && typeof window.navigator.vibrate === 'function') {
      window.navigator.vibrate([15, 50, 30]);
    }
  } catch {}
};
