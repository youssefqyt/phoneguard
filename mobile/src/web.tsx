import { AppRegistry } from 'react-native';
import App from '../App';
import appInfo from '../app.json';
import './web.css';

const browser = globalThis as unknown as {
  document: { getElementById(id: string): unknown };
};
const rootTag = browser.document.getElementById('root');

if (!rootTag) {
  throw new Error('PhoneGuard web root element is missing.');
}

AppRegistry.registerComponent(appInfo.name, () => App);
AppRegistry.runApplication(appInfo.name, {
  rootTag: rootTag as Parameters<typeof AppRegistry.runApplication>[1]['rootTag'],
  initialProps: {},
});
