import { useEffect } from 'react';
import { Modal, Tabs } from 'antd';
import FrontendView from '@/demo/FrontendView';
import BackendView from '@/demo/BackendView';
import BackendReport from '@/demo/BackendReport';
import FrontendReport from '@/demo/FrontendReport';
import { removePage } from '@/pages/storageActions';
import AESPluginEvent from '@/utils/mockAesTrackerPluginEvent';

export default function AppPages({ storageData }) {
  const { config, restPages, currentProject } = storageData;
  const mode = config.mode || 'frontend';
  useEffect(() => {
    if (!config?.userId) return;
    AESPluginEvent('app_pv', { c1: mode });
  }, [mode, config?.userId]);
  function handleEditPage(targetKey, action) {
    const actionHandler = {
      add: () => {
        alert('请在需要添加的页面上打开播件面板添加');
      },
      remove: () => {
        deletePage(targetKey);
      },
    };
    actionHandler[action] && actionHandler[action]();
  }

  function deletePage(key) {
    Modal.confirm({
      title: '删除页面',
      content: '确认删除页面?',
      onOk: () => {
        removePage({ url: key });
      },
    });
  }

  const viewReportBtn =
    mode === 'frontend' ? (
      <FrontendReport currentProject={currentProject} config={config} />
    ) : (
      <BackendReport currentProject={currentProject} config={config} />
    );

  return (
    <>
      <div
        style={{
          width: '615px',
          overflow: 'hidden',
        }}
      >
        <Tabs
          type="editable-card"
          onEdit={handleEditPage}
          tabBarExtraContent={viewReportBtn}
        >
          <Tabs.TabPane
            tab={storageData.currentPage?.title || storageData.currentTitle}
            key={storageData.currentPage?.url || storageData.currentUrl}
          >
            {mode === 'frontend' && (
              <FrontendView
                config={storageData?.config}
                pageInfo={storageData?.currentPage}
                currentPageUrl={storageData?.currentUrl}
                pageTitle={storageData?.currentTitle}
              />
            )}
            {mode === 'backend' &&
              (storageData?.currentPage ? (
                <BackendView
                  config={storageData.config}
                  pageInfo={storageData?.currentPage}
                  currentPageUrl={storageData?.currentUrl}
                  runtimeResponse={
                    storageData.runtimeResponse?.[storageData?.currentPage.url]
                  }
                />
              ) : (
                <div>该页面无接口相关调试信息</div>
              ))}
          </Tabs.TabPane>
          {restPages.length &&
            restPages.map((page) => (
              <Tabs.TabPane tab={page.title} key={page.url}>
                {mode === 'frontend' && (
                  <FrontendView
                    config={storageData?.config}
                    pageInfo={page}
                    currentPageUrl={storageData?.currentUrl}
                    pageTitle={page.title}
                  />
                )}
                {mode === 'backend' && (
                  <BackendView
                    config={storageData.config}
                    pageInfo={page}
                    currentPageUrl={storageData?.currentUrl}
                    runtimeResponse={storageData.runtimeResponselpage.urt}
                  />
                )}
              </Tabs.TabPane>
            ))}
        </Tabs>
      </div>
    </>
  );
}
