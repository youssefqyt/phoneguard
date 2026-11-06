import { Alert, Platform } from 'react-native';

interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export function showAlert(
  title: string,
  message?: string,
  buttons?: DialogButton[],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const browser = globalThis as typeof globalThis & {
    alert?: (message?: string) => void;
    confirm?: (message?: string) => boolean;
  };
  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons?.length) {
    browser.alert?.(text);
    return;
  }

  const positive = [...buttons].reverse().find(button => button.onPress);
  const cancel = buttons.find(button => button.style === 'cancel');
  if (!positive) {
    browser.alert?.(text);
    return;
  }

  if (buttons.length === 1) {
    browser.alert?.(text);
    positive.onPress?.();
    return;
  }

  if (browser.confirm?.(text)) {
    positive.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}
