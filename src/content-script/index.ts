{
  const createId = () => String(Date.now());

  const pageUrl = window.location.host + window.location.pathname;
  let bridgeDiv;

  const getPageInfo = async (currentPageUrl = pageUrl) => {
    const { projects } = await chrome.storage.local.get('projects');
    const currentProject: IProject = projects?.find((p) => p.active);
    const currentVersion: IVersion | undefined = currentProject?.versions?.find(
      (p) => !p.locked,
    );
    const currentPage = currentVersion?.pages?.find(
      (p) => p.url === currentPageUrl,
    );
    const updateProjects = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          chrome.storage.local.set({ projects }).then(resolve).catch(reject);
        }, 1000);
      });
    };

    return { currentPage, updateProjects };
  };

  async function injectedScript(onReady) {
    const res = await getPageMockConfigFromStorage();

    document.documentElement.setAttribute(
      'data-toolConfig',
      JSON.stringify(res?.pageMockConfig || {}),
    );

    const script = document.createElement('script');
    script.type = 'text/javascript';

    script.src = `chrome-extension:${chrome.runtime.id}/extension/page-script/index.js`;
    document.getElementsByTagName('html')[0].prepend(script);
    script.onload = () => {
      onReady?.();
    };
  }

  const getPageMockConfigFromStorage = async (currentPageUrl?: string) => {
    const storage = await chrome.storage.local.get('config');
    if (!storage.config) return;
    const {
      mocking,
      defaultRequestContentType,
      httpApiHostWhiteList,
      mode,
      ignoreParams,
    } = storage.config;
    const { currentPage: pageInfo, updateProjects } = await getPageInfo(
      currentPageUrl,
    );
    if (!pageInfo) return;
    const { apiCapture, apis } = pageInfo;
    const pageMockConfig: IPageConfig = {
      mocking,
      defaultRequestContentType,
      httpApiHostWhiteList,
      mode,
      ignoreParams,
      apiCapture: !!apiCapture,
      apis,
    };

    return { pageMockConfig, pageInfo, updateProjects };
  };

  const handleResponseData = async (responseData: IResponseData) => {
    // 处理抓取数据
    const res = await getPageMockConfigFromStorage();
    if (!res) return;
    const { pageMockConfig: pageInfo, updateProjects } = res;

    let isApiInWhiteList = responseData.isMtop;
    if (!responseData.isMtop && responseData.url && responseData.host) {
      isApiInWhiteList = pageInfo?.httpApiHostWhiteList?.includes(
        responseData.host,
      );
    }
    if (!isApiInWhiteList || !pageInfo.mocking) return;

    if (pageInfo.mode === 'frontend' && pageInfo.apiCapture) {
      const apiInfo: TApiConfig | undefined = pageInfo.apis.find(
        (api) => api.url === responseData.url,
      );
      const responseText = responseData.isMtop
        ? JSON.stringify(responseData.response)
        : responseData.responseText;

      const { isMtop, method, requestContentType } = responseData;

      let requestParams;

      if (isMtop) {
        requestParams =
          typeof responseData.requestParams === 'string'
            ? JSON.parse(responseData.requestParams)
            : responseData.requestParams;
      } else if (['GET', 'DELETE'].includes(method)) {
        requestParams = responseData.query;
      } else if (responseData.requestParams) {
        if (requestContentType === 'application/x-www-form-urlencoded') {
          const params = new URLSearchParams(responseData.requestParams);
          requestParams = [...params].reduce((total, [key, value]) => {
            total[key] = value;
            return total;
          }, {});
        } else {
          requestParams = JSON.parse(responseData.requestParams as string);
        }
      }
      pageInfo.ignoreParams?.forEach((key) => {
        delete requestParams[key];
      });

      const scene: IScene = {
        name: '抓取的响应数据',
        id: createId(),
        active: true,
        defaultResponse: {
          responseText,
        },
      };

      const parmas = Object.entries(requestParams);
      if (parmas.length) {
        const rule = parmas
          .map((p) =>
            String(Number(p[1])) === p[1] || p[1] === null
              ? `${p[0]} == ${p[1]}`
              : `${p[0]} == '${p[1]}'`,
          )
          .join(' && ');

        scene.temporaryMapRuleRequest = {
          id: createId(),
          rule,
          latestParams: requestParams,
          responseText,
        };
      }

      if (apiInfo) {
        if (!apiInfo.scenes?.length) {
          apiInfo.scenes = [scene];
        } else {
          // 此处逻辑尝试对接口多态做处理
          //-当前响应无匹配规则，更新场景接口默认响应
          //-如果接口单次或多次被调用无入参，不显示匹配规则// -如果接口多次被调用入参都一样，不显示匹配规则// -如果接口首次无入参，二次有入参，显示匹配规则。
          // -如果接口多次被调用入参存在一样，显示匹配规则，所以需要先缓存下匹配规则，判断是否存在多次调用入参不一致情况
          //-当前响应无匹配规则，更新场景接口默认响应
          if (!scene.temporaryMapRuleRequest) {
            apiInfo.scenes[0].defaultResponse = scene.defaultResponse;
            return;
          }
          if (!apiInfo.scenes[0].mapRuleRequests) {
            //后续入参有匹配规则存在且当前接口无匹配规则，覆盖临时匹配规则
            if (!apiInfo.scenes[0].temporaryMapRuleRequest) {
              apiInfo.scenes[0].temporaryMapRuleRequest =
                scene.temporaryMapRuleRequest;
              return;
            }
            // 如果接口多次被调用入参一样，不显示匹配规则// todo:拼配规则的精细匹配
            if (
              scene.temporaryMapRuleRequest.rule ===
              apiInfo.scenes[0].temporaryMapRuleRequest?.rule
            )
              return;
            //当前的临时匹配规则与接口之前的临时匹配规则不一致，添加到接口mapRuleRequests中,并且删除接口temporaryMaprulerequest
            apiInfo.scenes[0].mapRuleRequests = [
              apiInfo.scenes[0].temporaryMapRuleRequest,
              scene.temporaryMapRuleRequest,
            ];
            delete apiInfo.scenes[0].temporaryMapRuleRequest;
          } else {
            //入参在之前的列表中存在，不处理
            const isExist = apiInfo.scenes[0].mapRuleRequests?.find(
              (req) => req.rule === scene.temporaryMapRuleRequest?.rule,
            );
            if (isExist) return;
            //当前的临时匹配规则与接口之前的匹配规则不一致，添加到接口mapRuleRequests中
            apiInfo.scenes[0].mapRuleRequests = [
              ...apiInfo.scenes[0]?.mapRuleRequests,
              scene.temporaryMapRuleRequest,
            ];
          }
        }
      } else if (responseData.isMtop) {
        pageInfo.apis.push({
          id: createId(),
          mocking: true,
          //@ts-ignore
          name: '抓取的接口',
          description: '来自页面抓取的接口',
          url: responseData.url,
          method: responseData.method,
          scenes: [scene],
          // defaultResponseText: responseText,
          version: responseData.version,
          isMtop: true,
          latestParams: requestParams,
        });
      } else {
        pageInfo.apis.push({
          id: createId(),
          mocking: true,
          isMtop: false,
          // @ts-ignore
          name: '抓取的接口',

          description: '来自页面抓取的接口',
          url: responseData.url,
          method: responseData.method,
          scenes: [scene],
          // defaultResponseText: responseText,
          requestContentType: requestContentType as TRequestContentType,
          latestParams: requestParams,
        });
      }

      return await updateProjects();
    } else if (pageInfo.mode === 'backend') {
      storageActionQueueUp(() => {
        return new Promise((resolve, reject) => {
          chrome.storage.local
            .get('runtimeResponse')
            .then(({ runtimeResponse }) => {
              const pageRuntimeResponse = runtimeResponse[pageUrl] || {};
              pageRuntimeResponse[
                `${responseData.method}/${responseData.url}`
              ] = responseData;
              runtimeResponse[pageUrl] = pageRuntimeResponse;
              chrome.storage.local
                .set({ runtimeResponse })
                .then(resolve)
                .catch(reject);
            })
            .catch(reject);
        });
      });
    }
  };

  //由于每次并行异步读写storage，导致数据写入相互覆盖的问题。
  //需要将并行读写storage操作推入队列中，逐条写入 You，1秒钟前·Uncommitted change
  const createStorageActionQueueUp = () => {
    const updateQueue: any[] = [];
    const queueUp = (handler: () => Promise<any>) => {
      return new Promise((resolve, reject) => {
        const currentHandler = () => {
          return handler()
            .then(resolve)
            .catch(reject)
            .finally(() => {
              updateQueue.shift();
              runQueue();
            });
        };
        updateQueue.push(currentHandler);
        if (currentHandler === updateQueue[0]) {
          runQueue();
        }
      });
    };
    const runQueue = () => {
      return updateQueue[0]?.();
    };
    return queueUp;
  };

  const storageActionQueueUp = createStorageActionQueueUp();

  const handleMessage = (messgaeString) => {
    const message: IMessage = JSON.parse(messgaeString);
    switch (message.type) {
      case 'responseData':
        storageActionQueueUp(() => handleResponseData(message.data));
        break;
    }
  };

  const enableMock = (pageMockConfig?: any) => {
    injectedScript(() => {
      bridgeDiv = document.getElementById('extension');
      // 开启mock时需要传入pageMockConfig，页面刷新时依赖存在本地的pageMockConfig
      if (pageMockConfig) {
        try {
          bridgeDiv.innerText = JSON.stringify(pageMockConfig);
        } catch (e) {
          console.warn('解析pageMockConfig出错', e);
        }
      }
      const observer = new MutationObserver(() => {
        handleMessage(bridgeDiv.dataset.message);
        // chrome.runtime.sendMessage(bridgeDiv.dataset.message);
      });
      observer.observe(bridgeDiv, { attributes: true });
    });
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('enableMock onMessage', request);
      switch (request.type) {
        case 'updatePageMockingData':
          try {
            bridgeDiv.innerText = JSON.stringify(request.pageMockConfig);
          } catch (e) {
            console.warn('解析pageMockConfig出错口', e);
          }
          break;
      }
    });
  };

  chrome.storage.local.get().then(({ config, projects, runtimeResponse }) => {
    const initStorageData: {
      config?: IMockConfig;
      projects?: IProject[];
      runtimeResponse?: any;
    } = {};
    if (!config) {
      initStorageData.config = {
        mode: 'frontend',
        mocking: true,
        defaultRequestContentType: 'application/x-www-form-urlencoded',
      };
    }
    if (!projects) {
      initStorageData.projects = [
        {
          active: true,
          name: '默认项目',
          desc: '默认项目',
          id: createId(),
          versions: [{ locked: false, version: 1, pages: [] }],
        },
      ];
    }
    if (!runtimeResponse) {
      initStorageData.runtimeResponse = {};
    }
    if (Object.keys(initStorageData).length) {
      chrome.storage.local.set(initStorageData);
    }

    if (!config?.mocking) return;
    enableMock();
  });

  const onConfigChange = async (
    newConfig: IMockConfig,
    oldConfig: IMockConfig,
  ) => {
    const res = await getPageMockConfigFromStorage();
    if (!res) return;
    const { pageMockConfig } = res;
    if (newConfig.mocking !== oldConfig.mocking) {
      if (!newConfig.mocking) {
        window.location.reload();
        return;
      }
      enableMock(pageMockConfig);
      return;
    }
    try {
      bridgeDiv.innerText = JSON.stringify(pageMockConfig);
    } catch (e) {
      console.warn('解析pageMockConfig出错了围', e);
    }
  };

  const onProjectsChange = async (
    newConfig: IMockConfig,
    oldConfig: IMockConfig,
  ) => {
    const res = await getPageMockConfigFromStorage();
    if (!res) return;
    const { pageMockConfig } = res;
    try {
      bridgeDiv.innerText = JSON.stringify(pageMockConfig);
    } catch (e) {
      console.warn('解析pageMockConfig出错鸟国', e);
    }
  };

  chrome.storage.onChanged.addListener((changes, namespace) => {
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      switch (key) {
        case 'config':
          onConfigChange(newValue, oldValue);
          break;
        case 'projects':
          console.log('oldValue, newValue', oldValue, newValue);
          onProjectsChange(newValue, oldValue);
          break;
      }
    }
  });
}
