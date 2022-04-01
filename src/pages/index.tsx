import App from './App';
import set from 'lodash/set';

if (!chrome.storage) {
  const strageString = localStorage.getItem('__zzMock');
  let storage = strageString
    ? JSON.parse(strageString)
    : {
        config: {
          mocking: true,
          defaultRequestContentType: 'application/x-www-form-urlencoded',
          httpApiHostWhiteList: ['bp.aliexpress.com'],
          mode: 'backend',
        },
      };
  set(window.chrome, ['storage', 'local', 'get'], () => {
    return Promise.resolve(storage);
  });

  set(window.chrome, ['storage', 'local', 'set'], (data) => {
    storage = { ...storage, ...data };
    localStorage.setItem('__zzMock', JSON.stringify(storage));
    return Promise.resolve(data);
  });

  set(window.chrome, ['tabs', 'query'], (data, callback) => {
    callback([
      {
        id: '123123',
        url: 'https://gsp.aliexpress.com/apps/bp/activity_center',
        title: 'Seller Center',
      },
    ]);
  });
  set(window.chrome, ['storage', 'onChanged', 'addListener'], (callback) => {
    // callback()
  });
  set(window.chrome, ['tabs', 'sendMessage'], (tabid, message) => {
    console.log('sendMessage:', message);
  });

  set(window.chrome, ['runtime', 'sendMessage'], (message) => {
    console.log('runtime sendMessage:', message);
  });
}

export default function Popup() {
  return <App />;
}
