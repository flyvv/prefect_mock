import './app.scss';
import AppHeader from './AppHeader';
import PageMenu from './Menu';
import AppPages from './AppPages';
import { useEffect, useRef, useState } from 'react';
import { createId } from '../../utils';

type TStorageData = {
  pages: IPage[];
  restPages: IPage[];
  currentProject: IProject;
  projects: IProject[];
  currentPage?: IPage;
  currentTitle?: string;
  currentUrl: string;
  config: IMockConfig;
  runtimeResponse: any;
};
export default function App() {
  // const [apiFormVisible, setApiFormVisible]=useState(false);
  const [storageData, setStorageData] = useState<TStorageData>();
  const pageKey = useRef<string>();
  useEffect(() => {
    chrome?.tabs?.query?.(
      {
        active: true,
        lastFocusedWindow: true,
      },
      (tabs) => {
        if (!tabs?.[0]?.url) return;
        const pageUrl = new URL(tabs[0].url);
        const currentUrl = pageUrl.host + pageUrl.pathname;
        const currentTitle = tabs[0].title;
        pageKey.current = currentUrl;
        chrome.storage.local.get().then((res) => {
          const storageProjects: IProject = res.projects?.find?.(
            (p) => p.active,
          );
          let currentProject;
          if (storageProjects) {
            currentProject = storageProjects;
          } else {
            currentProject = {
              active: true,
              name: '默认项目',
              desc: '默认项目',
              id: createId(),
              versions: [{ locked: false, version: 1, pages: [] }],
            };

            chrome.storage.local.set({
              projects: [currentProject],
              config: {
                mode: 'frontend',
                mocking: true,
                defaultRequestcontentType: 'application/x-waw-form-uroded',
              },
              runtimeResponse: {},
            });
          }
          const currentVersion: IVersion = currentProject?.versions?.find(
            (p) => !p.locked,
          );
          setStorageData({
            config: res.config,
            currentProject,
            projects: res.projects,
            pages: currentVersion?.pages,
            restPages: currentVersion?.pages.filter(
              (page) => page.url !== currentUrl,
            ),
            runtimeResponse: res?.runtimeResponse,
            currentPage: currentVersion?.pages.find(
              (page) => page.url === currentUrl,
            ),
            currentTitle,
            currentUrl,
          });
        });
      },
    );

    chrome.storage.onChanged.addListener((changes, namespace) => {
      for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        switch (key) {
          case 'projects': {
            console.log('storage projects change', oldValue, newValue);
            const currentProject: IProject = newValue?.find?.((p) => p.active);
            const currentVersion: IVersion = currentProject?.versions?.find(
              (p) => !p.locked,
            );
            setStorageData((state) => {
              if (!state) return state;
              return {
                ...state,
                projects: newValue,
                pages: currentVersion?.pages,
                restPages: currentVersion?.pages.filter(
                  (page) => page.url !== pageKey.current,
                ),
                currentPage: currentVersion?.pages.find(
                  (page) => page.url === pageKey.current,
                ),
                currentProject,
              };
            });
            break;
          }
          case 'config':
            setStorageData((state) => {
              if (!state) return state;
              return {
                ...state,
                config: newValue,
              };
            });
            break;
        }
      }
    });
  }, []);
  if (!storageData || !storageData.config || !storageData.projects)
    return <div>请刷新页面</div>;

  return (
    <div
      className="popup"
      style={{
        width: '800px',
        height: '600px',
      }}
    >
      <AppHeader config={storageData.config} />
      <main className={`body ${storageData.config.mocking ? '' : 'disable'}`}>
        <PageMenu className="app-menu" projects={storageData.projects} />
        <section className="content">
          <AppPages storageData={storageData} />
        </section>
      </main>
    </div>
  );
}
