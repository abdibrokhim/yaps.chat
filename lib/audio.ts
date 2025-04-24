// Audio utility functions

// Single cached instance of the notification sound
let notificationSound: HTMLAudioElement | null = null;

/**
 * Plays a notification sound with optional volume control
 * @param soundUrl Path to the sound file
 * @param volume Volume level (0.0 to 1.0)
 */
export const playNotificationSound = (soundUrl = '/audio/yapsnotify.mp3', volume = 0.5) => {
  try {
    // Check if sound is enabled in user preferences
    const soundEnabled = localStorage.getItem('soundEnabled');
    if (soundEnabled === 'false') {
      return; // Do not play sound if disabled
    }
    
    // Create audio element if it doesn't exist
    if (!notificationSound) {
      notificationSound = new Audio(soundUrl);
    }
    
    // Set volume and play
    notificationSound.volume = volume;
    
    // Reset the audio to the beginning if it's already playing
    notificationSound.currentTime = 0;
    
    // Play the sound
    const playPromise = notificationSound.play();
    
    // Handle autoplay restrictions in browsers
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn('Audio playback failed:', error);
        // Handle autoplay restriction
        if (error.name === 'NotAllowedError') {
          console.warn('Audio playback was prevented by the browser. User interaction might be required.');
        }
      });
    }
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}; 