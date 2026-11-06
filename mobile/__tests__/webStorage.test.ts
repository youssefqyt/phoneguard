import {
  clearAll,
  getItem,
  removeItem,
  setItem,
} from '../src/utils/storage.web';

const sessionValues = new Map<string, string>();
const sessionStorageMock = {
  getItem: (key: string) => sessionValues.get(key) ?? null,
  setItem: (key: string, value: string) => sessionValues.set(key, value),
  removeItem: (key: string) => sessionValues.delete(key),
  key: (index: number) => Array.from(sessionValues.keys())[index] ?? null,
  get length() {
    return sessionValues.size;
  },
};

beforeEach(() => {
  sessionValues.clear();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: sessionStorageMock,
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'sessionStorage');
});

describe('browser storage', () => {
  it('stores values in the PhoneGuard session namespace', async () => {
    await setItem('auth.accessToken', 'example-token');

    await expect(getItem('auth.accessToken')).resolves.toBe('example-token');
    expect(sessionValues.has('phoneguard:auth.accessToken')).toBe(true);
  });

  it('clears only PhoneGuard keys', async () => {
    sessionValues.set('phoneguard:auth.user', '{"id":"user"}');
    sessionValues.set('other-app:key', 'keep');

    await clearAll();

    expect(sessionValues.has('phoneguard:auth.user')).toBe(false);
    expect(sessionValues.get('other-app:key')).toBe('keep');
  });

  it('removes one value without affecting other session data', async () => {
    sessionValues.set('phoneguard:auth.accessToken', 'token');
    sessionValues.set('phoneguard:auth.refreshToken', 'refresh');

    await removeItem('auth.accessToken');

    expect(await getItem('auth.accessToken')).toBeNull();
    expect(await getItem('auth.refreshToken')).toBe('refresh');
  });
});
